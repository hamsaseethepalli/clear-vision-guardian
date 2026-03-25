
CREATE OR REPLACE FUNCTION public.prevent_hospital_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.hospital_id IS NOT NULL AND OLD.hospital_id IS DISTINCT FROM NEW.hospital_id THEN
    RAISE EXCEPTION 'Hospital affiliation cannot be changed after registration';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_hospital_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hospital_change();
