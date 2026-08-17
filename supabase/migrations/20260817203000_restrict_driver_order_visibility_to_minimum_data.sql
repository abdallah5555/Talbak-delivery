BEGIN;

CREATE OR REPLACE FUNCTION public.get_available_driver_orders()
RETURNS TABLE (
  id uuid,
  status text,
  total numeric,
  delivery_address jsonb,
  created_at timestamptz,
  payment_method text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_driver_id uuid := auth.uid();
BEGIN
  IF v_driver_id IS NULL OR NOT public.is_driver(v_driver_id) THEN
    RAISE EXCEPTION 'Driver authorization required';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.status,
    o.total,
    jsonb_build_object(
      'street', COALESCE(o.delivery_address->>'street',''),
      'building', COALESCE(o.delivery_address->>'building','')
    ) AS delivery_address,
    o.created_at,
    o.payment_method
  FROM public.orders o
  WHERE o.driver_id IS NULL
    AND o.status IN ('sent','preparing')
  ORDER BY o.created_at DESC
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_driver_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_available_driver_orders() TO authenticated;

DROP POLICY IF EXISTS "Orders View Policy" ON public.orders;
CREATE POLICY "Orders View Policy" ON public.orders
FOR SELECT TO authenticated
USING (
  auth.uid() = customer_id
  OR auth.uid() = driver_id
  OR public.is_admin(auth.uid())
);

COMMIT;
