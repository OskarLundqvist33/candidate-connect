
-- Add new enum values to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'job_seeker';
