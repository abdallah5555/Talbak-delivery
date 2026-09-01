BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN user_id = auth.uid() THEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.users u ON u.id = ur.user_id
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND u.status = 'active'
    )
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles caller_role
      JOIN public.users caller_user ON caller_user.id = caller_role.user_id
      WHERE caller_role.user_id = auth.uid()
        AND caller_role.role = 'admin'
        AND caller_user.status = 'active'
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles target_role
      JOIN public.users target_user ON target_user.id = target_role.user_id
      WHERE target_role.user_id = user_id
        AND target_role.role = 'admin'
        AND target_user.status = 'active'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_driver(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN user_id = auth.uid() THEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.users u ON u.id = ur.user_id
      WHERE ur.user_id = auth.uid() AND ur.role = 'driver' AND u.status = 'active'
    )
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles caller_role
      JOIN public.users caller_user ON caller_user.id = caller_role.user_id
      WHERE caller_role.user_id = auth.uid()
        AND caller_role.role = 'admin'
        AND caller_user.status = 'active'
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles target_role
      JOIN public.users target_user ON target_user.id = target_role.user_id
      WHERE target_role.user_id = user_id
        AND target_role.role = 'driver'
        AND target_user.status = 'active'
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.protect_driver_status_integrity() FROM PUBLIC, anon, authenticated;

COMMIT;
