-- Store care home replies and approval/decline notes on volunteer applications.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS coordinator_note TEXT;

-- Keep this column declaration here as well so both application message fields
-- are present on projects applying this migration directly.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS volunteer_note TEXT;
