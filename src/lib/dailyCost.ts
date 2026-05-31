/**
 * dailyCost — Daily.co cost model for SharedMinds.
 *
 * Daily bills per *participant-minute* on graduated brackets (like tax
 * brackets): each bracket's minutes are charged at that bracket's rate and
 * summed. The first 10,000 participant-minutes each month are free.
 *
 *   Video rate ranges $0.0040 → $0.0015 / participant-min as volume grows.
 *   Audio-only is ~4× cheaper ($0.00099 → $0.00036).
 *
 * This module turns our focus_sessions rows into an ESTIMATE of billable
 * participant-minutes + projected cost. It is a planning tool — the source of
 * truth is the Daily dashboard. The big unknown is group-session headcount
 * (we don't log per-participant attendance), so that's a tunable input.
 *
 * Reused by the admin cost view and (later) fair-use enforcement.
 */

export type Brackets = { upTo: number; rate: number }[];

// First 10k minutes free, then graduated. Numbers from Daily's pricing page.
export const VIDEO_BRACKETS: Brackets = [
  { upTo: 10_000, rate: 0 },
  { upTo: 100_000, rate: 0.0040 },
  { upTo: 500_000, rate: 0.0037 },
  { upTo: 1_000_000, rate: 0.0034 },
  { upTo: 10_000_000, rate: 0.0030 },
  { upTo: 25_000_000, rate: 0.0026 },
  { upTo: 50_000_000, rate: 0.0022 },
  { upTo: Infinity, rate: 0.0015 },
];

export const AUDIO_BRACKETS: Brackets = [
  { upTo: 10_000, rate: 0 },
  { upTo: 100_000, rate: 0.00099 },
  { upTo: 500_000, rate: 0.00092 },
  { upTo: 1_000_000, rate: 0.00085 },
  { upTo: 10_000_000, rate: 0.00074 },
  { upTo: 25_000_000, rate: 0.00064 },
  { upTo: 50_000_000, rate: 0.00054 },
  { upTo: Infinity, rate: 0.00036 },
];

export const FREE_MINUTES = 10_000;

/** Graduated cost for a given number of participant-minutes. */
export function graduatedCost(participantMinutes: number, brackets: Brackets = VIDEO_BRACKETS): number {
  let remaining = Math.max(0, participantMinutes);
  let prevCap = 0;
  let cost = 0;
  for (const b of brackets) {
    const span = Math.min(remaining, b.upTo - prevCap);
    if (span <= 0) { prevCap = b.upTo; continue; }
    cost += span * b.rate;
    remaining -= span;
    prevCap = b.upTo;
    if (remaining <= 0) break;
  }
  return cost;
}

// ── Per-session estimation ────────────────────────────────────────────────────

export interface CostSessionRow {
  session_mode: 'solo' | 'one_on_one' | 'group' | null;
  partner_user_id: string | null;
  body_double: boolean | null;
  is_offline: boolean | null;
  quiet_mode: boolean | null;
  status: string | null;
  actual_duration_minutes: number | null;
  intended_duration_minutes: number | null;
  start_time: string | null;
  ended_at: string | null;
  user_id: string;
}

/** Best available duration for a session, in minutes. Prefer the recorded
 *  actual; fall back to wall-clock, then declared length. Capped at the
 *  DECLARED duration (when known) so a zombie row left "active" for hours
 *  can't bill 8h — a session rarely runs meaningfully past its declared end.
 *  Falls back to an 8h hard ceiling only when no declared length exists. */
export function sessionDurationMin(r: CostSessionRow): number {
  let mins = r.actual_duration_minutes ?? 0;
  if (!mins && r.ended_at && r.start_time) {
    mins = (new Date(r.ended_at).getTime() - new Date(r.start_time).getTime()) / 60_000;
  }
  if (!mins) mins = r.intended_duration_minutes ?? 0;
  const ceiling = r.intended_duration_minutes && r.intended_duration_minutes > 0
    ? r.intended_duration_minutes
    : 480;
  return Math.max(0, Math.min(mins, ceiling));
}

/**
 * Estimated number of participants whose minutes Daily bills for this session.
 * Solo / offline / unmatched sessions never create a Daily room (lazy room
 * creation), so they cost nothing.
 */
