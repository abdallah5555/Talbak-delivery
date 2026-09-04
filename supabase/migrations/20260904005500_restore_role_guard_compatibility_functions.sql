create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'::public.app_role
  );
$$;

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role = 'admin'::public.app_role
  );
$$;

create or replace function public.is_driver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'driver'::public.app_role
  );
$$;

create or replace function public.is_driver(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role = 'driver'::public.app_role
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin(uuid) from public;
revoke all on function public.is_driver() from public;
revoke all on function public.is_driver(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_driver() to authenticated;
