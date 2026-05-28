/**
 * TaskStepsSection — the per-task checklist of sub-steps.
 *
 * "Break the boulder into pebbles." When a task is too heavy to start, you
 * add a few small steps and tick them off one at a time. Any step can be
 * promoted into its own first-class task once it grows past a checkbox.
 *
 * Self-contained: owns its own fetch + mutations via TaskService so it can
 * drop into any task surface (the TaskDetailSheet today) without threading
 * step state through the host. Optimistic where it's cheap, with a quiet
 * reload on failure.
 */

import { useEffect, useState } from 'react';
import { Circle, CheckCircle2, Plus, Loader2, Trash2, ArrowUpRight, CornerDownRight } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { TaskService, type TaskStep, type Task } from '../services/TaskService';

interface Props {
  taskId: string;
  /** Fired when a step is promoted into its own task, with the new task. */
  onPromoted?: (task: Task) => void;
}

export function TaskStepsSection({ taskId, onPromoted }: Props) {
  const { user } = useAuth();
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    TaskService.getStepsByTask(taskId)
      .then((rows) => { if (!cancelled) setSteps(rows); })
      .catch(() => { if (!cancelled) setSteps([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [taskId]);

  const doneCount = steps.filter((s) => s.done).length;

  async function reload() {
    try { setSteps(await TaskService.getStepsByTask(taskId)); } catch { /* keep current */ }
  }

  async function addStep() {
    const title = draft.trim();
    if (!title || adding || !user) return;
    setAdding(true);
    try {
      const created = await TaskService.createStep(taskId, user.id, title, steps.length);
      setSteps((prev) => [...prev, created]);
      setDraft('');
    } catch { /* swallow — input keeps its text for retry */ }
    finally { setAdding(false); }
  }

  async function toggle(step: TaskStep) {
    if (busyId) return;
    setBusyId(step.id);
    // Optimistic flip.
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)));
    try { await TaskService.updateStep(step.id, { done: !step.done }); }
    catch { await reload(); }
    finally { setBusyId(null); }
  }

  async function remove(step: TaskStep) {
    if (busyId) return;
    setBusyId(step.id);
    setSteps((prev) => prev.filter((s) => s.id !== step.id)); // optimistic
    try { await TaskService.deleteStep(step.id); }
    catch { await reload(); }
    finally { setBusyId(null); }
  }

  async function promote(step: TaskStep) {
    if (busyId || !user) return;
    setBusyId(step.id);
    try {
      const task = await TaskService.promoteStepToTask(step.id, user.id);
      setSteps((prev) => prev.map((s) =>
        s.id === step.id ? { ...s, promoted_task_id: task.id, done: true } : s));
      onPromoted?.(task);
    } catch { await reload(); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
          Steps
        </p>
        {steps.length > 0 && (
          <span className="text-[10px] font-bold stitch-text-secondary tabular-nums">
            {doneCount}/{steps.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs stitch-text-secondary py-1">
          <Loader2 size={13} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-1">
          {steps.map((step) => {
            const promoted = !!step.promoted_task_id;
            return (
              <div key={step.id} className="group flex items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-container-low/60">
                <button
                  type="button"
                  onClick={() => toggle(step)}
                  disabled={busyId === step.id || promoted}
                  aria-label={step.done ? 'Mark step not done' : 'Mark step done'}
                  className={`shrink-0 mt-0.5 transition-colors ${step.done ? 'text-emerald-500' : 'text-slate-300 hover:text-primary'}`}
                >
                  {busyId === step.id ? <Loader2 size={15} className="animate-spin" />
                    : step.done ? <CheckCircle2 size={15} strokeWidth={2.25} />
                    : <Circle size={15} strokeWidth={2} />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] leading-snug ${step.done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'}`}>
                    {step.title}
                  </p>
                  {promoted && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary/80 mt-0.5">
                      <CornerDownRight size={10} /> became its own task
                    </span>
                  )}
                </div>

                {!promoted && (
                  <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => promote(step)}
                      disabled={busyId === step.id}
                      aria-label="Promote step to its own task"
                      title="Make this its own task"
                      className="w-6 h-6 rounded-md grid place-items-center stitch-text-secondary hover:bg-surface-container hover:text-primary"
                    >
                      <ArrowUpRight size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(step)}
                      disabled={busyId === step.id}
                      aria-label="Delete step"
                      className="w-6 h-6 rounded-md grid place-items-center text-rose-600/70 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add a step */}
          <div className="flex items-center gap-2 px-1.5 py-1">
            <Plus size={13} className="shrink-0 stitch-text-secondary" />
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addStep(); }
              }}
              placeholder="Break it into a small step…"
              className="flex-1 min-w-0 bg-transparent text-[13px] stitch-text-primary placeholder:stitch-text-secondary outline-none"
            />
            {draft.trim() && (
              <button
                type="button"
                onClick={addStep}
                disabled={adding}
                className="shrink-0 w-6 h-6 rounded-full bg-primary grid place-items-center active:scale-90 transition-transform disabled:opacity-50"
                aria-label="Add step"
              >
                {adding ? <Loader2 size={11} className="text-white animate-spin" />
                  : <Plus size={12} className="text-white" strokeWidth={3} />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
