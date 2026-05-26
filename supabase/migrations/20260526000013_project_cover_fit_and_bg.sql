-- Project cover image — fit mode + background colour.
--
-- The 20260526000012 migration added cover_x / cover_y / cover_zoom for
-- focal-point + zoom control under a fixed "cover" fit model. That works
-- for photos where you want the image edge-to-edge, but fails for wide
-- illustrations (like a 3:1 banner) where cover-fit chops the sides.
--
-- This migration adds:
--   - cover_fit: 'cover' (crop-to-fill, today's default) | 'contain' (fit-whole-image)
--   - cover_bg_color: nullable hex string painted behind the image when bands show
--
-- And widens cover_zoom min from 100 → 50 so users can shrink the image
-- further than its natural contain size for extra breathing room.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_fit      text NOT NULL DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS cover_bg_color text;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_cover_fit_check
    CHECK (cover_fit IN ('cover', 'contain'));

-- Widen the zoom range. Drop + re-add the constraint because PG doesn't
-- support modifying a CHECK in place.
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_cover_zoom_range_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_cover_zoom_range_check
    CHECK (cover_zoom BETWEEN 50 AND 300);

-- Sanity: the colour should look like a hex (cheap regex). NULL means
-- "no background — show whatever's behind the cover container," which
-- in practice is the gradient fallback or surface tone.
ALTER TABLE public.projects
  ADD CONSTRAINT projects_cover_bg_color_format_check
    CHECK (cover_bg_color IS NULL OR cover_bg_color ~ '^#[0-9A-Fa-f]{6}$');
