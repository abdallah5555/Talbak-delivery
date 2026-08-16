-- ============================================================================
-- MIGRATION: 20260816_secure_orders_pipeline.sql
-- DESCRIPTION: Phase 4.3 Server-Authoritative Pricing, Option Validation,
--              Single-Store Enforcement, Atomic Coupons & Hardened RLS
-- ============================================================================

-- Ensure menu_items table has option_groups column for authoritative option verification
ALTER TABLE public.menu_items 
  ADD COLUMN IF NOT EXISTS option_groups JSONB DEFAULT '[]'::JSONB;

-- 1. Helper function to check driver role
CREATE OR REPLACE FUNCTION public.is_driver(user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'driver' AND status = 'active'
  );
END;
$$;

-- 2. Comprehensive Server-Side Order Integrity & Recalculation Trigger
CREATE OR REPLACE FUNCTION public.handle_order_insert_integrity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  elem JSONB;
  opt_elem JSONB;
  v_item_id_str TEXT;
  v_quantity INT;
  v_opt_name TEXT;
  v_real_item_id UUID;
  v_real_item_price NUMERIC(10, 2);
  v_real_store_id UUID;
  v_item_option_groups JSONB;
  v_options_price NUMERIC(10, 2);
  v_opt_val NUMERIC(10, 2);
  v_line_total NUMERIC(10, 2);
  v_calc_subtotal NUMERIC(10, 2) := 0.00;
  v_calc_delivery_fee NUMERIC(10, 2) := 15.00;
  v_calc_discount NUMERIC(10, 2) := 0.00;
  v_calc_total NUMERIC(10, 2) := 0.00;
  v_primary_store_id UUID := NULL;
  v_coupon_code TEXT := NULL;
  v_coupon_type TEXT;
  v_coupon_val NUMERIC(10, 2);
  v_sanitized_items JSONB := '[]'::JSONB;
  v_sanitized_options JSONB;
  v_sanitized_item JSONB;
