BEGIN;

DROP TRIGGER IF EXISTS trg_sync_user_role_to_roles ON public.users;

DROP POLICY IF EXISTS "Users insert self profile" ON public.users;
CREATE POLICY "Users insert self profile" ON public.users FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id AND status = 'active');

DROP POLICY IF EXISTS "Users update own profile or admin update" ON public.users;
CREATE POLICY "Users update own profile or admin update" ON public.users FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id OR public.is_admin((SELECT auth.uid()))) WITH CHECK (public.is_admin((SELECT auth.uid())) OR ((SELECT auth.uid()) = id AND status = 'active'));

DROP POLICY IF EXISTS "Users view own profile or admin view all" ON public.users;
CREATE POLICY "Users view own profile or admin view all" ON public.users FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id OR public.is_admin((SELECT auth.uid())));

ALTER TABLE public.users DROP COLUMN IF EXISTS role;

DROP INDEX IF EXISTS public.orders_customer_id_idx;
DROP INDEX IF EXISTS public.idx_push_subs_user_id;
DROP INDEX IF EXISTS public.trusted_devices_user_device_unique;
CREATE INDEX IF NOT EXISTS idx_complaints_order_id ON public.complaints(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_store_id ON public.menu_items(store_id);

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users manage own religious schedule" ON public.religious_reminder_schedules;
CREATE POLICY "users manage own religious schedule" ON public.religious_reminder_schedules FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

COMMIT;
