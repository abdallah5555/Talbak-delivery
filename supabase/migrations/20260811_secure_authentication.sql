-- Migration: Secure Authentication, Admin Role & PIN Security
-- Created: 2026-08-11

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ensure public.users table exists with correct schema
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'driver', 'merchant', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  rating NUMERIC DEFAULT 5.0,
  total_ratings INT DEFAULT 0,
  pin_hash TEXT,
  last_pin_verified_at TIMESTAMPTZ,
  is_verified_customer BOOLEAN DEFAULT false,
  vehicle_type TEXT,
  store_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safely add missing columns if table already existed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='pin_hash') THEN
    ALTER TABLE public.users ADD COLUMN pin_hash TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_pin_verified_at') THEN
    ALTER TABLE public.users ADD COLUMN last_pin_verified_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN
    ALTER TABLE public.users ADD COLUMN username TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='total_ratings') THEN
    ALTER TABLE public.users ADD COLUMN total_ratings INT DEFAULT 0;
  END IF;
  -- Drop legacy plain text password columns if present
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
    ALTER TABLE public.users DROP COLUMN password;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
    ALTER TABLE public.users DROP COLUMN password_hash;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='pin') THEN
    ALTER TABLE public.users DROP COLUMN pin;
  END IF;
END $$;

-- 2. Trusted Devices Table
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  browser TEXT,
  platform TEXT,
  last_seen TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- 3. Helper Functions for non-recursive RLS policy evaluation
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT role INTO v_role FROM public.users WHERE id = user_id;
  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_status(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT status INTO v_status FROM public.users WHERE id = user_id;
  RETURN v_status;
END;
$$;

-- 4. RLS Policies for public.users
DROP POLICY IF EXISTS "Public users viewable by authenticated users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
DROP POLICY IF EXISTS "Users view own profile or admin view all" ON public.users;
DROP POLICY IF EXISTS "Users update own profile or admin update" ON public.users;
DROP POLICY IF EXISTS "Users insert self profile" ON public.users;
DROP POLICY IF EXISTS "Admin delete users" ON public.users;

-- SELECT: Authenticated users can view ONLY their own profile, admins can view all
CREATE POLICY "Users view own profile or admin view all" 
ON public.users FOR SELECT 
TO authenticated 
USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- INSERT: Authenticated users can insert self profile with default role/status, or admin can insert
CREATE POLICY "Users insert self profile" 
ON public.users FOR INSERT 
TO authenticated 
WITH CHECK (
  ((auth.uid() = id) AND (role = 'customer') AND (status = 'active'))
  OR public.is_admin(auth.uid())
);

-- UPDATE: Users can update own profile (without changing role/status/id), or admin can update
CREATE POLICY "Users update own profile or admin update" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id OR public.is_admin(auth.uid())) 
WITH CHECK (
  public.is_admin(auth.uid()) 
  OR (
    (auth.uid() = id) 
    AND (role = public.get_user_role(auth.uid()))
    AND (status = public.get_user_status(auth.uid()))
  )
);

-- DELETE: Admin only
CREATE POLICY "Admin delete users" 
ON public.users FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 4. RLS Policies for trusted_devices
DROP POLICY IF EXISTS "Users can manage own devices" ON public.trusted_devices;

CREATE POLICY "Users can manage own devices" 
ON public.trusted_devices FOR ALL 
TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- 5. Helper RPC Functions
-- Verify PIN RPC
CREATE OR REPLACE FUNCTION public.verify_user_pin(p_pin text, p_hash text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stored_hash text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT pin_hash INTO v_stored_hash FROM public.users WHERE id = v_user_id;

  IF v_stored_hash IS NULL THEN
    RETURN false;
  END IF;

  -- If p_hash passed (client hashed using bcrypt), compare hash directly
  -- Otherwise, if stored_hash matches client hash, verify success
  IF p_hash IS NOT NULL AND v_stored_hash = p_hash THEN
    UPDATE public.users SET last_pin_verified_at = now() WHERE id = v_user_id;
    RETURN true;
  END IF;

  -- Fallback plain match if hash matches crypt(p_pin, v_stored_hash)
  IF v_stored_hash = crypt(p_pin, v_stored_hash) THEN
    UPDATE public.users SET last_pin_verified_at = now() WHERE id = v_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Set/Update PIN RPC
CREATE OR REPLACE FUNCTION public.set_user_pin(p_pin_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.users 
  SET pin_hash = p_pin_hash,
      last_pin_verified_at = now(),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

-- Register Trusted Device RPC
CREATE OR REPLACE FUNCTION public.register_trusted_device(
  p_device_id text,
  p_device_name text DEFAULT NULL,
  p_browser text DEFAULT NULL,
  p_platform text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR p_device_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.trusted_devices (user_id, device_id, device_name, browser, platform, last_seen)
  VALUES (v_user_id, p_device_id, p_device_name, p_browser, p_platform, now())
  ON CONFLICT (user_id, device_id) 
  DO UPDATE SET 
    last_seen = now(),
    device_name = COALESCE(EXCLUDED.device_name, trusted_devices.device_name),
    browser = COALESCE(EXCLUDED.browser, trusted_devices.browser),
    platform = COALESCE(EXCLUDED.platform, trusted_devices.platform),
    revoked_at = NULL;

  RETURN true;
END;
$$;

-- Seed Primary Admin User safely in Supabase Auth & public.users
DO $$
DECLARE
  v_admin_id uuid;
  v_phone text := '01501600192';
  v_email text := '01501600192@talabak.app';
BEGIN
  -- Check if admin exists in auth.users
  SELECT id INTO v_admin_id FROM auth.users WHERE email = v_email;
  
  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      role, aud, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt('88226464', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"مدير النظام (Admin)","phone":"01501600192"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      '', '', '', ''
    );
  END IF;

  -- Remove orphan users with same phone under a different ID
  DELETE FROM public.users WHERE phone = v_phone AND id != v_admin_id;

  -- Insert/Upsert into public.users
  INSERT INTO public.users (
    id, name, username, phone, role, status, pin_hash, last_pin_verified_at, created_at, updated_at
  ) VALUES (
    v_admin_id,
    'مدير النظام (Admin)',
    'admin_main',
    v_phone,
    'admin',
    'active',
    crypt('8822', gen_salt('bf')),
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    pin_hash = COALESCE(public.users.pin_hash, crypt('8822', gen_salt('bf')));

END $$;
