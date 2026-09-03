CREATE OR REPLACE FUNCTION public.notify_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_name text;
  v_status_label text;
  v_owner_id uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
    SELECT name, owner_id INTO v_store_name, v_owner_id
    FROM public.stores WHERE id = NEW.store_id;

    v_status_label := CASE NEW.status
      WHEN 'pending' THEN 'بنأكد الطلب'
      WHEN 'accepted' THEN 'المتجر استلم'
      WHEN 'preparing' THEN 'بيجهز طلبك'
      WHEN 'ready' THEN 'جاهز للسائق'
      WHEN 'assigned' THEN 'السائق استلمه'
      WHEN 'picked_up' THEN 'اتستلم من المتجر'
      WHEN 'on_the_way' THEN 'في الطريق ليك'
      WHEN 'delivered' THEN 'اتسلّم بنجاح'
      WHEN 'cancelled' THEN 'اتلغى'
      WHEN 'rejected' THEN 'مرفوض'
      ELSE NEW.status::text
    END;

    IF NEW.customer_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.notifications(user_id,title,body,kind,is_read)
      VALUES (NEW.customer_id,'تحديث طلبك',COALESCE(v_store_name,'المتجر') || ' • ' || v_status_label,'order',false);
    END IF;

    IF v_owner_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.notifications(user_id,title,body,kind,is_read)
      VALUES (v_owner_id,'تحديث تشغيل','الطلب #' || left(NEW.id::text,6) || ' أصبح: ' || v_status_label,'order',false);
    END IF;

    IF NEW.driver_id IS NOT NULL AND (NEW.driver_id IS DISTINCT FROM OLD.driver_id OR NEW.status IS DISTINCT FROM OLD.status) THEN
      INSERT INTO public.notifications(user_id,title,body,kind,is_read)
      VALUES (NEW.driver_id,
              CASE WHEN NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN 'طلب جديد اتسند ليك' ELSE 'تحديث رحلة' END,
              COALESCE(v_store_name,'متجر') || ' • الطلب #' || left(NEW.id::text,6) || ' • ' || v_status_label,
              'order',false);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_order_change ON public.orders;
CREATE TRIGGER trg_notify_order_change AFTER UPDATE OF status, driver_id ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_change();
