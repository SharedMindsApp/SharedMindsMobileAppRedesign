import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, List, PenLine, Loader2, Timer, Zap, Leaf, Coffee, Users, UserPlus, Mic, MicOff, User, Calendar } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import type { CoreTask } from '../../data/CoreDataContext';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { startCommunitySession, createScheduledSession } from '../../services/SessionService';
import { InputWell } from '../../ui/CorePage';

type DurationOption = 25 | 50 | 90;
type GoalTab = 'pick' | 'type';

const DURATIONS: { value: DurationOption; label: string; sublabel: string; icon: any }[] = [
  { value: 25, label: '25 min', sublabel: 'Pomodoro', icon: Coffee },
  { value: 50, label: '50 min', sublabel: 'Deep work', icon: Zap },
  { value: 90, label: '90 min', sublabel: 'Flow state', icon: Leaf },
];

const ENERGY_COLORS: Record<CoreTask['energy'], string> = {
  deep: 'bg-red-400',
  medium: 'bg-emerald-400',
  light: 'bg-sky-400',
};

const PROJECT_COLOR_HEX: Record<string, string> = {
  cyan: '#22d3ee',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
};

function projectSwatch(token: string | null): string {
  return PROJECT_COLOR_HEX[token ?? ''] ?? PROJECT_COLOR_HEX.blue;
}

interface Props {
  onClose: () => void;
  initialGoal?: string;
  /** Pre-fills the modal with a future start time. When set, the session is created as `scheduled` instead of `active`. */
  initialScheduledAt?: Date;
  /** Forces the mode picker to Solo and locks it (used by the sidebar Solo button). */
  forceSoloMode?: boolean;
  /** Pre-selects a project to pin the session to. */
  initialProjectId?: string;
  /** Pre-selects duration (25 / 50 / 90). Used by Quick Start templates. */
  initialDuration?: 25 | 50 | 90;
}

