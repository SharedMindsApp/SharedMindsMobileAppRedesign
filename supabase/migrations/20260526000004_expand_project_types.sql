-- ─────────────────────────────────────────────────────────────────
-- Expand project_type CHECK constraint
--
-- The original 4 types (passion/client/employment/freelance) missed
-- common shapes — startups, creative works, learning projects, and
-- personal goals are all materially different from the existing four
-- and drive different AI roadmap suggestions.
--
-- New full set:
--   passion · creative · startup · client · employment · freelance ·
--   learning · personal
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_project_type_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_project_type_check
  CHECK (project_type IN (
    'passion', 'creative', 'startup', 'client',
    'employment', 'freelance', 'learning', 'personal'
  ));
