CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.users u ON u.id = ur.user_id WHERE ur.user_id = $1 AND ur.role = 'admin' AND u.status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.is_driver(user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.users u ON u.id = ur.user_id WHERE ur.user_id = $1 AND ur.role = 'driver' AND u.status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.create_order_secure(p_items jsonb, p_delivery_address jsonb, p_payment_method text, p_payment_paid_online boolean DEFAULT false, p_coupon_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_customer_id uuid := auth.uid(); v_customer_name text; v_customer_phone text; v_delivery_address_payload jsonb := p_delivery_address; v_created_record record;
BEGIN
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Authentication required to create an order'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.users u ON u.id = ur.user_id WHERE ur.user_id = v_customer_id AND ur.role = 'customer' AND u.status = 'active') THEN RAISE EXCEPTION 'Only active customers can create orders'; END IF;
  v_customer_name := COALESCE(p_delivery_address->>'name', p_delivery_address->>'street', 'عميل');
  v_customer_phone := COALESCE(p_delivery_address->>'phone', '');
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN v_delivery_address_payload := v_delivery_address_payload || jsonb_build_object('coupon_code', TRIM(p_coupon_code)); END IF;
  IF p_payment_method NOT IN ('cash', 'vodafone_cash', 'card') THEN p_payment_method := 'cash'; END IF;
  INSERT INTO public.orders (customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, delivery_address, payment_method, payment_paid_online, created_at)
  VALUES (v_customer_id, v_customer_name, v_customer_phone, p_items, 0.00, 15.00, 0.00, 15.00, 'sent', v_delivery_address_payload, p_payment_method, COALESCE(p_payment_paid_online, false), NOW())
  RETURNING * INTO v_created_record;
  RETURN jsonb_build_object('success', true, 'order_id', v_created_record.id, 'subtotal', v_created_record.subtotal, 'delivery_fee', v_created_record.delivery_fee, 'discount', v_created_record.discount, 'total', v_created_record.total, 'status', v_created_record.status, 'created_at', v_created_record.created_at);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_driver_application(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_approve_merchant_application(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_user_role_to_roles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_driver_application(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_merchant_application(text, uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.users WHERE role IN ('customer','driver','merchant','admin') ON CONFLICT (user_id, role) DO NOTHING;
