/**
 * TaskDetailSheet — the "work on this" view.
 *
 * Tapping a task anywhere (Home Today, the project board) opens this sheet
 * instead of jumping straight into session declaration. The whole point:
 * **scheduling a session is optional, not compulsory.** You can feel
 * productive by editing the task, marking progress, rescheduling, or just
 * ticking it done — all without ever booking a session. Starting a session
 * is one CTA among several, not the only door in.
 *
 * Deliberately presentational + decoupled from any data source. Each host
 * (home card / project board) passes the display fields and wires the action
 * callbacks to its own state management (CoreData optimistic updates on Home,
 * local TaskService optimistic updates on the project board). That keeps the
 * two surfaces' separate task stores in sync with their own mutations.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Circle, CheckCircle2, Calendar, CalendarClock, Inbox,
  Play, Trash2, ArrowRight, Loader2, Pencil, Check,
} from 'lucide-react';
import { taskUrgency, type UrgencyInput } from '../../lib/taskUrgency';
import { TaskStepsSection } from './TaskStepsSection';

export interface TaskDetailData extends UrgencyInput {
  id: string;
  title: string;
  projectName?: string | null;
  projectColorHex?: string | null;
}

interface Props {
  task: TaskDetailData;
  onClose: () => void;
  /** Toggle done/active. Omit to hide the toggle. */
  onToggleDone?: () => void | Promise<void>;
  /** Set the scheduled day (YYYY-MM-DD) or null for backlog. */
  onReschedule?: (isoDate: string | null) => void | Promise<void>;
  /** Commit a renamed title. */
  onRename?: (title: string) => void | Promise<void>;
  /** "Let go" — drop the task (soft). Closes on success. */
  onDrop?: () => void | Promise<void>;
  /** Hard delete. Closes on success. Host owns its own confirm step. */
  onDelete?: () => void | Promise<void>;
  /** Optional: open session declaration pinned to this task. */
  onStartSession?: () => void;
  /** Fired when a step is promoted into its own task — host can refresh lists. */
  onStepPromoted?: (task: import('../services/TaskService').Task) => void;
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TaskDetailSheet({
  task, onClose, onToggleDone, onReschedule, onRename, onDrop, onDelete, onStartSession, onStepPromoted,
}: Props) {
  const u = taskUrgency(task);
  const done = u.kind === 'done';

  const [busy, setBusy] = useState<null | 'done' | 'today' | 'tomorrow' | 'backlog' | 'drop' | 'delete'>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  // "Let it go" is destructive + easy to mis-tap, so the first tap arms an
  // inline confirm rather than acting immediately.
  const [confirmingDrop, setConfirmingDrop] = useState(false);

  // Esc closes the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !editing) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editing]);

  const today = isoToday();
  const isToday = task.scheduledFor === today;
  const isTomorrow = task.scheduledFor === isoTomorrow();

  async function run(key: typeof busy, fn?: () => void | Promise<void>, closeAfter = false) {
    if (!fn || busy) return;
    setBusy(key);
    try {
      await fn();
      if (closeAfter) onClose();
    } catch { /* host logs + reverts */ }
    finally { setBusy(null); }
  }

  function commitRename() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== task.title) void onRename?.(trimmed);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface shadow-2xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-9 h-1 rounded-full bg-surface-container" />
        </div>

        {/* Header: done toggle + title + close */}
        <div className="flex items-start gap-3 px-5 pt-3 pb-4">
          {onToggleDone && (
            <button
              type="button"
              onClick={() => run('done', onToggleDone)}
              disabled={busy !== null}
              aria-label={done ? 'Mark not done' : 'Mark done'}
              className={`shrink-0 mt-0.5 transition-colors ${done ? 'text-emerald-500' : 'text-slate-300 hover:text-primary'}`}
            >
              {busy === 'done' ? <Loader2 size={24} className="animate-spin" />
                : done ? <CheckCircle2 size={24} strokeWidth={2.25} />
                : <Circle size={24} strokeWidth={2} />}
            </button>
          )}

          <div className="flex-1 min-w-0">
            {editing ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                  if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setDraft(task.title); }
                }}
                autoFocus
                rows={2}
                className="w-full resize-none text-lg font-extrabold stitch-text-primary leading-snug bg-surface-container-low rounded-xl px-2.5 py-2 outline-none focus:ring-2 ring-primary/30"
              />
            ) : (
              <button
                type="button"
                onClick={() => onRename && setEditing(true)}
                className={`group block w-full text-left text-lg font-extrabold leading-snug ${done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'}`}
              >
                {task.title}
                {onRename && (
                  <Pencil size={13} className="inline-block ml-1.5 mb-0.5 stitch-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            )}

            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              {!done && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.tone}`}>
                  {u.label}
                </span>
              )}
              {task.projectName && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.projectColorHex ?? '#94a3b8' }} />
                  {task.projectName}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Start a session — the OPTIONAL primary action. Present, never forced. */}
        {onStartSession && !done && (
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => { onStartSession(); onClose(); }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary text-white text-sm font-bold active:scale-[0.98] transition-transform"
            >
              <Play size={15} fill="currentColor" /> Start a focus session
            </button>
            <p className="text-center text-[11px] stitch-text-secondary mt-1.5">
              Optional — you can just work on it and tick it off.
            </p>
          </div>
        )}

        {/* Scheduling — pick when, without booking anything */}
        {onReschedule && !done && (
          <div className="px-5 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-2">
              When
            </p>
            <div className="grid grid-cols-3 gap-2">
              <SchedulePill
                icon={<Calendar size={14} />}
                label="Today"
                active={isToday}
                busy={busy === 'today'}
                onClick={() => run('today', () => onReschedule(today))}
              />
              <SchedulePill
                icon={<CalendarClock size={14} />}
                label="Tomorrow"
                active={isTomorrow}
                busy={busy === 'tomorrow'}
                onClick={() => run('tomorrow', () => onReschedule(isoTomorrow()))}
              />
              <SchedulePill
                icon={<Inbox size={14} />}
                label="Backlog"
                active={task.scheduledFor === null}
                busy={busy === 'backlog'}
                onClick={() => run('backlog', () => onReschedule(null))}
              />
            </div>
          </div>
        )}

        {/* Steps — break it into pebbles. Always available; the heart of
            "feel productive without a session": tick one small step. */}
        <div className="px-5 pb-4 pt-1">
          <TaskStepsSection taskId={task.id} onPromoted={onStepPromoted} />
        </div>

        {/* Footer actions — let go / delete */}
        {(onDrop || onDelete) && !done && (
          confirmingDrop ? (
            <div className="px-5 py-4 border-t border-surface-container/70">
              <p className="text-xs font-semibold stitch-text-primary mb-2.5">
                Let this task go? It'll drop off your lists.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => run('drop', onDrop, true)}
                  disabled={busy !== null}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold active:scale-[0.98] transition-transform"
                >
                  {busy === 'drop' ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                  Yes, let it go
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDrop(false)}
                  disabled={busy !== null}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-xl bg-surface-container-low stitch-text-primary text-xs font-bold hover:bg-surface-container active:scale-[0.98] transition-all"
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 border-t border-surface-container/70 flex items-center gap-2">
              {onDrop && (
                <button
                  type="button"
                  onClick={() => setConfirmingDrop(true)}
                  disabled={busy !== null}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-rose-600 text-xs font-bold hover:bg-rose-50 active:scale-[0.98] transition-all"
                >
                  <ArrowRight size={13} />
                  Let it go
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => run('delete', onDelete, true)}
                  disabled={busy !== null}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl stitch-text-secondary text-xs font-bold hover:bg-surface-container-low active:scale-[0.98] transition-all"
                >
                  {busy === 'delete' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete
                </button>
              )}
            </div>
          )
        )}

        {/* When done, a gentle confirmation footer instead of the actions. */}
        {done && (
          <div className="px-5 py-4 border-t border-surface-container/70 flex items-center gap-2 text-emerald-700">
            <Check size={15} strokeWidth={2.5} />
            <p className="text-sm font-semibold">Done — nice one.</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SchedulePill({
  icon, label, active, busy, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-[0.97] ${
        active
          ? 'bg-primary text-white'
          : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
      }`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
