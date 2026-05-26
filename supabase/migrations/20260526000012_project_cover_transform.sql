-- Project cover image position + zoom.
--
-- The cover_image_url is already in place from 20260526000007. This adds
-- the three transform fields so the user can adjust which part of the
-- image is visible (cover_x, cover_y as percentages) and how far in we
-- zoom (cover_zoom as a multiplier × 100).
--
-- Defaults match the previous "centered cover-fit" rendering — every
-- existing project keeps looking identical until its owner customises.
--
-- Stored as smallint not float to dodge serialisation quirks and keep
-- the values comparable in the unlikely event we ever query them.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_x    smallint NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS cover_y    smallint NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS cover_zoom smallint NOT NULL DEFAULT 100;

-- Reasonable bounds: 0-100 for position, 100-300 for zoom (1x to 3x).
ALTER TABLE public.projects
  ADD CONSTRAINT projects_cover_x_range_check
    CHECK (cover_x BETWEEN 0 AND 100),
  ADD CONSTRAINT projects_cover_y_range_check
    CHECK (cover_y BETWEEN 0 AND 100),
  ADD CONSTRAINT projects_cover_zoom_range_check
    CHECK (cover_zoom BETWEEN 100 AND 300);
