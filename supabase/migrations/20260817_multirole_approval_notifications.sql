-- Multi-role identity + approval notifications + server-side push queue
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.users WHERE role IN ('customer','driver','merchant','admin')
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS push_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS push_last_error TEXT;

UPDATE public.notifications SET push_sent_at = COALESCE(push_sent_at, created_at) WHERE push_sent_at IS NULL;

DO $vault$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'talabak_notification_dispatcher_secret') THEN
    PERFORM vault.create_secret(gen_random_uuid()::text, 'talabak_notification_dispatcher_secret', 'Internal token for notification push dispatcher');
  END IF;
END
$vault$;

CREATE OR REPLACE FUNCTION public.get_notification_dispatcher_secret()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, pg_temp AS $fn$
DECLARE v_secret TEXT;
BEGIN
  IF current_user <> 'postgres' AND COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') <> 'service_role' THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'talabak_notification_dispatcher_secret';
  RETURN v_secret;
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_notification_dispatcher_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_dispatcher_secret() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_approve_driver_application(p_application_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE
  v_caller_id UUID := auth.uid(); v_app RECORD; v_target_user_id UUID := p_user_id; v_clean_phone TEXT; v_notification_id UUID := gen_random_uuid();
BEGIN
  IF v_caller_id IS NULL OR NOT public.is_admin(v_caller_id) THEN RAISE EXCEPTION 'Unauthorized: Only active administrators can approve driver applications'; END IF;
  SELECT * INTO v_app FROM public.driver_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Driver application % not found', p_application_id; END IF;
  IF v_app.status = 'approved' THEN RAISE EXCEPTION 'Driver application % is already approved', p_application_id; END IF;
  IF v_target_user_id IS NULL THEN
    v_clean_phone := REGEXP_REPLACE(v_app.phone, '\D', '', 'g');
    SELECT id INTO v_target_user_id FROM public.users WHERE REGEXP_REPLACE(phone, '\D', '', 'g') = v_clean_phone OR REGEXP_REPLACE(phone, '\D', '', 'g') = RIGHT(v_clean_phone, 10) ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF v_target_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_target_user_id) THEN RAISE EXCEPTION 'No user account found matching application phone (%)', v_app.phone; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_target_user_id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_target_user_id, 'driver') ON CONFLICT DO NOTHING;
  UPDATE public.users SET vehicle_type = COALESCE(v_app.vehicle_type, vehicle_type), status = 'active', updated_at = NOW() WHERE id = v_target_user_id;
  INSERT INTO public.driver_status (driver_id,is_online,current_active_orders,max_allowed_orders,last_seen) VALUES (v_target_user_id,false,0,2,NOW()) ON CONFLICT (driver_id) DO UPDATE SET last_seen = NOW();
  UPDATE public.driver_applications SET status='approved', updated_at=NOW() WHERE id=p_application_id;
  INSERT INTO public.notifications (id,user_id,title,message,type,is_read) VALUES (v_notification_id,v_target_user_id,'مبروك! تم قبولك كطيار 🛵🎉','أهلاً بك في فريق طلبك دليفري! حسابك أصبح معتمدًا كطيار. ابدأ بالظهور أونلاين واستقبل الطلبات — كل طلب جديد فرصة لزيادة دخلك 💰🔥','role_approved',false);
  INSERT INTO public.audit_logs (actor_name,actor_role,action,target,details,created_at) VALUES ('Admin','admin','APPROVE_DRIVER',v_app.full_name,jsonb_build_object('application_id',p_application_id,'user_id',v_target_user_id,'role_granted','driver')::TEXT,NOW());
  RETURN jsonb_build_object('success',true,'user_id',v_target_user_id,'application_id',p_application_id,'role_granted','driver','notification_id',v_notification_id);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_approve_merchant_application(p_application_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE
  v_caller_id UUID := auth.uid(); v_app RECORD; v_target_user_id UUID := p_user_id; v_store_id UUID; v_store_category TEXT; v_clean_phone TEXT; v_notification_id UUID := gen_random_uuid();
BEGIN
  IF v_caller_id IS NULL OR NOT public.is_admin(v_caller_id) THEN RAISE EXCEPTION 'Unauthorized: Only active administrators can approve merchant applications'; END IF;
  SELECT * INTO v_app FROM public.merchant_applications WHERE id=p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Merchant application % not found',p_application_id; END IF;
  IF v_app.status='approved' THEN RAISE EXCEPTION 'Merchant application % is already approved',p_application_id; END IF;
  IF v_target_user_id IS NULL THEN
    v_clean_phone := REGEXP_REPLACE(v_app.phone,'\D','','g');
    SELECT id INTO v_target_user_id FROM public.users WHERE REGEXP_REPLACE(phone,'\D','','g')=v_clean_phone OR REGEXP_REPLACE(phone,'\D','','g')=RIGHT(v_clean_phone,10) ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF v_target_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id=v_target_user_id) THEN RAISE EXCEPTION 'No user account found matching application phone (%)',v_app.phone; END IF;
  IF v_app.business_type LIKE '%سوبر%' OR v_app.business_type LIKE '%بقالة%' THEN v_store_category:='supermarket'; ELSIF v_app.business_type LIKE '%صيدلية%' OR v_app.business_type LIKE '%دواء%' THEN v_store_category:='pharmacy'; ELSE v_store_category:='restaurants'; END IF;
  v_store_id:=gen_random_uuid();
  INSERT INTO public.stores (id,name,category,rating,reviews_count,delivery_time,delivery_fee,min_order,image,banner,is_featured,is_open,distance,address,tags,created_at) VALUES (v_store_id,v_app.store_name,v_store_category,5.0,1,'20-30 دقيقة',15.00,30.00,'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80','https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',false,true,'1.2 كم',COALESCE(v_app.city,'وسط البلد'),ARRAY[v_app.business_type,'جديد','معتمد']::TEXT[],NOW());
  INSERT INTO public.menu_items (id,store_id,name,description,price,category,is_popular,image,created_at) VALUES (gen_random_uuid(),v_store_id,'الوجبة الرئيسية للمتجر','منتج مميز طازج متاح للطلب التلقائي',85.00,'الرئيسية',true,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',NOW());
  INSERT INTO public.user_roles (user_id,role) VALUES (v_target_user_id,'customer') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id,role) VALUES (v_target_user_id,'merchant') ON CONFLICT DO NOTHING;
  UPDATE public.users SET store_id=v_store_id,status='active',updated_at=NOW() WHERE id=v_target_user_id;
  UPDATE public.merchant_applications SET status='approved',updated_at=NOW() WHERE id=p_application_id;
  INSERT INTO public.notifications (id,user_id,title,message,type,is_read) VALUES (v_notification_id,v_target_user_id,'مبروك! تم قبولك كتاجر 🏪🎉','أهلاً بك كشريك في طلبك دليفري! متجرك أصبح معتمدًا ويمكنك الآن إدارة متجرك واستقبال الطلبات وزيادة مبيعاتك 🚀💰','role_approved',false);
  INSERT INTO public.audit_logs (actor_name,actor_role,action,target,details,created_at) VALUES ('Admin','admin','APPROVE_MERCHANT',v_app.store_name,jsonb_build_object('application_id',p_application_id,'user_id',v_target_user_id,'store_id',v_store_id,'role_granted','merchant')::TEXT,NOW());
  RETURN jsonb_build_object('success',true,'store_id',v_store_id,'user_id',v_target_user_id,'application_id',p_application_id,'role_granted','merchant','notification_id',v_notification_id);
END;
$fn$;

SELECT cron.unschedule('talabak-notification-push-dispatcher') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='talabak-notification-push-dispatcher');
SELECT cron.schedule('talabak-notification-push-dispatcher','* * * * *',$cron$
  SELECT net.http_post(
    url := 'https://vriwhtuxagnbfxybjviz.supabase.co/functions/v1/notification-push-dispatcher',
    headers := jsonb_build_object('Content-Type','application/json','X-Dispatcher-Token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='talabak_notification_dispatcher_secret')),
    body := jsonb_build_object('source','cron','at',now())
  );
$cron$);
