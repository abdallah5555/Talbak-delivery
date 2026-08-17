BEGIN;

DROP POLICY IF EXISTS "Complaints Insert" ON public.complaints;
CREATE POLICY "Complaints Insert"
ON public.complaints
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    order_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
  )
);

CREATE OR REPLACE FUNCTION public.bind_complaint_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text;
  v_phone text;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id AND status = 'active') THEN
    RAISE EXCEPTION 'Authenticated active user required';
  END IF;

  SELECT name, phone INTO v_name, v_phone
  FROM public.users
  WHERE id = v_user_id;

  NEW.customer_name := v_name;
  NEW.customer_phone := v_phone;
  NEW.created_at := COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bind_complaint_identity ON public.complaints;
CREATE TRIGGER trg_bind_complaint_identity
BEFORE INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.bind_complaint_identity();

REVOKE ALL ON FUNCTION public.bind_complaint_identity() FROM PUBLIC, anon, authenticated;

COMMIT;
