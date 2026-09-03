-- Production order integrity hardening applied to Supabase project vriwhtuxagnbfxybjviz.
-- This source file documents the database-side protections used in production.
create or replace function public.prepare_order_item() returns trigger language plpgsql security definer set search_path=public as $$
declare v_item public.menu_items%rowtype; v_store uuid;
begin
  select * into v_item from public.menu_items where id=new.menu_item_id and is_available=true;
  if not found then raise exception 'Menu item unavailable'; end if;
  select store_id into v_store from public.orders where id=new.order_id;
  if v_store is null or v_item.store_id<>v_store then raise exception 'Invalid order item store'; end if;
  if new.quantity<1 or new.quantity>30 then raise exception 'Invalid quantity'; end if;
  new.name_snapshot:=v_item.name; new.unit_price:=v_item.price;
  return new;
end $$;
drop trigger if exists trg_prepare_order_item on public.order_items;
create trigger trg_prepare_order_item before insert or update on public.order_items for each row execute function public.prepare_order_item();

create or replace function public.recalc_order_totals() returns trigger language plpgsql security definer set search_path=public as $$
declare v_subtotal numeric(12,2); v_fee numeric(12,2); v_order_id uuid:=coalesce(new.order_id,old.order_id);
begin
  select coalesce(sum(line_total),0) into v_subtotal from public.order_items where order_id=v_order_id;
  select delivery_fee into v_fee from public.stores where id=(select store_id from public.orders where id=v_order_id);
  update public.orders set subtotal=v_subtotal,delivery_fee=coalesce(v_fee,0),total=v_subtotal+coalesce(v_fee,0),updated_at=now() where id=v_order_id;
  return coalesce(new,old);
end $$;
drop trigger if exists trg_recalc_order_totals on public.order_items;
create trigger trg_recalc_order_totals after insert or update or delete on public.order_items for each row execute function public.recalc_order_totals();

drop policy if exists orders_update on public.orders;
drop policy if exists order_items_customer_insert on public.order_items;
create policy order_items_customer_insert on public.order_items for insert to authenticated with check (exists(select 1 from public.orders o where o.id=order_items.order_id and o.customer_id=auth.uid() and o.status='pending'));
drop policy if exists order_items_customer_delete on public.order_items;
create policy order_items_customer_delete on public.order_items for delete to authenticated using (exists(select 1 from public.orders o where o.id=order_items.order_id and o.customer_id=auth.uid() and o.status='pending'));
