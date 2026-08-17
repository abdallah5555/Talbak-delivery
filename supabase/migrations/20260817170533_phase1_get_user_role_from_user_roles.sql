CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT ur.role FROM public.user_roles ur JOIN public.users u ON u.id = ur.user_id
  WHERE ur.user_id = $1 AND u.status = 'active'
  ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'merchant' THEN 2 WHEN 'driver' THEN 3 WHEN 'customer' THEN 4 ELSE 99 END
  LIMIT 1;
$$;
