-- Preserve the volunteer's application message and matching details in Supabase.
-- Existing application rows are retained; historic messages cannot be reconstructed
-- because the old application flow never stored them.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS volunteer_note TEXT,
  ADD COLUMN IF NOT EXISTS match_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS coordinator_note TEXT;
