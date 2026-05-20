-- Sprint 5: Connections — symmetric mutual connection model

CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT connections_unique UNIQUE (requester_id, addressee_id),
  CONSTRAINT connections_no_self CHECK (requester_id != addressee_id)
);

CREATE INDEX IF NOT EXISTS connections_requester_idx ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS connections_addressee_idx ON public.connections(addressee_id);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Each user can see connections they are part of
DROP POLICY IF EXISTS "connections_select" ON public.connections;
CREATE POLICY "connections_select"
ON public.connections FOR SELECT
USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Users can send connection requests (requester must be themselves)
DROP POLICY IF EXISTS "connections_insert" ON public.connections;
CREATE POLICY "connections_insert"
ON public.connections FOR INSERT
WITH CHECK (requester_id = auth.uid());

-- Addressee can accept (update status to accepted); requester can cancel (delete via separate policy)
DROP POLICY IF EXISTS "connections_update" ON public.connections;
CREATE POLICY "connections_update"
ON public.connections FOR UPDATE
USING (addressee_id = auth.uid())
WITH CHECK (status = 'accepted');

-- Either party can remove the connection
DROP POLICY IF EXISTS "connections_delete" ON public.connections;
CREATE POLICY "connections_delete"
ON public.connections FOR DELETE
USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Expand profiles visibility: connected users can see each other's profiles
DROP POLICY IF EXISTS "profiles_select_active_session_owners" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
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
);
