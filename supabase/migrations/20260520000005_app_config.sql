-- App-wide configuration key-value store.
-- Admins can read and write; all other roles get no access.

create table if not exists public.app_config (
  key        text primary key,
  value      jsonb        not null,
  updated_by uuid         references public.profiles(id) on delete set null,
  updated_at timestamptz  not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "app_config_admin_read"  on public.app_config;
drop policy if exists "app_config_admin_write" on public.app_config;

create policy "app_config_admin_read"
on public.app_config for select
to authenticated
using (public.is_admin());

create policy "app_config_admin_write"
on public.app_config for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Seed sensible defaults (safe to re-run: ON CONFLICT DO NOTHING)
insert into public.app_config (key, value) values
  ('signups_open',             'true'::jsonb),
  ('maintenance_mode',         'false'::jsonb),
  ('default_session_minutes',  '45'::jsonb)
on conflict (key) do nothing;
