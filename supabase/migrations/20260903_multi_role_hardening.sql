-- Multi-role hardening for Talbak Delivery.
-- A user has one identity/phone but may hold customer, merchant, driver and/or admin roles.

create unique index if not exists profiles_phone_unique_idx
on public.profiles (phone)
where phone is not null and btrim(phone) <> '';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  insert into public.profiles(id,full_name,phone)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name','مستخدم طلبك'),nullif(new.raw_user_meta_data->>'phone',''))
  on conflict(id) do update set
    full_name=coalesce(nullif(excluded.full_name,''),public.profiles.full_name),
    phone=coalesce(excluded.phone,public.profiles.phone),
    updated_at=now();

  insert into public.user_roles(user_id,role)
  values(new.id,'customer')
  on conflict(user_id,role) do nothing;
  return new;
end $$;

create or replace function public.admin_set_merchant_application(p_id uuid, p_status text)
returns public.merchant_applications
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v public.merchant_applications%rowtype;
begin
  if not public.has_role('admin') then raise exception 'Admin only'; end if;
  if p_status not in ('approved','rejected','pending') then raise exception 'Invalid status'; end if;
  update public.merchant_applications set status=p_status where id=p_id returning * into v;
  if not found then raise exception 'Application not found'; end if;
  if p_status='approved' then
    insert into public.user_roles(user_id,role) values(v.applicant_id,'merchant') on conflict(user_id,role) do nothing;
    insert into public.stores(owner_id,name,category,address,phone,description,is_open,prep_minutes,delivery_fee,min_order,rating)
    values(v.applicant_id,v.business_name,coalesce(nullif(v.category,''),'مطاعم'),coalesce(v.address,''),v.phone,'متجر جديد على طلبك',true,25,15,0,5)
    on conflict do nothing;
  end if;
  return v;
end $$;

create or replace function public.admin_set_driver_application(p_id uuid, p_status text)
returns public.driver_applications
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v public.driver_applications%rowtype;
begin
  if not public.has_role('admin') then raise exception 'Admin only'; end if;
  if p_status not in ('approved','rejected','pending') then raise exception 'Invalid status'; end if;
  update public.driver_applications set status=p_status where id=p_id returning * into v;
  if not found then raise exception 'Application not found'; end if;
  if p_status='approved' then
    insert into public.user_roles(user_id,role) values(v.applicant_id,'driver') on conflict(user_id,role) do nothing;
    insert into public.driver_status(user_id,is_online) values(v.applicant_id,false) on conflict(user_id) do nothing;
  end if;
  return v;
end $$;

revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.admin_set_merchant_application(uuid,text) from public,anon,authenticated;
revoke all on function public.admin_set_driver_application(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_set_merchant_application(uuid,text) to authenticated;
grant execute on function public.admin_set_driver_application(uuid,text) to authenticated;
