import { useMemo } from 'react';
import {
  Zap,
  Clock,
  CalendarDays,
  Plus,
  Check,
  Circle,
  Sparkles,
  Coffee,
  AlertTriangle,
} from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import type { CoreTask } from '../../data/CoreDataContext';
import { CalendarShell } from '../../../components/calendarCore';
import {
  SurfaceCard,
  ProgressOrbit,
} from '../../ui/CorePage';

/* ════════════════════════════════════════════════════════════
   Calendar Page — ADHD-Optimized Command Center
   ─────────────────────────────────────────────────────────
   Design principles (from Stitch prototypes, improved):
   • "Up Next" hero: Always show what's coming — reduces
     time-blindness anxiety with a bold, prominent card
   • Energy tagging: Events inherit brain-state context
   • Task awareness: Due-today tasks shown alongside calendar
     so nothing falls through the cracks
   • Momentum orbit: Gamified daily progress, not anxious
   • Three-view switcher: Day / Week / Month with sensible
     defaults based on screen size
   ════════════════════════════════════════════════════════════ */

/* ── Helpers ──────────────────────────────────────────────── */

function formatTodayHero(): { dayName: string; dayNum: string; month: string } {
  const now = new Date();
  return {
    dayName: now.toLocaleDateString('en-US', { weekday: 'long' }),
    dayNum: now.getDate().toString(),
    month: now.toLocaleDateString('en-US', { month: 'long' }),
  };
}

function energyBadge(energy: string) {
  switch (energy) {
    case 'deep':
      return { label: 'High Energy', color: 'bg-rose-100 text-rose-700', icon: Zap };
    case 'medium':
      return { label: 'Med Energy', color: 'bg-amber-100 text-amber-700', icon: Coffee };
    case 'light':
      return { label: 'Low Energy', color: 'bg-emerald-100 text-emerald-700', icon: Sparkles };
    default:
      return { label: 'Energy', color: 'bg-slate-100 text-slate-600', icon: Sparkles };
  }
}

/* ── Main component ───────────────────────────────────────── */

