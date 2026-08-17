DROP POLICY IF EXISTS "Driver Apps Public Insert" ON public.driver_applications;
CREATE POLICY "Driver Apps Public Insert" ON public.driver_applications
FOR INSERT TO public
WITH CHECK (
  status = 'pending'
  AND rejection_reason IS NULL
  AND full_name IS NOT NULL AND length(trim(full_name)) BETWEEN 2 AND 120
  AND phone IS NOT NULL AND length(regexp_replace(phone, '\\D', '', 'g')) BETWEEN 10 AND 15
  AND vehicle_type IS NOT NULL AND length(trim(vehicle_type)) BETWEEN 2 AND 80
);

DROP POLICY IF EXISTS "Merchant Apps Public Insert" ON public.merchant_applications;
CREATE POLICY "Merchant Apps Public Insert" ON public.merchant_applications
FOR INSERT TO public
WITH CHECK (
  status = 'pending'
  AND rejection_reason IS NULL
  AND store_name IS NOT NULL AND length(trim(store_name)) BETWEEN 2 AND 160
  AND business_type IS NOT NULL AND length(trim(business_type)) BETWEEN 2 AND 100
  AND owner_name IS NOT NULL AND length(trim(owner_name)) BETWEEN 2 AND 120
  AND phone IS NOT NULL AND length(regexp_replace(phone, '\\D', '', 'g')) BETWEEN 10 AND 15
);
