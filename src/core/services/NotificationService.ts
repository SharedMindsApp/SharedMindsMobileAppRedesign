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
  | 'session_reminder_5min'
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
  | 'stuck_help_offered'
  // Session lifecycle
  | 'partner_joined'
  | 'session_now'
  | 'partner_no_show'
  | 'session_completed'
  | 'session_missed'
  | 'streak_at_risk';

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
  /** Structured payload attached by DB triggers (e.g. streak counts, partner names). */
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;

  // ── Email channel toggles (legacy — predate the inapp_* split) ──
  email_session_reminders: boolean;
  email_messages: boolean;
  email_post_replies: boolean;
  email_connection_requests: boolean;
  email_weekly_review: boolean;
  email_onboarding: boolean;
  email_community_sessions: boolean;
  email_marketing: boolean;

  // ── In-app channel toggles (one per category) ──────────────────
  // See migration 20260527000018. The DB has a BEFORE INSERT trigger
  // on `notifications` that silently skips inserts when the matching
  // inapp_* is false (or quiet hours are active for habit_nudges).
  inapp_session_reminders: boolean;
  inapp_session_activity: boolean;
  inapp_drop_in_opportunities: boolean;   // opt-IN
  inapp_habit_nudges: boolean;            // opt-IN
  inapp_messages: boolean;
  inapp_community: boolean;
  inapp_social: boolean;
  inapp_weekly_review: boolean;
  inapp_onboarding: boolean;
  inapp_marketing: boolean;

  // ── Quiet hours (habit_nudges category only) ───────────────────
  // Server stores UTC clock times; the picker UI converts to/from
  // the user's local browser timezone.
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;  // HH:MM:SS (Postgres `time` serializes this way)
  quiet_hours_end:   string;

  digest_mode: 'realtime' | 'daily' | 'off';
  dm_inactivity_threshold_hours: number;
  push_enabled: boolean;
  updated_at: string;
}

// ── Notifications ──────────────────────────────────────────────

/** Fetch recent notifications (up to `limit`). Defaults to UNREAD ONLY
 *  — the bell dropdown + /notifications page are inbox-style surfaces,
 *  not a permanent log. Read notifications are dismissed from the
 *  visible list (the row stays in the DB with `read_at` set so we can
 *  build an archive view later if it's actually useful).
 *
 *  Pass `{ includeRead: true }` for the future archive view. */
export async function listNotifications(
  limit = 30,
  opts: { includeRead?: boolean } = {},
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!opts.includeRead) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;

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
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);
  if (error) console.error('[NotificationService] markRead:', error);
}

/**
 * Flip every unread notification for the current user to read. Returns the
 * number of rows actually updated — important because a successful Supabase
 * call with zero affected rows still resolves without an error, which the
 * previous version of this function hid.
 *
 * If the count is 0 despite unread items being visible, RLS is denying the
 * update (or auth has lapsed) and we should surface that to the caller
 * rather than fail silently.
 */
export async function markAllRead(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
    .select('id'); // force RETURNING so we can count
  if (error) {
    console.error('[NotificationService] markAllRead failed:', error);
    throw error;
  }
  return data?.length ?? 0;
}

/**
 * Permanently remove a notification. RLS gates by user_id = auth.uid()
 * so users can only delete their own.
 */
export async function dismissNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  if (error) {
    console.error('[NotificationService] dismissNotification:', error);
    throw error;
  }
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
