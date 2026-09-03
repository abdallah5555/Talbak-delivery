-- Admin control center: users, roles, account state, stores, menu, orders and notifications.
create or replace function public.admin_list_users()
returns table(user_id uuid,full_name text,phone text,is_active boolean,roles text,is_online boolean,latitude double precision,longitude double precision)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 return query select p.id,p.full_name,p.phone,p.is_active,coalesce(string_agg(ur.role::text,',' order by ur.role::text),''),coalesce(ds.is_online,false),ds.latitude,ds.longitude from public.profiles p left join public.user_roles ur on ur.user_id=p.id left join public.driver_status ds on ds.user_id=p.id group by p.id,p.full_name,p.phone,p.is_active,ds.is_online,ds.latitude,ds.longitude order by p.created_at desc;
end $$;

create or replace function public.admin_set_role(p_user_id uuid,p_role public.app_role,p_enabled boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare n int;
begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'User not found'; end if;
 if p_enabled then insert into public.user_roles(user_id,role) values(p_user_id,p_role) on conflict(user_id,role) do nothing; if p_role='driver' then insert into public.driver_status(user_id,is_online) values(p_user_id,false) on conflict(user_id) do nothing; end if;
 else if p_role='admin' and p_user_id=auth.uid() then raise exception 'لا يمكن إزالة دور الإدارة من الحساب الحالي'; end if; if p_role='admin' then select count(*) into n from public.user_roles ur join public.profiles p on p.id=ur.user_id where ur.role='admin' and p.is_active=true; if n<=1 then raise exception 'يجب أن يظل هناك مدير نشط واحد على الأقل'; end if; end if; delete from public.user_roles where user_id=p_user_id and role=p_role; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),case when p_enabled then 'role_enabled' else 'role_disabled' end,'user',p_user_id,jsonb_build_object('role',p_role::text)); return true;
end $$;

create or replace function public.admin_set_user_active(p_user_id uuid,p_active boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Admin only'; end if; if p_user_id=auth.uid() and not p_active then raise exception 'لا يمكن تعطيل حساب الإدارة الحالي'; end if; update public.profiles set is_active=p_active,updated_at=now() where id=p_user_id; if not found then raise exception 'User not found'; end if; if not p_active then update public.driver_status set is_online=false,updated_at=now() where user_id=p_user_id; end if; insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),case when p_active then 'user_activated' else 'user_deactivated' end,'user',p_user_id,'{}'); return true;
end $$;

create or replace function public.admin_set_store(p_store_id uuid,p_name text,p_category text,p_address text,p_delivery_fee numeric,p_min_order numeric,p_prep_minutes integer,p_is_open boolean)
returns public.stores language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.stores%rowtype;
begin
 if not public.is_admin() then raise exception 'Admin only'; end if; update public.stores set name=trim(p_name),category=trim(p_category),address=trim(p_address),delivery_fee=greatest(0,coalesce(p_delivery_fee,0)),min_order=greatest(0,coalesce(p_min_order,0)),prep_minutes=greatest(1,least(coalesce(p_prep_minutes,25),240)),is_open=coalesce(p_is_open,true),updated_at=now() where id=p_store_id returning * into v; if not found then raise exception 'Store not found'; end if; insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'store_updated','store',p_store_id,jsonb_build_object('name',v.name,'is_open',v.is_open)); return v;
end $$;

create or replace function public.admin_add_menu_item(p_store_id uuid,p_name text,p_description text,p_price numeric,p_category text)
returns public.menu_items language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.menu_items%rowtype;
begin if not public.is_admin() then raise exception 'Admin only'; end if; if trim(coalesce(p_name,''))='' then raise exception 'اسم الصنف مطلوب'; end if; insert into public.menu_items(store_id,name,description,price,category,is_available) values(p_store_id,trim(p_name),coalesce(trim(p_description),''),greatest(0,coalesce(p_price,0)),coalesce(nullif(trim(p_category),''),'أصناف'),true) returning * into v; insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'menu_item_created','menu_item',v.id,jsonb_build_object('store_id',p_store_id)); return v; end $$;

create or replace function public.admin_set_menu_item(p_item_id uuid,p_name text,p_description text,p_price numeric,p_category text,p_is_available boolean)
returns public.menu_items language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.menu_items%rowtype;
begin if not public.is_admin() then raise exception 'Admin only'; end if; update public.menu_items set name=trim(p_name),description=coalesce(trim(p_description),''),price=greatest(0,coalesce(p_price,0)),category=coalesce(nullif(trim(p_category),''),'أصناف'),is_available=coalesce(p_is_available,true),updated_at=now() where id=p_item_id returning * into v; if not found then raise exception 'Menu item not found'; end if; return v; end $$;

create or replace function public.admin_set_order(p_order_id uuid,p_status public.order_status,p_driver_id uuid default null)
returns public.orders language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.orders%rowtype;
begin if not public.is_admin() then raise exception 'Admin only'; end if; if p_driver_id is not null and not exists(select 1 from public.user_roles ur join public.profiles p on p.id=ur.user_id where ur.user_id=p_driver_id and ur.role='driver' and p.is_active=true) then raise exception 'Invalid active driver'; end if; update public.orders set status=p_status,driver_id=p_driver_id,updated_at=now() where id=p_order_id returning * into v; if not found then raise exception 'Order not found'; end if; insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'order_admin_update','order',p_order_id,jsonb_build_object('status',p_status::text,'driver_id',p_driver_id)); return v; end $$;

create or replace function public.admin_send_notification(p_user_id uuid,p_title text,p_body text,p_kind text default 'info')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin if not public.is_admin() then raise exception 'Admin only'; end if; if p_user_id is not null then if not exists(select 1 from public.profiles where id=p_user_id and is_active=true) then raise exception 'User not found or inactive'; end if; insert into public.notifications(user_id,title,body,kind,is_read) values(p_user_id,trim(p_title),trim(p_body),coalesce(nullif(trim(p_kind),''),'info'),false) returning id into v_id; else insert into public.notifications(user_id,title,body,kind,is_read) select id,trim(p_title),trim(p_body),coalesce(nullif(trim(p_kind),''),'info'),false from public.profiles where is_active=true limit 5000; v_id=gen_random_uuid(); end if; insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'notification_sent','notification',v_id,jsonb_build_object('target_user',p_user_id)); return v_id; end $$;