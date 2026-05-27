-- Three-level visibility model for focus sessions.
--
-- Until now visibility was implied by session_mode: solo = fully private,
-- one_on_one/group = fully public. That's binary and loses the useful
-- middle ground: "I'm focusing right now, my connections can see I'm in
-- the zone, but they can't see WHAT I'm working on."
--
-- New `visibility` column with three values:
--
--   private  — invisible everywhere except to the host. Solo default.
--   presence — connections see "Matthew is focusing now" (status only,
--              no goal text). NEVER appears in the public marketplace.
--              Quick Timer default.
--   public   — fully discoverable in the marketplace + connection feeds.
--              Goal text is shown. one_on_one + group default.
--
-- Existing rows are backfilled based on session_mode so historical data
-- stays consistent with how it was created. Future rows pick up the
-- per-mode default via the INSERT path in SessionService.

-- ── 1. Add the column ─────────────────────────────────────────────────

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS visibility text;

-- Backfill from session_mode for any rows that don't have a value yet.
UPDATE public.focus_sessions
SET visibility = CASE
  WHEN session_mode = 'solo' THEN 'private'
  ELSE 'public'
END
WHERE visibility IS NULL;

-- Now lock it down: NOT NULL with check constraint + sensible default.
ALTER TABLE public.focus_sessions
  ALTER COLUMN visibility SET NOT NULL,
  ALTER COLUMN visibility SET DEFAULT 'public';

ALTER TABLE public.focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_visibility_check;

ALTER TABLE public.focus_sessions
  ADD CONSTRAINT focus_sessions_visibility_check
  CHECK (visibility IN ('private', 'presence', 'public'));

-- ── 2. Index for "connections-visible" lookups ────────────────────────
--
-- The home-page pulse + community presence feeds will eventually filter
-- by `visibility != 'private'` on currently-active sessions. Partial
-- index keeps it efficient — the dominant case is completed/ended rows
-- where presence doesn't matter.

CREATE INDEX IF NOT EXISTS focus_sessions_visible_active_idx
  ON public.focus_sessions(visibility, start_time)
  WHERE status = 'active' AND visibility IN ('presence', 'public');
