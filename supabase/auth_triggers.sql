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
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
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
      verification_status
    )
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'home_name', 'Senior Care Home'),
      COALESCE(new.raw_user_meta_data->>'description', 'Dedicated senior care and assisted living residence.'),
      COALESCE(new.raw_user_meta_data->>'address', 'Bengaluru'),
      COALESCE(new.raw_user_meta_data->>'city', 'Bengaluru'),
      COALESCE(new.raw_user_meta_data->>'phone', ''),
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
