-- Live session debrief.
--
-- Each participant submits an outcome for the session WHILE STILL IN THE CALL,
-- so everyone sees each other's answers in real time. This is the core
-- accountability ritual: "I said I'd finish X, here's whether I did."
--
-- One row per (session, user). Inserted when the user picks an outcome; if
-- they walk away without picking, a separate finalize step records 'no_answer'
-- when the 60s timeout elapses.

CREATE TABLE IF NOT EXISTS session_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN ('finished', 'partially', 'something_came_up', 'no_answer')),
  /** Snapshot of the goal the participant declared, so the debrief survives
      even if the underlying task is renamed or deleted later. */
  declared_goal text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS session_outcomes_session_idx ON session_outcomes(session_id);
CREATE INDEX IF NOT EXISTS session_outcomes_user_idx    ON session_outcomes(user_id);

ALTER TABLE session_outcomes ENABLE ROW LEVEL SECURITY;

-- Users can read all outcomes for any session — needed for the shipped feed
-- to surface group-session outcomes publicly, and for the debrief to show
-- everyone in the call each other's answers in real time. (Sessions themselves
-- are already public-readable, so this isn't a new leak.)
DROP POLICY IF EXISTS "session_outcomes_select_any" ON session_outcomes;
CREATE POLICY "session_outcomes_select_any" ON session_outcomes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "session_outcomes_insert_self" ON session_outcomes;
CREATE POLICY "session_outcomes_insert_self" ON session_outcomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "session_outcomes_update_self" ON session_outcomes;
CREATE POLICY "session_outcomes_update_self" ON session_outcomes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime: participants subscribe to this so they see each other's answers
-- as they come in (no polling).
ALTER PUBLICATION supabase_realtime ADD TABLE session_outcomes;

-- Touch updated_at on update so clients can drive smooth UI animations
CREATE OR REPLACE FUNCTION touch_session_outcomes_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_outcomes_touch_updated ON session_outcomes;
CREATE TRIGGER session_outcomes_touch_updated
  BEFORE UPDATE ON session_outcomes
  FOR EACH ROW EXECUTE FUNCTION touch_session_outcomes_updated_at();

COMMENT ON TABLE session_outcomes IS
  'Per-participant outcome captured at the end of a focus session via the live debrief flow. Drives the shipped feed and accountability stats.';
