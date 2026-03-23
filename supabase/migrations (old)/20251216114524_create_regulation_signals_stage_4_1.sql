/*
  # Stage 4.1: Regulation Signals System

  1. New Tables
    - `regulation_signal_definitions`
      - Signal metadata and configuration
      - Human-readable labels and explanations
      - Computation rules (stored as JSONB)

    - `regulation_active_signals`
      - Ephemeral signal instances
      - Session-scoped or time-boxed
      - Automatically expire
      - User-visible explanations

  2. Security
    - Enable RLS on all tables
    - Users can only see their own signals
    - No cross-user visibility
    - Read-only for most users

  3. Important Notes
    - Signals are ephemeral and auto-expire
    - No persistent behavioral profiles
    - No risk scores or labels
    - Descriptive, not prescriptive
*/

-- Signal Definitions Registry
CREATE TABLE IF NOT EXISTS regulation_signal_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_key text UNIQUE NOT NULL,
  human_label text NOT NULL,
  short_description text NOT NULL,
  explanation_text text NOT NULL,
  rule_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE regulation_signal_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signal definitions are readable by all authenticated users"
  ON regulation_signal_definitions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Active Signals (Ephemeral)
CREATE TABLE IF NOT EXISTS regulation_active_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_key text NOT NULL,

  -- Display content
  title text NOT NULL,
  description text NOT NULL,
  explanation_why text NOT NULL,

  -- Context data (what triggered this signal)
  context_data jsonb DEFAULT '{}'::jsonb,

  -- Lifecycle
  detected_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  dismissed_at timestamptz,

  -- Session binding
  session_id text,

  -- Metadata
  created_at timestamptz DEFAULT now()
);

ALTER TABLE regulation_active_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own active signals"
  ON regulation_active_signals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND (dismissed_at IS NULL AND expires_at > now()));

CREATE POLICY "Users can dismiss own signals"
  ON regulation_active_signals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_active_signals_user_id ON regulation_active_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_active_signals_expires_at ON regulation_active_signals(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_signals_signal_key ON regulation_active_signals(signal_key);

-- Seed the 5 initial signal definitions
INSERT INTO regulation_signal_definitions (signal_key, human_label, short_description, explanation_text, rule_parameters, display_order) VALUES
(
  'rapid_context_switching',
  'You''ve moved between several things quickly',
  'Frequent switching between projects, tracks, or major contexts in a short window.',
  E'This signal appears when you move between different contexts (projects, tracks, or focus areas) without settling on one for long.\n\nWhat counts as a context: Opening a project, selecting a track, or starting a focus session.\n\nTimeframe used: The last 20 minutes of activity.\n\nWhy this is shown: This pattern is common during exploration, idea capture, or when feeling overwhelmed. It''s not a problem to fix—just something you might want to be aware of.',
  '{"min_switches": 5, "time_window_minutes": 20}'::jsonb,
  1
),
(
  'runaway_scope_expansion',
  'Your project grew quickly in one session',
  'A burst of additive actions that expand scope rather than execute.',
  E'This signal appears when you add many new elements (side projects, offshoot ideas, tracks, or roadmap items) in a short time without completing tasks or entering focus mode.\n\nWhat triggers this: Multiple creations of new project elements within a single session.\n\nWhy this is shown: Expansion is sometimes intentional (ideation mode). Sometimes it''s a sign of excitement or overwhelm. Nothing is blocked or undone—this is just visibility.',
  '{"min_additions": 5, "session_based": true}'::jsonb,
  2
),
(
  'fragmented_focus_session',
  'Focus was started, but interrupted',
  'Focus Mode entered, then exited or context-switched quickly.',
  E'This signal appears when you start Focus Mode but exit or switch contexts shortly after.\n\nWhat counts as fragmented: Starting focus mode, then exiting within a few minutes or switching to a different project.\n\nWhy this is shown: Focus mode is optional and early exits are normal. Your context or priorities may have changed. This is just a reflection of what happened.',
  '{"min_duration_minutes": 5}'::jsonb,
  3
),
(
  'prolonged_inactivity_gap',
  'There was a long pause in activity',
  'No meaningful interaction for a defined period, followed by return.',
  E'This signal appears after you return to the app following a period of no activity.\n\nWhat counts as a gap: No meaningful interactions for several days, followed by re-entry.\n\nWhy this is shown: Life interruptions are normal. Illness, holidays, burnout, and life events happen. This is not treated as abandonment—just acknowledgment that time passed. Welcome back.',
  '{"min_gap_days": 3}'::jsonb,
  4
),
(
  'high_task_intake_without_completion',
  'Many tasks added, few finished',
  'Rapid intake of tasks without corresponding completion.',
  E'This signal appears when several tasks are created without many being marked complete.\n\nWhat triggers this: Adding multiple tasks in a session or day, with few or none marked as done.\n\nWhy this is shown: Capturing tasks is often helpful and necessary. Completion may happen later, or tasks may be moved to other systems. This is about visibility, not judgment.',
  '{"min_tasks_created": 5, "max_tasks_completed": 1, "time_window_hours": 24}'::jsonb,
  5
);

-- Function to auto-cleanup expired signals
CREATE OR REPLACE FUNCTION cleanup_expired_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM regulation_active_signals
  WHERE expires_at < now() OR dismissed_at IS NOT NULL;
END;
$$;