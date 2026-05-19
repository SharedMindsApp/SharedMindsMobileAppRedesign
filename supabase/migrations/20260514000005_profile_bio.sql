-- Sprint 6: Profile — add bio field for track record page

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;
