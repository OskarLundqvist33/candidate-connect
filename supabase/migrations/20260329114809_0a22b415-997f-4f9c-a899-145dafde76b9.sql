
-- Update the trigger function to also create a candidate entry for job seekers
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

    -- If the user is a job_seeker, also create a candidate entry
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'job_seeker') = 'job_seeker' THEN
        INSERT INTO public.candidates (customer_id, full_name, email, linkedin_url)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            NEW.email,
            NULL
        );
    END IF;

    RETURN NEW;
END;
$function$;

-- Also backfill: create candidate entries for existing job_seekers who don't have one yet
INSERT INTO public.candidates (customer_id, full_name, email)
SELECT p.user_id, p.full_name, p.email
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE ur.role = 'job_seeker'
AND NOT EXISTS (
    SELECT 1 FROM public.candidates c WHERE c.customer_id = p.user_id
);
