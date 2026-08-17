ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);

CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_items jsonb,
  p_delivery_address jsonb,
  p_payment_method text,
  p_payment_paid_online boolean DEFAULT false,
  p_coupon_code text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_customer_name text;
  v_customer_phone text;
  v_store_id uuid := NULL;
  v_delivery_fee numeric := 15;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_item_id uuid;
  v_store_item_store_id uuid;
  v_qty integer;
  v_server_price numeric;
  v_option_groups jsonb;
  v_selected jsonb;
  v_selected_price numeric;
  v_created record;
BEGIN
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Authentication required to create an order'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.users u ON u.id = ur.user_id WHERE ur.user_id = v_customer_id AND ur.role = 'customer' AND u.status = 'active') THEN RAISE EXCEPTION 'Only active customers can create an order'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
  v_customer_name := COALESCE(NULLIF(TRIM(p_delivery_address->>'name'), ''), 'عميل');
  v_customer_phone := COALESCE(TRIM(p_delivery_address->>'phone'), '');
  IF v_customer_phone = '' THEN RAISE EXCEPTION 'Customer phone is required'; END IF;
  IF p_payment_method NOT IN ('cash','vodafone_cash','card') THEN p_payment_method := 'cash'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_item_id := (v_item->'item'->>'id')::uuid;
      v_qty := GREATEST(1, LEAST(COALESCE((v_item->>'quantity')::integer, 1), 99));
    EXCEPTION WHEN others THEN RAISE EXCEPTION 'Invalid cart item';
    END;
    SELECT mi.price, mi.store_id, mi.option_groups INTO v_server_price, v_store_item_store_id, v_option_groups FROM public.menu_items mi WHERE mi.id = v_item_id;
    IF v_server_price IS NULL OR v_store_item_store_id IS NULL THEN RAISE EXCEPTION 'One or more products are no longer available'; END IF;
    IF v_store_id IS NULL THEN v_store_id := v_store_item_store_id; ELSIF v_store_id <> v_store_item_store_id THEN RAISE EXCEPTION 'All products in one order must belong to the same store'; END IF;
    v_selected_price := 0;
    FOR v_selected IN SELECT value FROM jsonb_array_elements(COALESCE(v_item->'selectedOptions','[]'::jsonb))
    LOOP
      SELECT COALESCE((opt->>'price')::numeric, 0) INTO v_server_price
      FROM jsonb_array_elements(COALESCE(v_option_groups,'[]'::jsonb)) grp, jsonb_array_elements(COALESCE(grp->'options','[]'::jsonb)) opt
      WHERE grp->>'title' = v_selected->>'groupTitle' AND opt->>'name' = v_selected->>'optionName' LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'Invalid product option selected'; END IF;
      v_selected_price := v_selected_price + COALESCE(v_server_price,0);
    END LOOP;
    v_subtotal := v_subtotal + ((SELECT price FROM public.menu_items WHERE id = v_item_id) + v_selected_price) * v_qty;
  END LOOP;

  SELECT COALESCE(delivery_fee,15) INTO v_delivery_fee FROM public.stores WHERE id = v_store_id;
  v_discount := 0;
  v_total := GREATEST(0, v_subtotal + v_delivery_fee - v_discount);
  IF v_store_id IS NULL THEN RAISE EXCEPTION 'No store could be resolved from the cart'; END IF;

  INSERT INTO public.orders (customer_id, store_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, delivery_address, payment_method, payment_paid_online, created_at)
  VALUES (v_customer_id, v_store_id, v_customer_name, v_customer_phone, p_items, v_subtotal, v_delivery_fee, v_discount, v_total, 'sent', p_delivery_address, p_payment_method, COALESCE(p_payment_paid_online,false), NOW())
  RETURNING * INTO v_created;

  RETURN jsonb_build_object('success', true, 'order_id', v_created.id, 'store_id', v_created.store_id, 'subtotal', v_created.subtotal, 'delivery_fee', v_created.delivery_fee, 'discount', v_created.discount, 'total', v_created.total, 'status', v_created.status, 'created_at', v_created.created_at);
END; $$;

CREATE OR REPLACE FUNCTION public.merchant_update_order(p_order_id uuid, p_action text, p_rejection_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user_id uuid := auth.uid(); v_store_id uuid; v_order record; v_new_status text; v_message text; v_notification_id uuid := gen_random_uuid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_admin(v_user_id) AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=v_user_id AND role='merchant') THEN RAISE EXCEPTION 'Merchant authorization required'; END IF;
  SELECT store_id INTO v_store_id FROM public.users WHERE id=v_user_id AND status='active';
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT public.is_admin(v_user_id) AND (v_store_id IS NULL OR v_order.store_id IS DISTINCT FROM v_store_id) THEN RAISE EXCEPTION 'Order does not belong to your store'; END IF;
  IF p_action='accept' AND v_order.status='sent' THEN v_new_status := 'preparing'; v_message := 'التاجر قبل طلبك وبدأ تحضيره الآن 👨‍🍳';
  ELSIF p_action='reject' AND v_order.status='sent' THEN v_new_status := 'cancelled'; v_message := COALESCE(NULLIF(TRIM(p_rejection_reason),''),'التاجر اعتذر عن قبول الطلب حالياً.');
  ELSE RAISE EXCEPTION 'Invalid merchant action or order state'; END IF;
  UPDATE public.orders SET status=v_new_status, cancelled_by=CASE WHEN v_new_status='cancelled' THEN 'merchant' ELSE cancelled_by END, cancellation_reason=CASE WHEN v_new_status='cancelled' THEN NULLIF(TRIM(p_rejection_reason),'') ELSE cancellation_reason END, cancelled_at=CASE WHEN v_new_status='cancelled' THEN now() ELSE cancelled_at END WHERE id=p_order_id;
  IF v_order.customer_id IS NOT NULL THEN INSERT INTO public.notifications(id,user_id,title,message,type,is_read) VALUES(v_notification_id,v_order.customer_id,CASE WHEN v_new_status='preparing' THEN 'تم قبول طلبك 🍔' ELSE 'تحديث على طلبك' END,v_message,'order',false); END IF;
  RETURN jsonb_build_object('success',true,'order_id',p_order_id,'status',v_new_status,'notification_id',v_notification_id);
END; $$;

REVOKE ALL ON FUNCTION public.create_order_secure(jsonb,jsonb,text,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_secure(jsonb,jsonb,text,boolean,text) TO authenticated;
REVOKE ALL ON FUNCTION public.merchant_update_order(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_update_order(uuid,text,text) TO authenticated;
