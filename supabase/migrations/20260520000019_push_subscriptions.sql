-- ─────────────────────────────────────────────────────────────────────────────
-- 20260520000019_push_subscriptions.sql
--
-- Web Push (VAPID) infrastructure:
--   1. push_subscriptions — one row per device/browser per user
--   2. push_enabled column on notification_preferences
--   3. push_status / push_sent_at tracking on notifications
--   4. pg_cron trigger for dispatch-notifications (runs every minute)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Push subscriptions table ───────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  endpoint    text        not null,
  p256dh      text        not null,    -- public key for payload encryption
  auth_key    text        not null,    -- auth secret
  user_agent  text,                    -- browser/device hint for admin debugging
  created_at  timestamptz default now() not null,
  constraint push_subscriptions_user_endpoint_unique unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs_select_own"  on public.push_subscriptions;
drop policy if exists "push_subs_insert_own"  on public.push_subscriptions;
drop policy if exists "push_subs_delete_own"  on public.push_subscriptions;

create policy "push_subs_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subs_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subs_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- ── 2. Push preference on notification_preferences ────────────────────────────

alter table public.notification_preferences
  add column if not exists push_enabled boolean not null default true;

-- ── 3. Push tracking columns on notifications ─────────────────────────────────

alter table public.notifications
  add column if not exists push_sent_at  timestamptz,
  add column if not exists push_status   text; -- 'sent' | 'skipped' | 'failed' | 'no_subscription'

-- ── 4. pg_cron: run dispatch-notifications every minute ───────────────────────
-- Requires: pg_cron and pg_net extensions enabled (both are on in Supabase).
-- You must set the following Supabase secrets before scheduling:
--   supabase secrets set RESEND_API_KEY=re_...
--   supabase secrets set DISPATCH_SECRET=<random-token>
--   supabase secrets set VAPID_PUBLIC_KEY=<your-vapid-public-key>
--   supabase secrets set VAPID_PRIVATE_KEY=<your-vapid-private-key>
--   supabase secrets set VAPID_SUBJECT=mailto:hello@sharedminds.app
--   supabase secrets set APP_URL=https://app.sharedminds.app
--
-- To generate VAPID keys run:
--   npx web-push generate-vapid-keys
--
-- Replace <PROJECT_REF> and <DISPATCH_SECRET_VALUE> below with your actual values,
-- then run this block manually in the Supabase SQL Editor after setting secrets:
--
-- DO $$
-- DECLARE
--   project_url text := 'https://<PROJECT_REF>.supabase.co/functions/v1/dispatch-notifications';
--   dispatch_secret text := '<DISPATCH_SECRET_VALUE>';
-- BEGIN
--   perform cron.unschedule('dispatch-notifications') WHERE jobname = 'dispatch-notifications';
--   perform cron.schedule(
--     'dispatch-notifications',
--     '* * * * *',
--     format(
--       $$select net.http_post(
--           url := %L,
--           headers := '{"Authorization":"Bearer %s","Content-Type":"application/json"}'::jsonb,
--           body := '{}'::jsonb
--         );$$,
--       project_url,
--       dispatch_secret
--     )
--   );
-- END $$;
