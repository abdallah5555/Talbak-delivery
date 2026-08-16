-- ============================================================================
-- MIGRATION: 20260817_partner_approval_rpc.sql
-- DESCRIPTION: Phase 5.3 Secure Server-Authoritative Merchant & Driver Approval RPCs,
--              Auth Identity Synchronization & Atomic Store-User Linking
-- ============================================================================

-- 1. Ensure Applications Tables Exist
CREATE TABLE IF NOT EXISTS public.merchant_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  custom_business_type TEXT,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  has_whatsapp BOOLEAN DEFAULT FALSE,
  city TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.driver_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  plate_number TEXT,
  no_license BOOLEAN DEFAULT FALSE,
  personal_photo_url TEXT,
  driver_license_url TEXT,
  vehicle_license_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  doc_status JSONB,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on applications tables
ALTER TABLE public.merchant_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- Applications RLS Policies
DROP POLICY IF EXISTS "Merchant Apps Public Insert" ON public.merchant_applications;
DROP POLICY IF EXISTS "Merchant Apps Admin All" ON public.merchant_applications;
DROP POLICY IF EXISTS "Driver Apps Public Insert" ON public.driver_applications;
DROP POLICY IF EXISTS "Driver Apps Admin All" ON public.driver_applications;

CREATE POLICY "Merchant Apps Public Insert" ON public.merchant_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Merchant Apps Admin All" ON public.merchant_applications
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Driver Apps Public Insert" ON public.driver_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Driver Apps Admin All" ON public.driver_applications
  FOR ALL USING (public.is_admin(auth.uid()));


-- 2. SECURE RPC: admin_approve_merchant_application
-- Verifies Admin privileges, creates real UUID store, links store_id to user profile,
-- creates starter menu item, prevents duplicate approval, and marks application approved.
CREATE OR REPLACE FUNCTION public.admin_approve_merchant_application(
  p_application_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_app RECORD;
  v_target_user_id UUID := p_user_id;
  v_store_id UUID;
  v_store_category TEXT;
  v_clean_phone TEXT;
BEGIN
  -- 2A. Verify Caller is an Active Admin
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only active administrators can approve merchant applications';
  END IF;

  -- 2B. Fetch and lock the application row
  SELECT * INTO v_app
  FROM public.merchant_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant application % not found', p_application_id;
  END IF;

  -- 2C. Duplicate Approval Protection
  IF v_app.status = 'approved' THEN
    RAISE EXCEPTION 'Merchant application % is already approved', p_application_id;
  END IF;

  -- 2D. Resolve user profile in public.users (must have valid Auth identity)
  IF v_target_user_id IS NULL THEN
    v_clean_phone := REGEXP_REPLACE(v_app.phone, '\D', '', 'g');
    SELECT id INTO v_target_user_id
    FROM public.users
    WHERE REGEXP_REPLACE(phone, '\D', '', 'g') = v_clean_phone
       OR REGEXP_REPLACE(phone, '\D', '', 'g') = RIGHT(v_clean_phone, 10)
    LIMIT 1;
  END IF;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user account found matching application phone (%). The user identity must be provisioned in Auth first.', v_app.phone;
  END IF;

  -- Verify user exists in public.users
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_target_user_id) THEN
    RAISE EXCEPTION 'User ID % does not exist in public.users', v_target_user_id;
  END IF;

  -- 2E. Determine Store Category
  IF v_app.business_type LIKE '%سوبر%' OR v_app.business_type LIKE '%بقالة%' THEN
    v_store_category := 'supermarket';
  ELSIF v_app.business_type LIKE '%صيدلية%' OR v_app.business_type LIKE '%دواء%' THEN
    v_store_category := 'pharmacy';
  ELSE
    v_store_category := 'restaurants';
  END IF;

  -- 2F. Atomically Create Store with genuine UUID
  v_store_id := gen_random_uuid();

  INSERT INTO public.stores (
    id,
    name,
    category,
    rating,
    reviews_count,
    delivery_time,
    delivery_fee,
    min_order,
    image,
    banner,
    is_featured,
    is_open,
    distance,
    address,
    tags,
    created_at
  ) VALUES (
    v_store_id,
    v_app.store_name,
    v_store_category,
    5.0,
    1,
    '20-30 دقيقة',
    15.00,
    30.00,
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    false,
    true,
    '1.2 كم',
    COALESCE(v_app.city, 'وسط البلد'),
    ARRAY[v_app.business_type, 'جديد', 'معتمد']::TEXT[],
    NOW()
  );

  -- 2G. Insert Starter Menu Item for the new store
  INSERT INTO public.menu_items (
    id,
    store_id,
    name,
    description,
    price,
    category,
    is_popular,
    image,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_store_id,
    'الوجبة الرئيسية للمتجر',
    'منتج مميز طازج متاح للطلب التلقائي',
    85.00,
    'الرئيسية',
    true,
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
    NOW()
  );

  -- 2H. Atomically Elevate and Link User Profile
  UPDATE public.users
  SET role = 'merchant',
      status = 'active',
      store_id = v_store_id,
      updated_at = NOW()
  WHERE id = v_target_user_id;

  -- 2I. Mark Application as Approved
  UPDATE public.merchant_applications
  SET status = 'approved',
      updated_at = NOW()
  WHERE id = p_application_id;

  -- 2J. Record Audit Log
  INSERT INTO public.audit_logs (
    actor_name,
    actor_role,
    action,
    target,
    details,
    created_at
  ) VALUES (
    'Admin',
    'admin',
    'APPROVE_MERCHANT',
    v_app.store_name,
    jsonb_build_object(
      'application_id', p_application_id,
      'user_id', v_target_user_id,
      'store_id', v_store_id
    )::TEXT,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'store_id', v_store_id,
    'user_id', v_target_user_id,
    'application_id', p_application_id
  );
