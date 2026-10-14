-- Sahaaya security and workflow hardening.
-- Apply after schema.sql and 20261014_secure_signup_roles.sql.
-- This migration is additive and does not delete application data.

-- ---------------------------------------------------------------------------
-- 1. Prevent self-service role escalation and unauthorized home verification.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SQL Editor/service-role maintenance has no end-user JWT. Normal browser
  -- requests do, and must never be able to grant themselves admin privileges.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    RAISE EXCEPTION 'Admin accounts must be provisioned by a trusted administrator';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can change account roles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_role_escalation
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

CREATE OR REPLACE FUNCTION public.prevent_home_verification_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can change home verification status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_home_verification_tampering ON public.old_age_homes;
CREATE TRIGGER prevent_home_verification_tampering
BEFORE UPDATE OF verification_status ON public.old_age_homes
FOR EACH ROW EXECUTE FUNCTION public.prevent_home_verification_tampering();

-- The original self-insert policy allowed a client to request role='admin'.
-- The trigger above is the final guard; these policies make the intended
-- self-service permissions explicit as well.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own non-admin profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND role IN ('volunteer', 'home'));

-- Keep the existing update policy semantics for profile fields. The trigger
-- above blocks role changes unless the caller is already an administrator.

-- ---------------------------------------------------------------------------
-- 2. Atomic application review with row locking and capacity enforcement.
--    Use this RPC instead of client-side read/check/update sequences.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_application(
  p_application_id UUID,
  p_status TEXT,
  p_coordinator_note TEXT DEFAULT NULL
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application public.applications%ROWTYPE;
  v_activity public.activities%ROWTYPE;
  v_approved_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Review status must be approved or rejected';
  END IF;

  SELECT * INTO v_application
  FROM public.applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  SELECT * INTO v_activity
  FROM public.activities
  WHERE id = v_application.activity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  IF NOT public.is_admin()
     AND v_activity.home_id IS DISTINCT FROM public.get_user_home_id() THEN
    RAISE EXCEPTION 'Only the host home or an administrator can review this application';
  END IF;

  -- A repeated identical review is safe and does not consume another place.
  IF v_application.status = p_status THEN
    RETURN v_application;
  END IF;

  IF v_application.status <> 'applied' THEN
    RAISE EXCEPTION 'Only pending applications can be reviewed';
  END IF;

  IF p_status = 'approved' THEN
    IF v_activity.status <> 'open' THEN
      RAISE EXCEPTION 'This activity is no longer open for approvals';
    END IF;

    SELECT count(*) INTO v_approved_count
    FROM public.applications
    WHERE activity_id = v_application.activity_id
      AND status IN ('approved', 'attended');

    IF v_approved_count >= v_activity.volunteers_required THEN
      RAISE EXCEPTION 'No volunteer places remain for this activity';
    END IF;
  END IF;

  UPDATE public.applications
  SET status = p_status,
      coordinator_note = COALESCE(p_coordinator_note, coordinator_note),
      reviewed_at = now()
  WHERE id = p_application_id
  RETURNING * INTO v_application;

  IF p_status = 'approved' THEN
    SELECT count(*) INTO v_approved_count
    FROM public.applications
    WHERE activity_id = v_application.activity_id
      AND status IN ('approved', 'attended');

    IF v_approved_count >= v_activity.volunteers_required THEN
      UPDATE public.activities SET status = 'filled'
      WHERE id = v_activity.id AND status = 'open';
    END IF;
  END IF;

  RETURN v_application;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Atomic attendance recording and one-time hour credit.
--    Hours are calculated from the activity times, never supplied by a client.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_activity_attendance(
  p_application_id UUID,
  p_status TEXT
)
RETURNS public.attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application public.applications%ROWTYPE;
  v_activity public.activities%ROWTYPE;
  v_attendance public.attendance%ROWTYPE;
  v_hours NUMERIC(4,2);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_status NOT IN ('present', 'absent') THEN
    RAISE EXCEPTION 'Attendance status must be present or absent';
  END IF;

  SELECT * INTO v_application
  FROM public.applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  SELECT * INTO v_activity
  FROM public.activities
  WHERE id = v_application.activity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  IF NOT public.is_admin()
     AND v_activity.home_id IS DISTINCT FROM public.get_user_home_id() THEN
    RAISE EXCEPTION 'Only the host home or an administrator can mark attendance';
  END IF;

  IF v_application.status <> 'approved' THEN
    RAISE EXCEPTION 'Attendance can only be marked for approved applications';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance
    WHERE activity_id = v_application.activity_id
      AND volunteer_id = v_application.volunteer_id
  ) THEN
    RAISE EXCEPTION 'Attendance has already been recorded for this volunteer';
  END IF;

  IF v_activity.end_time <= v_activity.start_time THEN
    RAISE EXCEPTION 'Activity end time must be later than its start time';
  END IF;

  v_hours := CASE
    WHEN p_status = 'present'
      THEN round((extract(epoch FROM (v_activity.end_time - v_activity.start_time)) / 3600)::numeric, 2)
    ELSE 0
  END;

  INSERT INTO public.attendance (activity_id, volunteer_id, status, hours, marked_at)
  VALUES (v_activity.id, v_application.volunteer_id, p_status, v_hours, now())
  RETURNING * INTO v_attendance;

  IF p_status = 'present' THEN
    UPDATE public.applications
    SET status = 'attended'
    WHERE id = p_application_id;
  END IF;

  RETURN v_attendance;
END;
$$;

REVOKE ALL ON FUNCTION public.review_application(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_activity_attendance(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_application(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_activity_attendance(UUID, TEXT) TO authenticated;

-- Basic query indexes for review and attendance lookup.
CREATE INDEX IF NOT EXISTS idx_applications_activity_status
  ON public.applications(activity_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_activity_volunteer
  ON public.attendance(activity_id, volunteer_id);
