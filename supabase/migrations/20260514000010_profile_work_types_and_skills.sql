-- Multi-role identity + skills.
-- Replaces the single `work_type` column with a `work_types` array, and adds
-- a `skills` array for LinkedIn-style profile tags.
--
-- The legacy `work_type` column is kept and continues to receive the first
-- element of `work_types` so older code paths keep working.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS work_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills      text[] NOT NULL DEFAULT '{}';

-- Backfill: anyone with a single work_type set gets it copied into the new array.
UPDATE public.profiles
SET work_types = ARRAY[work_type]
WHERE work_type IS NOT NULL
  AND (work_types IS NULL OR array_length(work_types, 1) IS NULL);

-- Length caps. Multi-role identity, not free-for-all.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_work_types_count;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_work_types_count
  CHECK (array_length(work_types, 1) IS NULL OR array_length(work_types, 1) <= 5);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_skills_count;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_skills_count
  CHECK (array_length(skills, 1) IS NULL OR array_length(skills, 1) <= 30);

-- GIN indexes for "find me people who do X" / "find me people with skill Y" queries.
CREATE INDEX IF NOT EXISTS profiles_work_types_gin_idx
  ON public.profiles USING gin (work_types);

CREATE INDEX IF NOT EXISTS profiles_skills_gin_idx
  ON public.profiles USING gin (skills);
