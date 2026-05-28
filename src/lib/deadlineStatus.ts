/**
 * deadlineStatus — turns a target date + flexible/hard type + done-ness into
 * an "are we on target?" verdict, used for the chips on phases, milestones
 * and the project header.
 *
 * Date-driven (no per-item start date exists), softened by the deadline
 * type: a *flexible* target that's slipped reads as a gentle "past target",
 * a *hard* one reads as "overdue". Completed items always read "done",
 * never overdue.
 */

export type DeadlineType = 'flexible' | 'hard';

export type DeadlineKind = 'none' | 'done' | 'overdue' | 'past-target' | 'due-soon' | 'on-track';

export interface DeadlineStatus {
  kind: DeadlineKind;
  /** Short chip label, e.g. "Due in 3d", "Overdue 2d", "On track · 5 Jun". */
  label: string;
  /** Tailwind bg+text classes for the chip. Empty for kind 'none'. */
  tone: string;
  /** Whole days from today to the target (negative = past). null when no date. */
  daysLeft: number | null;
}

const DAY_MS = 86_400_000;

/** Local midnight (avoids UTC off-by-one when diffing dates). */
function midnightLocal(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "5 Jun" — compact, no year unless it differs from now. */
export function formatDeadlineDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: '2-digit' };
  return d.toLocaleDateString('en-GB', opts);
}

export function deadlineStatus(args: {
  targetDate: string | null | undefined;
  deadlineType?: DeadlineType | null;
  done?: boolean;
}): DeadlineStatus {
  const { targetDate, done } = args;
  const type: DeadlineType = args.deadlineType ?? 'flexible';

  if (done) {
    return { kind: 'done', label: 'Done', tone: 'bg-emerald-100 text-emerald-700', daysLeft: null };
  }
  if (!targetDate) {
    return { kind: 'none', label: '', tone: '', daysLeft: null };
  }

  const target = midnightLocal(new Date(`${targetDate}T00:00:00`));
  const today = midnightLocal(new Date());
  const daysLeft = Math.round((target - today) / DAY_MS);
  const when = formatDeadlineDate(targetDate);

  if (daysLeft < 0) {
    const over = -daysLeft;
    return type === 'hard'
      ? { kind: 'overdue', label: `Overdue ${over}d`, tone: 'bg-rose-100 text-rose-700', daysLeft }
      : { kind: 'past-target', label: `${over}d past aim`, tone: 'bg-amber-100 text-amber-800', daysLeft };
  }
  if (daysLeft === 0) {
    return { kind: 'due-soon', label: 'Due today', tone: 'bg-amber-100 text-amber-700', daysLeft };
  }
  if (daysLeft <= 7) {
    return { kind: 'due-soon', label: `Due in ${daysLeft}d`, tone: 'bg-amber-100 text-amber-700', daysLeft };
  }
  return {
    kind: 'on-track',
    label: `${type === 'hard' ? 'Due' : 'Aim'} ${when}`,
    tone: 'bg-sky-100 text-sky-700',
    daysLeft,
  };
}

/**
 * Roll a set of child statuses up to a parent verdict (milestone from its
 * phases, or project from its milestones). The worst live state wins:
 * overdue > past-target > due-soon > on-track. 'done'/'none' don't downgrade.
 */
export function rollupDeadline(children: DeadlineStatus[]): DeadlineKind {
  const order: DeadlineKind[] = ['overdue', 'past-target', 'due-soon', 'on-track'];
  for (const kind of order) {
    if (children.some((c) => c.kind === kind)) return kind;
  }
  return 'none';
}
