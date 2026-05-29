// open_to — the structured "opportunity signals" a member advertises on their
// profile. The scannable version of "what would you actually like to find here."
//
// Stored as text[] of these ids on profiles.open_to. Deliberately a small,
// fixed set: enough to express intent, not so many it becomes noise. The
// 'focus' option is the opt-OUT — it lets heads-down users say "I'm not here to
// network right now," which keeps the connection layer from feeling pushy.

export interface OpenToOption {
  id: string;
  label: string;
  emoji: string;
  /** Short helper shown in the editor. */
  hint?: string;
}

export const OPEN_TO_OPTIONS: OpenToOption[] = [
  { id: 'collaborate', label: 'Collaborators',   emoji: '🤝', hint: 'Build something together' },
  { id: 'freelance',   label: 'Freelance work',  emoji: '💼', hint: 'Open to contract / paid work' },
  { id: 'hiring',      label: 'Hiring',          emoji: '📣', hint: 'Looking for people to help me' },
  { id: 'cofounder',   label: 'Co-founder',      emoji: '🚀', hint: 'Seeking someone to build with' },
  { id: 'feedback',    label: 'Feedback',        emoji: '💬', hint: 'Want eyes on what I’m making' },
  { id: 'mentoring',   label: 'Mentoring',       emoji: '🧭', hint: 'Happy to help others along' },
  { id: 'mentored',    label: 'Being mentored',  emoji: '🌱', hint: 'Want to learn from someone further on' },
  { id: 'focus',       label: 'Just here to focus', emoji: '🔕', hint: 'Not networking right now' },
];

const BY_ID = new Map(OPEN_TO_OPTIONS.map((o) => [o.id, o]));

export function openToMeta(id: string): OpenToOption {
  return BY_ID.get(id) ?? { id, label: id, emoji: '✨' };
}

/** Headline/current-focus length caps, shared between editor + validation. */
export const HEADLINE_MAX = 80;
export const CURRENT_FOCUS_MAX = 140;
