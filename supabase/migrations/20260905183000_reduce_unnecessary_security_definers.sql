-- Reduce unnecessary SECURITY DEFINER usage; keep authorization in RLS.
DROP POLICY IF EXISTS coupons_admin_manage ON public.coupons;
CREATE POLICY coupons_admin_manage ON public.coupons
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin'::public.app_role)))
  WITH CHECK ((SELECT public.has_role('admin'::public.app_role)));

DROP POLICY IF EXISTS inventory_movements_owner_insert ON public.inventory_movements;
CREATE POLICY inventory_movements_owner_insert ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.inventory_items i
      JOIN public.stores s ON s.id = i.store_id
      WHERE i.id = inventory_movements.item_id
        AND (
          (s.owner_id = (SELECT auth.uid()) AND (SELECT public.has_role('merchant'::public.app_role)))
          OR (SELECT public.has_role('admin'::public.app_role))
        )
    )
  );

ALTER FUNCTION public.admin_create_coupon(text,text,numeric,integer,timestamptz,timestamptz,boolean) SECURITY INVOKER;
ALTER FUNCTION public.admin_set_coupon_active(uuid,boolean) SECURITY INVOKER;
ALTER FUNCTION public.merchant_adjust_inventory(uuid,numeric,text) SECURITY INVOKER;
