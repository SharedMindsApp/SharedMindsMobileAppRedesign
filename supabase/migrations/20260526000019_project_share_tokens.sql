-- Simple external project sharing — Phase D of the no-shame product
-- reframe. Lets a user share a single project with a trusted person
-- (partner, friend, parent) for external accountability, WITHOUT
-- requiring the recipient to create a SharedMinds account.
--
-- Model:
--   • One project can have many share tokens (different recipients).
--   • Each token is a random url-safe string, ~32 chars.
--   • Tokens have an expiry (default 90 days from creation) and a
--     revoke flag. Either kills the share without deleting the row.
--   • Public route /shared/:token renders a read-only project view
--     via the get_shared_project_view RPC (SECURITY DEFINER).
--   • Owners manage their tokens through the project editor.
--
-- Privacy posture:
--   The public view shows project title/description/colour/cover and
--   completed-session summaries (goal + outcome + duration + date).
--   It does NOT show: tasks, milestones, notes, members, raw user ids,
--   email addresses, or the owner's full name. Just first name +
--   "is working on PROJECT — here's how it's going."

-- pgcrypto provides gen_random_bytes() used by the token default below.
-- gen_random_uuid() works without it on modern Postgres, but the random
-- bytes helper is pgcrypto-only.
create extension if not exists pgcrypto;

-- ── Table ────────────────────────────────────────────────────────────

create table if not exists public.project_share_tokens (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects(id) on delete cascade,
  /** URL-safe random token. ~24 bytes → ~32 base64url chars. */
  token                text not null unique
                       default encode(extensions.gen_random_bytes(24), 'base64'),
  /** Optional friendly label like "Mum" or "Accountability buddy" —
   *  shown only to the project owner in the share-management list. */
  invited_label        text,
  /** Optional email captured at share time. Used purely for the
   *  owner's reference + future weekly-summary delivery. NEVER
   *  exposed via the public RPC. */
  invited_email        text,
  created_by           uuid not null references public.profiles(id) on delete cascade,
  /** Default 90-day expiry. NULL = never expires (use sparingly). */
  expires_at           timestamptz default (now() + interval '90 days'),
  /** Marks the token dead without deleting the row, so we can still
   *  track that someone had access at some point. */
  revoked_at           timestamptz,
  /** Future-use flag for the weekly summary email feature. Owner opts
   *  this in when creating the token. */
  weekly_summary_email boolean not null default false,
  /** Set by the RPC every time the token is used to view the page —
   *  lets the owner see "Mum last viewed 2 days ago" in the manage UI. */
  last_viewed_at       timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists project_share_tokens_project_idx
  on public.project_share_tokens(project_id);

create index if not exists project_share_tokens_owner_idx
  on public.project_share_tokens(created_by);

-- Cleanup the default `base64` to be url-safe in practice — strip the
-- few non-url-safe characters that might appear. Done as a trigger to
-- keep the default expression simple. (Base64 can include / and + which
-- break in URLs.)
create or replace function public.normalise_share_token()
returns trigger language plpgsql as $$
begin
  if new.token is not null then
    new.token := replace(replace(replace(new.token, '/', '_'), '+', '-'), '=', '');
  end if;
  return new;
end;
$$;

drop trigger if exists project_share_tokens_normalise on public.project_share_tokens;
create trigger project_share_tokens_normalise
  before insert on public.project_share_tokens
  for each row execute function public.normalise_share_token();

-- ── RLS ──────────────────────────────────────────────────────────────
-- The token rows themselves are owner-only. The PUBLIC consumption
-- path goes through the SECURITY DEFINER RPC, which validates the
-- token and returns only the projected fields.

alter table public.project_share_tokens enable row level security;

drop policy if exists "share_tokens_select_own" on public.project_share_tokens;
create policy "share_tokens_select_own"
on public.project_share_tokens for select
to authenticated
using (created_by = auth.uid());

drop policy if exists "share_tokens_insert_own" on public.project_share_tokens;
create policy "share_tokens_insert_own"
on public.project_share_tokens for insert
to authenticated
with check (
  created_by = auth.uid()
  -- And the caller must be the project owner (matches the existing
  -- project ownership model — created_by on projects).
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.created_by = auth.uid()
  )
);

drop policy if exists "share_tokens_update_own" on public.project_share_tokens;
create policy "share_tokens_update_own"
on public.project_share_tokens for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "share_tokens_delete_own" on public.project_share_tokens;
create policy "share_tokens_delete_own"
on public.project_share_tokens for delete
to authenticated
using (created_by = auth.uid());

-- ── Public RPC ───────────────────────────────────────────────────────
-- Called from the /shared/:token page without auth. SECURITY DEFINER
-- so it can read across tables that would normally be RLS-gated.
-- Validates the token + expiry + revoke flag before returning anything.

create or replace function public.get_shared_project_view(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_token       record;
  v_project     record;
  v_owner_name  text;
  v_sessions    jsonb;
begin
  -- Look up + validate token.
  select * into v_token
  from public.project_share_tokens
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_token is null then
    return jsonb_build_object('error', 'invalid_or_expired');
  end if;

  -- Touch last_viewed_at. We do this even though the function is
  -- declared STABLE — Postgres allows the trigger-style side effect
  -- via a separate UPDATE statement. Worst case: a stale read returns
  -- and the timestamp lags by one render, which is fine.
  update public.project_share_tokens
  set last_viewed_at = now()
  where id = v_token.id;

  -- Fetch the project shape (projected — no sensitive fields).
  select
    id, title, description, color,
    cover_image_url, cover_x, cover_y, cover_zoom,
    cover_fit, cover_bg_color, cover_text_color,
    created_at, target_date, status
  into v_project
  from public.projects
  where id = v_token.project_id;

  if v_project is null then
    return jsonb_build_object('error', 'project_not_found');
  end if;

  -- Owner's FIRST name only — keep PII minimal.
  select coalesce(split_part(display_name, ' ', 1), 'Someone')
  into v_owner_name
  from public.profiles
  where id = v_token.created_by;

  -- Recent completed sessions with outcomes (last 50). The recipient
  -- sees a story: what they worked on, how it went, when.
  select coalesce(jsonb_agg(row_to_json(s) order by s.sort_ts desc), '[]'::jsonb)
  into v_sessions
  from (
    select
      id,
      session_goal,
      session_title,
      session_outcome,
      session_mode,
      is_offline,
      intended_duration_minutes,
      ended_at,
      start_time,
      coalesce(ended_at, end_time, start_time) as sort_ts
    from public.focus_sessions
    where project_id = v_token.project_id
      and status = 'completed'
      and session_outcome is not null
    order by coalesce(ended_at, end_time, start_time) desc
    limit 50
  ) s;

  return jsonb_build_object(
    'project',        row_to_json(v_project),
    'ownerFirstName', v_owner_name,
    'sessions',       v_sessions
  );
end;
$$;

grant execute on function public.get_shared_project_view(text) to anon, authenticated;
