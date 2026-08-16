-- Migration: 20260815_admin_create_user.sql
-- Description: Security helpers and admin protection triggers for public.users.
-- User creation is handled securely by the Supabase Edge Function (admin-create-user)
-- using the server-side Supabase Admin API. No direct SQL inserts into auth.users.

-- 1. Helper function to check if a user is an active admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
      AND role = 'admin'
      AND status = 'active'
  );
$$;

-- 2. Trigger function to prevent non-admins from downgrading or modifying admin accounts
CREATE OR REPLACE FUNCTION public.protect_admin_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If the existing row is an admin, ensure only an active admin can modify its role/status
  IF OLD.role = 'admin' AND (NEW.role <> 'admin' OR NEW.status <> OLD.status) THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Cannot demote or deactivate an admin account without admin privileges';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Bind trigger to public.users table
DROP TRIGGER IF EXISTS trg_protect_admin_accounts ON public.users;
CREATE TRIGGER trg_protect_admin_accounts
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_accounts();

-- 4. Grant execute only to authenticated users (never anonymous)
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