BEGIN
  -- 2A. Authenticated User Binding
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    NEW.customer_id := auth.uid();
  END IF;

  -- 2B. Reset driver assignment & lifecycle on initial creation (Admin exception)
  IF NOT public.is_admin(auth.uid()) THEN
    NEW.driver_id := NULL;
    NEW.driver_step := NULL;
  END IF;

  -- 2C. Force initial status to 'sent'
  NEW.status := 'sent';

  -- 2D. Validate presence of items array
  IF NEW.items IS NULL OR jsonb_typeof(NEW.items) <> 'array' OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'Order items array cannot be empty';
  END IF;

  -- 2E. Iterate through items and enforce Server-Authoritative pricing & store isolation
  FOR elem IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Extract ID & Quantity
    v_item_id_str := COALESCE(elem->'item'->>'id', elem->>'id');
    v_quantity := COALESCE((elem->>'quantity')::INT, (elem->>'qty')::INT, (elem->'item'->>'quantity')::INT, 1);

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity % for item %: Quantity must be greater than zero', v_quantity, v_item_id_str;
    END IF;

    IF v_item_id_str IS NULL OR TRIM(v_item_id_str) = '' THEN
      RAISE EXCEPTION 'Missing or invalid menu item identifier';
    END IF;

    -- Authoritative lookup from public.menu_items ONLY (NO CLIENT PRICE FALLBACK)
    v_real_item_id := NULL;
    v_real_item_price := NULL;
    v_real_store_id := NULL;
    v_item_option_groups := NULL;

    SELECT id, price, store_id, option_groups
    INTO v_real_item_id, v_real_item_price, v_real_store_id, v_item_option_groups
    FROM public.menu_items
    WHERE (
      (v_item_id_str ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND id = v_item_id_str::UUID)
      OR name = COALESCE(elem->'item'->>'name', elem->>'name')
    )
    LIMIT 1;

    -- STRICT ENFORCEMENT: Item MUST exist in public.menu_items
    IF v_real_item_price IS NULL OR v_real_item_id IS NULL THEN
      RAISE EXCEPTION 'Menu item not found in database: %', v_item_id_str;
    END IF;

    -- STRICT SINGLE-STORE ENFORCEMENT: All items must belong to the exact same store
    IF v_real_store_id IS NOT NULL THEN
      IF v_primary_store_id IS NULL THEN
        v_primary_store_id := v_real_store_id;
      ELSIF v_primary_store_id <> v_real_store_id THEN
        RAISE EXCEPTION 'Cross-store items are strictly forbidden in a single order (Store % vs Store %)', v_primary_store_id, v_real_store_id;
      END IF;
    END IF;

    -- STRICT OPTIONS VALIDATION: Authoritative pricing from menu_items.option_groups
    v_options_price := 0.00;
    v_sanitized_options := '[]'::JSONB;

    IF elem ? 'selectedOptions' AND jsonb_typeof(elem->'selectedOptions') = 'array' THEN
      FOR opt_elem IN SELECT * FROM jsonb_array_elements(elem->'selectedOptions')
      LOOP
        v_opt_name := COALESCE(opt_elem->>'optionName', opt_elem->>'name');
        IF v_opt_name IS NULL OR TRIM(v_opt_name) = '' THEN
          RAISE EXCEPTION 'Invalid option name in order item %', v_item_id_str;
        END IF;

        v_opt_val := NULL;

        -- Search option_groups inside public.menu_items
        IF v_item_option_groups IS NOT NULL AND jsonb_typeof(v_item_option_groups) = 'array' THEN
          SELECT (opt->>'price')::NUMERIC INTO v_opt_val
          FROM jsonb_array_elements(v_item_option_groups) grp,
               jsonb_array_elements(grp->'options') opt
          WHERE opt->>'name' = v_opt_name
          LIMIT 1;
        END IF;

        -- If option has not been defined in option_groups
        IF v_opt_val IS NULL THEN
          IF COALESCE((opt_elem->>'price')::NUMERIC, 0.00) > 0.00 THEN
            RAISE EXCEPTION 'Option "%" is not registered in menu item options for item %', v_opt_name, v_item_id_str;
          ELSE
            v_opt_val := 0.00;
          END IF;
        END IF;

        v_options_price := v_options_price + v_opt_val;
        v_sanitized_options := v_sanitized_options || jsonb_build_array(
          jsonb_build_object(
            'optionName', v_opt_name,
            'price', v_opt_val
          )
        );
      END LOOP;
    END IF;

    -- Authoritative Line Total & Subtotal
    v_line_total := (v_real_item_price + v_options_price) * v_quantity;
    v_calc_subtotal := v_calc_subtotal + v_line_total;

    -- Build sanitized item record
    v_sanitized_item := jsonb_build_object(
      'id', v_real_item_id,
      'name', COALESCE(elem->'item'->>'name', elem->>'name'),
      'storeId', v_real_store_id,
      'quantity', v_quantity,
      'price', v_real_item_price,
      'optionsPrice', v_options_price,
      'selectedOptions', v_sanitized_options,
      'lineTotal', v_line_total
    );
    v_sanitized_items := v_sanitized_items || jsonb_build_array(v_sanitized_item);
  END LOOP;

  -- 2F. Server-Authoritative Delivery Fee (From public.stores)
  IF v_primary_store_id IS NOT NULL THEN
    SELECT COALESCE(delivery_fee, 15.00) INTO v_calc_delivery_fee
    FROM public.stores
    WHERE id = v_primary_store_id;
  END IF;
  v_calc_delivery_fee := COALESCE(v_calc_delivery_fee, 15.00);

  -- 2G. Atomic Coupon Verification & Consumption
  v_calc_discount := 0.00;
  IF NEW.delivery_address ? 'coupon_code' THEN
    v_coupon_code := TRIM(NEW.delivery_address->>'coupon_code');
  END IF;

  IF v_coupon_code IS NOT NULL AND v_coupon_code <> '' THEN
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE UPPER(code) = UPPER(v_coupon_code)
      AND is_active = TRUE
      AND (usage_limit IS NULL OR used_count < usage_limit)
    RETURNING discount_type, discount_value INTO v_coupon_type, v_coupon_val;

    IF FOUND THEN
      IF v_coupon_type = 'percentage' THEN
        v_calc_discount := LEAST(v_calc_subtotal, (v_calc_subtotal * v_coupon_val / 100.00));
      ELSIF v_coupon_type = 'fixed' THEN
        v_calc_discount := LEAST(v_calc_subtotal, v_coupon_val);
      END IF;
    ELSE
      RAISE EXCEPTION 'Coupon code % is invalid, expired, or maximum usage limit reached', v_coupon_code;
    END IF;
  END IF;

  -- 2H. Authoritative Grand Total Calculation
  v_calc_total := GREATEST(0.00, (v_calc_subtotal + v_calc_delivery_fee - v_calc_discount));

  -- Assign authoritative sanitized values to NEW record
  NEW.items := v_sanitized_items;
  NEW.subtotal := v_calc_subtotal;
  NEW.delivery_fee := v_calc_delivery_fee;
  NEW.discount := v_calc_discount;
  NEW.total := v_calc_total;
  NEW.created_at := COALESCE(NEW.created_at, NOW());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_insert_integrity ON public.orders;
