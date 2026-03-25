CREATE POLICY "Public can view hospitals for signup"
ON public.hospitals
FOR SELECT
TO public
USING (true);