export function DeclareSessionModal({ onClose, initialGoal, initialScheduledAt, forceSoloMode, initialProjectId, initialDuration }: Props) {
  const navigate = useNavigate();
  const { state: { tasks, projects, activeProjectId }, addTaskAsync } = useCoreData();
  const { setActiveSession } = useFocusSession();

  const isScheduling = initialScheduledAt != null;

  const [tab, setTab] = useState<GoalTab>(initialGoal ? 'type' : 'pick');
  const [selectedTask, setSelectedTask] = useState<CoreTask | null>(null);
  const [goalText, setGoalText] = useState(initialGoal ?? '');
  const [duration, setDuration] = useState<DurationOption>(initialDuration ?? 50);
  const [sessionMode, setSessionMode] = useState<'group' | 'one_on_one' | 'solo'>(
    forceSoloMode ? 'solo' : 'group'
  );
  const [quietMode, setQuietMode] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId ?? activeProjectId ?? null
  );
  /** When the user types a free-form goal, also save it as a real task so
   *  it shows up in "From my tasks" next time. Default ON — most goals
   *  are real tasks people want to track. Toggle off for ad-hoc one-offs. */
  const [saveAsTask, setSaveAsTask] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openTasks = tasks.filter((t) => !t.done);
  const resolvedGoal = tab === 'pick' ? (selectedTask?.title ?? '') : goalText.trim();
  const canSubmit = resolvedGoal.length > 0 && !submitting;

  async function handleStart() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Resolve task id: either a pre-existing task the user picked, OR a
      // brand-new task we create on the fly (when "Save as task" is on).
      let resolvedTaskId: string | undefined;
      if (tab === 'pick' && selectedTask) {
        resolvedTaskId = selectedTask.id;
      } else if (tab === 'type' && saveAsTask && goalText.trim()) {
        try {
          resolvedTaskId = await addTaskAsync(goalText.trim(), selectedProjectId);
        } catch (taskErr) {
          // Don't block session start if task save fails — log + continue
          console.warn('[DeclareSessionModal] Save-as-task failed:', taskErr);
        }
      }

      if (isScheduling && initialScheduledAt) {
        // Future slot → create scheduled session, do not navigate into it
        await createScheduledSession({
          title: resolvedGoal,
          scheduledAt: initialScheduledAt,
          durationMinutes: duration,
          projectId: selectedProjectId ?? undefined,
        });
        onClose();
        return;
      }
      const session = await startCommunitySession({
        goalText: resolvedGoal,
        taskId: resolvedTaskId,
        projectId: selectedProjectId ?? undefined,
        durationMinutes: duration,
        sessionMode,
        // Solo has no audio room — quiet mode is meaningless there
        quietMode: sessionMode === 'solo' ? false : quietMode,
      });
      setActiveSession(session);
      onClose();
      navigate(`/session/${session.id}`);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  // Format the scheduled time for the header subtitle
  const scheduledLabel = initialScheduledAt
    ? initialScheduledAt.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 sm:backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-xl bg-surface flex flex-col max-h-[88vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-surface-container-high" />
        </div>

        {/* ── Header ───────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl stitch-card--accent flex items-center justify-center shrink-0">
              <Timer size={18} className="text-white" />
            </div>
            <div>
              <h2 className="stitch-headline text-base font-extrabold leading-tight">
                {isScheduling ? 'Schedule a session' : forceSoloMode ? 'Solo focus session' : 'Declare your focus'}
              </h2>
              <p className="text-xs stitch-text-secondary">
                {scheduledLabel ?? "What's the one thing you'll finish?"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors shrink-0"
          >
            <X size={15} className="stitch-text-secondary" />
          </button>
        </div>

        {/* ── Goal source tabs ─────────────────────────────── */}
        <div className="shrink-0 px-5 pb-3">
          <div className="flex p-1 bg-surface-container-low rounded-full gap-1">
            {([
              { id: 'pick', label: 'From my tasks', icon: List },
              { id: 'type', label: 'Type a goal', icon: PenLine },
            ] as { id: GoalTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id as GoalTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                  tab === id
                    ? 'bg-white shadow-sm text-primary'
                    : 'stitch-text-secondary hover:stitch-text-primary'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Task list / free text (fills remaining space) ── */}
        <div className="flex-1 overflow-y-auto px-5 min-h-0">
          {tab === 'pick' ? (
            <div className="space-y-1.5 pb-2">
              {openTasks.length === 0 ? (
                <div className="text-center py-8 stitch-card rounded-2xl">
                  <p className="text-sm font-medium stitch-text-primary mb-1">No tasks yet</p>
                  <p className="text-xs stitch-text-secondary">
                    Switch to "Type a goal" to declare what you're working on.
                  </p>
                </div>
              ) : (
                openTasks.map((task) => {
                  const isSelected = selectedTask?.id === task.id;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTask(isSelected ? null : task)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 ${
                        isSelected
                          ? 'bg-primary/8 ring-2 ring-primary/25 shadow-sm'
                          : 'bg-surface-container-low hover:bg-surface-container active:scale-[0.99]'
                      }`}
                    >
                      <div className={`w-1 self-stretch rounded-full shrink-0 ${ENERGY_COLORS[task.energy]}`} />
                      <span className="flex-1 text-sm font-medium stitch-text-primary leading-snug">
                        {task.title}
                      </span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-primary' : 'border-2 border-surface-container'
                      }`}>
                        {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="pb-2">
              <InputWell
                value={goalText}
                onChange={setGoalText}
                onSubmit={handleStart}
                placeholder="e.g. Finish the first draft of the pitch deck"
              />
              <p className="mt-1.5 text-xs stitch-text-secondary px-1">
                Be specific — you'll report back when you're done.
              </p>

              {/* Save-as-task toggle — only shown when there's something to save */}
              {goalText.trim() && (
                <button
                  type="button"
                  onClick={() => setSaveAsTask((v) => !v)}
                  className={`mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                    saveAsTask
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200/60 dark:ring-emerald-800/40'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                    saveAsTask ? 'bg-emerald-500 text-white' : 'bg-white ring-1 ring-surface-container-high'
                  }`}>
                    {saveAsTask && <Check size={11} strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold stitch-text-primary leading-tight">
                      Save as a task
                    </p>
                    <p className="text-[11px] stitch-text-secondary leading-tight mt-0.5">
                      {saveAsTask
                        ? selectedProjectId
                          ? <>Saves to <span className="font-semibold">{projects.find((p) => p.id === selectedProjectId)?.name ?? 'project'}</span> · appears in "From my tasks" next time</>
                          : <>Saves to <span className="font-semibold">Inbox</span> · appears in "From my tasks" next time</>
                        : 'Goal stays on this session only'}
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Project pin (optional) ───────────────────────── */}
        {projects.length > 0 && (
          <div className="shrink-0 px-5 pt-3">
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
              Pin to project <span className="opacity-60 normal-case font-medium">(optional)</span>
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  selectedProjectId === null
                    ? 'stitch-btn--primary text-white shadow-sm'
                    : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
                }`}
              >
                None
              </button>
              {projects.map((p) => {
                const isSel = p.id === selectedProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                      isSel
                        ? 'stitch-btn--primary text-white shadow-sm'
                        : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: projectSwatch(p.color) }}
                    />
                    <span className="truncate max-w-[140px]">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Duration picker ──────────────────────────────── */}
        <div className="shrink-0 px-5 pt-3">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
            Session length
          </p>
          <div className="flex gap-2">
            {DURATIONS.map(({ value, label, sublabel, icon: Icon }) => {
              const isActive = duration === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDuration(value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'stitch-btn--primary text-white shadow-md shadow-primary/20'
                      : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.97]'
                  }`}
                >
                  <Icon size={13} className={isActive ? 'text-white/80' : 'stitch-text-secondary'} />
                  <div className="text-left">
                    <p className="text-sm font-extrabold leading-none">{label}</p>
                    <p className={`text-[10px] leading-none mt-0.5 ${isActive ? 'text-white/70' : 'stitch-text-secondary'}`}>
                      {sublabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Session mode (hidden when locked to Solo or when scheduling) ── */}
        {!forceSoloMode && !isScheduling && (
        <div className="shrink-0 px-5 pt-3">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
            Mode
          </p>
          <div className="flex gap-2">
            {([
              { id: 'solo',       label: 'Solo',   sublabel: 'Just you',         icon: User },
              { id: 'one_on_one', label: '1-on-1', sublabel: 'One partner',      icon: UserPlus },
              { id: 'group',      label: 'Group',  sublabel: 'Anyone can join',  icon: Users },
            ] as const).map(({ id, label, sublabel, icon: Icon }) => {
              const isActive = sessionMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSessionMode(id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'stitch-btn--primary text-white shadow-md shadow-primary/20'
                      : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.97]'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white/90' : 'stitch-text-secondary'} />
                  <div className="text-center">
                    <p className="text-sm font-extrabold leading-none">{label}</p>
                    <p className={`text-[10px] leading-none mt-0.5 ${isActive ? 'text-white/70' : 'stitch-text-secondary'}`}>
                      {sublabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* ── Quiet mode toggle (hidden for Solo — no audio room) ── */}
        {sessionMode !== 'solo' && (
          <div className="shrink-0 px-5 pt-3">
            <button
              type="button"
              onClick={() => setQuietMode((v) => !v)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                quietMode
                  ? 'bg-primary/8 ring-2 ring-primary/25'
                  : 'bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                quietMode ? 'bg-primary text-white' : 'bg-white stitch-text-secondary'
              }`}>
                {quietMode ? <MicOff size={14} /> : <Mic size={14} />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold stitch-text-primary leading-tight">
                  Quiet mode {quietMode && <span className="text-primary">· on</span>}
                </p>
                <p className="text-[11px] stitch-text-secondary leading-tight mt-0.5">
                  Start with mic muted — presence only, chat for talking
                </p>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                quietMode ? 'bg-primary' : 'bg-surface-container'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  quietMode ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </button>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <p className="shrink-0 mx-5 mt-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
        )}

        {/* ── Start button ─────────────────────────────────── */}
        <div className="shrink-0 px-5 pt-3 pb-6">
          <button
            type="button"
            onClick={handleStart}
            disabled={!canSubmit}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold transition-all duration-200 ${
              canSubmit
                ? 'stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]'
                : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {isScheduling ? <Calendar size={18} /> : <Timer size={18} />}
                {!canSubmit
                  ? 'Pick a goal to start'
                  : isScheduling
                  ? `Schedule ${duration}-min session`
                  : `Start ${duration}-min session`}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
