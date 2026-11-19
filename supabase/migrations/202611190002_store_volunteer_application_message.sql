-- Store the message a volunteer writes when applying for an activity.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS volunteer_note TEXT;
