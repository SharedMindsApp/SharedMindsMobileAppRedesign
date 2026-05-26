-- Project cover image — text colour toggle.
--
-- The hero renders project title + description ON TOP of the cover image
-- with a darken gradient for legibility. When the user picks a light
-- background colour (white, cream, sage), the default white title text
-- gets muted by the dark overlay or — worse — disappears entirely if
-- they reduce the overlay.
--
-- This adds a simple binary: cover_text_color = 'light' | 'dark'.
-- - 'light' (default, today's behaviour) → white text + dark gradient overlay
-- - 'dark' → near-black text + light gradient overlay (or no overlay)
--
-- A binary is enough — full hex picking for text on top of a cover image
-- usually backfires (people pick colours that clash with their bg).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_text_color text NOT NULL DEFAULT 'light';

ALTER TABLE public.projects
  ADD CONSTRAINT projects_cover_text_color_check
    CHECK (cover_text_color IN ('light', 'dark'));
