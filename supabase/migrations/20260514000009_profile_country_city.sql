-- Profile location: structured country + city
-- Adds ISO-2 country_code and city columns to profiles.
-- The legacy `location` column is preserved and continues to receive a
-- formatted display string ("City, Country") for backwards compatibility
-- with anywhere that reads it directly.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS city text;

-- Length guard: country_code is ISO 3166-1 alpha-2.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_country_code_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_country_code_format
  CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

-- Index for future "people in country X" queries.
CREATE INDEX IF NOT EXISTS profiles_country_code_idx
  ON public.profiles(country_code)
  WHERE country_code IS NOT NULL;
