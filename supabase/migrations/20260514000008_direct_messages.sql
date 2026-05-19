-- Direct messaging — simple plain-text DM system for SharedMinds
-- Uses separate tables to avoid conflict with the legacy encrypted conversations system

CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dm_participants (
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at    timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dm_messages_conv_idx ON public.dm_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_participants_user_idx ON public.dm_participants(user_id);

ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_participants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages       ENABLE ROW LEVEL SECURITY;

-- Conversations: visible if you're a participant
CREATE POLICY "dm_conversations_select" ON public.dm_conversations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dm_participants dp
  WHERE dp.conversation_id = id AND dp.user_id = auth.uid()
));

-- Participants: visible within conversations you belong to
CREATE POLICY "dm_participants_select" ON public.dm_participants FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dm_participants dp2
  WHERE dp2.conversation_id = conversation_id AND dp2.user_id = auth.uid()
));

-- Participants: update own last_read_at
CREATE POLICY "dm_participants_update" ON public.dm_participants FOR UPDATE
USING (user_id = auth.uid());

-- Messages: read if participant
CREATE POLICY "dm_messages_select" ON public.dm_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dm_participants dp
  WHERE dp.conversation_id = conversation_id AND dp.user_id = auth.uid()
));

-- Messages: insert as yourself if participant
CREATE POLICY "dm_messages_insert" ON public.dm_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.dm_participants dp
    WHERE dp.conversation_id = conversation_id AND dp.user_id = auth.uid()
  )
);

-- SECURITY DEFINER function: get or create a 1:1 DM conversation
CREATE OR REPLACE FUNCTION public.get_or_create_dm(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Look for existing conversation between these two users
  SELECT dp1.conversation_id INTO v_id
  FROM public.dm_participants dp1
  JOIN public.dm_participants dp2
    ON dp1.conversation_id = dp2.conversation_id
  WHERE dp1.user_id = auth.uid()
    AND dp2.user_id = other_user_id
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Create a fresh conversation
  INSERT INTO public.dm_conversations DEFAULT VALUES RETURNING id INTO v_id;

  INSERT INTO public.dm_participants (conversation_id, user_id) VALUES
    (v_id, auth.uid()),
    (v_id, other_user_id);

  RETURN v_id;
END;
$$;

-- Profiles must be visible to DM participants so names can be shown
-- Extend the existing profiles policy to include DM participants
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.focus_sessions fs
    WHERE fs.user_id = id AND fs.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.status = 'accepted'
      AND ((c.requester_id = auth.uid() AND c.addressee_id = id)
        OR (c.addressee_id = auth.uid() AND c.requester_id = id))
  )
  OR EXISTS (
    SELECT 1 FROM public.dm_participants dp1
    JOIN public.dm_participants dp2 ON dp1.conversation_id = dp2.conversation_id
    WHERE dp1.user_id = auth.uid() AND dp2.user_id = id
  )
);
