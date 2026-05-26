-- Allow users to delete their own notifications.
--
-- Existing policies (from 20260520000001) only cover SELECT + UPDATE.
-- Users can mark as read but can't dismiss / remove a notification
-- entirely. The bell UI needs per-row dismissal via an X icon, so we
-- add the matching DELETE RLS here.

drop policy if exists "notifications_delete_self" on public.notifications;
create policy "notifications_delete_self"
on public.notifications for delete
to authenticated
using (user_id = auth.uid());
