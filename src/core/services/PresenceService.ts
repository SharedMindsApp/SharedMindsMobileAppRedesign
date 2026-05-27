/**
 * PresenceService — single source of truth for "what dot do I render
 * next to this person?"
 *
 * Status values returned by the DB RPC:
 *   'online'      — green, recent heartbeat
 *   'busy'        — amber, manual "Busy" toggle
 *   'in_session'  — blue, currently in an active focus session
 *   'offline'     — grey
 *   'hidden'      — caller MUST treat target as invisible
 *                   (omit from lists, no last-seen, no dot)
 *
 * Privacy gating happens server-side. A user who set their
 * presence_privacy to 'nobody', or to 'connections' for a viewer
 * who isn't connected, comes back as 'hidden' — there is no way
 * for a client to bypass this.
 */

import { supabase } from '../../lib/supabase';

export type EffectivePresence =
  | 'online'
  | 'busy'
  | 'in_session'
  | 'offline'
  | 'hidden';

/** Visible online-now row returned by list_visible_online_users. */
export interface OnlineUser {
  id: string;
  status: Exclude<EffectivePresence, 'hidden' | 'offline'>;
}

/**
 * The list of users we're allowed to see as currently active.
 * Privacy + status + active-session rules all applied server-side;
 * caller renders whatever comes back.
 */
export async function listVisibleOnlineUsers(maxRows = 50): Promise<OnlineUser[]> {
  const { data, error } = await supabase.rpc('list_visible_online_users', { max_rows: maxRows });
  if (error) {
    console.error('[PresenceService] listVisibleOnlineUsers failed:', error);
    return [];
  }
  return (data ?? []) as OnlineUser[];
}

/**
 * Effective presence for a single user, viewed by the calling user.
 * Returns 'hidden' if you're not allowed to see them at all.
 */
export async function getPresenceFor(userId: string): Promise<EffectivePresence> {
  const { data, error } = await supabase.rpc('get_presence_for_viewer', { target: userId });
  if (error) {
    console.error('[PresenceService] getPresenceFor failed:', error);
    return 'offline';
  }
  return (data ?? 'offline') as EffectivePresence;
}

/**
 * Batch fetch effective presence for a list of user IDs. Each lookup
 * is one RPC call — fine for the small lists we use this on (DM
 * conversation list ≤ 50, member directory page size 60). If we
 * ever need more, swap to a single batched RPC.
 */
export async function getPresenceForMany(userIds: string[]): Promise<Map<string, EffectivePresence>> {
  const map = new Map<string, EffectivePresence>();
  if (userIds.length === 0) return map;
  const results = await Promise.all(userIds.map((id) => getPresenceFor(id).then((s) => [id, s] as const)));
  for (const [id, status] of results) map.set(id, status);
  return map;
}

// ── UI helpers ────────────────────────────────────────────────────

export function presenceLabel(p: EffectivePresence): string {
  switch (p) {
    case 'online':     return 'Online';
    case 'busy':       return 'Busy';
    case 'in_session': return 'In a focus session';
    case 'offline':    return 'Offline';
    case 'hidden':     return '';
  }
}

/** Tailwind color tokens for the presence dot. */
export function presenceDotClass(p: EffectivePresence): string {
  switch (p) {
    case 'online':     return 'bg-emerald-500';
    case 'busy':       return 'bg-amber-500';
    case 'in_session': return 'bg-blue-500';
    case 'offline':    return 'bg-slate-400';
    case 'hidden':     return 'bg-transparent';
  }
}
