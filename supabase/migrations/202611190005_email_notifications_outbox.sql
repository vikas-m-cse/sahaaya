-- Sahaaya: transactional email outbox for volunteers, care homes and admins.
-- Database triggers enqueue events; a Supabase Database Webhook invokes the
-- send-email-notification Edge Function for each inserted outbox row.

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('volunteer', 'home', 'admin')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'application_received',
    'application_status_changed',
    'new_application_message',
    'home_verification_changed',
    'attendance_recorded'
  )),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_status_created
  ON public.email_outbox(status, created_at);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_outbox FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.email_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_sahaaya_email(
  p_profile_id UUID,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.email_outbox (
    recipient_profile_id, recipient_email, recipient_name,
    recipient_role, event_type, payload
  )
  SELECT
    p.id,
    COALESCE(NULLIF(btrim(p.email), ''), NULLIF(btrim(u.email), '')),
    p.full_name,
    p.role,
    p_event_type,
    COALESCE(p_payload, '{}'::jsonb)
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id = p_profile_id
    AND p.role IN ('volunteer', 'home', 'admin')
    AND COALESCE(NULLIF(btrim(p.email), ''), NULLIF(btrim(u.email), '')) IS NOT NULL;
END;
$$;

-- New volunteer application: notify the host home and every platform admin.
CREATE OR REPLACE FUNCTION public.notify_sahaaya_application_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  admin_id UUID;
  event_payload JSONB;
BEGIN
  SELECT
    h.profile_id AS home_profile_id,
    h.name AS home_name,
    a.title AS activity_title,
    a.date AS activity_date,
    a.start_time,
    a.end_time,
    vp.profile_id AS volunteer_profile_id,
    vp.full_name AS volunteer_name
  INTO v
  FROM public.activities a
  JOIN public.old_age_homes h ON h.id = a.home_id
  JOIN public.volunteers vol ON vol.id = NEW.volunteer_id
  JOIN public.profiles vp ON vp.id = vol.profile_id
  WHERE a.id = NEW.activity_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  event_payload := jsonb_build_object(
    'application_id', NEW.id,
    'activity_title', v.activity_title,
    'activity_date', v.activity_date,
    'start_time', v.start_time,
    'end_time', v.end_time,
    'home_name', v.home_name,
    'volunteer_name', v.volunteer_name,
    'status', NEW.status
  );

  PERFORM public.enqueue_sahaaya_email(v.home_profile_id, 'application_received', event_payload);

  FOR admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    PERFORM public.enqueue_sahaaya_email(admin_id, 'application_received', event_payload);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sahaaya_application_created_email ON public.applications;
CREATE TRIGGER trg_sahaaya_application_created_email
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_sahaaya_application_created();

-- Application decision: notify the volunteer and platform admins.
CREATE OR REPLACE FUNCTION public.notify_sahaaya_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  admin_id UUID;
  event_payload JSONB;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status = 'attended' THEN RETURN NEW; END IF;

  SELECT
    vol.profile_id AS volunteer_profile_id,
    vp.full_name AS volunteer_name,
    h.name AS home_name,
    a.title AS activity_title,
    a.date AS activity_date,
    a.start_time,
    a.end_time
  INTO v
  FROM public.activities a
  JOIN public.old_age_homes h ON h.id = a.home_id
  JOIN public.volunteers vol ON vol.id = NEW.volunteer_id
  JOIN public.profiles vp ON vp.id = vol.profile_id
  WHERE a.id = NEW.activity_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  event_payload := jsonb_build_object(
    'application_id', NEW.id,
    'activity_title', v.activity_title,
    'activity_date', v.activity_date,
    'start_time', v.start_time,
    'end_time', v.end_time,
    'home_name', v.home_name,
    'volunteer_name', v.volunteer_name,
    'status', NEW.status
  );

  PERFORM public.enqueue_sahaaya_email(v.volunteer_profile_id, 'application_status_changed', event_payload);

  FOR admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    PERFORM public.enqueue_sahaaya_email(admin_id, 'application_status_changed', event_payload);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sahaaya_application_status_email ON public.applications;
CREATE TRIGGER trg_sahaaya_application_status_email
AFTER UPDATE OF status ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_sahaaya_application_status();

-- New chat message: notify only the other participant (not the sender).
CREATE OR REPLACE FUNCTION public.notify_sahaaya_application_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  recipient_id UUID;
  recipient_role TEXT;
BEGIN
  SELECT
    h.profile_id AS home_profile_id,
    h.name AS home_name,
    a.title AS activity_title,
    vol.profile_id AS volunteer_profile_id,
    vp.full_name AS volunteer_name,
    sender.full_name AS sender_name
  INTO v
  FROM public.applications app
  JOIN public.activities a ON a.id = app.activity_id
  JOIN public.old_age_homes h ON h.id = a.home_id
  JOIN public.volunteers vol ON vol.id = app.volunteer_id
  JOIN public.profiles vp ON vp.id = vol.profile_id
  JOIN public.profiles sender ON sender.id = NEW.sender_id
  WHERE app.id = NEW.application_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NEW.sender_role = 'volunteer' THEN
    recipient_id := v.home_profile_id;
    recipient_role := 'home';
  ELSIF NEW.sender_role = 'home' THEN
    recipient_id := v.volunteer_profile_id;
    recipient_role := 'volunteer';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.enqueue_sahaaya_email(
    recipient_id,
    'new_application_message',
    jsonb_build_object(
      'application_id', NEW.application_id,
      'activity_title', v.activity_title,
      'home_name', v.home_name,
      'volunteer_name', v.volunteer_name,
      'sender_name', v.sender_name,
      'sender_role', NEW.sender_role
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sahaaya_application_message_email ON public.application_messages;
CREATE TRIGGER trg_sahaaya_application_message_email
AFTER INSERT ON public.application_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_sahaaya_application_message();

-- Home verification updates: notify the home coordinator and admins.
CREATE OR REPLACE FUNCTION public.notify_sahaaya_home_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
  event_payload JSONB;
BEGIN
  IF NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status THEN RETURN NEW; END IF;

  event_payload := jsonb_build_object(
    'home_name', NEW.name,
    'verification_status', NEW.verification_status
  );

  PERFORM public.enqueue_sahaaya_email(NEW.profile_id, 'home_verification_changed', event_payload);

  FOR admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    PERFORM public.enqueue_sahaaya_email(admin_id, 'home_verification_changed', event_payload);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sahaaya_home_verification_email ON public.old_age_homes;
CREATE TRIGGER trg_sahaaya_home_verification_email
AFTER UPDATE OF verification_status ON public.old_age_homes
FOR EACH ROW EXECUTE FUNCTION public.notify_sahaaya_home_verification();

-- Attendance credited: notify the volunteer and admins.
CREATE OR REPLACE FUNCTION public.notify_sahaaya_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  admin_id UUID;
  event_payload JSONB;
BEGIN
  IF NEW.status <> 'present' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  SELECT
    vol.profile_id AS volunteer_profile_id,
    vp.full_name AS volunteer_name,
    h.name AS home_name,
    a.title AS activity_title,
    NEW.hours AS hours
  INTO v
  FROM public.activities a
  JOIN public.old_age_homes h ON h.id = a.home_id
  JOIN public.volunteers vol ON vol.id = NEW.volunteer_id
  JOIN public.profiles vp ON vp.id = vol.profile_id
  WHERE a.id = NEW.activity_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  event_payload := jsonb_build_object(
    'activity_title', v.activity_title,
    'home_name', v.home_name,
    'volunteer_name', v.volunteer_name,
    'hours', v.hours
  );

  PERFORM public.enqueue_sahaaya_email(v.volunteer_profile_id, 'attendance_recorded', event_payload);

  FOR admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    PERFORM public.enqueue_sahaaya_email(admin_id, 'attendance_recorded', event_payload);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sahaaya_attendance_email ON public.attendance;
CREATE TRIGGER trg_sahaaya_attendance_email
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.notify_sahaaya_attendance();


-- Trigger-only entry points; browser clients must never enqueue arbitrary mail.
REVOKE ALL ON FUNCTION public.enqueue_sahaaya_email(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_sahaaya_application_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_sahaaya_application_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_sahaaya_application_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_sahaaya_home_verification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_sahaaya_attendance() FROM PUBLIC, anon, authenticated;