END;
$$;


-- 3. SECURE RPC: admin_approve_driver_application
-- Verifies Admin privileges, elevates user profile to driver, initializes driver_status,
-- prevents duplicate approval, and marks application approved.
CREATE OR REPLACE FUNCTION public.admin_approve_driver_application(
  p_application_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_app RECORD;
  v_target_user_id UUID := p_user_id;
  v_clean_phone TEXT;
BEGIN
  -- 3A. Verify Caller is an Active Admin
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only active administrators can approve driver applications';
  END IF;

  -- 3B. Fetch and lock the application row
  SELECT * INTO v_app
  FROM public.driver_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver application % not found', p_application_id;
  END IF;

  -- 3C. Duplicate Approval Protection
  IF v_app.status = 'approved' THEN
    RAISE EXCEPTION 'Driver application % is already approved', p_application_id;
  END IF;

  -- 3D. Resolve user profile in public.users
  IF v_target_user_id IS NULL THEN
    v_clean_phone := REGEXP_REPLACE(v_app.phone, '\D', '', 'g');
    SELECT id INTO v_target_user_id
    FROM public.users
    WHERE REGEXP_REPLACE(phone, '\D', '', 'g') = v_clean_phone
       OR REGEXP_REPLACE(phone, '\D', '', 'g') = RIGHT(v_clean_phone, 10)
    LIMIT 1;
  END IF;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user account found matching application phone (%). The user identity must be provisioned in Auth first.', v_app.phone;
  END IF;

  -- Verify user exists in public.users
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_target_user_id) THEN
    RAISE EXCEPTION 'User ID % does not exist in public.users', v_target_user_id;
  END IF;

  -- 3E. Elevate User Profile to Driver
  UPDATE public.users
  SET role = 'driver',
      status = 'active',
      vehicle_type = COALESCE(v_app.vehicle_type, 'موتوسيكل'),
      updated_at = NOW()
  WHERE id = v_target_user_id;

  -- 3F. Initialize Driver Status with Capacity Defaults
  INSERT INTO public.driver_status (
    driver_id,
    is_online,
    current_active_orders,
    max_allowed_orders,
    last_seen
  ) VALUES (
    v_target_user_id,
    false,
    0,
    2,
    NOW()
  )
  ON CONFLICT (driver_id) DO UPDATE
  SET last_seen = NOW();

  -- 3G. Mark Application as Approved
  UPDATE public.driver_applications
  SET status = 'approved',
      updated_at = NOW()
  WHERE id = p_application_id;

  -- 3H. Record Audit Log
  INSERT INTO public.audit_logs (
    actor_name,
    actor_role,
    action,
    target,
    details,
    created_at
  ) VALUES (
    'Admin',
    'admin',
    'APPROVE_DRIVER',
    v_app.full_name,
    jsonb_build_object(
      'application_id', p_application_id,
      'user_id', v_target_user_id
    )::TEXT,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_target_user_id,
    'application_id', p_application_id
  );
END;
$$;
