-- Session templates — curated structures for both solo and group
-- focus sessions, modelled after Flown's "intro → intentions → deep
-- work → break → deep work → reflect → farewell" pattern (industry
-- standard, not protected IP).
--
-- Two new shapes:
--
--   • session_templates table — admin-curated library of named
--     templates. Each has an ordered array of segments stored as
--     JSONB. Users pick a template at scheduling time; the segments
--     get copied onto the new focus_sessions row.
--
--   • focus_sessions.segments column — JSONB array of segment
--     objects. Each segment:
--       {
--         "kind": "intro" | "intentions" | "work" | "break"
--               | "reflect" | "farewell" | "wizard",
--         "label": "Deep work",
--         "minutes": 50,
--         "wizard": "intentions"  -- optional
--       }
--
-- The "scope" column lets us show different templates depending on
-- whether the user is creating a solo or group session. Solo templates
-- use "platform-hosted" voice (no human host); group templates assume
-- a real host facilitating.
--
-- Runtime progression (auto-advance through segments mid-session,
-- fire wizards at the right moments, play audio cues) ships in a
-- follow-up migration — this one just establishes data + lets the UI
-- display structures.

-- ── Templates table ────────────────────────────────────────────

create table if not exists public.session_templates (
  id              uuid primary key default gen_random_uuid(),
  label           text not null,
  /** Short marketing-style hook. Shown on the picker card. */
  tagline         text not null,
  /** 1–2 sentence description shown when the template is selected. */
  description     text not null,
  emoji           text not null,
  /** 'solo' | 'group' — drives where the template appears in pickers.
   *  A future 'one_on_one' value is reserved but not yet seeded. */
  scope           text not null check (scope in ('solo','group','one_on_one')),
  /** Computed at insert/seed time as sum(segments.minutes). Kept as
   *  a column for cheap sorting and quick display without re-summing. */
  total_minutes   integer not null check (total_minutes between 5 and 300),
  /** Ordered segments. See file header for shape. */
  segments        jsonb not null default '[]'::jsonb,
  sort_order      integer not null default 100,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists session_templates_scope_idx
  on public.session_templates(scope, is_active, sort_order);

alter table public.session_templates enable row level security;

drop policy if exists "session_templates_read_all" on public.session_templates;
create policy "session_templates_read_all"
on public.session_templates for select
to anon, authenticated
using (is_active = true);

-- ── Segments column on focus_sessions ──────────────────────────

alter table public.focus_sessions
  add column if not exists segments jsonb;

comment on column public.focus_sessions.segments is
  'Ordered array of segment objects copied from session_templates at session creation. Drives the segment timeline in the detail sheet and (future) mid-session auto-advance. NULL = unstructured session.';

-- ── Seed library ───────────────────────────────────────────────

-- Solo templates (platform-hosted voice — the platform is the
-- "facilitator", no human host).
insert into public.session_templates
  (label,             tagline,                                            description,                                                                                                                              emoji,  scope,  total_minutes, segments, sort_order) values

  ('Morning Anchor',  'Start the day with one clear intention.',
                       'A short structured ritual. The platform walks you through grounding, setting one focus, then a deep work block. End with a clean close.',
                       '🌅',   'solo',  30,
   $$[
     {"kind":"intro","label":"Settle in","minutes":3},
     {"kind":"intentions","label":"What’s today’s one thing?","minutes":5,"wizard":"intentions"},
     {"kind":"work","label":"Deep work","minutes":20},
     {"kind":"reflect","label":"Capture + close","minutes":2}
   ]$$::jsonb, 10),

  ('Focus Sprint',    'Single-task, single-thread, 50 minutes.',
                       'Pick the next chunk, then 45 minutes of unbroken work. Closes with a quick "what did I do?" so the session leaves a trace.',
                       '🎯',   'solo',  50,
   $$[
     {"kind":"intentions","label":"Pick the next chunk","minutes":3,"wizard":"intentions"},
     {"kind":"work","label":"Deep work","minutes":45},
     {"kind":"reflect","label":"What did I do?","minutes":2}
   ]$$::jsonb, 20),

  ('Deep Dive',       'Real depth — two 40-minute blocks with a reset.',
                       'For the work that needs more than a sprint. Two protected blocks of deep work with a stand-up break in between. Reflection at the end captures progress and any open loops.',
                       '🌊',   'solo',  90,
   $$[
     {"kind":"intentions","label":"Set intention + clear distractions","minutes":5,"wizard":"intentions"},
     {"kind":"work","label":"Deep work I","minutes":40},
     {"kind":"break","label":"Stand + reset","minutes":5},
     {"kind":"work","label":"Deep work II","minutes":35},
     {"kind":"reflect","label":"Reflect + capture","minutes":5}
   ]$$::jsonb, 30),

  ('Pomodoro Pulse',  'Three short sprints, two micro-breaks.',
                       'Classic Pomodoro pacing for when your focus is patchy. Three 20-minute sprints separated by 5-minute resets. Better than one long session on a scattered day.',
                       '⏱️',   'solo',  75,
   $$[
     {"kind":"intentions","label":"Pick what to do","minutes":3,"wizard":"intentions"},
     {"kind":"work","label":"Sprint 1","minutes":20},
     {"kind":"break","label":"Reset","minutes":5},
     {"kind":"work","label":"Sprint 2","minutes":20},
     {"kind":"break","label":"Reset","minutes":5},
     {"kind":"work","label":"Sprint 3","minutes":20},
     {"kind":"reflect","label":"Wrap","minutes":2}
   ]$$::jsonb, 40),

  ('Wind Down',       'End the workday on your own terms.',
                       'A 25-minute closing ritual — breathe, set tomorrow''s first move, capture wins, close laptop. Stops the day bleeding into the evening.',
                       '🌙',   'solo',  25,
   $$[
     {"kind":"intro","label":"Breathe","minutes":3,"wizard":"breathing"},
     {"kind":"work","label":"Tomorrow’s first move + clear inbox","minutes":15},
     {"kind":"reflect","label":"Wins of the day","minutes":5},
     {"kind":"farewell","label":"Close laptop","minutes":2}
   ]$$::jsonb, 50),

-- Group templates (assumes a real human host facilitating).
  ('Drop-in Coworking', 'Lowest commitment — just work together.',
                        '45 minutes of quiet parallel work with a brief hello and bye. No intentions, no breaks. Good when you just need company.',
                        '🪑',   'group', 45,
   $$[
     {"kind":"intro","label":"Hello + check-in","minutes":2},
     {"kind":"work","label":"Quiet co-working","minutes":40},
     {"kind":"farewell","label":"Bye","minutes":3}
   ]$$::jsonb, 110),

  ('Pomodoro Pair',   '60 minutes — two sprints with a chat break.',
                        'Two 25-minute sprints separated by a 5-minute chat. The break is intentional — small talk now means deeper focus next round.',
                        '🤝',   'group', 60,
   $$[
     {"kind":"intro","label":"Welcome + intentions","minutes":3,"wizard":"intentions"},
     {"kind":"work","label":"Sprint 1","minutes":25},
     {"kind":"break","label":"Quick chat / stretch","minutes":5},
     {"kind":"work","label":"Sprint 2","minutes":25},
     {"kind":"farewell","label":"Wrap","minutes":2}
   ]$$::jsonb, 120),

  ('Deep Work Block', 'The classic 2-hour focus block.',
                        'Two 50-minute deep work blocks with a 5-minute break. Intentions at the start, reflections at the end. Industry-standard format for focused group co-working.',
                        '🌀',   'group', 120,
   $$[
     {"kind":"intro","label":"Welcome","minutes":3},
     {"kind":"intentions","label":"Set intentions","minutes":5,"wizard":"intentions"},
     {"kind":"work","label":"Deep work I","minutes":50},
     {"kind":"break","label":"Stretch break","minutes":5},
     {"kind":"work","label":"Deep work II","minutes":50},
     {"kind":"reflect","label":"Reflections","minutes":5},
     {"kind":"farewell","label":"Farewell","minutes":2}
   ]$$::jsonb, 130),

  ('Triple Sprint',   'Three hours, three blocks, real momentum.',
                        'Three 50-minute deep work blocks with 10-minute breaks between. The longer breaks let you actually rest. Reserved for the biggest, hairiest pieces of work.',
                        '🚀',   'group', 180,
   $$[
     {"kind":"intro","label":"Welcome","minutes":3},
     {"kind":"intentions","label":"Set intentions","minutes":5,"wizard":"intentions"},
     {"kind":"work","label":"Deep work I","minutes":50},
     {"kind":"break","label":"Break","minutes":10},
     {"kind":"work","label":"Deep work II","minutes":50},
     {"kind":"break","label":"Break","minutes":10},
     {"kind":"work","label":"Deep work III","minutes":50},
     {"kind":"reflect","label":"Reflections","minutes":5},
     {"kind":"farewell","label":"Farewell","minutes":2}
   ]$$::jsonb, 140),

  ('Body Double Drift', 'Loose, unstructured presence for 90 minutes.',
                        'For ADHD-leaning weeks when ceremony is a barrier. Brief hello, 80 minutes of body-double presence (no segments, no transitions), short reflection.',
                        '🌿',   'group', 90,
   $$[
     {"kind":"intro","label":"Hello","minutes":3},
     {"kind":"work","label":"Just work together","minutes":80},
     {"kind":"reflect","label":"Reflect","minutes":5},
     {"kind":"farewell","label":"Bye","minutes":2}
   ]$$::jsonb, 150)
on conflict do nothing;
