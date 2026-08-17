-- Tighten SECURITY DEFINER RPC authorization at the database boundary.
REVOKE EXECUTE ON FUNCTION public.accept_order_atomic(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_driver_application(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_merchant_application(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_order_secure(jsonb, jsonb, text, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.driver_update_order_step(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_trusted_device(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_user_pin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_user_pin(text, text) FROM anon;

CREATE OR REPLACE FUNCTION public.accept_order_atomic(p_order_id uuid, p_driver_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_caller_id uuid := auth.uid(); v_assigned uuid; v_driver_rating numeric;
  v_max_orders int; v_current_orders int; v_online boolean;
BEGIN
  IF v_caller_id IS NULL THEN RETURN false; END IF;
  IF v_caller_id <> p_driver_id AND NOT public.is_admin(v_caller_id) THEN RETURN false; END IF;
  IF NOT public.is_driver(p_driver_id) AND NOT public.is_admin(v_caller_id) THEN RETURN false; END IF;
  SELECT COALESCE(is_online, false) INTO v_online FROM public.driver_status WHERE driver_id = p_driver_id;
  IF NOT public.is_admin(v_caller_id) AND NOT COALESCE(v_online, false) THEN RETURN false; END IF;
  SELECT driver_id INTO v_assigned FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_assigned IS NOT NULL THEN RETURN false; END IF;
  SELECT rating INTO v_driver_rating FROM public.users WHERE id = p_driver_id;
  IF v_driver_rating IS NULL OR v_driver_rating < 4.0 THEN v_max_orders := 2;
  ELSIF v_driver_rating < 4.5 THEN v_max_orders := 3;
  ELSIF v_driver_rating < 5.0 THEN v_max_orders := 4;
  ELSE v_max_orders := 5; END IF;
  SELECT COUNT(*) INTO v_current_orders FROM public.orders WHERE driver_id = p_driver_id AND status NOT IN ('delivered', 'cancelled');
  IF v_current_orders >= v_max_orders THEN RETURN false; END IF;
  UPDATE public.orders SET driver_id = p_driver_id, status = 'driver_assigned', driver_step = 'accepted' WHERE id = p_order_id AND driver_id IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.driver_status (driver_id, is_online, current_active_orders, max_allowed_orders)
  VALUES (p_driver_id, true, v_current_orders + 1, v_max_orders)
  ON CONFLICT (driver_id) DO UPDATE SET current_active_orders = public.driver_status.current_active_orders + 1, max_allowed_orders = EXCLUDED.max_allowed_orders;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.create_order_secure(p_items jsonb, p_delivery_address jsonb, p_payment_method text, p_payment_paid_online boolean DEFAULT false, p_coupon_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_customer_id uuid := auth.uid(); v_customer_name text; v_customer_phone text;
  v_delivery_address_payload jsonb := p_delivery_address; v_created_record record;
BEGIN
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Authentication required to create an order'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_customer_id AND role = 'customer' AND status = 'active') THEN RAISE EXCEPTION 'Only active customers can create orders'; END IF;
  v_customer_name := COALESCE(p_delivery_address->>'street', 'عميل');
  v_customer_phone := COALESCE(p_delivery_address->>'phone', '');
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN v_delivery_address_payload := v_delivery_address_payload || jsonb_build_object('coupon_code', TRIM(p_coupon_code)); END IF;
  IF p_payment_method NOT IN ('cash', 'vodafone_cash', 'card') THEN p_payment_method := 'cash'; END IF;
  INSERT INTO public.orders (customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, delivery_address, payment_method, payment_paid_online, created_at)
  VALUES (v_customer_id, v_customer_name, v_customer_phone, p_items, 0.00, 15.00, 0.00, 15.00, 'sent', v_delivery_address_payload, p_payment_method, COALESCE(p_payment_paid_online, false), NOW())
  RETURNING * INTO v_created_record;
  RETURN jsonb_build_object('success', true, 'order_id', v_created_record.id, 'subtotal', v_created_record.subtotal, 'delivery_fee', v_created_record.delivery_fee, 'discount', v_created_record.discount, 'total', v_created_record.total, 'status', v_created_record.status, 'created_at', v_created_record.created_at);
END; $$;

CREATE OR REPLACE FUNCTION public.driver_update_order_step(p_order_id uuid, p_next_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_caller_id uuid := auth.uid(); v_order record; v_new_driver_step text;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT id, driver_id, status INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order % not found', p_order_id; END IF;
  IF NOT public.is_admin(v_caller_id) AND (NOT public.is_driver(v_caller_id) OR v_order.driver_id IS NULL OR v_order.driver_id <> v_caller_id) THEN RAISE EXCEPTION 'Not authorized to update status for order %', p_order_id; END IF;
  IF p_next_status = 'arrived_store' THEN
    IF v_order.status <> 'driver_assigned' THEN RAISE EXCEPTION 'Invalid transition'; END IF; v_new_driver_step := 'at_store';
  ELSIF p_next_status = 'picked_up' THEN
    IF v_order.status <> 'arrived_store' THEN RAISE EXCEPTION 'Invalid transition'; END IF; v_new_driver_step := 'picked';
  ELSIF p_next_status = 'arrived_customer' THEN
    IF v_order.status <> 'picked_up' THEN RAISE EXCEPTION 'Invalid transition'; END IF; v_new_driver_step := 'at_customer';
  ELSIF p_next_status = 'delivered' THEN
    IF v_order.status <> 'arrived_customer' THEN RAISE EXCEPTION 'Invalid transition'; END IF; v_new_driver_step := 'completed';
  ELSE RAISE EXCEPTION 'Unsupported next status: %', p_next_status; END IF;
  UPDATE public.orders SET status = p_next_status, driver_step = v_new_driver_step WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', p_next_status, 'driver_step', v_new_driver_step);
END; $$;

GRANT EXECUTE ON FUNCTION public.accept_order_atomic(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_driver_application(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_merchant_application(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_secure(jsonb, jsonb, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_update_order_step(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_trusted_device(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_user_pin(text, text) TO authenticated;
