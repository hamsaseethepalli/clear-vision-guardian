
ALTER TABLE public.reports ADD COLUMN requested_doctor_id uuid DEFAULT NULL;

-- Create a hospitals table for hospital selection
CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Everyone can view hospitals
CREATE POLICY "Anyone can view hospitals" ON public.hospitals FOR SELECT TO authenticated USING (true);

-- Admins can manage hospitals
CREATE POLICY "Admins can manage hospitals" ON public.hospitals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add hospital_id to profiles for doctors
ALTER TABLE public.profiles ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id) DEFAULT NULL;

-- Add hospital_id to reports
ALTER TABLE public.reports ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id) DEFAULT NULL;

-- Insert some sample hospitals
INSERT INTO public.hospitals (name, address, city) VALUES
  ('Aravind Eye Hospital', 'Aravind Eye Care System, Anna Nagar', 'Madurai'),
  ('Sankara Nethralaya', 'No.18, College Road, Nungambakkam', 'Chennai'),
  ('LV Prasad Eye Institute', 'L V Prasad Marg, Banjara Hills', 'Hyderabad'),
  ('AIIMS Eye Centre', 'All India Institute of Medical Sciences', 'New Delhi'),
  ('Narayana Nethralaya', '121/C, Chord Road, Rajaji Nagar', 'Bangalore');
