-- project_type + public_summary — not every project is something you're "building".
--
-- A project is the macro goal a session chips at, and that goal has different
-- natures (building a product, learning a skill, client work, …). The type
-- drives how it's labelled on the profile and whether it's a public candidate.
-- public_summary is the limited, owner-written blurb shown in the public
-- overview — distinct from the internal description (which may be sensitive).

alter table public.projects
  add column if not exists project_type   text not null default 'building',
  add column if not exists public_summary text;

-- Keep the type to the known set (mirrors lib/projectTypes.ts).
do $$ begin
  alter table public.projects
    add constraint projects_type_check
    check (project_type in ('building','creating','launching','learning','client','exploring','personal'));
exception when duplicate_object then null; end $$;
