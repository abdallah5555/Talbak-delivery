drop policy if exists stores_owner_insert on public.stores;
create policy stores_owner_insert on public.stores
for insert to authenticated
with check (
  (owner_id = (select auth.uid()) and (select public.has_role('merchant'::public.app_role)))
  or (select public.has_role('admin'::public.app_role))
);

drop policy if exists stores_owner_update on public.stores;
create policy stores_owner_update on public.stores
for update to authenticated
using (
  (owner_id = (select auth.uid()) and (select public.has_role('merchant'::public.app_role)))
  or (select public.has_role('admin'::public.app_role))
)
with check (
  (owner_id = (select auth.uid()) and (select public.has_role('merchant'::public.app_role)))
  or (select public.has_role('admin'::public.app_role))
);

drop policy if exists stores_owner_delete on public.stores;
create policy stores_owner_delete on public.stores
for delete to authenticated
using (
  (owner_id = (select auth.uid()) and (select public.has_role('merchant'::public.app_role)))
  or (select public.has_role('admin'::public.app_role))
);

drop policy if exists menu_owner_insert on public.menu_items;
create policy menu_owner_insert on public.menu_items
for insert to authenticated
with check (
  ((select public.has_role('merchant'::public.app_role)) or (select public.has_role('admin'::public.app_role)))
  and exists (
    select 1 from public.stores s
    where s.id = menu_items.store_id
      and ((s.owner_id = (select auth.uid()) and (select public.has_role('merchant'::public.app_role)))
           or (select public.has_role('admin'::public.app_role)))
  )
);

drop policy if exists menu_owner_update on public.menu_items;
create policy menu_owner_update on public.menu_items
for update to authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = menu_items.store_id
      and ((s.owner_id = (select auth.uid()) and (select public.has_role('merchant'::public.app_role)))
           or (select public.has_role('admin'::public.app_role)))
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = menu_items.store_id
      and ((s.owner_id = (select auth.uid()) and (select public.has_role('merchant'::public.app_role)))
           or (select public.has_role('admin'::public.app_role)))
  )
);

drop policy if exists menu_owner_delete on public.menu_items;
create policy menu_owner_delete on public.menu_items
for delete to authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = menu_items.store_id
      and ((s.owner_id = (select auth.uid()) and (select public.has_role('merchant'::public.app_role)))
           or (select public.has_role('admin'::public.app_role)))
  )
);

drop policy if exists inventory_items_owner_all on public.inventory_items;
create policy inventory_items_owner_all on public.inventory_items
for all to authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = inventory_items.store_id
      and ((s.owner_id = (select auth.uid()) and (select public.has_role('merchant'::public.app_role)))
           or (select public.has_role('admin'::public.app_role)))
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = inventory_items.store_id
      and ((s.owner_id = (select auth.uid()) and (select public.has_role('merchant'::public.app_role)))
           or (select public.has_role('admin'::public.app_role)))
  )
);

drop policy if exists driver_status_self on public.driver_status;
create policy driver_status_self on public.driver_status
for all to authenticated
using (
  (user_id = (select auth.uid()) and (select public.has_role('driver'::public.app_role)))
  or (select public.has_role('admin'::public.app_role))
)
with check (
  (user_id = (select auth.uid()) and (select public.has_role('driver'::public.app_role)))
  or (select public.has_role('admin'::public.app_role))
);
