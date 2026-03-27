alter table public.pantry_space_settings
  add column if not exists pricing_city text,
  add column if not exists pricing_country text;