CREATE TRIGGER trg_order_insert_integrity
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_insert_integrity();


-- 3. Dedicated Server-Authoritative RPC: create_order_secure
CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_items JSONB,
  p_delivery_address JSONB,
  p_payment_method TEXT,
  p_payment_paid_online BOOLEAN DEFAULT FALSE,
  p_coupon_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_delivery_address_payload JSONB := p_delivery_address;
  v_created_record RECORD;
BEGIN
  -- Verify authenticated session
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create an order';
  END IF;

  -- Customer name & phone from delivery address payload
  v_customer_name := COALESCE(p_delivery_address->>'street', 'عميل');
  v_customer_phone := COALESCE(p_delivery_address->>'phone', '');

  -- Attach coupon code if present
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN
    v_delivery_address_payload := v_delivery_address_payload || jsonb_build_object('coupon_code', TRIM(p_coupon_code));
  END IF;

  -- Validate payment method
  IF p_payment_method NOT IN ('cash', 'vodafone_cash', 'card') THEN
    p_payment_method := 'cash';
  END IF;

  -- Insert order row (Trigger will authoritatively validate items, options, stores, delivery fee, coupons and compute total)
  INSERT INTO public.orders (
    customer_id,
    customer_name,
    customer_phone,
    items,
    subtotal,
    delivery_fee,
    discount,
    total,
    status,
    delivery_address,
    payment_method,
    payment_paid_online,
    created_at
  ) VALUES (
    v_customer_id,
    v_customer_name,
    v_customer_phone,
    p_items,
    0.00,
    15.00,
    0.00,
    15.00,
    'sent',
    v_delivery_address_payload,
    p_payment_method,
    COALESCE(p_payment_paid_online, false),
    NOW()
  )
  RETURNING * INTO v_created_record;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_created_record.id,
    'subtotal', v_created_record.subtotal,
    'delivery_fee', v_created_record.delivery_fee,
    'discount', v_created_record.discount,
    'total', v_created_record.total,
    'status', v_created_record.status,
    'created_at', v_created_record.created_at
  );
END;
$$;


-- 4. Hardened Row Level Security (RLS) on public.orders
DROP POLICY IF EXISTS "Orders Insert" ON public.orders;
DROP POLICY IF EXISTS "Orders View Policy" ON public.orders;
DROP POLICY IF EXISTS "Orders Update Policy" ON public.orders;

-- 4A. Orders Insert Policy:
CREATE POLICY "Orders Insert" ON public.orders
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      customer_id = auth.uid()
      OR public.is_admin(auth.uid())
    )
  );

-- 4B. Orders View Policy:
CREATE POLICY "Orders View Policy" ON public.orders
  FOR SELECT USING (
    auth.uid() = customer_id
    OR auth.uid() = driver_id
    OR (driver_id IS NULL AND (public.is_driver(auth.uid()) OR public.is_admin(auth.uid())))
    OR public.is_admin(auth.uid())
  );

-- 4C. Orders Update Policy:
CREATE POLICY "Orders Update Policy" ON public.orders
  FOR UPDATE USING (
    -- Customer can only cancel their own pending order
    (auth.uid() = customer_id AND status = 'sent')
    -- Driver can update their assigned order
    OR (auth.uid() = driver_id AND public.is_driver(auth.uid()))
    -- Admin has full update control
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    -- Customer can ONLY change status to 'cancelled'
    (
      auth.uid() = customer_id
      AND status = 'cancelled'
    )
    -- Driver can update assigned order
    OR (auth.uid() = driver_id AND public.is_driver(auth.uid()))
    -- Admin has full update control
    OR public.is_admin(auth.uid())
  );
