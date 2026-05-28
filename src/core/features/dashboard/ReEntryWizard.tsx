/**
 * ReEntryWizard — the "I'm back, what now?" moment.
 *
 * Fires two ways (see DashboardPage): automatically on the first open of the
 * morning, or on demand via the "I'm back" button after a mid-day break. Its
 * whole job is to shrink re-entry from "stare at the backlog" to two taps:
 *
 *   Step 1 — How's your head right now? (sets the brain state)
 *   Step 2 — Here are 2-3 tasks that fit that headspace. Work on one, start a
 *            session on it, or adjust how heavy a task is right here.
 *
 * Mood → cognitive load matching lives in lib/reentry.ts. Tasks carry the
 * load tag via their existing `energy` field, adjustable inline so coverage
 * grows organically. A "something lighter" downshift re-matches to the
 * easiest tasks for when even the suggestion feels like too much.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ArrowLeft, ArrowRight, Play, Loader2, Coffee } from 'lucide-react';
import { useCoreData, type BrainStateId, type CoreTask } from '../../data/CoreDataContext';
import {
  buildReEntryShortlist, loadCopy, loadForMood, reasonLabel,
  type ReEntryTask, type ScoredTask, type Load,
} from '../../../lib/reentry';

const TaskDetailSheet = lazy(() =>
  import('../../ui/TaskDetailSheet').then((m) => ({ default: m.TaskDetailSheet })));

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDot(token: string | null): string {
  if (!token) return '#94a3b8';
  return PROJECT_HEX[token] ?? token;
}

const LOAD_SEGMENTS: { key: Load; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'medium', label: 'Medium' },
  { key: 'deep', label: 'Heavy' },
];

function toReEntryTask(t: CoreTask): ReEntryTask {
  return {
    id: t.id, title: t.title, energy: t.energy, done: t.done, status: t.status,
    scheduledFor: t.scheduledFor, dueOn: t.dueOn, projectId: t.projectId,
    lastSessionOutcome: t.lastSessionOutcome ?? null,
  };
}

interface Props {
  /** Title chip when launched as the morning check-in vs. mid-day return. */
  variant?: 'morning' | 'manual';
  onClose: () => void;
  /** Open session declaration pinned to this task title. */
  onStartSession: (taskTitle: string) => void;
}

