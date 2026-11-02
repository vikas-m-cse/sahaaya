-- Sahaaya: persist notes exchanged during application review.
-- Safe to run on an existing Supabase project; does not remove data.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS volunteer_note TEXT,
  ADD COLUMN IF NOT EXISTS coordinator_note TEXT;
