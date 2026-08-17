-- Multi-role driver authorization fix
-- A user can remain primarily a customer while also holding the driver role in user_roles.
-- Backend driver authorization must therefore use user_roles, not users.role.

CREATE OR REPLACE FUNCTION public.is_driver(user_id UUID)
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
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON u.id = ur.user_id
    WHERE ur.user_id = user_id
      AND ur.role = 'driver'
      AND u.status = 'active'
  );
END;
$$;

-- Keep the canonical multi-role grant for the already-approved driver account(s).
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'driver'
FROM public.users
WHERE role = 'driver'
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure every approved driver application has its driver role in the multi-role table.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'driver'
FROM public.driver_applications da
JOIN public.users u
  ON regexp_replace(u.phone, '\\D', '', 'g') = regexp_replace(da.phone, '\\D', '', 'g')
  OR regexp_replace(u.phone, '\\D', '', 'g') = right(regexp_replace(da.phone, '\\D', '', 'g'), 10)
WHERE da.status = 'approved'
ON CONFLICT (user_id, role) DO NOTHING;
