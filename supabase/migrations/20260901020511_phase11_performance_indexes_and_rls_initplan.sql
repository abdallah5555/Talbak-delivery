-- Phase 11: low-risk performance hardening.
-- Add indexes for foreign-key columns used by ownership/lookup queries.
CREATE INDEX IF NOT EXISTS idx_favorites_menu_item_id ON public.favorites(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_favorites_store_id ON public.favorites(store_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_order_id ON public.store_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_store_id ON public.store_reviews(store_id);

-- Avoid per-row init-plan evaluation of auth.uid() in these RLS policies.
DROP POLICY IF EXISTS "Audit Logs View" ON public.audit_logs;
CREATE POLICY "Audit Logs View" ON public.audit_logs
  FOR SELECT TO authenticated
  USING ((select public.is_admin((select auth.uid()))));

DROP POLICY IF EXISTS "Drivers can view own location" ON public.driver_locations;
CREATE POLICY "Drivers can view own location" ON public.driver_locations
  FOR SELECT TO authenticated
  USING ((driver_id = (select auth.uid())) OR (select public.is_admin((select auth.uid()))));
