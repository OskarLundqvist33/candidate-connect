-- Allow employers to view all candidates (read-only)
CREATE POLICY "Employers can view all candidates"
ON public.candidates FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'employer'::app_role));

-- Allow employers to insert job_candidates for their own jobs
CREATE POLICY "Employers can scout candidates to own jobs"
ON public.job_candidates FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'employer'::app_role)
  AND auth.uid() = customer_id
  AND EXISTS (
    SELECT 1 FROM public.jobs WHERE jobs.id = job_id AND jobs.customer_id = auth.uid()
  )
);