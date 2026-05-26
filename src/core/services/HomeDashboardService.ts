// Home dashboard — single-call RPC that bundles everything the home
// page needs into one round-trip. The Postgres server does the
// aggregation and ships back a small JSON blob; the client makes ONE
// call instead of four and renders the whole dashboard in one paint.
//
// Heavier "stats" data (longest streak, best day/week, total focus
// minutes etc) stays in ProfileService.fetchProfileStats — only loaded
// when the user opens the Stats tab. Home stays slim.

import { supabase } from '../../lib/supabase';
import type { ScheduledSessionWithProfile, ShippedSession } from './SessionService';

export interface HomeDashboard {
  totalSessions: number;
  finishedCount: number;
  completionRate: number;
  currentStreak: number;
  connectionCount: number;
  /** Convenience derived flag — true iff totalSessions > 0. Lets the
   *  day-zero vs returning-user branch pick itself without an extra check. */
  hasAnySession: boolean;
  upcomingScheduled: ScheduledSessionWithProfile[];
  recentShips: ShippedSession[];
  /** Just start_times (one per session in the last 7 days), used by the
   *  today/week grid for sparkline-style density display. */
  weekSessions: { start_time: string }[];
}

/** Single-call home dashboard fetch. ~30-80 ms in practice on Pro/Micro;
 *  much faster than the previous four round-trips. */
export async function fetchHomeDashboard(userId: string): Promise<HomeDashboard | null> {
  const { data, error } = await supabase.rpc('get_home_dashboard', { uid: userId });
  if (error) {
    console.error('[fetchHomeDashboard]', error);
    return null;
  }
  // Map the RPC's profiles JSON onto the legacy shape consumers expect
  // (display_name + avatar_url hoisted to the top level).
  const blob = data as any;
  const upcomingScheduled: ScheduledSessionWithProfile[] = (blob.upcomingScheduled ?? []).map(
    (row: any) => ({
      ...row,
      display_name: row.profiles?.display_name ?? 'Someone',
      avatar_url: row.profiles?.avatar_url ?? null,
    }),
  );
  return {
    totalSessions:     blob.totalSessions ?? 0,
    finishedCount:     blob.finishedCount ?? 0,
    completionRate:    blob.completionRate ?? 0,
    currentStreak:     blob.currentStreak ?? 0,
    connectionCount:   blob.connectionCount ?? 0,
    hasAnySession:     !!blob.hasAnySession,
    upcomingScheduled,
    recentShips:       (blob.recentShips ?? []) as ShippedSession[],
    weekSessions:      (blob.weekSessions ?? []) as { start_time: string }[],
  };
}
