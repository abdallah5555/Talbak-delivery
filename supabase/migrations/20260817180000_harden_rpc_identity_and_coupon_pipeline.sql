BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  JOIN public.users u ON u.id = ur.user_id
  WHERE ur.user_id = $1
    AND u.status = 'active'
    AND (ur.user_id = auth.uid() OR public.is_admin(auth.uid()))
  ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'merchant' THEN 2 WHEN 'driver' THEN 3 WHEN 'customer' THEN 4 ELSE 99 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_status(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_status text;
BEGIN
  IF user_id IS NULL THEN RETURN NULL; END IF;
  IF auth.uid() IS NULL OR (user_id <> auth.uid() AND NOT public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT status INTO v_status FROM public.users WHERE id = user_id;
  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_items jsonb,
  p_delivery_address jsonb,
  p_payment_method text,
  p_payment_paid_online boolean DEFAULT false,
  p_coupon_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
  v_delivery_address_payload jsonb := COALESCE(p_delivery_address, '{}'::jsonb);
BEGIN
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Authentication required to create an order'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.users u ON u.id = ur.user_id
    WHERE ur.user_id = v_customer_id AND ur.role = 'customer' AND u.status = 'active'
  ) THEN RAISE EXCEPTION 'Only active customers can create an order'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;

  v_customer_name := COALESCE(NULLIF(TRIM(v_delivery_address->>'name'), ''), 'عميل');
  v_customer_phone := COALESCE(TRIM(v_delivery_address->>'phone'), '');
  IF v_customer_phone = '' THEN RAISE EXCEPTION 'Customer phone is required'; END IF;
  IF p_payment_method NOT IN ('cash','vodafone_cash','card') THEN p_payment_method := 'cash'; END IF;

  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN
    v_delivery_address_payload := v_delivery_address_payload || jsonb_build_object('coupon_code', TRIM(p_coupon_code));
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_item_id := (v_item->'item'->>'id')::uuid;
      v_qty := GREATEST(1, LEAST(COALESCE((v_item->>'quantity')::integer, 1), 99));
    EXCEPTION WHEN others THEN RAISE EXCEPTION 'Invalid cart item'; END;

    SELECT mi.price, mi.store_id, mi.option_groups INTO v_server_price, v_store_item_store_id, v_option_groups
    FROM public.menu_items mi WHERE mi.id = v_item_id;
    IF v_server_price IS NULL OR v_store_item_store_id IS NULL THEN RAISE EXCEPTION 'One or more products are no longer available'; END IF;

    IF v_store_id IS NULL THEN v_store_id := v_store_item_store_id;
    ELSIF v_store_id <> v_store_item_store_id THEN RAISE EXCEPTION 'All products in one order must belong to the same store'; END IF;

    v_selected_price := 0;
    FOR v_selected IN SELECT value FROM jsonb_array_elements(COALESCE(v_item->'selectedOptions','[]'::jsonb))
    LOOP
      SELECT COALESCE((opt->>'price')::numeric, 0) INTO v_server_price
      FROM jsonb_array_elements(COALESCE(v_option_groups,'[]'::jsonb)) grp,
           jsonb_array_elements(COALESCE(grp->'options','[]'::jsonb)) opt
      WHERE grp->>'title' = v_selected->>'groupTitle' AND opt->>'name' = v_selected->>'optionName'
      LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'Invalid product option selected'; END IF;
      v_selected_price := v_selected_price + COALESCE(v_server_price,0);
    END LOOP;
    v_subtotal := v_subtotal + ((SELECT price FROM public.menu_items WHERE id = v_item_id) + v_selected_price) * v_qty;
  END LOOP;

  SELECT COALESCE(delivery_fee,15) INTO v_delivery_fee FROM public.stores WHERE id = v_store_id;
  v_discount := 0;
  v_total := GREATEST(0, v_subtotal + v_delivery_fee - v_discount);
  IF v_store_id IS NULL THEN RAISE EXCEPTION 'No store could be resolved from the cart'; END IF;

  INSERT INTO public.orders (
    customer_id, store_id, customer_name, customer_phone, items,
    subtotal, delivery_fee, discount, total, status, delivery_address,
    payment_method, payment_paid_online, created_at
  ) VALUES (
    v_customer_id, v_store_id, v_customer_name, v_customer_phone, p_items,
    v_subtotal, v_delivery_fee, v_discount, v_total, 'sent', v_delivery_address_payload,
    p_payment_method, COALESCE(p_payment_paid_online,false), NOW()
  ) RETURNING * INTO v_created;

  RETURN jsonb_build_object('success', true, 'order_id', v_created.id, 'store_id', v_created.store_id,
    'subtotal', v_created.subtotal, 'delivery_fee', v_created.delivery_fee, 'discount', v_created.discount,
    'total', v_created.total, 'status', v_created.status, 'created_at', v_created.created_at);
END;
$$;

COMMIT;
