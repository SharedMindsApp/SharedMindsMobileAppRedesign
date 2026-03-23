create table if not exists public.pantry_space_settings (
  space_id uuid primary key references public.spaces(id) on delete cascade,
  auto_add_replacements_to_shopping_list boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists pantry_space_settings_set_updated_at on public.pantry_space_settings;
create trigger pantry_space_settings_set_updated_at
before update on public.pantry_space_settings
for each row execute function public.set_updated_at();

alter table public.pantry_space_settings enable row level security;

drop policy if exists "pantry_space_settings_select_if_space_member" on public.pantry_space_settings;
create policy "pantry_space_settings_select_if_space_member"
on public.pantry_space_settings
for select
using (public.is_space_member(space_id));

drop policy if exists "pantry_space_settings_insert_if_space_write" on public.pantry_space_settings;
create policy "pantry_space_settings_insert_if_space_write"
on public.pantry_space_settings
for insert
with check (public.can_manage_space(space_id));

drop policy if exists "pantry_space_settings_update_if_space_write" on public.pantry_space_settings;
create policy "pantry_space_settings_update_if_space_write"
on public.pantry_space_settings
for update
using (public.can_manage_space(space_id))
with check (public.can_manage_space(space_id));

drop policy if exists "pantry_space_settings_delete_if_space_write" on public.pantry_space_settings;
create policy "pantry_space_settings_delete_if_space_write"
on public.pantry_space_settings
for delete
using (public.can_manage_space(space_id));
