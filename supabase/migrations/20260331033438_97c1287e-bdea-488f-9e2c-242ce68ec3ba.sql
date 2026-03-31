
-- Add new columns to service_orders
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS device_password text;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS unit_condition text;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS unit_accessories text;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS unit_checks jsonb;

-- Update existing service_type values
UPDATE public.service_orders SET service_type = 'non_warranty' WHERE service_type = 'personal';
UPDATE public.service_orders SET service_type = 'warranty_store' WHERE service_type = 'warranty';
UPDATE public.service_orders SET service_type = 'non_warranty' WHERE service_type = 'install_upgrade';

-- Create storage bucket for unit photos
INSERT INTO storage.buckets (id, name, public) VALUES ('unit-photos', 'unit-photos', true);

-- Storage RLS: anyone can read
CREATE POLICY "Public can view unit photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'unit-photos');

-- Storage RLS: authenticated can upload
CREATE POLICY "Authenticated can upload unit photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'unit-photos');

-- Storage RLS: authenticated can delete own uploads
CREATE POLICY "Authenticated can delete unit photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'unit-photos');

-- Create service_photos table
CREATE TABLE public.service_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view service photos" ON public.service_photos FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert service photos" ON public.service_photos FOR INSERT TO authenticated WITH CHECK (true);
