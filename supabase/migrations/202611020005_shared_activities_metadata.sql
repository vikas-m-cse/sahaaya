-- Sahaaya shared activity metadata used by Home and Volunteer portals.
-- Run once in Supabase SQL Editor; safe to re-run.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS slot_id TEXT,
  ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(4,2) NOT NULL DEFAULT 2.0
    CHECK (duration_hours > 0),
  ADD COLUMN IF NOT EXISTS required_skills JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_activities_open_date
  ON public.activities(status, date)
  WHERE status = 'open';

-- Ensure the volunteer portal can read open activities only when the host home is verified.
-- Existing owner/admin access remains available for managing their own records.
