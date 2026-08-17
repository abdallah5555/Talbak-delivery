-- Production security hardening
REVOKE EXECUTE ON FUNCTION public.accept_order_atomic(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_order_atomic(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_approve_driver_application(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_driver_application(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_approve_merchant_application(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_merchant_application(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_order_secure(jsonb, jsonb, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_secure(jsonb, jsonb, text, boolean, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.driver_update_order_step(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.driver_update_order_step(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_status(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_driver(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_driver(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.register_trusted_device(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_trusted_device(text, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_pin(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_user_pin(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_user_pin(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_capacity_decrement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_insert_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_admin_accounts() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coupons Admin All" ON public.coupons;
CREATE POLICY "Coupons Admin All" ON public.coupons FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Audit Logs Insert" ON public.audit_logs;
CREATE UNIQUE INDEX IF NOT EXISTS trusted_devices_user_device_unique ON public.trusted_devices(user_id, device_id);
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_driver_id_status_idx ON public.orders(driver_id, status);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);
