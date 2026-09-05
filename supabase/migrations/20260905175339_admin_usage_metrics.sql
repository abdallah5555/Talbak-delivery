create or replace function public.admin_get_usage_metrics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_db_bytes bigint;
  v_storage_bytes bigint;
  v_storage_objects bigint;
  v_auth_users bigint;
  v_mau bigint;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Admin only';
  end if;
  select pg_database_size(current_database()) into v_db_bytes;
  select count(*) into v_storage_objects from storage.objects;
  select coalesce(sum(case when (metadata->>'size') ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end), 0) into v_storage_bytes from storage.objects;
  select count(*) into v_auth_users from auth.users;
  select count(*) into v_mau from auth.users where last_sign_in_at >= date_trunc('month', now());
  return jsonb_build_object('database_bytes',v_db_bytes,'storage_bytes',v_storage_bytes,'storage_objects',v_storage_objects,'auth_users',v_auth_users,'mau',v_mau,'measured_at',now());
end;
$$;
revoke all on function public.admin_get_usage_metrics() from public, anon, authenticated;
grant execute on function public.admin_get_usage_metrics() to authenticated;
