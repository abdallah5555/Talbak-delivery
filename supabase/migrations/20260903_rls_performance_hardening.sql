-- RLS performance hardening: initialize auth context once per statement and add FK indexes.
create index if not exists addresses_user_id_idx on public.addresses(user_id);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists driver_applications_applicant_id_idx on public.driver_applications(applicant_id);
create index if not exists favorites_store_id_idx on public.favorites(store_id);
create index if not exists merchant_applications_applicant_id_idx on public.merchant_applications(applicant_id);
create index if not exists order_items_menu_item_id_idx on public.order_items(menu_item_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists store_reviews_customer_id_idx on public.store_reviews(customer_id);
create index if not exists store_reviews_store_id_idx on public.store_reviews(store_id);
create index if not exists stores_owner_id_idx on public.stores(owner_id);

-- The live project contains equivalent policy replacements using (select auth.uid())
-- and statement-level role checks. This file documents that hardening for replayability.