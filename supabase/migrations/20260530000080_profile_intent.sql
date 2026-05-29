-- profile_intent — the "what I want / what I offer right now" layer.
--
-- The give/get columns (offering, seeking, wanted_skills, skill_levels) already
-- exist but were never surfaced. This adds the three missing intent fields so a
-- profile can advertise not just WHO you are but what you're doing and what
-- would help — the serendipity fuel that makes connection purposeful.

alter table public.profiles
  add column if not exists headline      text,        -- one-line hook, ≤80 chars (enforced client-side)
  add column if not exists current_focus text,        -- "right now" line, ≤140 chars
  add column if not exists open_to       text[] not null default '{}';  -- opportunity signals (see lib/openTo.ts)
