import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Check, List, PenLine, Loader2, Timer, Zap, Leaf, Coffee, Users, UserPlus, Mic, MicOff, User, Calendar, Bell, Plus, Trash2, Clock } from 'lucide-react';
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
  const { state: { tasks, projects, activeProjectId }, addTaskAsync, deleteTaskAsync } = useCoreData();
  const { setActiveSession } = useFocusSession();

  // "when" state — if initialScheduledAt was passed (calendar slot click), pre-fill it.
  // Otherwise default to "now". User can toggle to "schedule" to pick a custom time.
  const [whenMode, setWhenMode] = useState<'now' | 'schedule'>(
    initialScheduledAt ? 'schedule' : 'now'
  );
  // Initialise the datetime-local input to either the passed-in time or +1 hour from now
  const defaultScheduled = initialScheduledAt
    ?? (() => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d; })();
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [scheduledAt, setScheduledAt] = useState<string>(toLocalInput(defaultScheduled));

  const isScheduling = whenMode === 'schedule';
  const resolvedScheduledAt = isScheduling ? new Date(scheduledAt) : null;

  const [tab, setTab] = useState<GoalTab>(initialGoal ? 'type' : 'pick');
  const [selectedTask, setSelectedTask] = useState<CoreTask | null>(null);
  const [goalText, setGoalText] = useState(initialGoal ?? '');
  const [duration, setDuration] = useState<DurationOption>(initialDuration ?? 50);
  const [sessionMode, setSessionMode] = useState<'group' | 'one_on_one' | 'solo'>(
    forceSoloMode ? 'solo' : 'one_on_one'
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
  // After a future session is scheduled, show a 2.5s confirmation before closing
  const [scheduledConfirm, setScheduledConfirm] = useState(false);

  // Inline task creation in the "From my tasks" tab
  const [newTaskText, setNewTaskText] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  async function handleAddTask() {
    const title = newTaskText.trim();
    if (!title || savingTask) return;
    setSavingTask(true);
    try {
      await addTaskAsync(title, selectedProjectId);
      setNewTaskText('');
      // Keep focus in the input so users can keep adding tasks quickly
      newTaskInputRef.current?.focus();
    } catch (err) {
      console.warn('[DeclareSessionModal] Add task failed:', err);
    } finally {
      setSavingTask(false);
    }
  }

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

      if (isScheduling && resolvedScheduledAt) {
        // Future slot → create scheduled session, show reminder confirmation then close
        await createScheduledSession({
          title: resolvedGoal,
          scheduledAt: resolvedScheduledAt,
          durationMinutes: duration,
          projectId: selectedProjectId ?? undefined,
        });
        setScheduledConfirm(true);
        setTimeout(onClose, 2500);
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
      // Pass the session object in router state so ActiveSessionPage has it
      // immediately on first render — the context update may flush async in
      // React 18 batching, causing a blank-loading-state flash otherwise.
      navigate(`/session/${session.id}`, { state: { session } });
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  // Format the scheduled time for the header subtitle
  const scheduledLabel = resolvedScheduledAt
    ? resolvedScheduledAt.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // Track desktop vs mobile so we can use inline styles for centering —
  // Tailwind responsive `sm:bottom-auto` was failing to unset `bottom-0`
  // reliably, leaving the modal stretched between top:50% and bottom:0.
  // Inline styles bypass that entirely.
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Render into document.body via portal — escapes any ancestor with a
  // transform/filter/contain style that would otherwise turn our `position:
  // fixed` into `position: absolute` relative to that ancestor (which is why
  // `top: 50%` was landing well below viewport center — the Layout or one of
  // the wrapping providers creates a containing block).
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40"
        onClick={onClose}
      />
      {/* Modal — explicit inline positioning, no Tailwind responsive
          shenanigans. Desktop: centered. Mobile: anchored to bottom. */}
      <div
        className="fixed z-[101] w-full sm:w-auto sm:max-w-xl bg-surface flex flex-col max-h-[88vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={
          isDesktop
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            : { bottom: 0, left: 0, right: 0 }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-surface-container-high" />
        </div>

        {/* ── Scheduled confirmation overlay ───────────────── */}
        {scheduledConfirm && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-surface rounded-3xl px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Bell size={28} className="text-emerald-600" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xl font-extrabold stitch-text-primary mb-1">Session scheduled!</p>
              <p className="text-sm stitch-text-secondary leading-relaxed">
                We'll remind you <span className="font-bold text-primary">15 minutes before</span> it starts
                — via in-app notification and email.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs stitch-text-secondary">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Closing in a moment…
            </div>
          </div>
        )}

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
              {openTasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                return (
                  <div key={task.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setSelectedTask(isSelected ? null : task)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 pr-10 ${
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
                    {/* Delete button — appears on hover, sits in top-right corner */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedTask?.id === task.id) setSelectedTask(null);
                        deleteTaskAsync(task.id).catch(() => {});
                      }}
                      title="Remove task"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-surface-container hover:bg-red-100 hover:text-red-500 stitch-text-secondary"
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}

              {/* ── Inline task creation row ── */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                newTaskText ? 'bg-surface-container ring-1 ring-primary/20' : 'bg-surface-container-low'
              }`}>
                <Plus size={14} className="stitch-text-secondary shrink-0" />
                <input
                  ref={newTaskInputRef}
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); }
                    if (e.key === 'Escape') setNewTaskText('');
                  }}
                  placeholder={openTasks.length === 0 ? 'Add your first task…' : 'Add another task…'}
                  className="flex-1 bg-transparent text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none min-w-0"
                />
                {newTaskText.trim() && (
                  <button
                    type="button"
                    onClick={handleAddTask}
                    disabled={savingTask}
                    className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
                  >
                    {savingTask
                      ? <Loader2 size={11} className="text-white animate-spin" />
                      : <Check size={11} className="text-white" strokeWidth={3} />
                    }
                  </button>
                )}
              </div>

              {openTasks.length === 0 && !newTaskText && (
                <p className="text-center text-xs stitch-text-secondary pt-1 pb-2">
                  Type a task above, or switch to "Type a goal" for a one-off.
                </p>
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

        {/* ── When picker ──────────────────────────────────── */}
        <div className="shrink-0 px-5 pt-3">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
            When
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWhenMode('now')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                whenMode === 'now'
                  ? 'stitch-btn--primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
              }`}
            >
              <Zap size={13} className={whenMode === 'now' ? 'text-white/80' : 'stitch-text-secondary'} />
              Start now
            </button>
            <button
              type="button"
              onClick={() => setWhenMode('schedule')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                whenMode === 'schedule'
                  ? 'stitch-btn--primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
              }`}
            >
              <Clock size={13} className={whenMode === 'schedule' ? 'text-white/80' : 'stitch-text-secondary'} />
              Schedule
            </button>
          </div>
          {whenMode === 'schedule' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={toLocalInput(new Date())}
              className="mt-2 w-full px-4 py-2.5 rounded-xl bg-surface-container-low stitch-text-primary text-sm outline-none focus:ring-2 ring-primary/25 transition-all"
            />
          )}
        </div>

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
                  ? `Schedule for ${scheduledLabel ?? `${duration} min`}`
                  : `Start ${duration}-min session`}
              </>
            )}
          </button>
        </div>

      </div>
    </>,
    document.body
  );
}
