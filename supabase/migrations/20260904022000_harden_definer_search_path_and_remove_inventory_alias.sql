-- Harden existing SECURITY DEFINER RPCs against search_path manipulation.
-- These functions intentionally remain callable by authenticated users because the
-- application invokes them through PostgREST; each function performs its own role
-- and ownership authorization checks.
alter function public.admin_create_coupon(text,text,numeric,integer,timestamptz,timestamptz,boolean) set search_path = '';
alter function public.admin_set_coupon_active(uuid,boolean) set search_path = '';
alter function public.auto_assign_nearest_driver(uuid) set search_path = '';
alter function public.create_order_secure(uuid,jsonb,text,text,text,text) set search_path = '';
alter function public.customer_cancel_order(uuid) set search_path = '';
alter function public.driver_accept_order(uuid) set search_path = '';
alter function public.driver_update_order(uuid,public.order_status) set search_path = '';
alter function public.merchant_adjust_inventory(uuid,numeric,text) set search_path = '';
alter function public.merchant_update_order(uuid,public.order_status,integer) set search_path = '';
alter function public.update_driver_location(double precision,double precision,double precision) set search_path = '';
alter function public.validate_coupon(text,numeric) set search_path = '';

-- Compatibility column was only needed while the E2E cleanup code used the old
-- inventory_item_id name. Cleanup now uses the canonical item_id column.
alter table public.inventory_movements drop column if exists inventory_item_id;
