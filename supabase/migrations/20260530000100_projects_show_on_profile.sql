-- projects.show_on_profile — opt a project into the public "Building" section.
--
-- Projects are normally space/member-scoped (can_see_project RLS). A profile is
-- public to any member, so a project the owner chooses to feature needs to be
-- readable by anyone — gated ONLY to opted-in projects, never the private ones.

alter table public.projects
  add column if not exists show_on_profile boolean not null default false;

create index if not exists projects_show_on_profile_idx
  on public.projects (created_by)
  where show_on_profile = true;

-- Additive read policy: any authenticated member may SELECT a project that its
-- owner has explicitly featured. Does NOT widen access to private/unfeatured
-- projects — those stay behind the existing can_see_project policy.
drop policy if exists "projects featured are public" on public.projects;
create policy "projects featured are public" on public.projects
  for select using (show_on_profile = true and auth.role() = 'authenticated');
