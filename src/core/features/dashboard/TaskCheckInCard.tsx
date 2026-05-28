/**
 * TaskCheckInCard — the once-a-day "roll forward" triage.
 *
 * Gathers tasks that have slipped — scheduled for a past day, or past their
 * deadline — and lets you make one quick decision each: pull to Today, push
 * to Tomorrow, or let it go. The anti-pileup, anti-shame mechanic: stale
 * tasks never silently accumulate; every one gets a gentle, low-friction
 * home for the cost of a single tap.
 *
 * Shows at most once per day (localStorage gate), only when something has
 * actually slipped, and hides itself the moment the list is cleared.
 */

import { useMemo, useState } from 'react';
import { CalendarClock, ArrowRight, X, Check } from 'lucide-react';
import { useCoreData, type CoreTask, type CoreProject } from '../../data/CoreDataContext';
import { taskUrgency } from '../../../lib/taskUrgency';

const LS_LAST_SHOWN = 'sm.taskCheckin.lastShownAt';

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDot(token: string | null): string {
  if (!token) return '#94a3b8';
  return PROJECT_HEX[token] ?? token;
}

/** A task has "slipped" if it's open and overdue or rolled over from a past day. */
function hasSlipped(t: CoreTask): boolean {
  if (t.done) return false;
  return taskUrgency(t).kind === 'overdue';
}

export function TaskCheckInCard({ tasks, projects }: { tasks: CoreTask[]; projects: CoreProject[] }) {
  const { rescheduleTaskAsync, dropTaskAsync } = useCoreData();

  // Gate: at most once per day. Compute eagerly so we don't flash the card
  // then hide it. Seen-today => never show.
  const seenToday = useMemo(() => {
    try { return window.localStorage.getItem(LS_LAST_SHOWN) === isoToday(); }
    catch { return false; }
  }, []);

  const slipped = useMemo(() => tasks.filter(hasSlipped), [tasks]);

  // Local working set — tasks disappear as they're triaged this session.
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  const remaining = slipped.filter((t) => !handled.has(t.id));

  if (seenToday || dismissed || slipped.length === 0) return null;

  function markSeen() {
    try { window.localStorage.setItem(LS_LAST_SHOWN, isoToday()); } catch { /* private mode */ }
  }

  async function act(taskId: string, fn: () => Promise<void>) {
    setHandled((prev) => new Set(prev).add(taskId)); // optimistic remove from list
    try { await fn(); } catch { /* context already reverts + logs */ }
  }

  // Once everything's handled, record the daily gate + hide.
  if (remaining.length === 0) {
    markSeen();
    return (
      <section className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200/60 p-4 flex items-center gap-3">
        <Check size={16} className="text-emerald-600 shrink-0" strokeWidth={2.5} />
        <p className="text-sm font-semibold text-emerald-800">All caught up — nothing left hanging.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-amber-50/70 ring-1 ring-amber-200/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarClock size={16} className="text-amber-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-amber-900 leading-tight">
              {remaining.length} task{remaining.length === 1 ? '' : 's'} need a new home
            </p>
            <p className="text-[11px] text-amber-700/80 leading-snug">
              No guilt — just pick where each one goes.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { markSeen(); setDismissed(true); }}
          aria-label="Not now"
          className="w-7 h-7 rounded-full grid place-items-center text-amber-700/70 hover:bg-amber-100 transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-1.5">
        {remaining.map((task) => {
          const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
          return (
            <div key={task.id} className="rounded-xl bg-surface ring-1 ring-amber-200/40 px-3 py-2.5">
              <div className="flex items-start gap-2 mb-2">
                <p className="flex-1 min-w-0 text-sm font-semibold stitch-text-primary leading-snug">
                  {task.title}
                </p>
                {project && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: projectDot(project.color) }} />
                    {project.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => act(task.id, () => rescheduleTaskAsync(task.id, isoToday()))}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold active:scale-[0.97] transition-transform"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => act(task.id, () => rescheduleTaskAsync(task.id, isoTomorrow()))}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container-low stitch-text-primary text-xs font-bold hover:bg-surface-container active:scale-[0.97] transition-all"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => act(task.id, () => dropTaskAsync(task.id))}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 text-xs font-bold hover:bg-rose-50 active:scale-[0.97] transition-all"
                >
                  Let go
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Keep the rest scheduled where they are */}
      <button
        type="button"
        onClick={() => { markSeen(); setDismissed(true); }}
        className="w-full text-center text-[11px] font-semibold text-amber-700/80 hover:text-amber-900 py-1 transition-colors inline-flex items-center justify-center gap-1"
      >
        Leave the rest for now <ArrowRight size={11} />
      </button>
    </section>
  );
}
