-- Phase 12: production RLS policy cleanup.
-- Keep public application intake available anonymously, while authenticated
-- business data uses explicit authenticated policies.

DROP POLICY IF EXISTS "Drivers cannot direct write location" ON public.driver_locations;

DROP POLICY IF EXISTS "Driver Status Delete Policy" ON public.driver_status;
DROP POLICY IF EXISTS "Driver Status Insert Policy" ON public.driver_status;
DROP POLICY IF EXISTS "Driver Status View Policy" ON public.driver_status;
DROP POLICY IF EXISTS "Driver Status Update Policy" ON public.driver_status;

CREATE POLICY "Driver Status Admin Delete"
  ON public.driver_status FOR DELETE TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "Driver Status Own Insert"
  ON public.driver_status FOR INSERT TO authenticated
  WITH CHECK (((SELECT auth.uid()) = driver_id AND public.is_driver((SELECT auth.uid()))) OR public.is_admin((SELECT auth.uid())));

CREATE POLICY "Driver Status Own Select"
  ON public.driver_status FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = driver_id OR public.is_admin((SELECT auth.uid())));

CREATE POLICY "Driver Status Own Update"
  ON public.driver_status FOR UPDATE TO authenticated
  USING (((SELECT auth.uid()) = driver_id AND public.is_driver((SELECT auth.uid()))) OR public.is_admin((SELECT auth.uid())))
  WITH CHECK (((SELECT auth.uid()) = driver_id AND public.is_driver((SELECT auth.uid()))) OR public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Complaints Insert" ON public.complaints;
DROP POLICY IF EXISTS "Complaints View" ON public.complaints;
DROP POLICY IF EXISTS "Complaints Update" ON public.complaints;

CREATE POLICY "Complaints Authenticated Insert"
  ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin((SELECT auth.uid())) OR
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Complaints Admin View"
  ON public.complaints FOR SELECT TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "Complaints Admin Update"
  ON public.complaints FOR UPDATE TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Orders View Policy" ON public.orders;
DROP POLICY IF EXISTS "Orders Update Policy" ON public.orders;

CREATE POLICY "Orders Authenticated View"
  ON public.orders FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = customer_id OR
    (SELECT auth.uid()) = driver_id OR
    (driver_id IS NULL AND public.is_driver((SELECT auth.uid()))) OR
    public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "Orders Authenticated Update"
  ON public.orders FOR UPDATE TO authenticated
  USING (((SELECT auth.uid()) = customer_id AND status = 'sent') OR public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())) OR ((SELECT auth.uid()) = customer_id AND status = 'cancelled'));

DROP POLICY IF EXISTS "Admin Menu Items Insert" ON public.menu_items;
DROP POLICY IF EXISTS "Admin Menu Items Update" ON public.menu_items;

CREATE POLICY "Admin Menu Items Insert"
  ON public.menu_items FOR INSERT TO authenticated
  WITH CHECK (public.is_admin((SELECT auth.uid())));

CREATE POLICY "Admin Menu Items Update"
  ON public.menu_items FOR UPDATE TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admin Stores Insert" ON public.stores;
DROP POLICY IF EXISTS "Admin Stores Update" ON public.stores;

CREATE POLICY "Admin Stores Insert"
  ON public.stores FOR INSERT TO authenticated
  WITH CHECK (public.is_admin((SELECT auth.uid())));

CREATE POLICY "Admin Stores Update"
  ON public.stores FOR UPDATE TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "store_reviews_customer_insert" ON public.store_reviews;

CREATE POLICY "store_reviews_customer_insert"
  ON public.store_reviews FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = store_reviews.order_id
        AND o.customer_id = (SELECT auth.uid())
        AND o.store_id = store_reviews.store_id
        AND o.status = 'delivered'
    )
  );

DROP POLICY IF EXISTS "Driver Apps Public Insert" ON public.driver_applications;
CREATE POLICY "Driver Apps Public Insert"
  ON public.driver_applications FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending' AND rejection_reason IS NULL AND
    full_name IS NOT NULL AND length(trim(full_name)) BETWEEN 2 AND 120 AND
    phone IS NOT NULL AND length(regexp_replace(phone, '\\D', '', 'g')) BETWEEN 10 AND 15 AND
    vehicle_type IS NOT NULL AND length(trim(vehicle_type)) BETWEEN 2 AND 80
  );

DROP POLICY IF EXISTS "Merchant Apps Public Insert" ON public.merchant_applications;
CREATE POLICY "Merchant Apps Public Insert"
  ON public.merchant_applications FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending' AND rejection_reason IS NULL AND
    store_name IS NOT NULL AND length(trim(store_name)) BETWEEN 2 AND 160 AND
    business_type IS NOT NULL AND length(trim(business_type)) BETWEEN 2 AND 100 AND
    owner_name IS NOT NULL AND length(trim(owner_name)) BETWEEN 2 AND 120 AND
    phone IS NOT NULL AND length(regexp_replace(phone, '\\D', '', 'g')) BETWEEN 10 AND 15
  );
