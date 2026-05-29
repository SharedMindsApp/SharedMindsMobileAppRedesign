/**
 * reentry — the brains behind the re-entry wizard.
 *
 * Re-entry is the moment a focus-sensitive user comes back to work after a
 * break (a fresh morning, lunch, a context-switch) and faces the "where do I
 * even start?" wall. This module turns a self-reported mood into a small,
 * matched shortlist of tasks — so the answer is two or three taps, not a
 * staring contest with a backlog.
 *
 * Two ideas do the work:
 *   1. Mood → cognitive load. Each brain state maps to how heavy a task the
 *      user can take on right now (deep / medium / light). We reuse the
 *      existing task `energy` field as the load tag — no new schema.
 *   2. Score, don't filter. Tasks aren't hard-filtered by load (that would
 *      hide everything when nothing's tagged). They're *scored* — load-match
 *      is the strongest signal, then "continue where you left off", urgency,
 *      and whether it belongs to the project you're actively in.
 *
 * Pure + dependency-free so it's trivially testable and reusable.
 */

import type { BrainStateId } from '../core/data/CoreDataContext';
import { taskUrgency } from './taskUrgency';

/** The cognitive-load tag — identical to a task's `energy` field. */
export type Load = 'deep' | 'medium' | 'light';

/**
 * Mood → the load the user can comfortably take on.
 *   hyperfocus / energised → deep   (give them the involved thing)
 *   steady                 → medium
 *   distracted/low/brainfog→ light   (small, low-friction; stepping stones)
 */
const MOOD_TO_LOAD: Record<BrainStateId, Load> = {
  hyperfocus: 'deep',
  energised: 'deep',
  steady: 'medium',
  distracted: 'light',
  low: 'light',
  brainfog: 'light',
};

export function loadForMood(mood: BrainStateId): Load {
  return MOOD_TO_LOAD[mood];
}

/** Human label + one-liner for the matched-load, shown atop the shortlist. */
export function loadCopy(load: Load): { label: string; hint: string } {
  switch (load) {
    case 'deep':
      return { label: 'Deep work', hint: "You've got the focus — point it at something that matters." };
    case 'medium':
      return { label: 'Steady work', hint: 'A solid, moderate task to build momentum.' };
    case 'light':
      return { label: 'Light & easy', hint: 'Small wins only. One tiny thing beats nothing.' };
  }
}

/** Distance between two loads on the deep↔light scale (0 = exact match). */
const LOAD_RANK: Record<Load, number> = { deep: 2, medium: 1, light: 0 };
function loadDistance(a: Load, b: Load): number {
  return Math.abs(LOAD_RANK[a] - LOAD_RANK[b]);
}

/** Minimal task shape the matcher needs — a subset of CoreTask. */
export interface ReEntryTask {
  id: string;
  title: string;
  energy: Load;
  done: boolean;
  status: 'inbox' | 'active' | 'done' | 'dropped';
  scheduledFor: string | null;
  dueOn: string | null;
  projectId: string | null;
  lastSessionOutcome?: 'finished' | 'partially' | 'something_came_up' | 'no_answer' | null;
}

export interface ScoredTask {
  task: ReEntryTask;
  score: number;
  /** Why it was picked — drives a tiny "because…" line in the UI. */
  reason: 'continue' | 'load-match' | 'today' | 'overdue' | 'pinned' | 'general';
}

function isContinue(t: ReEntryTask): boolean {
  return t.lastSessionOutcome === 'partially'
      || t.lastSessionOutcome === 'something_came_up'
      || t.lastSessionOutcome === 'no_answer';
}

/**
 * Build the re-entry shortlist for a mood.
 *
 * @param tasks       all of the user's tasks (we filter open ones here)
 * @param mood        the just-reported brain state
 * @param activeProjectId  the pinned project, if any (small boost)
 * @param limit       how many to return (default 3)
 */