export function ReEntryWizard({ variant = 'manual', onClose, onStartSession }: Props) {
  const navigate = useNavigate();
  const {
    state, brainStateOptions, setCurrentBrainState,
    toggleTask, rescheduleTaskAsync, dropTaskAsync, deleteTaskAsync, updateTaskAsync,
  } = useCoreData();
  const { tasks, projects, activeProjectId } = state;

  const [step, setStep] = useState<'mood' | 'tasks'>('mood');
  const [mood, setMood] = useState<BrainStateId | null>(null);
  const [downshift, setDownshift] = useState(false);
  // Snapshot the shortlist when mood/downshift settle, so live energy edits
  // don't make the list re-rank and jump under the user's finger.
  const [shortlist, setShortlist] = useState<ScoredTask[]>([]);
  const [busyLoadId, setBusyLoadId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const reentryTasks = useMemo(() => tasks.map(toReEntryTask), [tasks]);

  // Compute the shortlist snapshot whenever mood / downshift changes.
  useEffect(() => {
    if (!mood) return;
    // Downshift forces the lightest target by pretending the mood is brainfog.
    const effectiveMood: BrainStateId = downshift ? 'brainfog' : mood;
    setShortlist(buildReEntryShortlist(reentryTasks, effectiveMood, activeProjectId));
    // Intentionally NOT depending on reentryTasks — we want a stable snapshot
    // per mood selection, not a re-rank on every energy edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, downshift]);

  function pickMood(id: BrainStateId) {
    setMood(id);
    setCurrentBrainState(id);
    setDownshift(false);
    setStep('tasks');
  }

  async function setLoad(taskId: string, load: Load) {
    if (busyLoadId) return;
    setBusyLoadId(taskId);
    try { await updateTaskAsync(taskId, { energy: load }); }
    catch { /* context reverts + logs */ }
    finally { setBusyLoadId(null); }
  }

  const targetLoad = mood ? loadForMood(downshift ? 'brainfog' : mood) : 'medium';
  const copy = loadCopy(targetLoad);
  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) ?? null : null;
  const openTaskProject = openTask?.projectId ? projects.find((p) => p.id === openTask.projectId) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface shadow-2xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-9 h-1 rounded-full bg-surface-container" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-1">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
              {variant === 'morning' ? 'Morning check-in' : "Welcome back"}
            </p>
            <h2 className="text-lg font-extrabold stitch-text-primary leading-tight mt-0.5">
              {step === 'mood' ? "How's your head right now?" : copy.label}
            </h2>
            <p className="text-xs stitch-text-secondary leading-snug mt-0.5">
              {step === 'mood'
                ? 'No wrong answer — it just helps me pick what fits.'
                : copy.hint}
            </p>
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

        {/* ── Step 1: mood grid ─────────────────────────────────────── */}
        {step === 'mood' && (
          <div className="px-5 py-4 grid grid-cols-2 gap-2.5">
            {brainStateOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => pickMood(opt.id)}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container active:scale-[0.98] transition-all text-left"
              >
                <span className="text-xl shrink-0">{opt.emoji}</span>
                <span className="text-sm font-bold stitch-text-primary leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Step 2: matched shortlist ─────────────────────────────── */}
        {step === 'tasks' && (
          <div className="px-5 pb-4 pt-2 space-y-2.5">
            {shortlist.length === 0 ? (
              <div className="text-center py-6 px-2">
                <p className="text-sm font-semibold stitch-text-primary">Nothing on your list yet.</p>
                <p className="text-xs stitch-text-secondary mt-1 leading-relaxed">
                  Add the one thing you want to move, and I'll have it ready next time.
                </p>
                <button
                  type="button"
                  onClick={() => { onClose(); navigate('/tasks'); }}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:opacity-80"
                >
                  Go to tasks <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              shortlist.map(({ task, reason }) => {
                const live = tasks.find((t) => t.id === task.id);
                if (!live) return null;
                const project = live.projectId ? projects.find((p) => p.id === live.projectId) : null;
                const rLabel = reasonLabel(reason);
                return (
                  <div key={task.id} className="rounded-2xl bg-surface-container-low/70 ring-1 ring-surface-container/60 p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <p className="flex-1 min-w-0 text-sm font-bold stitch-text-primary leading-snug">
                        {live.title}
                      </p>
                      {project && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary shrink-0 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: projectDot(project.color) }} />
                          {project.name}
                        </span>
                      )}
                    </div>

                    {rLabel && (
                      <p className="text-[11px] font-semibold text-primary/80 mb-2">{rLabel}</p>
                    )}

                    {/* Inline load adjust — grows tag coverage organically */}
                    <div className="flex items-center gap-1 mb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary mr-1">Load</span>
                      <div className="inline-flex p-0.5 rounded-lg bg-surface-container">
                        {LOAD_SEGMENTS.map((seg) => (
                          <button
                            key={seg.key}
                            type="button"
                            onClick={() => setLoad(live.id, seg.key)}
                            disabled={busyLoadId === live.id}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                              live.energy === seg.key
                                ? 'bg-surface stitch-text-primary shadow-sm'
                                : 'stitch-text-secondary hover:stitch-text-primary'
                            }`}
                          >
                            {busyLoadId === live.id && live.energy === seg.key
                              ? <Loader2 size={10} className="animate-spin" />
                              : seg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { onStartSession(live.title); onClose(); }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold active:scale-[0.98] transition-transform"
                      >
                        <Play size={12} fill="currentColor" /> Start session
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenTaskId(live.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-low stitch-text-primary text-xs font-bold hover:bg-surface-container active:scale-[0.98] transition-all"
                      >
                        Work on it
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Downshift — "still too much" */}
            {shortlist.length > 0 && !downshift && targetLoad !== 'light' && (
              <button
                type="button"
                onClick={() => setDownshift(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold stitch-text-secondary hover:stitch-text-primary transition-colors"
              >
                <Coffee size={12} /> Still feels like too much — show me something lighter
              </button>
            )}
            {downshift && (
              <p className="text-center text-[11px] stitch-text-secondary italic">
                Lightest tasks only. One small win is a win.
              </p>
            )}
          </div>
        )}

        {/* Footer — back / not now */}
        <div className="px-5 py-3 border-t border-surface-container/70 flex items-center justify-between">
          {step === 'tasks' ? (
            <button
              type="button"
              onClick={() => { setStep('mood'); setDownshift(false); }}
              className="inline-flex items-center gap-1 text-xs font-semibold stitch-text-secondary hover:stitch-text-primary transition-colors"
            >
              <ArrowLeft size={13} /> Change mood
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold stitch-text-secondary hover:stitch-text-primary transition-colors"
          >
            Not now
          </button>
        </div>
      </div>

      {/* "Work on this" sheet, opened from a shortlist row */}
      {openTask && (
        <Suspense fallback={null}>
          <TaskDetailSheet
            task={{
              id: openTask.id,
              title: openTask.title,
              status: openTask.status,
              scheduledFor: openTask.scheduledFor,
              dueOn: openTask.dueOn,
              projectName: openTaskProject?.name ?? null,
              projectColorHex: openTaskProject ? projectDot(openTaskProject.color) : null,
            }}
            onClose={() => setOpenTaskId(null)}
            onToggleDone={() => toggleTask(openTask.id)}
            onReschedule={(iso) => rescheduleTaskAsync(openTask.id, iso)}
            onRename={(title) => updateTaskAsync(openTask.id, { title })}
            onDrop={() => dropTaskAsync(openTask.id)}
            onDelete={() => deleteTaskAsync(openTask.id)}
            onStartSession={() => { onStartSession(openTask.title); onClose(); }}
          />
        </Suspense>
      )}
    </div>,
    document.body,
  );
}
