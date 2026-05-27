-- Music library expansion: 8 → 9 albums.
--
-- Two changes from the v6 → v8 spec:
--
--   1. `open` is renamed to `zen` and reframed as Japanese / East Asian
--      instrumental music (shakuhachi, koto, taiko etc.) for the
--      creative / brainstorming state. Same target frequency
--      (Theta–alpha 8 Hz), different sonic identity.
--
--   2. NEW album `dusk` — Middle Eastern modal scales (oud, ney,
--      maqam-based melodies) for the "creative / contemplative" state.
--      Also targets 8 Hz so it sits in the same brainwave family as
--      zen but offers a more pensive/introspective musical character.
--
-- IMPORTANT: this migration renames the DB category + file_path prefix
-- but does NOT rename the actual files in Supabase Storage. After
-- running the migration, manually rename the `open/` folder in the
-- session-music bucket to `zen/` (or upload the files under the new
-- prefix). Otherwise tracks will 404 on play.

-- ── 1. Update existing `open` rows to `zen` ───────────────────────────
--
-- Done BEFORE swapping the CHECK constraint so the UPDATE doesn't
-- violate the new constraint mid-transaction. file_path gets a prefix
-- swap so it points at the new storage path.

UPDATE public.session_tracks
SET
  category = 'zen',
  file_path = regexp_replace(file_path, '^open/', 'zen/')
WHERE category = 'open';

-- ── 2. Swap the CHECK constraint ──────────────────────────────────────

ALTER TABLE public.session_tracks
  DROP CONSTRAINT IF EXISTS session_tracks_category_check;

ALTER TABLE public.session_tracks
  ADD CONSTRAINT session_tracks_category_check
  CHECK (category IN ('calm', 'anchor', 'lift', 'flow', 'deep', 'zen', 'dusk', 'drive', 'score'));

-- ── 3. Extend music_category_target_hz() ──────────────────────────────

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
    WHEN 'zen'    THEN 8     -- Theta-alpha — Japanese / East Asian creative daydream
    WHEN 'dusk'   THEN 8     -- Theta-alpha — Middle Eastern modal contemplative
    WHEN 'drive'  THEN 16    -- Mid-beta — external rhythm as fuel
    WHEN 'score'  THEN 12    -- Alpha — orchestral gravitas
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.music_category_target_hz(text) TO authenticated, anon;
