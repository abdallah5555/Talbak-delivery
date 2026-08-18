-- Complete PIN server-side setup/update path and reduce reorder RPC privilege surface.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DROP FUNCTION IF EXISTS public.set_user_pin(text);
CREATE OR REPLACE FUNCTION public.set_user_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR p_pin IS NULL OR p_pin !~ '^[0-9]{4,6}$' THEN RETURN false; END IF;
  PERFORM set_config('app.talabak_pin_update','1',true);
  UPDATE public.users
  SET pin_hash = crypt(p_pin, gen_salt('bf', 8)), last_pin_verified_at = now(), pin_attempts = 0, pin_locked_until = NULL, updated_at = now()
  WHERE id = v_user_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.set_user_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_pin(text) TO authenticated;

DROP FUNCTION IF EXISTS public.get_reorder_items(uuid);
CREATE OR REPLACE FUNCTION public.get_reorder_items(p_order_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(o.items, '[]'::jsonb)
  FROM public.orders o
  WHERE o.id = p_order_id AND o.customer_id = (SELECT auth.uid()) AND o.status = 'delivered';
$$;
REVOKE ALL ON FUNCTION public.get_reorder_items(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reorder_items(uuid) TO authenticated;
