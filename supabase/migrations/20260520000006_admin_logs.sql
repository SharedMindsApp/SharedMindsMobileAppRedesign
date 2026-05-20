-- Admin audit log table + automatic role-change logging.
--
-- admin_logs captures explicit admin actions (role changes, etc.).
-- A trigger on profiles.role fires whenever an admin changes a user's role
-- so the audit trail is automatic — no extra code needed at the call site.

-- 1. Table
create table if not exists public.admin_logs (
  id          uuid        primary key default gen_random_uuid(),
  admin_id    uuid        references public.profiles(id) on delete set null,
  action_type text        not null,   -- 'role_change', 'session_end', etc.
  target_id   uuid,                   -- user or resource affected
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists admin_logs_created_at_idx
  on public.admin_logs(created_at desc);

create index if not exists admin_logs_action_type_idx
  on public.admin_logs(action_type, created_at desc);

-- 2. RLS — admins read-only; inserts come from SECURITY DEFINER triggers
alter table public.admin_logs enable row level security;

drop policy if exists "admin_logs_admin_select" on public.admin_logs;
create policy "admin_logs_admin_select"
on public.admin_logs for select
to authenticated
using (public.is_admin());

-- 3. Trigger: auto-log every role change on the profiles table
create or replace function public.log_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    insert into public.admin_logs (admin_id, action_type, target_id, notes)
    values (
      auth.uid(),
      'role_change',
      new.id,
      'Role changed: ' || coalesce(old.role, 'free') || ' → ' || new.role
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_log_role_change on public.profiles;
create trigger profiles_log_role_change
  after update of role on public.profiles
  for each row
  execute function public.log_profile_role_change();
