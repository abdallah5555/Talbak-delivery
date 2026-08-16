-- Migration: Push Subscriptions Table & RLS Policies for Web Push
-- Created: 2026-08-15
-- Target: Supabase PostgreSQL (Free Tier Compatible)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create public.push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  role TEXT DEFAULT 'customer',
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely ensure columns exist if table was already created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'user_id') THEN
    ALTER TABLE public.push_subscriptions ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'endpoint') THEN
    ALTER TABLE public.push_subscriptions ADD COLUMN endpoint TEXT NOT NULL UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'p256dh') THEN
    ALTER TABLE public.push_subscriptions ADD COLUMN p256dh TEXT NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'auth') THEN
    ALTER TABLE public.push_subscriptions ADD COLUMN auth TEXT NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'role') THEN
    ALTER TABLE public.push_subscriptions ADD COLUMN role TEXT DEFAULT 'customer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'user_agent') THEN
    ALTER TABLE public.push_subscriptions ADD COLUMN user_agent TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'updated_at') THEN
    ALTER TABLE public.push_subscriptions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- 2. Indexes for fast lookup by user_id and role
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_role ON public.push_subscriptions(role);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON public.push_subscriptions(endpoint);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;

-- 5. RLS Policies
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Users can update own push subscriptions"
ON public.push_subscriptions FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);
