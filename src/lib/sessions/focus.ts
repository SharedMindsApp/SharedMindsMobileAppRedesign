/**
 * focus.ts — post-pivot remnant.
 *
 * This module used to hold the full guardrails-era focus-session engine
 * (start/end/pause, drift + distraction logging, nudges) backed by the
 * `master_projects`, `focus_events`, and `focus_drift_log` tables. Those
 * tables no longer exist in the coworking schema, and the session lifecycle
 * now lives in `core/services/SessionService.ts` (startCommunitySession,
 * markSessionEnded, endCommunitySession, …).
 *
 * The only piece still imported by live code is `getFocusSessionSummary`,
 * used by the post-session SessionSummaryPage. It reads the session row
 * directly — the old drift/event tables are gone, so the timeline + drift
 * details are simply empty for the new flow.
 */

import { supabase } from '../supabase';
import type { FocusSessionSummary } from './focusTypes';

export async function getFocusSessionSummary(
  sessionId: string
): Promise<FocusSessionSummary> {
  const { data: session, error: sessionError } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error('Focus session not found');
  }

  // The drift/event/distraction machinery is retired — return the session
  // row with empty timelines so the summary still renders for coworking.
  return {
    session,
    totalDrifts: session.drift_count ?? 0,
    totalDistractions: session.distraction_count ?? 0,
    focusScore: session.focus_score ?? 0,
    biggestDriftType: null,
    timeline: [],
    driftDetails: [],
  };
}
