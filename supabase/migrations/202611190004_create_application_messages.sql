-- =============================================================================
-- SAHAAYA — Secure two-way application chat
-- Creates one persistent conversation per volunteer application.
-- Run only in the Sahaaya Supabase project.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.application_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL
        REFERENCES public.applications(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL
        CHECK (sender_role IN ('volunteer', 'home', 'admin')),
    message TEXT NOT NULL
        CHECK (
            length(trim(message)) BETWEEN 1 AND 4000
        ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Efficient chronological conversation reads.
CREATE INDEX IF NOT EXISTS idx_application_messages_conversation
    ON public.application_messages (application_id, created_at, id);

CREATE INDEX IF NOT EXISTS idx_application_messages_sender
    ON public.application_messages (sender_id);

ALTER TABLE public.application_messages ENABLE ROW LEVEL SECURITY;

-- Remove any earlier policies with these names so this migration is repeatable.
DROP POLICY IF EXISTS "Conversation participants and admins can read messages"
    ON public.application_messages;
DROP POLICY IF EXISTS "Conversation participants and admins can send messages"
    ON public.application_messages;

-- A participant can read only the conversation for their own application.
CREATE POLICY "Conversation participants and admins can read messages"
ON public.application_messages
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.applications AS app
        WHERE app.id = application_messages.application_id
          AND (
              app.volunteer_id = public.get_user_volunteer_id()
              OR EXISTS (
                  SELECT 1
                  FROM public.activities AS act
                  WHERE act.id = app.activity_id
                    AND act.home_id = public.get_user_home_id()
              )
          )
    )
);

-- A sender can only write as their authenticated profile and their actual
-- participant role. Application ownership is verified in the database.
CREATE POLICY "Conversation participants and admins can send messages"
ON public.application_messages
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND (
        (
            sender_role = 'volunteer'
            AND EXISTS (
                SELECT 1
                FROM public.profiles AS profile
                JOIN public.volunteers AS volunteer
                  ON volunteer.profile_id = profile.id
                JOIN public.applications AS app
                  ON app.volunteer_id = volunteer.id
                WHERE profile.id = auth.uid()
                  AND profile.role = 'volunteer'
                  AND app.id = application_messages.application_id
            )
        )
        OR (
            sender_role = 'home'
            AND EXISTS (
                SELECT 1
                FROM public.profiles AS profile
                JOIN public.old_age_homes AS home
                  ON home.profile_id = profile.id
                JOIN public.activities AS act
                  ON act.home_id = home.id
                JOIN public.applications AS app
                  ON app.activity_id = act.id
                WHERE profile.id = auth.uid()
                  AND profile.role = 'home'
                  AND app.id = application_messages.application_id
            )
        )
        OR (
            sender_role = 'admin'
            AND public.is_admin()
        )
    )
);

-- No UPDATE or DELETE policy is intentionally provided: chat history is
-- append-only for authenticated clients. RLS remains enabled.
REVOKE ALL ON TABLE public.application_messages FROM anon, public;
GRANT SELECT, INSERT ON TABLE public.application_messages TO authenticated;
