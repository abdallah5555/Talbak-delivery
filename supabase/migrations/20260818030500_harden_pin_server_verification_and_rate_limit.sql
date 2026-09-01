-- Server-only PIN verification with brute-force protection.
-- Never exposes users.pin_hash to authenticated clients.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pin_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz NULL;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_pin_attempts_nonnegative;
ALTER TABLE public.users
  ADD CONSTRAINT users_pin_attempts_nonnegative CHECK (pin_attempts >= 0);

DROP FUNCTION IF EXISTS public.verify_user_pin(text, text);
DROP FUNCTION IF EXISTS public.verify_user_pin(text);

CREATE OR REPLACE FUNCTION public.verify_user_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_stored_hash text;
  v_attempts integer;
  v_locked_until timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT pin_hash, pin_attempts, pin_locked_until
    INTO v_stored_hash, v_attempts, v_locked_until
  FROM public.users
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_stored_hash IS NULL THEN
    RETURN false;
  END IF;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RAISE EXCEPTION 'PIN_LOCKED';
  END IF;

  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4,6}$' THEN
    RETURN false;
  END IF;

  IF crypt(p_pin, v_stored_hash) = v_stored_hash THEN
    PERFORM set_config('app.talabak_pin_update', '1', true);
    UPDATE public.users
    SET pin_attempts = 0,
        pin_locked_until = NULL,
        last_pin_verified_at = now(),
        updated_at = now()
    WHERE id = v_user_id;
    RETURN true;
  END IF;

  v_attempts := COALESCE(v_attempts, 0) + 1;

  IF v_attempts >= 5 THEN
    UPDATE public.users
    SET pin_attempts = 0,
        pin_locked_until = now() + interval '15 minutes',
        updated_at = now()
    WHERE id = v_user_id;
    RAISE EXCEPTION 'PIN_LOCKED';
  END IF;

  UPDATE public.users
  SET pin_attempts = v_attempts,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_user_pin(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_user_pin(text) TO authenticated;

REVOKE SELECT (pin_hash, pin_attempts, pin_locked_until) ON public.users FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.verify_user_pin(text) IS
  'Verifies the authenticated user PIN only inside Postgres. Never returns or exposes the stored hash. Locks after 5 failed attempts for 15 minutes.';
