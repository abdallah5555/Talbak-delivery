-- Runtime hardening for the current phone-first, multi-role schema.
-- This migration is intentionally idempotent where practical.
alter table public.profiles add column if not exists is_active boolean not null default true;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.profiles(id,full_name,phone,is_active)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'مستخدم طلبك'),nullif(coalesce(new.phone,new.raw_user_meta_data->>'phone'),''),true)
  on conflict(id) do update set full_name=coalesce(nullif(excluded.full_name,''),public.profiles.full_name),phone=coalesce(excluded.phone,public.profiles.phone),is_active=true,updated_at=now();
  insert into public.user_roles(user_id,role) values(new.id,'customer') on conflict(user_id,role) do nothing;
  return new;
end $$;

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
select exists(select 1 from public.user_roles ur join public.profiles p on p.id=ur.user_id where ur.user_id=p_user_id and ur.role='admin' and p.is_active=true); $$;

create or replace function public.is_driver(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
select exists(select 1 from public.user_roles ur join public.profiles p on p.id=ur.user_id where ur.user_id=p_user_id and ur.role='driver' and p.is_active=true); $$;

create or replace function public.driver_accept_order(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.orders%rowtype; active_count int; online_now boolean;
begin
 if auth.uid() is null or not public.is_driver() then raise exception 'Driver authorization required'; end if;
 select coalesce(is_online,false) into online_now from public.driver_status where user_id=auth.uid();
 if not online_now then raise exception 'السائق لازم يكون أونلاين'; end if;
 select count(*) into active_count from public.orders where driver_id=auth.uid() and status in ('assigned','picked_up','on_the_way');
 if active_count>=5 then raise exception 'وصلت للحد الأقصى من الطلبات النشطة'; end if;
 update public.orders set driver_id=auth.uid(),status='assigned',updated_at=now() where id=p_order_id and status='ready' and driver_id is null returning * into v;
 if not found then raise exception 'Order no longer available'; end if;
 return v;
end $$;

create or replace function public.driver_update_order(p_order_id uuid,p_status public.order_status)
returns public.orders language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.orders%rowtype;
begin
 if auth.uid() is null or not public.is_driver() then raise exception 'Driver authorization required'; end if;
 update public.orders set status=p_status,updated_at=now() where id=p_order_id and driver_id=auth.uid() and ((status='assigned' and p_status='picked_up') or (status='picked_up' and p_status='on_the_way') or (status='on_the_way' and p_status='delivered')) returning * into v;
 if not found then raise exception 'Invalid driver transition or permission'; end if;
 return v;
end $$;

create or replace function public.update_driver_location(p_latitude double precision,p_longitude double precision,p_accuracy_meters double precision default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_driver() then raise exception 'Driver authorization required'; end if;
 if p_latitude is null or p_latitude not between -90 and 90 or p_longitude is null or p_longitude not between -180 and 180 then raise exception 'Invalid coordinates'; end if;
 insert into public.driver_status(user_id,is_online,latitude,longitude,updated_at) values(auth.uid(),true,p_latitude,p_longitude,now()) on conflict(user_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,is_online=true,updated_at=excluded.updated_at;
 return true;
end $$;

do $$ begin
 revoke all on function public.driver_accept_order(uuid) from public,anon,authenticated;
 revoke all on function public.driver_update_order(uuid,public.order_status) from public,anon,authenticated;
 revoke all on function public.update_driver_location(double precision,double precision,double precision) from public,anon,authenticated;
 grant execute on function public.driver_accept_order(uuid) to authenticated;
 grant execute on function public.driver_update_order(uuid,public.order_status) to authenticated;
 grant execute on function public.update_driver_location(double precision,double precision,double precision) to authenticated;
end $$;