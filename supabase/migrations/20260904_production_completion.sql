-- Talbak Delivery production completion record.
-- This migration records the production hardening applied on 2026-09-04.
-- It assumes the core Talbak schema and earlier migrations already exist.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_total_matches_parts;
ALTER TABLE public.orders ADD CONSTRAINT orders_total_matches_parts CHECK (total = subtotal + delivery_fee);
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_line_total_matches;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_line_total_matches CHECK (line_total IS NULL OR line_total = unit_price * quantity);

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_driver(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;

DROP POLICY IF EXISTS orders_read ON public.orders;
CREATE POLICY orders_read ON public.orders FOR SELECT TO authenticated USING (
  customer_id = (SELECT auth.uid())
  OR driver_id = (SELECT auth.uid())
  OR (SELECT has_role('admin'::public.app_role))
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.owner_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS order_items_read ON public.order_items;
CREATE POLICY order_items_read ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.customer_id = (SELECT auth.uid())
        OR o.driver_id = (SELECT auth.uid())
        OR (SELECT has_role('admin'::public.app_role))
        OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id=o.store_id AND s.owner_id=(SELECT auth.uid()))
      )
  )
);

DROP POLICY IF EXISTS driver_apps_self ON public.driver_applications;
CREATE POLICY driver_apps_read ON public.driver_applications FOR SELECT TO authenticated USING (applicant_id=(SELECT auth.uid()) OR (SELECT has_role('admin'::public.app_role)));
CREATE POLICY driver_apps_insert ON public.driver_applications FOR INSERT TO authenticated WITH CHECK (applicant_id=(SELECT auth.uid()) AND status='pending');
CREATE POLICY driver_apps_admin_manage ON public.driver_applications FOR UPDATE TO authenticated USING ((SELECT has_role('admin'::public.app_role))) WITH CHECK ((SELECT has_role('admin'::public.app_role)));

DROP POLICY IF EXISTS merchant_apps_self ON public.merchant_applications;
CREATE POLICY merchant_apps_read ON public.merchant_applications FOR SELECT TO authenticated USING (applicant_id=(SELECT auth.uid()) OR (SELECT has_role('admin'::public.app_role)));
CREATE POLICY merchant_apps_insert ON public.merchant_applications FOR INSERT TO authenticated WITH CHECK (applicant_id=(SELECT auth.uid()) AND status='pending');
CREATE POLICY merchant_apps_admin_manage ON public.merchant_applications FOR UPDATE TO authenticated USING ((SELECT has_role('admin'::public.app_role))) WITH CHECK ((SELECT has_role('admin'::public.app_role)));

DROP POLICY IF EXISTS reviews_insert ON public.store_reviews;
CREATE POLICY reviews_insert ON public.store_reviews FOR INSERT TO authenticated WITH CHECK (
  customer_id=(SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id=store_reviews.order_id AND o.customer_id=(SELECT auth.uid())
      AND o.store_id=store_reviews.store_id AND o.status='delivered'
  )
);

DROP POLICY IF EXISTS orders_insert ON public.orders;
CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated WITH CHECK (
  customer_id=(SELECT auth.uid()) AND (SELECT has_role('customer'::public.app_role))
);

ALTER FUNCTION public.admin_add_menu_item(uuid,text,text,numeric,text) SECURITY INVOKER;
ALTER FUNCTION public.admin_list_users() SECURITY INVOKER;
ALTER FUNCTION public.admin_send_notification(uuid,text,text,text) SECURITY INVOKER;
ALTER FUNCTION public.admin_set_driver_application(uuid,text) SECURITY INVOKER;
ALTER FUNCTION public.admin_set_menu_item(uuid,text,text,numeric,text,boolean) SECURITY INVOKER;
ALTER FUNCTION public.admin_set_merchant_application(uuid,text) SECURITY INVOKER;
ALTER FUNCTION public.admin_set_order(uuid,public.order_status,uuid) SECURITY INVOKER;
ALTER FUNCTION public.admin_set_role(uuid,public.app_role,boolean) SECURITY INVOKER;
ALTER FUNCTION public.admin_set_store(uuid,text,text,text,numeric,numeric,integer,boolean) SECURITY INVOKER;
ALTER FUNCTION public.admin_set_user_active(uuid,boolean) SECURITY INVOKER;

DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
CREATE POLICY profiles_admin_select ON public.profiles FOR SELECT TO authenticated USING ((SELECT has_role('admin'::public.app_role)) OR id=(SELECT auth.uid()));
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE TO authenticated USING ((SELECT has_role('admin'::public.app_role)) OR id=(SELECT auth.uid())) WITH CHECK ((SELECT has_role('admin'::public.app_role)) OR id=(SELECT auth.uid()));
DROP POLICY IF EXISTS roles_admin_manage ON public.user_roles;
CREATE POLICY roles_admin_manage ON public.user_roles FOR ALL TO authenticated USING ((SELECT has_role('admin'::public.app_role)) OR user_id=(SELECT auth.uid())) WITH CHECK ((SELECT has_role('admin'::public.app_role)) OR user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS notifications_admin_insert ON public.notifications;
CREATE POLICY notifications_admin_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK ((SELECT has_role('admin'::public.app_role)) OR user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS orders_admin_update ON public.orders;
CREATE POLICY orders_admin_update ON public.orders FOR UPDATE TO authenticated USING ((SELECT has_role('admin'::public.app_role))) WITH CHECK ((SELECT has_role('admin'::public.app_role)));

ALTER FUNCTION public.apply_as_driver(text,text,text) SECURITY INVOKER;
ALTER FUNCTION public.apply_as_merchant(text,text,text,text) SECURITY INVOKER;
ALTER FUNCTION public.create_order_secure(uuid,jsonb,text,text,text) SECURITY INVOKER;
ALTER FUNCTION public.submit_store_review(uuid,integer,text) SECURITY INVOKER;

CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON public.notifications(user_id,is_read,created_at DESC);
CREATE INDEX IF NOT EXISTS driver_status_online_idx ON public.driver_status(is_online,updated_at DESC);
CREATE INDEX IF NOT EXISTS driver_apps_status_idx ON public.driver_applications(status,created_at DESC);
CREATE INDEX IF NOT EXISTS merchant_apps_status_idx ON public.merchant_applications(status,created_at DESC);

CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL, subject text NOT NULL, message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS complaints_customer_created_idx ON public.complaints(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS complaints_status_created_idx ON public.complaints(status,created_at DESC);
DROP POLICY IF EXISTS complaints_read ON public.complaints;
CREATE POLICY complaints_read ON public.complaints FOR SELECT TO authenticated USING (customer_id=(SELECT auth.uid()) OR (SELECT has_role('admin'::public.app_role)));
DROP POLICY IF EXISTS complaints_insert ON public.complaints;
CREATE POLICY complaints_insert ON public.complaints FOR INSERT TO authenticated WITH CHECK (customer_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS complaints_admin_update ON public.complaints;
CREATE POLICY complaints_admin_update ON public.complaints FOR UPDATE TO authenticated USING ((SELECT has_role('admin'::public.app_role))) WITH CHECK ((SELECT has_role('admin'::public.app_role)));

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage','fixed')), discount_value numeric(12,2) NOT NULL CHECK (discount_value>=0),
  usage_limit integer CHECK (usage_limit IS NULL OR usage_limit>0), used_count integer NOT NULL DEFAULT 0 CHECK (used_count>=0),
  is_active boolean NOT NULL DEFAULT false, starts_at timestamptz, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS coupons_active_window_idx ON public.coupons(is_active,starts_at,expires_at);
DROP POLICY IF EXISTS coupons_admin_read ON public.coupons;
CREATE POLICY coupons_admin_read ON public.coupons FOR SELECT TO authenticated USING ((SELECT has_role('admin'::public.app_role)));

CREATE OR REPLACE FUNCTION public.submit_complaint(p_order_id uuid,p_subject text,p_message text) RETURNS public.complaints
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v public.complaints%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF trim(coalesce(p_subject,''))='' OR trim(coalesce(p_message,''))='' THEN RAISE EXCEPTION 'موضوع ورسالة الشكوى مطلوبان'; END IF;
  IF p_order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.orders WHERE id=p_order_id AND customer_id=auth.uid()) THEN RAISE EXCEPTION 'Order does not belong to current customer'; END IF;
  INSERT INTO public.complaints(customer_id,order_id,subject,message) VALUES(auth.uid(),p_order_id,trim(p_subject),trim(p_message)) RETURNING * INTO v;
  RETURN v;
END; $$;
REVOKE EXECUTE ON FUNCTION public.submit_complaint(uuid,text,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.submit_complaint(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_complaint_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_touch_complaint_updated_at ON public.complaints;
CREATE TRIGGER trg_touch_complaint_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.touch_complaint_updated_at();

CREATE OR REPLACE FUNCTION public.admin_set_complaint(p_id uuid,p_status text,p_admin_note text DEFAULT '') RETURNS public.complaints
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v public.complaints%rowtype;
BEGIN
  IF NOT public.has_role('admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_status NOT IN ('open','in_progress','resolved','closed') THEN RAISE EXCEPTION 'Invalid complaint status'; END IF;
  UPDATE public.complaints SET status=p_status,admin_note=coalesce(trim(p_admin_note),''),updated_at=now() WHERE id=p_id RETURNING * INTO v;
  IF NOT FOUND THEN RAISE EXCEPTION 'Complaint not found'; END IF;
  INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES(auth.uid(),'complaint_updated','complaint',p_id,jsonb_build_object('status',p_status));
  RETURN v;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_complaint(uuid,text,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_complaint(uuid,text,text) TO authenticated;
