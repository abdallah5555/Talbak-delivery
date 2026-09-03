CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text,p_subtotal numeric)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $fn$
DECLARE v public.coupons%rowtype;
BEGIN
 IF auth.uid() IS NULL OR p_subtotal IS NULL OR p_subtotal < 0 THEN RAISE EXCEPTION 'Invalid coupon request'; END IF;
 SELECT * INTO v FROM public.coupons WHERE upper(code)=upper(btrim(p_code));
 IF NOT FOUND OR NOT v.is_active OR (v.starts_at IS NOT NULL AND now()<v.starts_at) OR (v.expires_at IS NOT NULL AND now()>=v.expires_at) OR (v.usage_limit IS NOT NULL AND v.used_count>=v.usage_limit) THEN
   RAISE EXCEPTION 'Coupon is invalid, expired, or unavailable';
 END IF;
 IF v.discount_type='percentage' THEN RETURN least(p_subtotal,round(p_subtotal*v.discount_value/100,2)); END IF;
 RETURN least(p_subtotal,v.discount_value);
END;
$fn$;
REVOKE ALL ON FUNCTION public.validate_coupon(text,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text,numeric) TO authenticated;
