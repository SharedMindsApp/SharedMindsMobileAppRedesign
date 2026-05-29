// projectTypes — the nature of a project (what kind of macro goal it is).
//
// Drives the label/verb on the profile and whether it's a public candidate.
// Client + Personal default private (confidential / not for show); the rest are
// opt-in public. Mirrors the projects_type_check constraint.

export type ProjectType =
  | 'building' | 'creating' | 'launching' | 'learning' | 'client' | 'exploring' | 'personal';

export interface ProjectTypeMeta {
  id: ProjectType;
  label: string;
  /** Verb shown on the profile ("Building", "Learning"…). */
  verb: string;
  emoji: string;
  /** Whether it's a sensible default to feature publicly. */
  defaultPublic: boolean;
  hint: string;
}

export const PROJECT_TYPES: ProjectTypeMeta[] = [
  { id: 'building',  label: 'Building',    verb: 'Building',    emoji: '🚀', defaultPublic: true,  hint: 'A product, app or business' },
  { id: 'creating',  label: 'Creating',    verb: 'Creating',    emoji: '🎬', defaultPublic: true,  hint: 'A film, writing, music, content' },
  { id: 'launching', label: 'Launching',   verb: 'Launching',   emoji: '📣', defaultPublic: true,  hint: 'A campaign, event or release' },
  { id: 'learning',  label: 'Learning',    verb: 'Learning',    emoji: '📚', defaultPublic: false, hint: 'A skill, course or qualification' },
  { id: 'client',    label: 'Client work', verb: 'Client work', emoji: '💼', defaultPublic: false, hint: 'Freelance / contract delivery' },
  { id: 'exploring', label: 'Exploring',   verb: 'Exploring',   emoji: '🧭', defaultPublic: false, hint: 'Research or validating an idea' },
  { id: 'personal',  label: 'Personal',    verb: 'Personal',    emoji: '🗂️', defaultPublic: false, hint: 'Private goals or life admin' },
];

const BY_ID = new Map(PROJECT_TYPES.map((t) => [t.id, t]));

export function projectTypeMeta(id: string | null | undefined): ProjectTypeMeta {
  return BY_ID.get((id ?? 'building') as ProjectType) ?? PROJECT_TYPES[0];
}
