
-- Add cancel_type to service_updates
ALTER TABLE public.service_updates ADD COLUMN IF NOT EXISTS cancel_type text;

-- Add edited_by and edited_at to service_orders
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS edited_by text;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Replace generate_ticket_number function with new A-XXX format
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  month_letter CHAR(1);
  current_month INT;
  current_year INT;
  seq_count INT;
  new_ticket TEXT;
BEGIN
  current_month := EXTRACT(MONTH FROM now());
  current_year := EXTRACT(YEAR FROM now());
  
  month_letter := CASE current_month
    WHEN 1 THEN 'J' WHEN 2 THEN 'F' WHEN 3 THEN 'M' WHEN 4 THEN 'A'
    WHEN 5 THEN 'Y' WHEN 6 THEN 'U' WHEN 7 THEN 'L' WHEN 8 THEN 'G'
    WHEN 9 THEN 'S' WHEN 10 THEN 'O' WHEN 11 THEN 'N' WHEN 12 THEN 'D'
  END;
  
  SELECT COUNT(*) INTO seq_count
  FROM public.service_orders
  WHERE EXTRACT(MONTH FROM created_at) = current_month
    AND EXTRACT(YEAR FROM created_at) = current_year;
  
  seq_count := seq_count + 1;
  new_ticket := month_letter || '-' || LPAD(seq_count::TEXT, 3, '0');
  
  WHILE EXISTS (SELECT 1 FROM public.service_orders WHERE ticket_number = new_ticket) LOOP
    seq_count := seq_count + 1;
    new_ticket := month_letter || '-' || LPAD(seq_count::TEXT, 3, '0');
  END LOOP;
  
  NEW.ticket_number := new_ticket;
  RETURN NEW;
END;
$function$;

-- Update handle_new_user to support owner role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'requested_role')::app_role, 'technician');
  
  INSERT INTO public.profiles (id, full_name, email, requested_role, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    _role,
    CASE WHEN _role IN ('admin', 'owner') THEN true ELSE false END
  );

  IF _role IN ('admin', 'owner') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add RLS policies for owner role
CREATE POLICY "Owners can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can create orders"
ON public.service_orders FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update orders"
ON public.service_orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));