export function buildReEntryShortlist(
  tasks: ReEntryTask[],
  mood: BrainStateId,
  activeProjectId: string | null,
  limit = 3,
): ScoredTask[] {
  const targetLoad = loadForMood(mood);
  const open = tasks.filter((t) => !t.done && t.status !== 'done' && t.status !== 'dropped');

  const scored: ScoredTask[] = open.map((task) => {
    let score = 0;
    let reason: ScoredTask['reason'] = 'general';

    // 1. Load match — the dominant signal.
    const dist = loadDistance(task.energy, targetLoad);
    if (dist === 0) { score += 5; reason = 'load-match'; }
    else if (dist === 1) { score += 2; }
    // dist === 2 (opposite end) adds nothing.

    // 2. Continue where you left off — strong pull.
    if (isContinue(task)) { score += 4; reason = 'continue'; }

    // 3. Urgency from schedule/deadline.
    const u = taskUrgency(task);
    if (u.kind === 'overdue') { score += 3; if (reason === 'general') reason = 'overdue'; }
    else if (u.kind === 'due-today') { score += 3; if (reason === 'general') reason = 'today'; }
    else if (u.kind === 'today') { score += 2; if (reason === 'general') reason = 'today'; }
    else if (u.kind === 'due-soon') { score += 1; }

    // 4. Belongs to the project you're actively in.
    if (activeProjectId && task.projectId === activeProjectId) {
      score += 1;
      if (reason === 'general') reason = 'pinned';
    }

    return { task, score, reason };
  });

  // Sort by score desc, then urgency weight asc (sooner first) as tie-break.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return taskUrgency(a.task).weight - taskUrgency(b.task).weight;
  });

  return scored.slice(0, limit);
}

/** Reason → short "because…" chip text. */
export function reasonLabel(reason: ScoredTask['reason']): string | null {
  switch (reason) {
    case 'continue': return 'Pick up where you left off';
    case 'load-match': return 'Fits your energy';
    case 'today': return 'On for today';
    case 'overdue': return 'Slipped — worth clearing';
    case 'pinned': return 'Your active project';
    case 'general': return null;
  }
}

// ── Trigger gating (localStorage) ───────────────────────────────────────
//
// Morning auto-prompt fires at most once per calendar day. The "I'm back"
// button is always available and bypasses the gate.

const LS_MORNING_SHOWN = 'sm.reentry.morningShownAt';

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Has the morning re-entry prompt already been shown today? */
export function morningPromptSeenToday(): boolean {
  try { return window.localStorage.getItem(LS_MORNING_SHOWN) === isoToday(); }
  catch { return false; }
}

/** Record that the morning prompt was shown (or dismissed) today. */
export function markMorningPromptSeen(): void {
  try { window.localStorage.setItem(LS_MORNING_SHOWN, isoToday()); }
  catch { /* private mode — fail open, prompt may reappear */ }
}

/** "Morning" window for the auto-prompt: before 11am local. */
export function isMorning(): boolean {
  return new Date().getHours() < 11;
}

// ── One-shot gates for the other auto-prompt triggers ──────────────────────
// Each fires at most once per day per key (break block / upcoming session), so
// returning to the home page repeatedly doesn't re-pop the same prompt.

function seenToday(prefix: string, id: string): boolean {
  try { return window.localStorage.getItem(`${prefix}${id}`) === isoToday(); }
  catch { return false; }
}
function markToday(prefix: string, id: string): void {
  try { window.localStorage.setItem(`${prefix}${id}`, isoToday()); }
  catch { /* private mode — fail open */ }
}

const LS_BREAK_PREFIX = 'sm.reentry.break.';
export function breakPromptSeen(blockId: string): boolean { return seenToday(LS_BREAK_PREFIX, blockId); }
export function markBreakPromptSeen(blockId: string): void { markToday(LS_BREAK_PREFIX, blockId); }

const LS_SESSION_SOON_PREFIX = 'sm.reentry.sessionSoon.';
export function sessionSoonPromptSeen(sessionId: string): boolean { return seenToday(LS_SESSION_SOON_PREFIX, sessionId); }
export function markSessionSoonPromptSeen(sessionId: string): void { markToday(LS_SESSION_SOON_PREFIX, sessionId); }
