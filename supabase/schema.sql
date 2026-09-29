-- ==============================================================================
-- SAHAAYA — Supabase PostgreSQL Schema & Row Level Security (RLS) Migration
-- 
-- System: Old Age Home Volunteer Coordination Portal
-- Core Principle: "The old age home defines what help it needs. The platform
--                  does not assume what elderly residents need."
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLES DEFINITION
-- ==============================================================================

-- 1. PROFILES (Extends Supabase auth.users or acts as identity registry)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('volunteer', 'home', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. VOLUNTEERS (Detailed profile for volunteers)
CREATE TABLE IF NOT EXISTS public.volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    interests TEXT[] NOT NULL DEFAULT '{}',
    availability TEXT[] NOT NULL DEFAULT '{}',
    preferred_activity_types TEXT[] NOT NULL DEFAULT '{}',
    preferred_area TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. OLD AGE HOMES (Senior care facilities registry)
CREATE TABLE IF NOT EXISTS public.old_age_homes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Bengaluru',
    contact_phone TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ACTIVITIES (Requirements published by old age homes)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL REFERENCES public.old_age_homes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    volunteers_required INTEGER NOT NULL CHECK (volunteers_required > 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. APPLICATIONS (Volunteer applications for requirements)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'approved', 'rejected', 'attended', 'cancelled')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT unique_volunteer_activity_application UNIQUE (activity_id, volunteer_id)
);

-- 6. ATTENDANCE (Attendance verification and hours crediting)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    hours NUMERIC(4, 2) NOT NULL DEFAULT 0.0 CHECK (hours >= 0),
    marked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_attendance_record UNIQUE (activity_id, volunteer_id)
);

-- 7. FEEDBACK (Post-activity experience ratings and observations)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
    home_id UUID NOT NULL REFERENCES public.old_age_homes(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. NOTIFICATIONS (In-app alerts for status updates, reviews, and activities)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. PERFORMANCE INDEXES
-- ==============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Volunteers indexes
CREATE INDEX IF NOT EXISTS idx_volunteers_profile_id ON public.volunteers(profile_id);

-- Old age homes indexes
CREATE INDEX IF NOT EXISTS idx_old_age_homes_profile_id ON public.old_age_homes(profile_id);
CREATE INDEX IF NOT EXISTS idx_old_age_homes_status ON public.old_age_homes(verification_status);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_home_id ON public.activities(home_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON public.activities(date);
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(activity_type);

-- Applications indexes
CREATE INDEX IF NOT EXISTS idx_applications_activity_id ON public.applications(activity_id);
CREATE INDEX IF NOT EXISTS idx_applications_volunteer_id ON public.applications(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_activity_id ON public.attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_attendance_volunteer_id ON public.attendance(volunteer_id);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_activity_id ON public.feedback(activity_id);
CREATE INDEX IF NOT EXISTS idx_feedback_home_id ON public.feedback(home_id);
CREATE INDEX IF NOT EXISTS idx_feedback_volunteer_id ON public.feedback(volunteer_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.old_age_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. HELPER SECURITY FUNCTIONS (Security Definer for clean policy queries)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_home_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.old_age_homes
  WHERE profile_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_volunteer_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.volunteers
  WHERE profile_id = auth.uid()
  LIMIT 1;
$$;

-- ==============================================================================
-- 6. RLS POLICIES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Anyone logged in can read profile details (needed to display applicant names, home coordinators)
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own profile upon registration
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own profile; Admins can update any profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- VOLUNTEERS POLICIES
-- ------------------------------------------------------------------------------
-- Volunteers can view their own record; Homes and Admins can view volunteer details
CREATE POLICY "Volunteers viewable by self, homes, and admin"
ON public.volunteers FOR SELECT
TO authenticated
USING (
  profile_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    -- Old age homes can view volunteers who applied to their activities
    SELECT 1 FROM public.applications a
    JOIN public.activities act ON act.id = a.activity_id
    WHERE a.volunteer_id = public.volunteers.id
    AND act.home_id = public.get_user_home_id()
  )
);

-- Volunteers can insert their own volunteer row
CREATE POLICY "Volunteers can insert own record"
ON public.volunteers FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Volunteers can update their own profile
CREATE POLICY "Volunteers can update own record"
ON public.volunteers FOR UPDATE
TO authenticated
USING (profile_id = auth.uid() OR public.is_admin())
WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- OLD AGE HOMES POLICIES
-- ------------------------------------------------------------------------------
-- Verified homes are public to all authenticated users; Pending homes viewable by owner & admin
CREATE POLICY "Verified homes are viewable by everyone"
ON public.old_age_homes FOR SELECT
TO authenticated
USING (
  verification_status = 'verified'
  OR profile_id = auth.uid()
  OR public.is_admin()
);

-- Home coordinator can insert their home profile
CREATE POLICY "Homes can register their facility"
ON public.old_age_homes FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Homes can update their own details (except verification_status unless admin)
CREATE POLICY "Homes can update own details"
ON public.old_age_homes FOR UPDATE
TO authenticated
USING (profile_id = auth.uid() OR public.is_admin())
WITH CHECK (
  (profile_id = auth.uid() AND verification_status = (SELECT verification_status FROM public.old_age_homes WHERE id = public.old_age_homes.id))
  OR public.is_admin()
);

-- ------------------------------------------------------------------------------
-- ACTIVITIES POLICIES
-- ------------------------------------------------------------------------------
-- Open activities from verified homes are visible to all; Homes can see all their own activities
CREATE POLICY "Activities viewable by all if home verified or if owner"
ON public.activities FOR SELECT
TO authenticated
USING (
  home_id = public.get_user_home_id()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.old_age_homes h
    WHERE h.id = public.activities.home_id
    AND h.verification_status = 'verified'
  )
);

-- Only verified homes can create activities (The home defines what help it needs)
CREATE POLICY "Verified homes can create activities"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (
  home_id = public.get_user_home_id()
  AND EXISTS (
    SELECT 1 FROM public.old_age_homes h
    WHERE h.id = home_id AND h.verification_status = 'verified'
  )
  OR public.is_admin()
);

-- Homes can update their own activities
CREATE POLICY "Homes can update own activities"
ON public.activities FOR UPDATE
TO authenticated
USING (home_id = public.get_user_home_id() OR public.is_admin())
WITH CHECK (home_id = public.get_user_home_id() OR public.is_admin());

-- Homes can delete their own activities
CREATE POLICY "Homes can delete own activities"
ON public.activities FOR DELETE
TO authenticated
USING (home_id = public.get_user_home_id() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- APPLICATIONS POLICIES
-- ------------------------------------------------------------------------------
-- Volunteers see their own applications; Homes see applications to their own activities
CREATE POLICY "Applications viewable by applicant or host home"
ON public.applications FOR SELECT
TO authenticated
USING (
  volunteer_id = public.get_user_volunteer_id()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.activities act
    WHERE act.id = public.applications.activity_id
    AND act.home_id = public.get_user_home_id()
  )
);

-- Volunteers can create their own applications
CREATE POLICY "Volunteers can apply to activities"
ON public.applications FOR INSERT
TO authenticated
WITH CHECK (
  volunteer_id = public.get_user_volunteer_id()
  AND EXISTS (
    SELECT 1 FROM public.activities act
    WHERE act.id = activity_id AND act.status = 'open'
  )
);

-- Homes can approve/reject applications for their own activities; Volunteers can cancel own applied
CREATE POLICY "Homes can review applications; Volunteers can cancel"
ON public.applications FOR UPDATE
TO authenticated
USING (
  volunteer_id = public.get_user_volunteer_id()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.activities act
    WHERE act.id = public.applications.activity_id
    AND act.home_id = public.get_user_home_id()
  )
)
WITH CHECK (
  -- Volunteer can only update status to cancelled
  (volunteer_id = public.get_user_volunteer_id() AND status = 'cancelled')
  -- Host home or admin can approve or reject
  OR EXISTS (
    SELECT 1 FROM public.activities act
    WHERE act.id = public.applications.activity_id
    AND act.home_id = public.get_user_home_id()
  )
  OR public.is_admin()
);

-- ------------------------------------------------------------------------------
-- ATTENDANCE POLICIES
-- ------------------------------------------------------------------------------
-- Volunteers can view their own attendance records; Homes see attendance for their activities
CREATE POLICY "Attendance viewable by volunteer or host home"
ON public.attendance FOR SELECT
TO authenticated
USING (
  volunteer_id = public.get_user_volunteer_id()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.activities act
    WHERE act.id = public.attendance.activity_id
    AND act.home_id = public.get_user_home_id()
  )
);

