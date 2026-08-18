-- Competitive free features: reviews, favorites, loyalty, full-text search, and re-order support.
-- All access is authenticated and ownership is enforced server-side/RLS.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.store_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, order_id, store_id)
);

ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_reviews_customer_select" ON public.store_reviews;
DROP POLICY IF EXISTS "store_reviews_customer_insert" ON public.store_reviews;
DROP POLICY IF EXISTS "store_reviews_admin_all" ON public.store_reviews;
CREATE POLICY "store_reviews_customer_select" ON public.store_reviews
  FOR SELECT TO authenticated
  USING (customer_id = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'
  ));
CREATE POLICY "store_reviews_customer_insert" ON public.store_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = (SELECT auth.uid())
        AND o.store_id = store_id AND o.status = 'delivered'
    )
  );
CREATE POLICY "store_reviews_admin_all" ON public.store_reviews
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'));

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((store_id IS NOT NULL) <> (menu_item_id IS NOT NULL)),
  UNIQUE (customer_id, store_id),
  UNIQUE (customer_id, menu_item_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "favorites_owner_all" ON public.favorites;
CREATE POLICY "favorites_owner_all" ON public.favorites
  FOR ALL TO authenticated USING (customer_id = (SELECT auth.uid())) WITH CHECK (customer_id = (SELECT auth.uid()));

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0);

CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_points integer;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_points := floor(GREATEST(COALESCE(NEW.total, 0), 0) / 10);
    IF v_points > 0 THEN
      UPDATE public.users SET loyalty_points = loyalty_points + v_points, updated_at = now()
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_award_loyalty_points ON public.orders;
CREATE TRIGGER trg_award_loyalty_points AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_points_on_delivery();
REVOKE ALL ON FUNCTION public.award_loyalty_points_on_delivery() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(address, '')), 'C')
) STORED;
CREATE INDEX IF NOT EXISTS stores_search_vector_gin_idx ON public.stores USING gin (search_vector);

CREATE OR REPLACE FUNCTION public.search_stores(p_query text)
RETURNS SETOF public.stores
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT s.*
  FROM public.stores s
  WHERE COALESCE(s.is_active, true)
    AND (
      nullif(trim(p_query), '') IS NULL
      OR s.search_vector @@ websearch_to_tsquery('simple', trim(p_query))
      OR s.name ILIKE '%' || trim(p_query) || '%'
    )
  ORDER BY ts_rank(s.search_vector, websearch_to_tsquery('simple', COALESCE(trim(p_query), ''))) DESC, s.is_featured DESC NULLS LAST, s.rating DESC NULLS LAST;
$$;
GRANT EXECUTE ON FUNCTION public.search_stores(text) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_reorder_items(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id AND customer_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_order.status <> 'delivered' THEN RAISE EXCEPTION 'ORDER_NOT_ELIGIBLE_FOR_REORDER'; END IF;
  RETURN COALESCE(v_order.items, '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.get_reorder_items(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reorder_items(uuid) TO authenticated;

COMMENT ON FUNCTION public.search_stores(text) IS 'Server-side store search using PostgreSQL full-text search and a GIN index.';
COMMENT ON FUNCTION public.get_reorder_items(uuid) IS 'Returns only the authenticated customer''s delivered order snapshot for client-side price revalidation before reorder.';
