import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, List, PenLine, Loader2, Timer, Zap, Leaf, Coffee, Users, UserPlus, Mic, MicOff, User } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import type { CoreTask } from '../../data/CoreDataContext';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { startCommunitySession } from '../../services/SessionService';
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

interface Props {
  onClose: () => void;
  initialGoal?: string;
}

export function DeclareSessionModal({ onClose, initialGoal }: Props) {
  const navigate = useNavigate();
  const { state: { tasks } } = useCoreData();
  const { setActiveSession } = useFocusSession();

  const [tab, setTab] = useState<GoalTab>(initialGoal ? 'type' : 'pick');
  const [selectedTask, setSelectedTask] = useState<CoreTask | null>(null);
  const [goalText, setGoalText] = useState(initialGoal ?? '');
  const [duration, setDuration] = useState<DurationOption>(50);
  const [sessionMode, setSessionMode] = useState<'group' | 'one_on_one' | 'solo'>('group');
  const [quietMode, setQuietMode] = useState(false);
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
      const session = await startCommunitySession({
        goalText: resolvedGoal,
        taskId: tab === 'pick' && selectedTask ? selectedTask.id : undefined,
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <div className="relative w-full h-full flex flex-col max-w-2xl mx-auto">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl stitch-card--accent flex items-center justify-center shrink-0">
              <Timer size={18} className="text-white" />
            </div>
            <div>
              <h2 className="stitch-headline text-base font-extrabold leading-tight">
                Declare your focus
              </h2>
              <p className="text-xs stitch-text-secondary">
                What's the one thing you'll finish?
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
              {/* Goal confirmation strip */}
              {goalText.trim() && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <Check size={13} className="text-emerald-500 shrink-0" strokeWidth={3} />
                  <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium leading-snug">
                    {goalText.trim()}
                  </p>
                </div>
              )}
            </div>
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

        {/* ── Session mode ─────────────────────────────────── */}
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
                <Timer size={18} />
                {canSubmit ? `Start ${duration}-min session` : 'Pick a goal to start'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
