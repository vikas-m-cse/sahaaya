-- Sahaaya Trust & Safety evidence workflow
-- Run this file once in Supabase SQL Editor.

ALTER TABLE public.old_age_homes
  ADD COLUMN IF NOT EXISTS resident_capacity INTEGER
    CHECK (resident_capacity IS NULL OR resident_capacity > 0),
  ADD COLUMN IF NOT EXISTS verification_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 0
    CHECK (trust_score BETWEEN 0 AND 100);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('home-verification', 'home-verification', false, 10485760,
        ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=10485760,
  allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png'];

DROP POLICY IF EXISTS "Home owners upload own verification evidence" ON storage.objects;
CREATE POLICY "Home owners upload own verification evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='home-verification'
  AND (storage.foldername(name))[1]=auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.old_age_homes h WHERE h.profile_id=auth.uid()));

DROP POLICY IF EXISTS "Home owners and admins view verification evidence" ON storage.objects;
CREATE POLICY "Home owners and admins view verification evidence"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='home-verification'
  AND ((storage.foldername(name))[1]=auth.uid()::text OR public.is_admin()));

CREATE OR REPLACE FUNCTION public.enforce_home_verification_gate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE docs JSONB; checks JSONB;
BEGIN
  IF NEW.verification_status='verified' AND OLD.verification_status IS DISTINCT FROM 'verified' THEN
    docs:=COALESCE(NEW.verification_documents,'[]'::jsonb);
    checks:=COALESCE(NEW.verification_checks,'{}'::jsonb);
    IF COALESCE(NEW.trust_score,0)<80
      OR COALESCE((checks->>'legal_registration')::boolean,false) IS NOT TRUE
      OR COALESCE((checks->>'address_proof')::boolean,false) IS NOT TRUE
      OR COALESCE((checks->>'resident_safety')::boolean,false) IS NOT TRUE
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(docs) x WHERE x->>'kind'='legal_registration')
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(docs) x WHERE x->>'kind'='address_proof')
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(docs) x WHERE x->>'kind'='safety_policy') THEN
      RAISE EXCEPTION 'Approval blocked: score >= 80, mandatory checks, and legal, address and safety documents are required.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_home_verification_gate ON public.old_age_homes;
CREATE TRIGGER trg_enforce_home_verification_gate
BEFORE UPDATE OF verification_status ON public.old_age_homes
FOR EACH ROW EXECUTE FUNCTION public.enforce_home_verification_gate();


-- Refresh auth trigger so email-confirmation registrations also retain resident capacity.
-- ==============================================================================
-- SAHAAYA — Supabase Auth Trigger Migration
-- Automatically creates 'profiles' and 'volunteers' / 'old_age_homes' records
-- whenever a new user signs up in auth.users.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'volunteer');

  -- 1. Insert into public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    avatar_url
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, new.phone, 'Volunteer'), '@', 1)),
    COALESCE(new.email, NULLIF(new.raw_user_meta_data->>'email', '')),
    new.raw_user_meta_data->>'phone',
    user_role,
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

  -- 2. If role is volunteer, create record in public.volunteers
  IF user_role = 'volunteer' THEN
    INSERT INTO public.volunteers (
      profile_id,
      interests,
      availability,
      preferred_activity_types,
      preferred_area
    )
    VALUES (
      new.id,
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'interests')),
        '{}'::text[]
      ),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'availability')),
        '{}'::text[]
      ),
      '{}'::text[],
      new.raw_user_meta_data->>'preferred_area'
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- 3. If role is home, create record in public.old_age_homes
  IF user_role = 'home' THEN
    INSERT INTO public.old_age_homes (
      profile_id,
      name,
      description,
      address,
      city,
      contact_phone,
      resident_capacity,
      verification_status
    )
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'home_name', 'Senior Care Home'),
      COALESCE(new.raw_user_meta_data->>'description', 'Dedicated senior care and assisted living residence.'),
      COALESCE(new.raw_user_meta_data->>'address', 'Bengaluru'),
      COALESCE(new.raw_user_meta_data->>'city', 'Bengaluru'),
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      NULLIF(new.raw_user_meta_data->>'resident_capacity', '')::INTEGER,
      'pending'
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- Drop trigger if it already exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
