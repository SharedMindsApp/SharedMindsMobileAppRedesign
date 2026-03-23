import { useState } from 'react';
import {
  Zap,
  Sparkles,
  Droplets,
  Squirrel,
  BatteryLow,
  Cloud,
  Circle,
  Check,
  Plus,
  Lightbulb,
  X,
  Mic,
  Users,
  MoreVertical,
} from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import type { BrainStateId, CoreTask } from '../../data/CoreDataContext';
import {
  SurfaceCard,
  PillButton,
  GradientButton,
  InputWell,
  ProgressOrbit,
} from '../../ui/CorePage';

/* ── Brain-state icon map ─────────────────────────────────── */
const brainIcons: Record<string, typeof Zap> = {
  hyperfocus: Zap,
  energised: Sparkles,
  steady: Droplets,
  distracted: Squirrel,
  low: BatteryLow,
  brainfog: Cloud,
};

/* ── Energy color helpers ─────────────────────────────────── */
function energyColor(energy: string) {
  switch (energy) {
    case 'deep':
      return 'bg-rose-100 text-rose-700';
    case 'medium':
      return 'bg-amber-100 text-amber-700';
    case 'light':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

/* ── Responsibility icon ──────────────────────────────────── */
function categoryIcon(category: string) {
  switch (category) {
    case 'health':
      return '💊';
    case 'home':
      return '🍽️';
    case 'family':
      return '🎒';
    default:
      return '✦';
  }
}

/* ════════════════════════════════════════════════════════════
   Today Page — "Command Center" layout
   Matches Stitch today_pro_fun + today_light_mode_refined
   ════════════════════════════════════════════════════════════ */

export function TodayPage() {
  const [activityDraft, setActivityDraft] = useState('');
  const [ideaDraft, setIdeaDraft] = useState('');
  const [showCapture, setShowCapture] = useState(false);
  const {
    brainStateOptions,
    state: {
      currentBrainStateId,
      activeProjectId,
      projects,
      tasks,
      responsibilities,
      activityLog,
      parkedIdeas,
      checkins,
      settings,
    },
    setCurrentBrainState,
    toggleTask,
    toggleResponsibility,
    addActivityEntry,
    addParkedIdea,
    removeParkedIdea,
    generateCheckIn,
  } = useCoreData();

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const currentBrainState =
    brainStateOptions.find((s) => s.id === currentBrainStateId) ?? brainStateOptions[0];
  const recommendedTasks = tasks
    .filter((t) => !t.done && t.projectId === activeProjectId)
    .slice(0, 4);
  const completedTasks = tasks.filter((t) => t.done);
  const openResponsibilities = responsibilities.filter((r) => !r.done);
  const completedCount =
    tasks.filter((t) => t.done).length + responsibilities.filter((r) => r.done).length;
  const totalActionable = tasks.length + responsibilities.length;
  const progressPercent =
    totalActionable > 0 ? Math.round((completedCount / totalActionable) * 100) : 0;
  const progressFraction = `${completedCount}/${totalActionable}`;
  const latestCheckIn = checkins[0];

  function submitActivity() {
    if (!activityDraft.trim()) return;
    addActivityEntry(activityDraft);
    setActivityDraft('');
  }

  function submitIdea() {
    if (!ideaDraft.trim()) return;
    addParkedIdea(ideaDraft);
    setIdeaDraft('');
    setShowCapture(false);
  }

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10">
      {/* ── Brain State Selector ─────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight">
            How's your mind?
          </h1>
          <span className="text-sm stitch-text-secondary font-medium hidden sm:block">
            Current: {currentBrainState.label}
          </span>
        </div>

        {/* Horizontally scrollable chips */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
          {brainStateOptions.map((state) => {
            const Icon = brainIcons[state.id] ?? Sparkles;
            const isSelected = currentBrainStateId === state.id;
            return (
              <button
                key={state.id}
                type="button"
                onClick={() => setCurrentBrainState(state.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full font-bold text-sm transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? 'stitch-pill--selected text-white shadow-md'
                    : 'stitch-card border border-[var(--color-border,#e2e8f0)] hover:border-[var(--color-accent,#005bc4)]/30'
                }`}
              >
                <Icon size={18} />
                <span className="whitespace-nowrap">{state.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Bento Row 1: Focus Project + Momentum ────────── */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-12">
        {/* Focus Project — large hero card */}
        <div className="md:col-span-8">
          <SurfaceCard padding="lg" className="relative overflow-hidden min-h-[220px] sm:min-h-[280px] flex flex-col justify-between">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full stitch-btn--primary flex items-center justify-center text-white">
                <Sparkles size={24} />
              </div>
            </div>
            <div className="pr-16 sm:pr-20">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider stitch-pill-tone--primary mb-3">
                Active Project
              </span>
              <h2 className="stitch-headline text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
                {activeProject?.name ?? 'No active project'}
              </h2>
              <p className="mt-2 text-sm sm:text-base stitch-text-secondary leading-relaxed max-w-md">
                {activeProject?.description ?? 'Select a project to focus your tasks and check-ins.'}
              </p>
            </div>
            <div className="mt-4 sm:mt-6 space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold stitch-headline">
                  {progressPercent}% Momentum
                </span>
                <span className="text-xs stitch-text-secondary">
                  {completedCount} of {totalActionable} actions done
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden stitch-card--nested">
                <div
                  className="h-full rounded-full stitch-btn--primary transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </SurfaceCard>
        </div>

        {/* Momentum / Daily Wins — compact orbit card */}
        <div className="md:col-span-4">
          <SurfaceCard padding="lg" className="flex flex-col items-center justify-center text-center h-full min-h-[220px] sm:min-h-[280px]">
            <ProgressOrbit value={progressPercent} size={120} strokeWidth={8}>
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black stitch-headline">
                  {progressFraction}
                </span>
                <span className="text-[10px] uppercase tracking-widest font-bold stitch-text-secondary mt-0.5">
                  Wins
                </span>
              </div>
            </ProgressOrbit>
            <div className="mt-4 space-y-1">
              <p className="text-sm font-bold stitch-text-primary">
                Daily Streak: {checkins.length + 1}
              </p>
              <p className="text-xs stitch-text-secondary">
                {progressPercent >= 75
                  ? "You're in the flow zone!"
                  : progressPercent >= 50
                  ? 'Great momentum — keep going!'
                  : 'Every step counts.'}
              </p>
            </div>
          </SurfaceCard>
        </div>
      </div>

      {/* ── Bento Row 2: Task Stack + Sidebar ─────────────── */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-12">
        {/* Task Stack */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="stitch-headline text-lg sm:text-xl font-bold">Today's Stack</h2>
              <p className="text-xs stitch-text-secondary font-medium mt-0.5">
                Personalized for {currentBrainState.label} state
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {recommendedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={() => toggleTask(task.id)} />
            ))}

            {/* Show a completed task if any */}
            {completedTasks.slice(0, 1).map((task) => (
              <TaskCard key={task.id} task={task} onToggle={() => toggleTask(task.id)} />
            ))}

            {recommendedTasks.length === 0 && completedTasks.length === 0 && (
              <SurfaceCard padding="md">
                <p className="text-sm stitch-text-secondary text-center py-4">
                  All caught up — nice work. Take a breath.
                </p>
              </SurfaceCard>
            )}
          </div>
        </div>

        {/* Sidebar: Responsibilities + Parked Ideas + Activity */}
        <div className="md:col-span-5 space-y-4 sm:space-y-5">
          {/* Daily Responsibilities — 2x2 compact grid */}
          <SurfaceCard variant="nested" padding="md">
            <p className="text-[11px] font-black uppercase tracking-widest stitch-text-secondary mb-3">
              Daily Routine
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {responsibilities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleResponsibility(item.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl text-left transition-all duration-200 active:scale-95 ${
                    item.done
                      ? 'stitch-checkable--done'
                      : 'stitch-card border border-[var(--color-border,#e2e8f0)] hover:shadow-sm'
                  }`}
                >
                  {item.done ? (
                    <div className="w-5 h-5 rounded-full stitch-check-circle--done flex items-center justify-center shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                  ) : (
                    <span className="text-base shrink-0">{categoryIcon(item.category)}</span>
                  )}
                  <span className={`text-xs font-bold truncate ${item.done ? 'line-through opacity-60' : 'stitch-text-primary'}`}>
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </SurfaceCard>

          {/* AI Check-in */}
          <SurfaceCard padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Mic size={16} className="stitch-icon-accent" />
              <p className="text-[11px] font-black uppercase tracking-widest stitch-text-secondary">
                Check-in
              </p>
            </div>
            <p className="text-sm leading-relaxed stitch-text-secondary">
              {latestCheckIn?.prompt ??
                'Generate a check-in for a personalised prompt based on your context.'}
            </p>
            <div className="mt-3">
              <GradientButton size="sm" onClick={generateCheckIn}>
                Generate check-in
              </GradientButton>
            </div>
          </SurfaceCard>

          {/* Parked Ideas */}
          <SurfaceCard padding="md">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[11px] font-black uppercase tracking-widest stitch-text-secondary">
                Parked Ideas
              </p>
              <button
                type="button"
                onClick={() => setShowCapture(!showCapture)}
                className="stitch-icon-accent hover:opacity-80 transition-opacity"
              >
                <Plus size={18} />
              </button>
            </div>

            {showCapture && (
              <div className="mb-3 space-y-2">
                <InputWell
                  value={ideaDraft}
                  onChange={setIdeaDraft}
                  onSubmit={submitIdea}
                  placeholder="Park an idea for later..."
                />
                <div className="flex gap-2 justify-end">
                  <GradientButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowCapture(false);
                      setIdeaDraft('');
                    }}
                  >
                    Cancel
                  </GradientButton>
                  <GradientButton size="sm" onClick={submitIdea}>
                    Save
                  </GradientButton>
                </div>
              </div>
            )}

            {parkedIdeas.length > 0 ? (
              <div className="space-y-2.5">
                {parkedIdeas.map((idea, idx) => (
                  <div
                    key={idea.id}
                    className={`p-3 rounded-xl text-xs font-medium leading-relaxed stitch-text-secondary stitch-card--nested border-l-4 ${
                      idx % 2 === 0
                        ? 'border-l-[var(--color-accent,#005bc4)]'
                        : 'border-l-[var(--color-secondary,#506076)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span>{idea.text}</span>
                      <button
                        type="button"
                        onClick={() => removeParkedIdea(idea.id)}
                        className="shrink-0 p-0.5 rounded-full opacity-40 hover:opacity-100 transition-opacity"
                        aria-label="Remove idea"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showCapture ? (
              <p className="text-xs stitch-text-secondary opacity-60">
                No ideas parked yet. Tap + to capture one.
              </p>
            ) : null}
          </SurfaceCard>
        </div>
      </div>

      {/* ── Bento Row 3: Activity Log (full width) ────────── */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="stitch-headline text-lg sm:text-xl font-bold">Activity Log</h2>
            <p className="text-xs stitch-text-secondary font-medium mt-0.5">
              {activityLog.length} entries today
            </p>
          </div>
        </div>

        {/* Quick log input */}
        <div className="mb-4 flex gap-2">
          <div className="flex-1">
            <InputWell
              value={activityDraft}
              onChange={setActivityDraft}
              onSubmit={submitActivity}
              placeholder="What did you just do?"
            />
          </div>
          <GradientButton size="sm" onClick={submitActivity}>
            Log
          </GradientButton>
        </div>

        {activityLog.length > 0 && (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activityLog.map((entry, idx) => (
              <SurfaceCard key={entry.id} padding="sm">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${
                      idx === 0
                        ? 'stitch-btn--primary'
                        : 'bg-[var(--color-surface-dim,#d7dadf)] text-[var(--color-text-secondary,#5b6063)]'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold stitch-text-primary truncate">
                      {entry.title}
                    </p>
                    <p className="text-[11px] stitch-text-secondary mt-0.5">
                      {entry.time}
                      {entry.durationMins > 0 ? ` · ${entry.durationMins}m` : ''}
                    </p>
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </section>

      {/* ── Floating Action Button ────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowCapture(true)}
        className="fixed right-4 bottom-24 md:bottom-8 w-14 h-14 rounded-full stitch-btn--primary text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40"
        aria-label="Quick add"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}

/* ── Task Card ────────────────────────────────────────────── */

function TaskCard({
  task,
  onToggle,
}: {
  task: CoreTask;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center p-4 sm:p-5 rounded-2xl transition-all duration-200 group ${
        task.done
          ? 'stitch-checkable--done opacity-60'
          : 'stitch-card border border-[var(--color-border,#e2e8f0)] hover:border-[var(--color-accent,#005bc4)]/20 hover:shadow-sm'
      }`}
    >
      {/* Toggle circle */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 ${
          task.done
            ? 'stitch-check-circle--done'
            : 'border-2 border-[var(--color-accent,#005bc4)]/20 hover:bg-[var(--color-accent,#005bc4)]/5'
        }`}
      >
        {task.done ? (
          <Check size={16} className="text-white" />
        ) : (
          <Circle size={16} className="opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </button>

      {/* Content */}
      <div className="ml-3 sm:ml-4 flex-1 min-w-0">
        <p
          className={`text-sm sm:text-base font-semibold truncate ${
            task.done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'
          }`}
        >
          {task.title}
        </p>
        {!task.done && (
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${energyColor(task.energy)}`}
            >
              {task.energy === 'deep' ? 'High Energy' : task.energy === 'medium' ? 'Med Energy' : 'Low Energy'}
            </span>
            {task.dueLabel && (
              <span className="text-[11px] stitch-text-secondary font-medium">
                {task.dueLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Drag handle hint */}
      {!task.done && (
        <MoreVertical
          size={18}
          className="stitch-text-secondary opacity-0 group-hover:opacity-60 transition-opacity shrink-0 ml-2"
        />
      )}
    </div>
  );
}
