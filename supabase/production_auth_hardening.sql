-- Sahaaya production authentication hardening
-- Run this once in Supabase SQL Editor before enabling real user registrations.
-- Public signup may create volunteer or home accounts only. Admin roles are assigned
-- manually by a trusted project owner through the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := CASE
    WHEN new.raw_user_meta_data->>'role' = 'home' THEN 'home'
    ELSE 'volunteer'
  END;

  INSERT INTO public.profiles (id, full_name, email, phone, role, avatar_url)
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

  IF user_role = 'volunteer' THEN
    INSERT INTO public.volunteers (profile_id, interests, availability, preferred_activity_types, preferred_area)
    VALUES (
      new.id,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'interests')), '{}'::text[]),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'availability')), '{}'::text[]),
      '{}'::text[],
      COALESCE(new.raw_user_meta_data->>'preferred_area', 'Bengaluru')
    )
    ON CONFLICT (profile_id) DO NOTHING;
  ELSE
    INSERT INTO public.old_age_homes (
      profile_id, name, description, address, city, contact_phone, verification_status
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Block authenticated users from changing their own role to admin.
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only a platform administrator can change account roles.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role_change ON public.profiles;
CREATE TRIGGER protect_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_profile_role_change();

-- Prevent direct client-side creation of an admin profile.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own non-admin profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND role IN ('volunteer', 'home'));
