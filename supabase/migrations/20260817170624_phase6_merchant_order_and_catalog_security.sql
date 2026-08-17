CREATE OR REPLACE FUNCTION public.merchant_update_order(p_order_id uuid, p_action text, p_rejection_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user_id uuid := auth.uid(); v_store_id uuid; v_order record; v_order_store_id uuid; v_new_status text; v_message text; v_notification_id uuid := gen_random_uuid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_admin(v_user_id) AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=v_user_id AND role='merchant') THEN RAISE EXCEPTION 'Merchant authorization required'; END IF;
  SELECT store_id INTO v_store_id FROM public.users WHERE id=v_user_id AND status='active';
  IF v_store_id IS NULL AND NOT public.is_admin(v_user_id) THEN RAISE EXCEPTION 'Merchant store is not configured'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  v_order_store_id := NULLIF(v_order.items->0->>'storeId','')::uuid;
  IF NOT public.is_admin(v_user_id) AND v_order_store_id IS DISTINCT FROM v_store_id THEN RAISE EXCEPTION 'Order does not belong to your store'; END IF;
  IF p_action='accept' AND v_order.status='sent' THEN v_new_status := 'preparing'; v_message := 'التاجر قبل طلبك وبدأ تحضيره الآن 👨‍🍳';
  ELSIF p_action='reject' AND v_order.status='sent' THEN v_new_status := 'cancelled'; v_message := COALESCE(NULLIF(TRIM(p_rejection_reason),''),'التاجر اعتذر عن قبول الطلب حالياً.');
  ELSE RAISE EXCEPTION 'Invalid merchant action or order state'; END IF;
  UPDATE public.orders SET status=v_new_status, cancelled_by=CASE WHEN v_new_status='cancelled' THEN 'merchant' ELSE cancelled_by END, cancellation_reason=CASE WHEN v_new_status='cancelled' THEN NULLIF(TRIM(p_rejection_reason),'') ELSE cancellation_reason END, cancelled_at=CASE WHEN v_new_status='cancelled' THEN now() ELSE cancelled_at END WHERE id=p_order_id;
  IF v_order.customer_id IS NOT NULL THEN INSERT INTO public.notifications(id,user_id,title,message,type,is_read) VALUES(v_notification_id,v_order.customer_id,CASE WHEN v_new_status='preparing' THEN 'تم قبول طلبك 🍔' ELSE 'تحديث على طلبك' END,v_message,'order',false); END IF;
  RETURN jsonb_build_object('success',true,'order_id',p_order_id,'status',v_new_status,'notification_id',v_notification_id);
END;
$$;
REVOKE ALL ON FUNCTION public.merchant_update_order(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_update_order(uuid,text,text) TO authenticated;

DROP POLICY IF EXISTS "Merchants can view own store orders" ON public.orders;
CREATE POLICY "Merchants can view own store orders" ON public.orders FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role='merchant') AND (items->0->>'storeId') IS NOT NULL AND NULLIF(items->0->>'storeId','')::uuid = (SELECT store_id FROM public.users WHERE id=auth.uid())));

DROP POLICY IF EXISTS "Merchants can manage own store" ON public.stores;
CREATE POLICY "Merchants can manage own store" ON public.stores FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR id=(SELECT store_id FROM public.users WHERE id=auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role='merchant'))) WITH CHECK (public.is_admin(auth.uid()) OR id=(SELECT store_id FROM public.users WHERE id=auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role='merchant')));

DROP POLICY IF EXISTS "Merchants can manage own menu" ON public.menu_items;
CREATE POLICY "Merchants can manage own menu" ON public.menu_items FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR store_id=(SELECT store_id FROM public.users WHERE id=auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role='merchant'))) WITH CHECK (public.is_admin(auth.uid()) OR store_id=(SELECT store_id FROM public.users WHERE id=auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role='merchant')));
