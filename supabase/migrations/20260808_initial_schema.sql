-- Initial Database Migration for "طلبك دليفري" (Talabak Delivery)
-- Platform: Supabase PostgreSQL
-- Features: RLS Security, Atomic Driver Order Assignment, Audit Logs, Complaints, Coupons

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'driver', 'merchant', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  vehicle_type TEXT,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  total_ratings INT DEFAULT 0,
  store_id UUID,
  pin_hash TEXT,
  last_pin_verified_at TIMESTAMPTZ DEFAULT NOW(),
  is_verified_customer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STORES TABLE
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  reviews_count INT DEFAULT 0,
  delivery_time TEXT DEFAULT '25 - 35 دقيقة',
  delivery_fee NUMERIC(10, 2) DEFAULT 15.0,
  min_order NUMERIC(10, 2) DEFAULT 0.0,
  image TEXT,
  banner TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_open BOOLEAN DEFAULT TRUE,
  distance TEXT DEFAULT '1.2 كم',
  address TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  image TEXT,
  category TEXT NOT NULL,
  is_popular BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id),
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0.0,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'preparing', 'driver_assigned', 'arrived_store', 'picked_up', 'arrived_customer', 'delivered', 'cancelled')),
  delivery_address JSONB NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'vodafone_cash', 'card')),
  payment_paid_online BOOLEAN DEFAULT FALSE,
  driver_id UUID REFERENCES public.users(id),
  driver_step TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DRIVER CAPACITIES & STATUS
CREATE TABLE IF NOT EXISTS public.driver_status (
  driver_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  current_active_orders INT DEFAULT 0,
  max_allowed_orders INT DEFAULT 2,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COUPONS TABLE (Admin Managed - Off at Checkout currently)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  usage_limit INT DEFAULT 100,
  used_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TRUSTED DEVICES TABLE
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  browser TEXT,
  platform TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ATOMIC RPC FUNCTION TO PREVENT RACE CONDITIONS ON DRIVER ORDER ACCEPTANCE
CREATE OR REPLACE FUNCTION accept_order_atomic(
  p_order_id UUID,
  p_driver_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_assigned UUID;
  v_driver_rating NUMERIC;
  v_max_orders INT;
  v_current_orders INT;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR (v_caller_id != p_driver_id AND NOT public.is_admin(v_caller_id)) THEN
    RETURN FALSE;
  END IF;

  -- Lock order row for update
  SELECT driver_id INTO v_assigned
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  -- Check if already assigned
  IF v_assigned IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- Check driver rating to calculate max orders capacity
  SELECT rating INTO v_driver_rating FROM public.users WHERE id = p_driver_id;
  IF v_driver_rating IS NULL OR v_driver_rating < 4.0 THEN
    v_max_orders := 2;
  ELSIF v_driver_rating < 4.5 THEN
    v_max_orders := 3;
  ELSIF v_driver_rating < 5.0 THEN
    v_max_orders := 4;
  ELSE
    v_max_orders := 5;
  END IF;

  -- Check driver active orders count
  SELECT COUNT(*) INTO v_current_orders
  FROM public.orders
  WHERE driver_id = p_driver_id AND status NOT IN ('delivered', 'cancelled');

  IF v_current_orders >= v_max_orders THEN
    RETURN FALSE;
  END IF;

  -- Atomic Assignment
  UPDATE public.orders
  SET driver_id = p_driver_id,
      status = 'driver_assigned',
      driver_step = 'accepted'
  WHERE id = p_order_id AND driver_id IS NULL;

  -- Update driver status capacity
  INSERT INTO public.driver_status (driver_id, is_online, current_active_orders, max_allowed_orders)
  VALUES (p_driver_id, TRUE, v_current_orders + 1, v_max_orders)
  ON CONFLICT (driver_id)
  DO UPDATE SET current_active_orders = public.driver_status.current_active_orders + 1;

  RETURN TRUE;
END;
$$;

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES (Secure RLS Configuration)
-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'admin' AND status = 'active'
  );
END;
$$;

-- 1. Stores & Menu Items: Publicly readable, write restricted to admin or merchant
CREATE POLICY "Public Stores Access" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Admin Stores Insert" ON public.stores FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND public.is_admin(auth.uid()));
CREATE POLICY "Admin Stores Update" ON public.stores FOR UPDATE USING (auth.role() = 'authenticated' AND public.is_admin(auth.uid()));

CREATE POLICY "Public Menu Items Access" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Admin Menu Items Insert" ON public.menu_items FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND public.is_admin(auth.uid()));
CREATE POLICY "Admin Menu Items Update" ON public.menu_items FOR UPDATE USING (auth.role() = 'authenticated' AND public.is_admin(auth.uid()));

-- 2. Users: Users view/update own profile or admin views all
CREATE POLICY "Users view own profile or admin view all" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert self profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id AND role = 'customer');

CREATE POLICY "Users update own profile or admin update" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- 3. Orders: Customers, Drivers, Merchants, Admins restricted access
CREATE POLICY "Orders Insert" ON public.orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Orders View Policy" ON public.orders
  FOR SELECT USING (
    auth.uid() = customer_id
    OR auth.uid() = driver_id
    OR driver_id IS NULL
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Orders Update Policy" ON public.orders
  FOR UPDATE USING (
    auth.uid() = customer_id
    OR auth.uid() = driver_id
    OR driver_id IS NULL
    OR public.is_admin(auth.uid())
  );

-- 4. Audit Logs & Complaints: Authenticated access
CREATE POLICY "Audit Logs View" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Audit Logs Insert" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Complaints View" ON public.complaints FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Complaints Insert" ON public.complaints FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Complaints Update" ON public.complaints FOR UPDATE USING (public.is_admin(auth.uid()));

