-- public_summary — the limited, owner-written blurb shown in the public project
-- overview (distinct from the internal description, which may be sensitive).
--
-- NOTE: projects.project_type already exists (see 20260526000003 / ...004) with
-- its own taxonomy — passion · creative · startup · client · employment ·
-- freelance · learning · personal — and live data. We REUSE that taxonomy
-- (lib/projectTypes.ts mirrors it) rather than introduce a conflicting set, so
-- this migration only adds the genuinely-new public_summary column. Idempotent.

alter table public.projects
  add column if not exists public_summary text;
