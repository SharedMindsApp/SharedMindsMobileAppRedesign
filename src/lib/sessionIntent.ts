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
