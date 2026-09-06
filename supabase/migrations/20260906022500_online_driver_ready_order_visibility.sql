-- Online drivers need to discover unassigned ready orders before accepting them.
-- All customer, assigned-driver, merchant-owner, and admin visibility stays unchanged.
DROP POLICY IF EXISTS orders_read ON public.orders;
CREATE POLICY orders_read ON public.orders
  FOR SELECT TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR driver_id = (SELECT auth.uid())
    OR (SELECT public.has_role('admin'::public.app_role))
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = orders.store_id AND s.owner_id = (SELECT auth.uid())
    )
    OR (
      status = 'ready'::public.order_status
      AND driver_id IS NULL
      AND (SELECT public.has_role('driver'::public.app_role))
      AND EXISTS (
        SELECT 1 FROM public.driver_status ds
        WHERE ds.user_id = (SELECT auth.uid()) AND ds.is_online = true
      )
    )
  );
