BEGIN;

CREATE OR REPLACE FUNCTION public.protect_admin_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_old_admin boolean := EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = OLD.id AND ur.role = 'admin'
  );
BEGIN
  IF current_setting('app.talabak_pin_update', true) = '1'
     AND v_caller = OLD.id THEN
    RETURN NEW;
  END IF;

  IF v_old_admin AND NOT public.is_admin(v_caller) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.store_id IS DISTINCT FROM OLD.store_id
       OR NEW.is_verified_customer IS DISTINCT FROM OLD.is_verified_customer
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.total_ratings IS DISTINCT FROM OLD.total_ratings
       OR NEW.pin_hash IS DISTINCT FROM OLD.pin_hash THEN
      RAISE EXCEPTION 'Cannot modify protected admin account fields without admin privileges';
    END IF;
  END IF;

  IF v_caller IS NOT NULL AND NOT public.is_admin(v_caller) AND v_caller = OLD.id THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.vehicle_type IS DISTINCT FROM OLD.vehicle_type
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.total_ratings IS DISTINCT FROM OLD.total_ratings
       OR NEW.store_id IS DISTINCT FROM OLD.store_id
       OR NEW.pin_hash IS DISTINCT FROM OLD.pin_hash
       OR NEW.last_pin_verified_at IS DISTINCT FROM OLD.last_pin_verified_at
       OR NEW.is_verified_customer IS DISTINCT FROM OLD.is_verified_customer
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'You may only update your profile name or username';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_pin(p_pin_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR p_pin_hash IS NULL OR length(trim(p_pin_hash)) < 20 THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.talabak_pin_update', '1', true);

  UPDATE public.users
  SET pin_hash = p_pin_hash,
      last_pin_verified_at = now(),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_user_pin(p_pin text, p_hash text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_stored_hash text;
BEGIN
  IF v_user_id IS NULL OR p_pin IS NULL OR length(p_pin) <> 4 THEN
    RETURN false;
  END IF;

  SELECT pin_hash INTO v_stored_hash
  FROM public.users
  WHERE id = v_user_id;

  IF v_stored_hash IS NULL THEN
    RETURN false;
  END IF;

  IF v_stored_hash = crypt(p_pin, v_stored_hash) THEN
    PERFORM set_config('app.talabak_pin_update', '1', true);
    UPDATE public.users
    SET last_pin_verified_at = now(), updated_at = now()
    WHERE id = v_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMIT;
