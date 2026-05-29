// projectTypes — the nature of a project (what kind of macro goal it is).
//
// Mirrors the EXISTING projects.project_type taxonomy + check constraint (see
// migrations 20260526000003 / 20260526000004) — do not invent new ids here, the
// DB constraint will reject them. Drives the label/verb on the profile and
// whether a type is a sensible public-feature candidate.

export type ProjectType =
  | 'passion' | 'creative' | 'startup' | 'client'
  | 'employment' | 'freelance' | 'learning' | 'personal';

export interface ProjectTypeMeta {
  id: ProjectType;
  label: string;
  /** Verb shown on the profile ("Building", "Creating"…). */
  verb: string;
  emoji: string;
  /** Whether it's a sensible default to feature publicly. */
  defaultPublic: boolean;
  hint: string;
}

export const PROJECT_TYPES: ProjectTypeMeta[] = [
  { id: 'startup',    label: 'Startup',     verb: 'Building',    emoji: '🚀', defaultPublic: true,  hint: 'A product or business' },
  { id: 'creative',   label: 'Creative',    verb: 'Creating',    emoji: '🎬', defaultPublic: true,  hint: 'Film, writing, music, content' },
  { id: 'passion',    label: 'Passion',     verb: 'Building',    emoji: '✨', defaultPublic: true,  hint: 'A passion project' },
  { id: 'learning',   label: 'Learning',    verb: 'Learning',    emoji: '📚', defaultPublic: false, hint: 'A skill, course or qualification' },
  { id: 'freelance',  label: 'Freelance',   verb: 'Freelancing', emoji: '💼', defaultPublic: false, hint: 'Freelance / contract work' },
  { id: 'client',     label: 'Client work', verb: 'Client work', emoji: '🤝', defaultPublic: false, hint: 'Delivery for a client' },
  { id: 'employment', label: 'Job',         verb: 'Working on',  emoji: '🏢', defaultPublic: false, hint: 'Work at a company' },
  { id: 'personal',   label: 'Personal',    verb: 'Personal',    emoji: '🗂️', defaultPublic: false, hint: 'Private goals or life admin' },
];

const BY_ID = new Map(PROJECT_TYPES.map((t) => [t.id, t]));

/** Null/unknown-safe lookup — returns a neutral fallback so display never breaks. */
export function projectTypeMeta(id: string | null | undefined): ProjectTypeMeta {
  return BY_ID.get((id ?? '') as ProjectType)
    ?? { id: 'startup', label: 'Project', verb: 'Working on', emoji: '📌', defaultPublic: false, hint: '' };
}
