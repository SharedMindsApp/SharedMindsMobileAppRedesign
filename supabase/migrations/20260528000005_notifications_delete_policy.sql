-- ============================================================
-- Allow users to delete (dismiss) their own notifications
-- Migration: 20260528000005_notifications_delete_policy
--
-- Bug: the per-row "X" dismiss in the notifications dropdown calls
-- dismissNotification() which runs DELETE FROM notifications WHERE
-- id = ?. The notifications table had SELECT + UPDATE RLS policies
-- but NO DELETE policy. Under RLS, a DELETE with no permitting
-- policy silently affects 0 rows and returns success — so the client
-- optimistically hid the row, then it reappeared on the next refresh
-- / realtime event. Hence "I can't remove specific notifications."
--
-- Fix: add a DELETE policy scoped to the owner. Users can only ever
-- delete their own rows (user_id = auth.uid()).
-- ============================================================

drop policy if exists "notifications_delete_self" on public.notifications;
create policy "notifications_delete_self"
on public.notifications for delete
to authenticated
using (user_id = auth.uid());
