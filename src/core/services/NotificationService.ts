/**
 * NotificationService — unified events feed.
 *
 * The `notifications` table is the single source of truth for both the
 * in-app bell-icon inbox and the outbound email queue. This service is
 * what the in-app side reads from + writes read-state to.
 */

import { supabase } from '../../lib/supabase';

export type NotificationType =
  // Scheduled
  | 'session_reminder_24h'
  | 'session_reminder_15min'
  | 'weekly_review_prompt'
  | 'onboarding_day_1'
  | 'onboarding_day_3'
  | 'onboarding_day_7'
  | 'community_session_reminder'
  // Reactive
  | 'new_dm'
  | 'post_reply'
  | 'post_reaction'
  | 'connection_request'
  | 'connection_accepted'
  | 'project_invite'
  | 'stuck_help_offered';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_id: string | null;
  deep_link: string | null;
  read_at: string | null;
  email_sent_at: string | null;
  email_status: 'queued' | 'sent' | 'failed' | 'skipped' | 'digest_queued' | null;
  push_sent_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_session_reminders: boolean;
  email_messages: boolean;
  email_post_replies: boolean;
  email_connection_requests: boolean;
  email_weekly_review: boolean;
  email_onboarding: boolean;
  email_community_sessions: boolean;
  email_marketing: boolean;
  digest_mode: 'realtime' | 'daily' | 'off';
  dm_inactivity_threshold_hours: number;
  updated_at: string;
}

// ── Notifications ──────────────────────────────────────────────

/** Fetch recent notifications (up to `limit`). Unread + read mixed,
 *  reverse-chronological. */
export async function listNotifications(limit = 30): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[NotificationService] listNotifications:', error);
    return [];
  }
  return (data ?? []) as Notification[];
}

/** Total unread count for the current user. Single round-trip via RPC. */
export async function fetchUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc('fetch_unread_notification_count');
  if (error) {
    console.error('[NotificationService] fetchUnreadCount:', error);
    return 0;
  }
  return Number(data ?? 0);
}

export async function markRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);
}

export async function markAllRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
}

/** Realtime: fires whenever ANY new notification for the current user arrives.
 *  Returns an unsubscribe function. */
export function subscribeToNotifications(onChange: () => void): () => void {
  const channel = supabase
    .channel('notifications:user')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      // RLS filters server-side; we still pay attention to all events
      // because INSERT and UPDATE (read flip) both matter to the UI
      () => onChange(),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── Preferences ────────────────────────────────────────────────

export async function getPreferences(): Promise<NotificationPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Try fetch; bootstrap-on-profile-insert trigger should have created
  // a row, but upsert defensively in case the user pre-dates the trigger.
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[NotificationService] getPreferences:', error);
    return null;
  }

  if (data) return data as NotificationPreferences;

  // Self-heal: insert defaults if somehow missing
  const { data: created } = await supabase
    .from('notification_preferences')
    .insert({ user_id: user.id })
    .select()
    .single();

  return (created ?? null) as NotificationPreferences | null;
}

export async function updatePreferences(
  patch: Partial<Omit<NotificationPreferences, 'user_id' | 'updated_at'>>,
): Promise<NotificationPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('notification_preferences')
    .update(patch)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[NotificationService] updatePreferences:', error);
    throw error;
  }
  return data as NotificationPreferences;
}
