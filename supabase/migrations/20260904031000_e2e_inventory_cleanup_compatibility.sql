-- Backward-compatible alias for the automated E2E fixture cleanup. The canonical column is item_id.
alter table public.inventory_movements
  add column if not exists inventory_item_id uuid generated always as (item_id) stored;

create index if not exists inventory_movements_inventory_item_id_idx
  on public.inventory_movements (inventory_item_id);
