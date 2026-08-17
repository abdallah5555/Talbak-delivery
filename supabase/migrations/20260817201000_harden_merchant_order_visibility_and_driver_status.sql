BEGIN;

DROP POLICY IF EXISTS "Merchants can view own store orders" ON public.orders;
CREATE POLICY "Merchants can view own store orders"
ON public.orders
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'merchant'
    )
    AND store_id = (
      SELECT u.store_id FROM public.users u WHERE u.id = auth.uid() AND u.status = 'active'
    )
  )
);

CREATE OR REPLACE FUNCTION public.protect_driver_status_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF public.is_admin(v_caller) OR v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_driver(v_caller) AND v_caller = OLD.driver_id THEN
    IF NEW.current_active_orders IS DISTINCT FROM OLD.current_active_orders
       OR NEW.max_allowed_orders IS DISTINCT FROM OLD.max_allowed_orders
       OR NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
      RAISE EXCEPTION 'Driver capacity fields are server-controlled';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_driver_status_integrity ON public.driver_status;
CREATE TRIGGER trg_protect_driver_status_integrity
BEFORE UPDATE ON public.driver_status
FOR EACH ROW
EXECUTE FUNCTION public.protect_driver_status_integrity();

DROP POLICY IF EXISTS "Driver Status Update Policy" ON public.driver_status;
CREATE POLICY "Driver Status Update Policy"
ON public.driver_status
FOR UPDATE TO authenticated
USING ((auth.uid() = driver_id AND public.is_driver(auth.uid())) OR public.is_admin(auth.uid()))
WITH CHECK ((auth.uid() = driver_id AND public.is_driver(auth.uid())) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Driver Status Insert Policy" ON public.driver_status;
CREATE POLICY "Driver Status Insert Policy"
ON public.driver_status
FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = driver_id AND public.is_driver(auth.uid())) OR public.is_admin(auth.uid()));

COMMIT;