export function CalendarPage() {
  const {
    state: {
      activeSpaceId,
      tasks,
      responsibilities,
      currentBrainStateId,
    },
    brainStateOptions,
    toggleTask,
    toggleResponsibility,
  } = useCoreData();

  const today = formatTodayHero();
  const currentBrainState =
    brainStateOptions.find((s) => s.id === currentBrainStateId) ?? brainStateOptions[2];

  // Tasks due today (or high priority incomplete tasks)
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.done && (t.dueLabel === 'Today' || t.priority === 'high'))
        .slice(0, 3),
    [tasks],
  );

  const openResponsibilities = responsibilities.filter((r) => !r.done);

  // Progress
  const completedCount =
    tasks.filter((t) => t.done).length + responsibilities.filter((r) => r.done).length;
  const totalActionable = tasks.length + responsibilities.length;
  const progressPercent =
    totalActionable > 0 ? Math.round((completedCount / totalActionable) * 100) : 0;

  return (
    <div className="space-y-5 sm:space-y-6 md:space-y-8">
      {/* ── Hero Header ──────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-widest stitch-icon-accent">
            Today's Focus
          </p>
          <div className="flex items-baseline gap-2 sm:gap-3">
            <h1 className="stitch-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              {today.dayName}, {today.dayNum}
            </h1>
            <span className="text-lg sm:text-2xl font-semibold stitch-text-secondary">
              {today.month}
            </span>
          </div>
        </div>

        {/* Brain state chip */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full stitch-card--nested text-sm font-bold shrink-0">
          <span>{currentBrainState.emoji}</span>
          <span className="stitch-text-primary">{currentBrainState.label}</span>
        </div>
      </section>

      {/* ── Bento Row: Up Next + Momentum + Quick Tasks ─── */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-12">
        {/* Up Next — hero card */}
        <div className="md:col-span-5">
          <UpNextCard brainState={currentBrainState.label} />
        </div>

        {/* Daily Momentum — orbit */}
        <div className="md:col-span-3">
          <SurfaceCard padding="md" className="flex flex-col items-center justify-center text-center h-full min-h-[200px]">
            <ProgressOrbit value={progressPercent} size={100} strokeWidth={7}>
              <div className="flex flex-col items-center">
                <span className="text-xl font-black stitch-headline">{progressPercent}%</span>
                <span className="text-[9px] uppercase tracking-widest font-bold stitch-text-secondary">
                  Done
                </span>
              </div>
            </ProgressOrbit>
            <p className="mt-3 text-xs font-bold stitch-text-primary">Daily Momentum</p>
            <p className="text-[11px] stitch-text-secondary mt-0.5">
              {completedCount} of {totalActionable} actions
            </p>
          </SurfaceCard>
        </div>

        {/* Quick tasks sidebar */}
        <div className="md:col-span-4">
          <SurfaceCard padding="md" className="h-full">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black uppercase tracking-widest stitch-text-secondary">
                Due Today
              </p>
              {openResponsibilities.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold stitch-text-secondary">
                  <AlertTriangle size={12} />
                  {openResponsibilities.length} routine{openResponsibilities.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <MiniTaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Check size={24} className="stitch-icon-accent mb-2 opacity-40" />
                <p className="text-sm stitch-text-secondary">All caught up for today.</p>
              </div>
            )}

            {/* Responsibilities quick-check */}
            {openResponsibilities.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border,#e2e8f0)]">
                <div className="flex flex-wrap gap-2">
                  {openResponsibilities.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleResponsibility(r.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold stitch-card border border-[var(--color-border,#e2e8f0)] hover:shadow-sm active:scale-95 transition-all"
                    >
                      <Circle size={10} className="stitch-text-secondary" />
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>

      {/* ── Calendar Shell ────────────────────────────────── */}
      <section>
        <SurfaceCard padding="sm" className="overflow-hidden">
          <div className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-18rem)] md:h-[calc(100vh-16rem)] min-h-[400px] sm:min-h-[500px]">
            <CalendarShell
              context="spaces"
              scope={{ householdId: activeSpaceId ?? undefined }}
              ui={{
                showHeader: true,
                showViewSelector: true,
                defaultView: 'month',
                enableGestures: true,
                filters: { memberIds: [], colors: [], myEventsOnly: false },
              }}
              handlers={{
                onEventClick: () => console.log('Event clicked'),
                onTimeSlotClick: () => console.log('Time slot clicked'),
                onDayDoubleClick: () => console.log('Day double clicked'),
                onEventCreate: () => console.log('Event created'),
              }}
              className="h-full"
            />
          </div>
        </SurfaceCard>
      </section>

      {/* ── FAB ───────────────────────────────────────────── */}
      <button
        type="button"
        className="fixed right-4 bottom-24 md:bottom-8 w-14 h-14 rounded-full stitch-btn--primary text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40"
        aria-label="Add event"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════ */

/* ── Up Next Card ─────────────────────────────────────────
   Shows the next upcoming event in a prominent hero card.
   Designed to combat ADHD time-blindness by making the
   next commitment unmissable.
   ─────────────────────────────────────────────────────── */

function UpNextCard({ brainState }: { brainState: string }) {
  // In a real implementation, this would pull from calendar events.
  // For now, we show a contextual prompt.
  const hour = new Date().getHours();

  // Time-of-day adaptive content
  let nextTitle = 'Plan your focus blocks';
  let nextTime = "When you're ready";
  let nextDuration = '';
  let nextCategory = 'Planning';

  if (hour < 10) {
    nextTitle = 'Morning Focus Block';
    nextTime = '09:00 – 10:30';
    nextDuration = '90 min';
    nextCategory = 'Deep Work';
  } else if (hour < 13) {
    nextTitle = 'Midday Check-in';
    nextTime = '12:00 – 12:30';
    nextDuration = '30 min';
    nextCategory = 'Reflection';
  } else if (hour < 17) {
    nextTitle = 'Afternoon Wind-down';
    nextTime = '16:00 – 16:30';
    nextDuration = '30 min';
    nextCategory = 'Transition';
  } else {
    nextTitle = 'Evening Reset';
    nextTime = 'Before bed';
    nextDuration = '15 min';
    nextCategory = 'Routine';
  }

  return (
    <div className="stitch-card--accent rounded-[1.75rem] p-5 sm:p-6 md:p-8 relative overflow-hidden h-full min-h-[200px] flex flex-col justify-between">
      {/* Background accent blur */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-white/90 mb-3">
          Up Next
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{nextTitle}</h3>
        <div className="flex items-center gap-3 text-sm text-white/80">
          <span className="flex items-center gap-1">
            <Clock size={14} /> {nextTime}
          </span>
          {nextDuration && (
            <span className="flex items-center gap-1">
              <CalendarDays size={14} /> {nextDuration}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white">
            {nextCategory}
          </span>
          <span className="text-[10px] font-bold text-white/60 flex items-center gap-1">
            <Zap size={10} /> {brainState}
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <button
          type="button"
          className="w-full py-3 sm:py-3.5 bg-white text-[var(--color-accent,#005bc4)] rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all"
        >
          Prepare Focus Mode
        </button>
      </div>
    </div>
  );
}

/* ── Mini Task Row ────────────────────────────────────────
   Compact task row for the sidebar. Shows energy badge
   and toggle circle. Fits in tight spaces.
   ─────────────────────────────────────────────────────── */

function MiniTaskRow({
  task,
  onToggle,
}: {
  task: CoreTask;
  onToggle: () => void;
}) {
  const badge = energyBadge(task.energy);
  const BadgeIcon = badge.icon;

  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl stitch-card--nested group transition-all hover:shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 ${task.done
          ? 'stitch-check-circle--done'
          : 'border-2 border-[var(--color-accent,#005bc4)]/20 hover:bg-[var(--color-accent,#005bc4)]/5'
          }`}
      >
        {task.done ? (
          <Check size={12} className="text-white" />
        ) : (
          <Circle size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${task.done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'}`}>
          {task.title}
        </p>
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${badge.color}`}>
        <BadgeIcon size={9} className="inline -mt-px mr-0.5" />
        {task.energy === 'deep' ? 'Hi' : task.energy === 'medium' ? 'Med' : 'Lo'}
      </span>
    </div>
  );
}
