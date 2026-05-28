/**
 * sessionMood — the context-aware "state of mind" model for focus sessions.
 *
 * A single energy scale is wrong for half of what people do. So the dimension
 * adapts to what the session is FOR:
 *
 *   • 'do'      → ENERGY / focus   (hyperfocus … brain fog) — execution work
 *   • 'plan'    → CLARITY / confidence — declaring intentions, planning
 *   • 'reflect' → CLARITY / confidence — reviews, debriefs, journaling
 *
 * We store a short mood `code` (e.g. 'foggy') + the session_kind; this module
 * interprets the code against the right axis for display. Codes are unique
 * across axes so a lone code is always resolvable.
 */

export type SessionKind = 'do' | 'plan' | 'reflect';
export type MoodAxis = 'energy' | 'clarity';

export interface MoodOption {
  code: string;
  label: string;
  emoji: string;
}

export interface SessionKindMeta {
  kind: SessionKind;
  label: string;
  hint: string;
  emoji: string;
  axis: MoodAxis;
}

export const SESSION_KINDS: SessionKindMeta[] = [
  { kind: 'do',      label: 'Do work',     hint: 'Execute on a task',            emoji: '⚡', axis: 'energy' },
  { kind: 'plan',    label: 'Plan & think', hint: 'Decide, map, set intentions', emoji: '🧭', axis: 'clarity' },
  { kind: 'reflect', label: 'Reflect',     hint: 'Review how things went',       emoji: '🪞', axis: 'clarity' },
];

/** Energy axis — reuses the six brain states used elsewhere in the app. */
export const ENERGY_MOODS: MoodOption[] = [
  { code: 'hyperfocus', label: 'Hyperfocus',  emoji: '🔥' },
  { code: 'energised',  label: 'Energised',   emoji: '⚡' },
  { code: 'steady',     label: 'Steady',      emoji: '🟢' },
  { code: 'distracted', label: 'Distracted',  emoji: '🐿️' },
  { code: 'low',        label: 'Low battery', emoji: '🪫' },
  { code: 'brainfog',   label: 'Brain fog',   emoji: '🌫️' },
];

/** Clarity / confidence axis — for planning + reflection sessions. */
export const CLARITY_MOODS: MoodOption[] = [
  { code: 'foggy',      label: 'Foggy',      emoji: '🌫️' },
  { code: 'scattered',  label: 'Scattered',  emoji: '🌀' },
  { code: 'unsure',     label: 'Unsure',     emoji: '😕' },
  { code: 'okay',       label: 'Okay',       emoji: '🙂' },
  { code: 'clear',      label: 'Clear',      emoji: '💡' },
  { code: 'motivated',  label: 'Motivated',  emoji: '🚀' },
];

export function kindMeta(kind: SessionKind | null | undefined): SessionKindMeta {
  return SESSION_KINDS.find((k) => k.kind === kind) ?? SESSION_KINDS[0];
}

export function axisForKind(kind: SessionKind | null | undefined): MoodAxis {
  return kindMeta(kind).axis;
}

/** The mood options to offer for a session of this kind. */
export function moodOptionsForKind(kind: SessionKind | null | undefined): MoodOption[] {
  return axisForKind(kind) === 'clarity' ? CLARITY_MOODS : ENERGY_MOODS;
}

/** The prompt shown above the mood picker, by axis. */
export function moodPromptForKind(kind: SessionKind | null | undefined, when: 'before' | 'after'): string {
  const axis = axisForKind(kind);
  if (axis === 'clarity') {
    return when === 'before' ? 'How clear do you feel going in?' : 'How clear do you feel now?';
  }
  return when === 'before' ? "What's your energy going in?" : "What's your energy now?";
}

const ALL_MOODS: MoodOption[] = [...ENERGY_MOODS, ...CLARITY_MOODS];

/** Resolve a stored code → its option (label + emoji), or null if unknown. */
export function lookupMood(code: string | null | undefined): MoodOption | null {
  if (!code) return null;
  return ALL_MOODS.find((m) => m.code === code) ?? null;
}
