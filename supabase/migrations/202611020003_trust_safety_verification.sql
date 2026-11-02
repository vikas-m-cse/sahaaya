-- Sahaaya Trust & Safety evidence workflow
-- Run once in Supabase SQL Editor. Safe to re-run.

ALTER TABLE public.old_age_homes
  ADD COLUMN IF NOT EXISTS resident_capacity INTEGER
    CHECK (resident_capacity IS NULL OR resident_capacity > 0),
  ADD COLUMN IF NOT EXISTS verification_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 0
    CHECK (trust_score BETWEEN 0 AND 100);

-- Private bucket: evidence is never publicly readable.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('home-verification', 'home-verification', false, 10485760,
        ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png'];

DROP POLICY IF EXISTS "Home owners upload own verification evidence" ON storage.objects;
CREATE POLICY "Home owners upload own verification evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'home-verification'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.old_age_homes h WHERE h.profile_id = auth.uid())
);

DROP POLICY IF EXISTS "Home owners and admins view verification evidence" ON storage.objects;
CREATE POLICY "Home owners and admins view verification evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'home-verification'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin()
  )
);

-- Enforce the approval threshold in the database too (not just the browser).
CREATE OR REPLACE FUNCTION public.enforce_home_verification_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  docs JSONB;
  checks JSONB;
BEGIN
  IF NEW.verification_status = 'verified'
     AND OLD.verification_status IS DISTINCT FROM 'verified' THEN
    docs := COALESCE(NEW.verification_documents, '[]'::jsonb);
    checks := COALESCE(NEW.verification_checks, '{}'::jsonb);

    IF COALESCE(NEW.trust_score, 0) < 80
       OR COALESCE((checks->>'legal_registration')::boolean, false) IS NOT TRUE
       OR COALESCE((checks->>'address_proof')::boolean, false) IS NOT TRUE
       OR COALESCE((checks->>'resident_safety')::boolean, false) IS NOT TRUE
       OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(docs) d WHERE d->>'kind' = 'legal_registration')
       OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(docs) d WHERE d->>'kind' = 'address_proof')
       OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(docs) d WHERE d->>'kind' = 'safety_policy') THEN
      RAISE EXCEPTION 'Approval blocked: score >= 80, mandatory checks, and legal, address and safety documents are required.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_home_verification_gate ON public.old_age_homes;
CREATE TRIGGER trg_enforce_home_verification_gate
BEFORE UPDATE OF verification_status ON public.old_age_homes
FOR EACH ROW EXECUTE FUNCTION public.enforce_home_verification_gate();
