import { useState } from 'react';
import { Zap, Leaf, Coffee, Sparkles, Plus, Check, Circle } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import type { CoreTask } from '../../data/CoreDataContext';
import {
  PageGreeting,
  SurfaceCard,
  GradientButton,
  InputWell,
} from '../../ui/CorePage';

type EnergyFilter = 'all' | 'deep' | 'medium' | 'light';

const ENERGY_FILTERS: { id: EnergyFilter; label: string; sublabel: string; icon: typeof Zap; color: string }[] = [
  { id: 'all',    label: 'All Levels', sublabel: `${'\u26A1'} Energy`,  icon: Sparkles, color: 'text-primary' },
  { id: 'deep',   label: 'Hyperfocus', sublabel: 'High',     icon: Zap,      color: 'text-red-500' },
  { id: 'medium', label: 'Steady',     sublabel: 'Medium',   icon: Leaf,     color: 'text-emerald-600' },
  { id: 'light',  label: 'Gentle',     sublabel: 'Low',      icon: Coffee,   color: 'text-gray-500' },
];

function energyPillClasses(energy: CoreTask['energy']): string {
  switch (energy) {
    case 'deep':   return 'bg-red-100 text-red-700';
    case 'medium': return 'bg-emerald-100 text-emerald-700';
    case 'light':  return 'bg-gray-100 text-gray-600';
  }
}

function energyLabel(energy: CoreTask['energy']): string {
  switch (energy) {
    case 'deep':   return 'High Energy';
    case 'medium': return 'Medium';
    case 'light':  return 'Low Energy';
  }
}

export function TasksPage() {
  const [draftTask, setDraftTask] = useState('');
  const [energyFilter, setEnergyFilter] = useState<EnergyFilter>('all');
  const [showCapture, setShowCapture] = useState(false);
  const {
    state: { tasks, projects, activeProjectId },
    addTask,
    toggleTask,
  } = useCoreData();

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const openTasks = tasks.filter((t) => !t.done);
  const completedTasks = tasks.filter((t) => t.done);

  const filteredOpen = energyFilter === 'all'
    ? openTasks
    : openTasks.filter((t) => t.energy === energyFilter);

  const filteredDone = energyFilter === 'all'
    ? completedTasks
    : completedTasks.filter((t) => t.energy === energyFilter);

  function submitTask() {
    if (!draftTask.trim()) return;
    addTask(draftTask);
    setDraftTask('');
    setShowCapture(false);
  }

  return (
    <div className="space-y-5 sm:space-y-8">

      {/* ── Editorial Header ──────────────────────────────── */}
      <section>
        <PageGreeting
          greeting="Your Flow State"
          subtitle="Focus on what matches your energy right now."
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles size={12} />
            {activeProject?.name ?? 'No project'}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-primary/5 text-primary px-3 py-1 rounded-full text-xs font-semibold">
            {openTasks.length} task{openTasks.length === 1 ? '' : 's'} remaining
          </span>
        </div>
      </section>

      {/* ── Energy Filter Tabs (Bento) ────────────────────── */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {ENERGY_FILTERS.map((f) => {
            const Icon = f.icon;
            const active = energyFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setEnergyFilter(f.id)}
                className={`flex flex-col items-start gap-2 p-3 sm:p-4 rounded-xl transition-all duration-200 active:scale-[0.97] ${
                  active
                    ? 'bg-white shadow-sm ring-2 ring-primary/20'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <Icon size={18} className={active ? 'text-primary' : f.color} />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
                    {f.sublabel}
                  </p>
                  <p className={`text-sm sm:text-base font-bold ${active ? 'text-primary' : 'stitch-text-primary'}`}>
                    {f.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Quick Capture (expandable) ────────────────────── */}
      {showCapture && (
        <SurfaceCard className="animate-fade-in">
          <div className="space-y-3">
            <InputWell
              value={draftTask}
              onChange={setDraftTask}
              onSubmit={submitTask}
              placeholder="What needs doing?"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium stitch-text-secondary truncate">
                {activeProject?.name ?? 'No project'}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCapture(false)}
                  className="px-3 py-2 text-sm font-medium rounded-full stitch-text-secondary hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <GradientButton size="sm" onClick={submitTask}>
                  Add task
                </GradientButton>
              </div>
            </div>
          </div>
        </SurfaceCard>
      )}

      {/* ── Task Cards Grid ───────────────────────────────── */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {filteredOpen.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={toggleTask} />
          ))}

          {filteredDone.slice(0, 4).map((task) => (
            <TaskCard key={task.id} task={task} onToggle={toggleTask} />
          ))}

          {/* Empty / Quick-add prompt */}
          {filteredOpen.length === 0 && filteredDone.length === 0 && (
            <div className="sm:col-span-2 bg-surface-container-low/50 border-2 border-dashed border-outline-variant/20 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center">
                <Plus size={20} className="text-outline-variant" />
              </div>
              <div>
                <p className="text-sm font-bold stitch-text-primary">No tasks match this filter</p>
                <p className="text-xs stitch-text-secondary mt-0.5">Try another energy level or add a task.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Floating Quick-Add Button ─────────────────────── */}
      {!showCapture && (
        <button
          type="button"
          onClick={() => setShowCapture(true)}
          className="fixed right-4 sm:right-6 bottom-24 md:bottom-8 z-20 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center shadow-2xl shadow-primary/30 hover:scale-105 active:scale-90 transition-all"
          aria-label="Quick add task"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

/* ── Individual Task Card ─────────────────────────────── */
function TaskCard({ task, onToggle }: { task: CoreTask; onToggle: (id: string) => void }) {
  return (
    <div
      className={`stitch-card flex flex-col justify-between gap-4 p-4 sm:p-5 transition-all duration-200 hover:shadow-md ${
        task.done ? 'opacity-60' : ''
      }`}
    >
      {/* Top row: energy pill + due label */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${energyPillClasses(task.energy)}`}>
            {task.energy === 'deep' && <Zap size={10} />}
            {task.energy === 'medium' && <Leaf size={10} />}
            {task.energy === 'light' && <Coffee size={10} />}
            {energyLabel(task.energy)}
          </span>
          <span className="text-[11px] font-medium stitch-text-secondary shrink-0">
            {task.dueLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className={`text-base sm:text-lg font-bold leading-snug stitch-text-primary ${task.done ? 'line-through' : ''}`}>
          {task.title}
        </h3>
      </div>

      {/* Bottom row: status + toggle */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
          task.done ? 'text-emerald-600' : 'stitch-text-secondary'
        }`}>
          {task.done ? <Check size={14} /> : <Circle size={14} />}
          {task.done ? 'Completed' : 'Not started'}
        </span>
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${
            task.done
              ? 'bg-surface-container text-on-surface-variant'
              : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105'
          }`}
          aria-label={task.done ? 'Undo task' : 'Complete task'}
        >
          <Check size={18} />
        </button>
      </div>
    </div>
  );
}
