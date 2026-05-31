// sessionIntent — a session's PURPOSE, which scales with its length.
//
// Short sessions aren't satisfying for deep work (match wait + intro + outro
// eats most of the time), so work is gated to 45+ min. Everything else —
// planning, connecting, meditating — is great in a short window. Purpose also
// drives matching: open doors pair same-purpose together.

import type { SessionKind } from './sessionMood';

export type SessionIntent = 'work' | 'plan' | 'connect' | 'meditate';

export interface IntentMeta {
  intent: SessionIntent;
  label: string;
  hint: string;
  emoji: string;
  /** Minimum session length (minutes) this purpose is offered at. */
  minMinutes: number;
  /** Whether this purpose declares a task/goal. */
  declaresTask: boolean;
  /** Whether the start mood/focus check-in is relevant. */
  checkIn: boolean;
  /** Mood axis to borrow for the (optional) check-in. */
  kind: SessionKind;
}

/** Deep work unlocks here. Below it, sessions are plan / connect / meditate. */
export const WORK_MIN_MINUTES = 45;

export const SESSION_INTENTS: IntentMeta[] = [
  { intent: 'work',     label: 'Deep work',       hint: 'Heads-down on a task',        emoji: '⚡', minMinutes: WORK_MIN_MINUTES, declaresTask: true,  checkIn: true,  kind: 'do' },
  { intent: 'plan',     label: 'Plan / brainstorm', hint: 'Think out loud, map it out', emoji: '🧠', minMinutes: 0,               declaresTask: false, checkIn: true,  kind: 'plan' },
  { intent: 'connect',  label: 'Chat & connect',  hint: 'Say hi, co-work, be social',  emoji: '💬', minMinutes: 0,               declaresTask: false, checkIn: false, kind: 'reflect' },
  { intent: 'meditate', label: 'Meditate / reset', hint: 'Sit together, recharge',     emoji: '🧘', minMinutes: 0,               declaresTask: false, checkIn: false, kind: 'reflect' },
];

export function intentMeta(intent: SessionIntent | null | undefined): IntentMeta {
  return SESSION_INTENTS.find((i) => i.intent === intent) ?? SESSION_INTENTS[1]; // default 'plan'
}

/** Purposes available for a given session length. */
export function intentsForDuration(durationMin: number): IntentMeta[] {
  return SESSION_INTENTS.filter((i) => durationMin >= i.minMinutes);
}

// ── Per-purpose session lengths ────────────────────────────────────────────
// Short purposes stay short (a 2-hour meditation isn't a thing). A `paid`
// length is offered only to paid users — shown locked to free users so they
// see what upgrading unlocks. The FIRST entry is always the free default.
export interface IntentDuration { value: number; paid?: boolean }

export const DURATIONS_BY_INTENT: Record<SessionIntent, IntentDuration[]> = {
  work:     [{ value: 50 }, { value: 90, paid: true }],  // deep work: 50 free, 1h30 paid
  plan:     [{ value: 25 }],
  connect:  [{ value: 25 }, { value: 50, paid: true }],  // chat: 25 free, 50 paid
  meditate: [{ value: 25 }],
};

export function fmtDuration(min: number): string {
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}`;
}
