-- Re-categorise session music around USER STATE, not cognitive load.
--
-- The original taxonomy (deep / medium / light) was organised by what kind
-- of work you're doing. The new taxonomy is organised by what mental state
-- you're arriving in and what state you need to reach. Each category also
-- has a target binaural frequency we'll layer in later.
--
-- 7 user states → 6 categories (Restless + Scattered both → Anchor):
--
--   🌊 calm    — stressed / overwhelmed → Alpha 9 Hz
--   ⚓ anchor  — scattered or restless  → Low beta 13 Hz
--   ☀️ lift    — low energy / foggy     → Alpha–beta 10 Hz
--   🌀 flow    — neutral / ready        → Low beta 14 Hz
--   🌑 deep    — already hyperfocused   → Gamma 40 Hz
--   🌿 open    — creative / brainstorm  → Theta–alpha 8 Hz
--
-- Migration of existing rows (we have none yet, but be safe):
--   deep   → deep   (closest semantic fit)
--   medium → flow   (steady mid-energy maps to neutral target)
--   light  → open   (gentle/organic maps to creative)

-- ── 1. Drop the old constraint ─────────────────────────────────────────

ALTER TABLE public.session_tracks
  DROP CONSTRAINT IF EXISTS session_tracks_category_check;

-- ── 2. Backfill any existing rows to the new vocabulary ────────────────

UPDATE public.session_tracks
SET category = CASE category
  WHEN 'deep'   THEN 'deep'
  WHEN 'medium' THEN 'flow'
  WHEN 'light'  THEN 'open'
  ELSE category
END
WHERE category IN ('deep', 'medium', 'light');

-- ── 3. Add the new constraint ──────────────────────────────────────────

ALTER TABLE public.session_tracks
  ADD CONSTRAINT session_tracks_category_check
  CHECK (category IN ('calm', 'anchor', 'lift', 'flow', 'deep', 'open'));

-- The category_active index from the original migration is still valid —
-- it indexes (category, is_active) regardless of which values category
-- can take, so no rebuild needed.

-- ── 4. Document target binaural frequencies via a lookup function ──────
--
-- Single source of truth for the matrix. The client uses this when the
-- binaural-beat layer is enabled. We could store as a table but a
-- function keeps it deterministic and read-only without RLS overhead.

CREATE OR REPLACE FUNCTION public.music_category_target_hz(category text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE category
    WHEN 'calm'   THEN 9     -- Alpha — slow the system down
    WHEN 'anchor' THEN 13    -- Low beta — rhythmic structure to latch onto
    WHEN 'lift'   THEN 10    -- Alpha-beta — gentle activation
    WHEN 'flow'   THEN 14    -- Low beta — deepen into focus
    WHEN 'deep'   THEN 40    -- Gamma — maintain hyperfocus
    WHEN 'open'   THEN 8     -- Theta-alpha — creative daydream zone
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.music_category_target_hz(text) TO authenticated, anon;