export function sessionParticipants(r: CostSessionRow, avgGroupSize: number): number {
  if (r.is_offline) return 0;                                  // no video room at all
  if (r.body_double) return 1;                                 // shared room; bill own presence
  if (r.partner_user_id || r.session_mode === 'one_on_one') return 2;
  if (r.session_mode === 'group') return avgGroupSize;
  return 0;                                                    // solo timer — never opened a room
}

/** Whether this session COULD run audio-only (quiet / body-double) — used to
 *  project the savings from an audio-only-rooms feature. */
export function couldBeAudioOnly(r: CostSessionRow): boolean {
  return !!r.quiet_mode || !!r.body_double;
}

export interface ModeBreakdown {
  sessions: number;
  participantMinutes: number;
}

export interface CostSummary {
  /** Sessions in the window (all). */
  sessionCount: number;
  /** Sessions that actually opened a billable room. */
  roomSessions: number;
  /** Total billable participant-minutes (video pricing). */
  participantMinutes: number;
  /** Estimated cost at video rates (graduated). */
  estCost: number;
  blendedRate: number;
  freeMinutesUsedPct: number;
  /** Distinct users who ran any session in the window. */
  activeUsers: number;
  costPerActiveUser: number;
  avgVideoMinutesPerUser: number;
  byMode: { solo: ModeBreakdown; one_on_one: ModeBreakdown; group: ModeBreakdown; body_double: ModeBreakdown };
  /** Cost if quiet + body-double sessions ran on audio-only rooms instead. */
  optimisedCost: number;
  optimisedSavings: number;
}

export function summariseCost(rows: CostSessionRow[], avgGroupSize: number): CostSummary {
  const byMode = {
    solo: { sessions: 0, participantMinutes: 0 },
    one_on_one: { sessions: 0, participantMinutes: 0 },
    group: { sessions: 0, participantMinutes: 0 },
    body_double: { sessions: 0, participantMinutes: 0 },
  };

  let participantMinutes = 0;
  let audioEligibleMinutes = 0;   // minutes that could move to audio-only
  let roomSessions = 0;
  const activeSet = new Set<string>();

  for (const r of rows) {
    const dur = sessionDurationMin(r);
    if (dur > 0) activeSet.add(r.user_id);
    const ppl = sessionParticipants(r, avgGroupSize);
    const mins = ppl * dur;

    const bucket = r.body_double ? 'body_double'
      : r.partner_user_id || r.session_mode === 'one_on_one' ? 'one_on_one'
      : r.session_mode === 'group' ? 'group'
      : 'solo';
    byMode[bucket].sessions += 1;
    byMode[bucket].participantMinutes += mins;

    if (mins > 0) roomSessions += 1;
    participantMinutes += mins;
    if (couldBeAudioOnly(r)) audioEligibleMinutes += mins;
  }

  const estCost = graduatedCost(participantMinutes, VIDEO_BRACKETS);

  // Optimised: the audio-eligible slice billed at audio rates, the rest video.
  const videoOnlyMinutes = participantMinutes - audioEligibleMinutes;
  const optimisedCost =
    graduatedCost(videoOnlyMinutes, VIDEO_BRACKETS) +
    graduatedCost(audioEligibleMinutes, AUDIO_BRACKETS);

  const activeUsers = activeSet.size;

  return {
    sessionCount: rows.length,
    roomSessions,
    participantMinutes,
    estCost,
    blendedRate: participantMinutes > 0 ? estCost / participantMinutes : 0,
    freeMinutesUsedPct: Math.min(100, (participantMinutes / FREE_MINUTES) * 100),
    activeUsers,
    costPerActiveUser: activeUsers > 0 ? estCost / activeUsers : 0,
    avgVideoMinutesPerUser: activeUsers > 0 ? participantMinutes / activeUsers : 0,
    byMode,
    optimisedCost,
    optimisedSavings: Math.max(0, estCost - optimisedCost),
  };
}

/** Project monthly cost at N active users, holding the current per-user
 *  video-minute average constant. Useful for "what happens at 1k / 10k users". */
export function projectMonthlyCost(avgMinutesPerUser: number, users: number): number {
  return graduatedCost(avgMinutesPerUser * users, VIDEO_BRACKETS);
}

export function fmtUSD(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 100 ? 2 : 0 });
}
