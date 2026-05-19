-- Profile privacy: hide-from-directory toggle
--
-- Lets users opt out of the public members directory at /people.
-- Their profile remains viewable by direct URL — connections, DM
-- partners, and session co-attendees can still find them. They just
-- don't appear in browse/discover.
--
-- Matches LinkedIn-style "private mode" semantics: hidden ≠ anonymous.
-- People they've actively engaged with (sessions, DMs, projects)
-- still see their name in those contexts.

alter table public.profiles
  add column if not exists is_hidden_from_directory boolean not null default false;

create index if not exists profiles_directory_visible_idx
  on public.profiles(is_hidden_from_directory)
  where is_hidden_from_directory = false;
