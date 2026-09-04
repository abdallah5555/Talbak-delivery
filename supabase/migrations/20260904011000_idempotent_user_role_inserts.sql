-- Keep role assignment idempotent for application and E2E retries.
create or replace function public.ignore_duplicate_user_role()
returns trigger
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
begin
  if exists (
    select 1
    from public.user_roles ur
    where ur.user_id = new.user_id
      and ur.role = new.role
  ) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists user_roles_ignore_duplicate_insert on public.user_roles;
create trigger user_roles_ignore_duplicate_insert
before insert on public.user_roles
for each row execute function public.ignore_duplicate_user_role();
