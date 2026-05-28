/**
 * taskUrgency — one place that decides how "urgent" a task is, from its
 * scheduled day (`scheduledFor`) and hard deadline (`dueOn`). Drives the
 * urgency chip on the shared TaskCard and the sort order in the Home
 * "Today" view + check-in.
 *
 * Two date signals, deliberately distinct:
 *   • scheduledFor — the day you PLANNED to do it ("Today", a weekday)
 *   • dueOn        — a hard DEADLINE ("Due Fri", "Overdue")
 *
 * A deadline always outranks a plan: an item due today/overdue shows the
 * deadline state even if it was scheduled for later. Copy is intentionally
 * non-shaming ("needs a new home", not "FAILED").
 */

export type UrgencyKind =
  | 'done'
  | 'overdue'      // deadline passed, or planned for a past day and not done
  | 'due-today'    // hard deadline is today
  | 'due-soon'     // hard deadline within ~2 days
  | 'today'        // scheduled for today (no nearer deadline)
  | 'scheduled'    // planned for a future day
  | 'someday';     // no date at all

export interface Urgency {
  kind: UrgencyKind;
  label: string;
  /** Tailwind classes for the chip (bg + text). */
  tone: string;
  /** Lower = more urgent; for sorting a mixed list. */
  weight: number;
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole-day difference (b - a) in local days, from YYYY-MM-DD strings. */
function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86_400_000);
}

function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short' });
}

export interface UrgencyInput {
  done?: boolean;
  status?: 'inbox' | 'active' | 'done' | 'dropped';
  scheduledFor?: string | null;
  dueOn?: string | null;
}

export function taskUrgency(t: UrgencyInput): Urgency {
  if (t.done || t.status === 'done' || t.status === 'dropped') {
    return { kind: 'done', label: 'Done', tone: 'bg-emerald-50 text-emerald-600', weight: 100 };
  }

  const today = isoToday();

  // ── Hard deadline takes priority ──
  if (t.dueOn) {
    const diff = dayDiff(today, t.dueOn); // <0 past, 0 today, >0 future
    if (diff < 0) return { kind: 'overdue', label: 'Overdue', tone: 'bg-amber-100 text-amber-800', weight: 0 };
    if (diff === 0) return { kind: 'due-today', label: 'Due today', tone: 'bg-rose-100 text-rose-700', weight: 1 };
    if (diff <= 2) return { kind: 'due-soon', label: `Due ${weekdayLabel(t.dueOn)}`, tone: 'bg-orange-50 text-orange-700', weight: 3 };
    // deadline further out — fall through to scheduled state, but remember it below
  }

  // ── Scheduled day ──
  if (t.scheduledFor) {
    const diff = dayDiff(today, t.scheduledFor);
    if (diff < 0) return { kind: 'overdue', label: 'Rolled over', tone: 'bg-amber-100 text-amber-800', weight: 2 };
    if (diff === 0) return { kind: 'today', label: 'Today', tone: 'bg-primary/10 text-primary', weight: 4 };
    return { kind: 'scheduled', label: weekdayLabel(t.scheduledFor), tone: 'bg-surface-container text-slate-600', weight: 6 };
  }

  // A future deadline but no schedule — still show the deadline softly.
  if (t.dueOn) {
    return { kind: 'scheduled', label: `Due ${weekdayLabel(t.dueOn)}`, tone: 'bg-surface-container text-slate-600', weight: 6 };
  }

  return { kind: 'someday', label: 'Someday', tone: 'bg-surface-container text-slate-500', weight: 8 };
}

/** True when a task should appear in the Home "Today" view: scheduled for
 *  today, due today/overdue, or a rolled-over plan needing attention. */
export function isTodayOrOverdue(t: UrgencyInput): boolean {
  const k = taskUrgency(t).kind;
  return k === 'today' || k === 'due-today' || k === 'overdue' || k === 'due-soon';
}
