create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.has_role('admin'::public.app_role);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