-- Only host home or admin can mark/insert attendance
CREATE POLICY "Host homes can mark attendance"
ON public.attendance FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.activities act
    WHERE act.id = activity_id
    AND act.home_id = public.get_user_home_id()
  )
);

-- Only host home or admin can update attendance
CREATE POLICY "Host homes can update attendance"
ON public.attendance FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.activities act
    WHERE act.id = public.attendance.activity_id
    AND act.home_id = public.get_user_home_id()
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.activities act
    WHERE act.id = public.attendance.activity_id
    AND act.home_id = public.get_user_home_id()
  )
);

-- ------------------------------------------------------------------------------
-- FEEDBACK POLICIES
-- ------------------------------------------------------------------------------
-- Anyone authenticated can view feedback for activities
CREATE POLICY "Feedback viewable by all authenticated users"
ON public.feedback FOR SELECT
TO authenticated
USING (true);

-- Volunteers and Homes can insert feedback if they participated in the activity
CREATE POLICY "Participants can submit feedback"
ON public.feedback FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  -- Volunteer who participated
  OR (
    volunteer_id = public.get_user_volunteer_id()
    AND EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.activity_id = public.feedback.activity_id
      AND a.volunteer_id = public.feedback.volunteer_id
      AND a.status IN ('approved', 'attended')
    )
  )
  -- Host home
  OR (home_id = public.get_user_home_id())
);

-- ------------------------------------------------------------------------------
-- NOTIFICATIONS POLICIES
-- ------------------------------------------------------------------------------
-- Users can only view their own notifications
CREATE POLICY "Users view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- System / Authenticated users can insert notifications for recipients
CREATE POLICY "Authenticated users can trigger notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);
