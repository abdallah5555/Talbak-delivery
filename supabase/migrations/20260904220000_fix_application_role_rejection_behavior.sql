CREATE OR REPLACE FUNCTION public.admin_set_driver_application(p_id uuid, p_status text)
RETURNS public.driver_applications
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v public.driver_applications%rowtype;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_status NOT IN ('approved','rejected','pending') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.driver_applications SET status=p_status WHERE id=p_id RETURNING * INTO v;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF p_status='approved' THEN
    INSERT INTO public.user_roles(user_id,role) VALUES(v.applicant_id,'driver') ON CONFLICT(user_id,role) DO NOTHING;
    INSERT INTO public.driver_status(user_id,is_online) VALUES(v.applicant_id,false) ON CONFLICT(user_id) DO NOTHING;
  END IF;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_merchant_application(p_id uuid, p_status text)
RETURNS public.merchant_applications
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v public.merchant_applications%rowtype;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_status NOT IN ('approved','rejected','pending') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.merchant_applications SET status=p_status WHERE id=p_id RETURNING * INTO v;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF p_status='approved' THEN
    INSERT INTO public.user_roles(user_id,role) VALUES(v.applicant_id,'merchant') ON CONFLICT(user_id,role) DO NOTHING;
    IF NOT EXISTS(select 1 from public.stores where owner_id=v.applicant_id and name=v.business_name) THEN
      INSERT INTO public.stores(owner_id,name,category,address,phone,description,is_open,prep_minutes,delivery_fee,min_order,rating)
      VALUES(v.applicant_id,v.business_name,v.category,v.address,v.phone,'متجر جديد على طلبك',true,25,15,0,5);
    END IF;
  END IF;
  RETURN v;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_set_driver_application(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_driver_application(uuid,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_merchant_application(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_merchant_application(uuid,text) TO authenticated;
