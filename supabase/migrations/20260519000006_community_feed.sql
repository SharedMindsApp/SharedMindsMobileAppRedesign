-- Community feed: posts, reactions, replies
--
-- Hybrid feed so a 10-20 user network doesn't feel empty:
--   * MANUAL posts — what I'm working on, stuck, win, question
--   * AUTO posts — non-solo session finishes, new projects, profile
--     created. Inserted by DB triggers so the feed always has texture.
--
-- All authenticated users can read everything. Writes scoped to the
-- author. Auto-posts have author_id = the subject user (e.g. session
-- owner) and is_auto = true so the UI can render them with a quieter
-- "activity" style rather than as full posts.


-- ============================================================
-- 1. community_posts
-- ============================================================

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  -- Manual: working_on, stuck, win, question
  -- Auto:   session_finished, project_started, joined
  post_type text not null check (post_type in (
    'working_on', 'stuck', 'win', 'question',
    'session_finished', 'project_started', 'joined'
  )),
  -- True for trigger-inserted posts. UI renders them more lightly.
  is_auto boolean not null default false,
  content text not null check (char_length(trim(content)) > 0),
  -- Optional links to related rows for richer rendering
  related_session_id uuid references public.focus_sessions(id) on delete set null,
  related_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx
  on public.community_posts(created_at desc);
create index if not exists community_posts_author_idx
  on public.community_posts(author_id);
create index if not exists community_posts_type_idx
  on public.community_posts(post_type);

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
before update on public.community_posts
for each row execute function public.set_updated_at();

alter table public.community_posts enable row level security;

-- Read: any authenticated user. We're a small private community; everyone
-- sees everything in the feed.
create policy "community_posts_select_authenticated"
on public.community_posts for select
to authenticated
using (true);

-- Insert manual posts: self only, only the manual post types
create policy "community_posts_insert_manual_self"
on public.community_posts for insert
to authenticated
with check (
  author_id = auth.uid()
  and is_auto = false
  and post_type in ('working_on', 'stuck', 'win', 'question')
);

-- Update: only your own (used for edits)
create policy "community_posts_update_self"
on public.community_posts for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

-- Delete: only your own (or admins via separate policy below)
create policy "community_posts_delete_self"
on public.community_posts for delete
to authenticated
using (author_id = auth.uid());

create policy "community_posts_delete_admin"
on public.community_posts for delete
to authenticated
using (public.is_admin());


-- ============================================================
-- 2. community_post_reactions
-- ============================================================

create table if not exists public.community_post_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👏', '💡', '🙏', '🔥', '💪')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

create index if not exists community_post_reactions_post_idx
  on public.community_post_reactions(post_id);

alter table public.community_post_reactions enable row level security;

create policy "post_reactions_select_authenticated"
on public.community_post_reactions for select
to authenticated using (true);

create policy "post_reactions_insert_self"
on public.community_post_reactions for insert
to authenticated with check (user_id = auth.uid());

create policy "post_reactions_delete_self"
on public.community_post_reactions for delete
to authenticated using (user_id = auth.uid());


-- ============================================================
-- 3. community_post_replies
-- ============================================================

create table if not exists public.community_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_post_replies_post_idx
  on public.community_post_replies(post_id, created_at);

drop trigger if exists community_post_replies_set_updated_at on public.community_post_replies;
create trigger community_post_replies_set_updated_at
before update on public.community_post_replies
for each row execute function public.set_updated_at();

alter table public.community_post_replies enable row level security;

create policy "post_replies_select_authenticated"
on public.community_post_replies for select
to authenticated using (true);

create policy "post_replies_insert_self"
on public.community_post_replies for insert
to authenticated with check (author_id = auth.uid());

create policy "post_replies_update_self"
on public.community_post_replies for update
to authenticated using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "post_replies_delete_self"
on public.community_post_replies for delete
to authenticated using (author_id = auth.uid());


-- ============================================================
-- 4. Auto-post trigger: session finished (non-solo)
-- ============================================================
-- Fires when a session moves to 'completed' status. Skips solo sessions
-- (they're private). Bypasses RLS via SECURITY DEFINER so triggers don't
-- need the user's INSERT permission for is_auto rows.

create or replace function public.community_post_on_session_finished()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content text;
  v_minutes int;
begin
  -- Only fire on transition to 'completed', skip solo
  if new.status <> 'completed' then return new; end if;
  if old.status = 'completed' then return new; end if;
  if new.session_mode = 'solo' then return new; end if;

  v_minutes := coalesce(new.intended_duration_minutes, 50);

  -- Build content depending on whether they had a goal
  if new.session_goal is not null and trim(new.session_goal) <> '' then
    v_content := 'Finished a ' || v_minutes || '-min session: ' || new.session_goal;
  else
    v_content := 'Finished a ' || v_minutes || '-min ' ||
                 case new.session_mode
                   when 'one_on_one' then '1-on-1'
                   when 'group' then 'group'
                   else 'focus'
                 end || ' session.';
  end if;

  insert into public.community_posts (
    author_id, post_type, is_auto, content, related_session_id, related_project_id
  ) values (
    new.user_id, 'session_finished', true, v_content, new.id, new.project_id
  );

  return new;
end;
$$;

drop trigger if exists session_finished_community_post on public.focus_sessions;
create trigger session_finished_community_post
after update on public.focus_sessions
for each row execute function public.community_post_on_session_finished();


-- ============================================================
-- 5. Auto-post trigger: project started
-- ============================================================

create or replace function public.community_post_on_project_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_content text;
begin
  -- Skip if private flag is set, or status isn't active
  if new.is_private = true then return new; end if;
  if new.status <> 'active' then return new; end if;

  v_content := 'Started a new project: ' || new.title;
  if new.description is not null and trim(new.description) <> '' then
    v_content := v_content || E'\n' || new.description;
  end if;

  insert into public.community_posts (
    author_id, post_type, is_auto, content, related_project_id
  ) values (
    new.created_by, 'project_started', true, v_content, new.id
  );

  return new;
end;
$$;

drop trigger if exists project_started_community_post on public.projects;
create trigger project_started_community_post
after insert on public.projects
for each row execute function public.community_post_on_project_started();


-- ============================================================
-- 6. Auto-post trigger: profile joined (welcome)
-- ============================================================

create or replace function public.community_post_on_profile_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_work text;
  v_content text;
begin
  v_name := coalesce(new.display_name, 'A new member');
  v_work := nullif(trim(coalesce(new.work_type, '')), '');

  v_content := v_name || ' just joined SharedMinds' ||
               case when v_work is not null then ' as a ' || v_work else '' end ||
               '. Say hi 👋';

  insert into public.community_posts (
    author_id, post_type, is_auto, content
  ) values (
    new.id, 'joined', true, v_content
  );

  return new;
end;
$$;

drop trigger if exists profile_joined_community_post on public.profiles;
create trigger profile_joined_community_post
after insert on public.profiles
for each row execute function public.community_post_on_profile_joined();
