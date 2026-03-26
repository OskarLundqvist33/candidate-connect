
-- Migrate existing customer roles to employer
UPDATE public.user_roles SET role = 'employer' WHERE role = 'customer';

-- Create applications table for job seekers
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  applicant_id uuid NOT NULL,
  cover_letter text,
  cv_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Job seekers can view their own applications
CREATE POLICY "Job seekers can view own applications" ON public.applications
  FOR SELECT USING (auth.uid() = applicant_id);

-- Job seekers can create applications
CREATE POLICY "Job seekers can insert own applications" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- Employers can view applications for their jobs
CREATE POLICY "Employers can view applications for their jobs" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs WHERE jobs.id = applications.job_id AND jobs.customer_id = auth.uid()
    )
  );

-- Employers can update application status
CREATE POLICY "Employers can update applications for their jobs" ON public.applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs WHERE jobs.id = applications.job_id AND jobs.customer_id = auth.uid()
    )
  );

-- Admins full access
CREATE POLICY "Admins can do all on applications" ON public.applications
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Job seekers can view all open jobs (add policy to jobs table)
CREATE POLICY "Job seekers can view open jobs" ON public.jobs
  FOR SELECT USING (
    status = 'open' AND has_role(auth.uid(), 'job_seeker')
  );

-- Trigger for updated_at
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create CV storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('cv-uploads', 'cv-uploads', false);

-- Storage policies for CV uploads
CREATE POLICY "Job seekers can upload CVs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Job seekers can view own CVs" ON storage.objects
  FOR SELECT USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Employers can view CVs for their job applicants" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cv-uploads' AND EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE j.customer_id = auth.uid() AND a.applicant_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Admins can view all CVs" ON storage.objects
  FOR SELECT USING (bucket_id = 'cv-uploads' AND has_role(auth.uid(), 'admin'));
