-- Quick Activities: fundamental focus + brainstorming + wellbeing additions.
--
-- The library covered role-specific work well but was thin on the
-- "stuff everyone does sometimes" universals: Meditation, Brainstorming,
-- Deep focus, Reading, Studying, Journaling, Pomodoro, Breathwork, etc.
-- Users searching Browse Library for "focus", "meditation" or "brainstorm"
-- were getting zero matches, which is a bad first impression of the
-- library's depth.
--
-- This migration adds ~16 universal templates tagged '{all}' so they
-- show up regardless of work_type. Sort_order in the 5..195 range so
-- they interleave near the top of the universal bucket rather than at
-- the bottom (the existing universals occupy 100..200 in v1+v2).

insert into public.activity_templates (label, emoji, default_minutes, work_types, sort_order) values
  ('Deep focus',              '🎯', 50, '{all}',  5),
  ('Pomodoro round',          '🍅', 25, '{all}',  8),
  ('Brainstorming',           '🧠', 25, '{all}', 12),
  ('Idea exploration',        '💡', 25, '{all}', 14),
  ('Problem solving',         '🤔', 50, '{all}', 16),
  ('Mind map',                '🕸️', 15, '{all}', 18),
  ('Reading',                 '📚', 25, '{all}', 22),
  ('Studying',                '🎓', 50, '{all}', 24),
  ('Note-taking',             '📝', 25, '{all}', 26),
  ('Research deep dive',      '🔬', 50, '{all}', 28),
  ('Journaling',              '📓', 15, '{all}', 32),
  ('Meditation',              '🧘', 15, '{all}', 34),
  ('Breathwork',              '🌬️', 10, '{all}', 36),
  ('Movement break',          '🏃', 15, '{all}', 38),
  ('Side project',            '🛠️', 50, '{all}', 42),
  ('Sketching ideas',         '✏️', 25, '{all}', 44)
on conflict do nothing;
