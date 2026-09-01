CREATE TABLE IF NOT EXISTS public.driver_locations (
  driver_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_meters double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can view own location" ON public.driver_locations;
CREATE POLICY "Drivers can view own location" ON public.driver_locations FOR SELECT TO authenticated USING (driver_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Drivers cannot direct write location" ON public.driver_locations;
CREATE POLICY "Drivers cannot direct write location" ON public.driver_locations FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE OR REPLACE FUNCTION public.update_driver_location(p_latitude double precision, p_longitude double precision, p_accuracy_meters double precision DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_driver(auth.uid()) THEN RAISE EXCEPTION 'Driver authorization required'; END IF;
  IF p_latitude IS NULL OR p_latitude NOT BETWEEN -90 AND 90 OR p_longitude IS NULL OR p_longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid coordinates'; END IF;
  INSERT INTO public.driver_locations(driver_id,latitude,longitude,accuracy_meters,updated_at)
  VALUES(auth.uid(),p_latitude,p_longitude,p_accuracy_meters,now())
  ON CONFLICT(driver_id) DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,accuracy_meters=excluded.accuracy_meters,updated_at=excluded.updated_at;
  UPDATE public.driver_status SET last_seen=now() WHERE driver_id=auth.uid();
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.update_driver_location(double precision,double precision,double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_driver_location(double precision,double precision,double precision) TO authenticated;
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated_at ON public.driver_locations(updated_at DESC);
