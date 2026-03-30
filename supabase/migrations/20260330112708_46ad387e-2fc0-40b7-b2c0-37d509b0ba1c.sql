-- Allow employers to view all jobs (not just their own)
CREATE POLICY "Employers can view all jobs"
ON public.jobs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'employer'::app_role));