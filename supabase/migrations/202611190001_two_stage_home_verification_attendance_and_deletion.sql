-- Sahaaya: two-stage care-home onboarding, document verification and activity deletion.
-- Run once in Supabase SQL Editor. Safe to re-run.

-- Add the intermediate state used after the admin accepts the basic application.
DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.old_age_homes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%verification_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.old_age_homes DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.old_age_homes
  ADD CONSTRAINT old_age_homes_verification_status_check
  CHECK (verification_status IN ('pending', 'documents_required', 'verified', 'rejected'));

-- Final approval is document-based. There is no compatibility/trust-score threshold.
CREATE OR REPLACE FUNCTION public.enforce_home_verification_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  docs JSONB;
BEGIN
  IF NEW.verification_status = 'verified'
     AND OLD.verification_status IS DISTINCT FROM 'verified' THEN
    docs := COALESCE(NEW.verification_documents, '[]'::jsonb);

    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(docs) d WHERE d->>'kind' = 'legal_registration')
       OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(docs) d WHERE d->>'kind' = 'address_proof')
       OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(docs) d WHERE d->>'kind' = 'safety_policy') THEN
      RAISE EXCEPTION 'Final approval requires legal registration proof, address proof and a resident safety policy.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_home_verification_gate ON public.old_age_homes;
CREATE TRIGGER trg_enforce_home_verification_gate
BEFORE UPDATE OF verification_status ON public.old_age_homes
FOR EACH ROW EXECUTE FUNCTION public.enforce_home_verification_gate();

-- Ensure a care home can delete its own requirement. Linked applications and
-- attendance rows are removed by the existing ON DELETE CASCADE foreign keys.
DROP POLICY IF EXISTS "Homes can delete own activities" ON public.activities;
CREATE POLICY "Homes can delete own activities"
ON public.activities FOR DELETE
TO authenticated
USING (home_id = public.get_user_home_id() OR public.is_admin());
