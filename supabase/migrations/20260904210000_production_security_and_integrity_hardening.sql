-- Production hardening: remove pg_temp from SECURITY DEFINER search paths and enforce core data invariants.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f' AND p.prosecdef
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_price_nonnegative;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_price_nonnegative CHECK (price >= 0);

ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_delivery_fee_nonnegative;
ALTER TABLE public.stores ADD CONSTRAINT stores_delivery_fee_nonnegative CHECK (delivery_fee >= 0);
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_min_order_nonnegative;
ALTER TABLE public.stores ADD CONSTRAINT stores_min_order_nonnegative CHECK (min_order >= 0);
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_prep_minutes_valid;
ALTER TABLE public.stores ADD CONSTRAINT stores_prep_minutes_valid CHECK (prep_minutes BETWEEN 1 AND 240);

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_quantity_valid;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_valid CHECK (quantity BETWEEN 1 AND 30);
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_unit_price_nonnegative;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_unit_price_nonnegative CHECK (unit_price >= 0);
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_line_total_nonnegative;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_line_total_nonnegative CHECK (line_total IS NULL OR line_total >= 0);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_money_nonnegative;
ALTER TABLE public.orders ADD CONSTRAINT orders_money_nonnegative CHECK (subtotal >= 0 AND delivery_fee >= 0 AND total >= 0);

ALTER TABLE public.store_reviews DROP CONSTRAINT IF EXISTS store_reviews_rating_valid;
ALTER TABLE public.store_reviews ADD CONSTRAINT store_reviews_rating_valid CHECK (rating BETWEEN 1 AND 5);
CREATE UNIQUE INDEX IF NOT EXISTS store_reviews_order_unique ON public.store_reviews(order_id);

CREATE INDEX IF NOT EXISTS orders_customer_created_idx ON public.orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_driver_status_idx ON public.orders(driver_id, status);
CREATE INDEX IF NOT EXISTS orders_store_status_idx ON public.orders(store_id, status);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS menu_items_store_available_idx ON public.menu_items(store_id, is_available);
