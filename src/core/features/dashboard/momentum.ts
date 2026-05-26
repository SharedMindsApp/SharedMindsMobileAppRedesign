// momentum.ts
//
// "Forgiving streaks." Instead of "X day streak" — which breaks on the
// first missed day and turns the home into a guilt machine — we derive
// a soft warmth-band from recent activity. A single missed day doesn't
// reset anything; consistent presence shifts you up; a long absence
// shifts you down warmly ("Coming back" not "Streak broken").
//
// Bands (in order):
//   • building   → brand-new user with 0-2 lifetime sessions
//   • returning  → last session > 7 days ago (gently welcoming back)
//   • warming    → at least 1 session in the last 14 days
//   • cruising   → 3+ sessions in the last 7 days  OR  current streak >= 3
//   • thriving   → 5+ sessions in the last 7 days  AND current streak >= 3
//
// The current_streak number from the RPC is preserved — but we never
// show it as "X day streak" anymore. It's an input to the band, not
// the output.
//
// "Days since last active" is also derived but never shown numerically.
// It's purely a private trigger for the Quick Restart card.

export type MomentumBand = 'building' | 'returning' | 'warming' | 'cruising' | 'thriving';

export interface MomentumInputs {
  /** Total completed sessions, all-time. */
  totalSessions: number;
  /** Current "day streak" from the RPC. Used as a band input, never shown. */
  currentStreak: number;
  /** ISO timestamp of the most recent completed session, or null. */
  lastActiveAt: string | null;
  /** Sessions in the last 7 days. Derived from the home dashboard's
   *  weekSessions list (already loaded — cheap). */
  sessionsLast7Days: number;
}

export interface MomentumState {
  band: MomentumBand;
  /** Short label safe to show in a chip: "Cruising", "Warming up", etc. */
  label: string;
  /** One-line warm description for tooltips / detail surfaces. */
  hint: string;
  /** Days since last active. Never shown numerically — used to
   *  decide whether to surface the Quick Restart card (≥ 3). */
  daysSinceLastActive: number | null;
  /** True iff the Quick Restart card should be considered for display. */
  isReturning: boolean;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function deriveMomentum(input: MomentumInputs): MomentumState {
  const { totalSessions, currentStreak, lastActiveAt, sessionsLast7Days } = input;

  const daysSinceLastActive = lastActiveAt
    ? Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / DAY)
    : null;

  // Brand-new user — no history at all.
  if (totalSessions === 0) {
    return {
      band: 'building',
      label: 'Building momentum',
      hint: 'Your first session sets the tone.',
      daysSinceLastActive,
      isReturning: false,
    };
  }

  // Long-absent user — welcome them back, gently.
  if (daysSinceLastActive !== null && daysSinceLastActive >= 3) {
    return {
      band: 'returning',
      label: 'Coming back',
      hint: 'Welcome back — a small session is a great way in.',
      daysSinceLastActive,
      isReturning: true,
    };
  }

  // Heat-band logic for active users.
  if (sessionsLast7Days >= 5 && currentStreak >= 3) {
    return {
      band: 'thriving',
      label: 'Thriving',
      hint: 'You\'re in the rhythm. Keep what works.',
      daysSinceLastActive,
      isReturning: false,
    };
  }
  if (sessionsLast7Days >= 3 || currentStreak >= 3) {
    return {
      band: 'cruising',
      label: 'Cruising',
      hint: 'Nice consistency this week.',
      daysSinceLastActive,
      isReturning: false,
    };
  }

  return {
    band: 'warming',
    label: 'Warming up',
    hint: 'Showing up is the win.',
    daysSinceLastActive,
    isReturning: false,
  };
}

/** Tailwind class lookup for the chip — tonal, never alarming. */
export function momentumChipClasses(band: MomentumBand): { bg: string; text: string } {
  switch (band) {
    case 'thriving':  return { bg: 'bg-emerald-50',  text: 'text-emerald-700' };
    case 'cruising':  return { bg: 'bg-sky-50',      text: 'text-sky-700'     };
    case 'warming':   return { bg: 'bg-amber-50',    text: 'text-amber-700'   };
    case 'returning': return { bg: 'bg-violet-50',   text: 'text-violet-700'  };
    case 'building':  return { bg: 'bg-surface-container-low', text: 'stitch-text-secondary' };
  }
}
