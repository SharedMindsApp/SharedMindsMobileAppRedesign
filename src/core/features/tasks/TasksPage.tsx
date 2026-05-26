/**
 * TasksPage — operational task surface.
 *
 * Redesigned to match the row pattern from the home page Plan tab:
 *   • Compact rows (1 line each instead of bulky cards)
 *   • Checkbox-left, title-middle, delete-on-hover-right
 *   • Inline "+ Add" at top of the list (no floating button that fights the chat widget)
 *   • Project + energy filter chips share one slim row
 *   • Completed tasks collapse into a "Done this week" section
 *
 * Same vocabulary as the Plan tab so users don't relearn the page.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Leaf, Coffee, Sparkles, Plus, Check, X, Play, Target, Clock, ChevronDown, Pencil } from 'lucide-react';
import { useCoreData, type CoreTask } from '../../data/CoreDataContext';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { showToast } from '../../../components/Toast';
import { PageGreeting, SurfaceCard, GradientButton } from '../../ui/CorePage';
import { DeclareSessionModal } from '../sessions/DeclareSessionModal';
import { TaskEditModal } from './TaskEditModal';

type EnergyFilter = 'all' | 'deep' | 'medium' | 'light';

const ENERGY_CHIPS: { id: EnergyFilter; label: string; icon: typeof Zap }[] = [
  { id: 'all',    label: 'All',    icon: Sparkles },
  { id: 'deep',   label: 'High',   icon: Zap },
  { id: 'medium', label: 'Medium', icon: Leaf },
  { id: 'light',  label: 'Low',    icon: Coffee },
];

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectChipHex(token: string | null): string {
  if (!token) return '#94a3b8';
  return PROJECT_HEX[token] ?? token;
}

const ENERGY_BARS: Record<CoreTask['energy'], string> = {
  deep:   'bg-violet-400',
  medium: 'bg-blue-400',
  light:  'bg-amber-400',
};

export function TasksPage() {
  const navigate = useNavigate();
  const [draftTask, setDraftTask] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [energyFilter, setEnergyFilter] = useState<EnergyFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string | null>(null);  // null=all, '__inbox'=unscoped, uuid=specific
  const [showDeclare, setShowDeclare] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [editingTask, setEditingTask] = useState<CoreTask | null>(null);
  const { activeSession } = useFocusSession();
  const {
    state: { tasks, projects, activeProjectId },
    addTaskAsync,
    toggleTask,
    deleteTaskAsync,
  } = useCoreData();

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Apply project filter
  const projectFiltered = projectFilter === null
    ? tasks
    : projectFilter === '__inbox'
      ? tasks.filter((t) => !t.projectId)
      : tasks.filter((t) => t.projectId === projectFilter);

  // Apply energy filter
  const energyFiltered = energyFilter === 'all'
    ? projectFiltered
    : projectFiltered.filter((t) => t.energy === energyFilter);

  // Open + done partition; open sorted continue-first
  const open = energyFiltered.filter((t) => !t.done).sort((a, b) => {
    const aCont = isContinue(a);
    const bCont = isContinue(b);
    if (aCont !== bCont) return aCont ? -1 : 1;
    return 0;
  });
  const done = energyFiltered.filter((t) => t.done);

  async function handleAddTask() {
    const title = draftTask.trim();
    if (!title || savingTask) return;
    setSavingTask(true);
    try {
      const targetProjectId =
        projectFilter && projectFilter !== '__inbox' ? projectFilter : activeProjectId;
      await addTaskAsync(title, targetProjectId);
      setDraftTask('');
    } catch (err) {
      console.warn('[TasksPage] add failed:', err);
    } finally {
      setSavingTask(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-8">

      {/* ── Header ─────────────────────────────────────── */}
      <section>
        <PageGreeting
          greeting="Your tasks"
          subtitle="Focus on what matches your energy right now."
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles size={12} />
            {activeProject?.name ?? 'No active project'}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-primary/8 text-primary px-3 py-1 rounded-full text-xs font-semibold">
            {open.length} open
          </span>
          {done.length > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-surface-container-low stitch-text-secondary px-3 py-1 rounded-full text-xs font-semibold">
              {done.length} done
            </span>
          )}
        </div>
      </section>

      {/* ── Start session CTA (compact) ───────────────── */}
      {!activeSession && (
        <SurfaceCard>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold stitch-text-primary truncate">Ready to focus?</p>
              <p className="text-xs stitch-text-secondary mt-0.5 truncate">
                Declare the one thing for your next session.
              </p>
            </div>
            <GradientButton size="sm" onClick={() => setShowDeclare(true)}>
              <Play size={13} className="mr-1" />
              Start
            </GradientButton>
          </div>
        </SurfaceCard>
      )}

      {/* ── Filter row — project + energy in one slim strip ── */}
      <section className="space-y-2">
        {projects.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
            <FilterChip
              label="All projects"
              selected={projectFilter === null}
              onClick={() => setProjectFilter(null)}
            />
            <FilterChip
              label="Inbox"
              selected={projectFilter === '__inbox'}
              onClick={() => setProjectFilter('__inbox')}
            />
            {projects.map((p) => (
              <FilterChip
                key={p.id}
                label={p.name}
                color={p.color}
                selected={projectFilter === p.id}
                onClick={() => setProjectFilter(p.id)}
              />
            ))}
          </div>
        )}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          {ENERGY_CHIPS.map((e) => {
            const Icon = e.icon;
            const active = energyFilter === e.id;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setEnergyFilter(e.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
                }`}
              >
                <Icon size={11} />
                {e.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Inline + Add ─────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container-low ring-1 ring-surface-container">
        <Plus size={14} className="stitch-text-secondary shrink-0" />
        <input
          type="text"
          value={draftTask}
          onChange={(e) => setDraftTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); }
          }}
          placeholder="Capture a task…"
          className="flex-1 bg-transparent text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none min-w-0"
        />
        {draftTask.trim() && (
          <button
            type="button"
            onClick={handleAddTask}
            disabled={savingTask}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
          >
            Add
          </button>
        )}
      </div>

      {/* ── Open task list ──────────────────────────── */}
      <section className="space-y-1.5">
        {open.length > 0 ? (
          open.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projects={projects}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => deleteTaskAsync(task.id).catch((err) => {
                console.error('[TasksPage] delete failed:', err);
                showToast('error', "Couldn't delete that task. Refresh and try again.");
              })}
              onEdit={() => setEditingTask(task)}
              onStartSession={() => {
                // Open declare modal — currently we don't have a way to pre-select
                // a task by ID. Title-prefill happens via the modal's "Type a goal"
                // tab, which lets users continue from any task quickly.
                setShowDeclare(true);
              }}
            />
          ))
        ) : (
          <div className="rounded-xl bg-surface-container-low/50 ring-1 ring-dashed ring-outline-variant/20 p-6 text-center">
            <p className="text-sm font-bold stitch-text-primary">Nothing matches this filter</p>
            <p className="text-xs stitch-text-secondary mt-1">
              {tasks.filter((t) => !t.done).length === 0
                ? 'Capture your first task above ↑'
                : 'Try a different energy or project filter.'}
            </p>
          </div>
        )}
      </section>

      {/* ── Done section (collapsible) ──────────────── */}
      {done.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="w-full flex items-center justify-between px-1 py-2 hover:opacity-70 transition-opacity"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
              Done · {done.length}
            </span>
            <ChevronDown
              size={14}
              className={`stitch-text-secondary transition-transform ${showDone ? 'rotate-180' : ''}`}
            />
          </button>
          {showDone && (
            <div className="space-y-1.5">
              {done.slice(0, 20).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projects={projects}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTaskAsync(task.id).catch((err) => {
                console.error('[TasksPage] delete failed:', err);
                showToast('error', "Couldn't delete that task. Refresh and try again.");
              })}
                  onStartSession={() => setShowDeclare(true)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showDeclare && (
        <DeclareSessionModal onClose={() => setShowDeclare(false)} />
      )}

      {editingTask && (
        <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );

  // Helper: suppress unused-import warning if navigate isn't otherwise used
  void navigate;
}

// ── Helpers / sub-components ──────────────────────────────────────

function isContinue(t: CoreTask): boolean {
  return t.lastSessionOutcome === 'partially'
      || t.lastSessionOutcome === 'something_came_up'
      || t.lastSessionOutcome === 'no_answer';
}

function FilterChip({
  label, color = null, selected, onClick,
}: {
  label: string;
  color?: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
        selected
          ? 'bg-primary text-white shadow-sm'
          : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
      }`}
    >
      {color && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: projectChipHex(color) }}
        />
      )}
      <span className="truncate max-w-[140px]">{label}</span>
    </button>
  );
}

function TaskRow({
  task, projects, onToggle, onDelete, onEdit, onStartSession,
}: {
  task: CoreTask;
  projects: Array<{ id: string; name: string; color: string | null }>;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onStartSession: () => void;
}) {
  const project = task.projectId
    ? projects.find((p) => p.id === task.projectId)
    : null;
  const continueFlag = isContinue(task);
  const sessions = task.sessionsCount ?? 0;

  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${
        task.done
          ? 'opacity-55 bg-surface-container-low'
          : continueFlag
          ? 'bg-amber-50/60 hover:bg-amber-50 ring-1 ring-amber-200/40'
          : 'bg-white ring-1 ring-surface-container hover:bg-surface-container-low'
      }`}
    >
      {/* Energy bar */}
      <div className={`w-0.5 self-stretch rounded-full shrink-0 ${ENERGY_BARS[task.energy]}`} />

      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        title={task.done ? 'Mark as not done' : 'Mark as done'}
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.done
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-surface-container-high hover:border-emerald-500 hover:bg-emerald-50'
        }`}
      >
        <Check
          size={11}
          className={
            task.done
              ? 'text-white opacity-100'
              : 'text-emerald-500 opacity-0 group-hover:opacity-60 transition-opacity'
          }
          strokeWidth={3}
        />
      </button>

      {/* Main click area — opens session */}
      <button
        type="button"
        onClick={onStartSession}
        disabled={task.done}
        className="flex-1 min-w-0 text-left active:scale-[0.99] transition-transform pr-20 disabled:cursor-default"
        title={task.done ? 'Task completed' : 'Start a session on this task'}
      >
        <p className={`text-sm font-semibold leading-tight ${
          task.done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'
        }`}>
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {project && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary truncate max-w-[120px]">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: projectChipHex(project.color) }}
              />
              {project.name}
            </span>
          )}
          {!project && (
            <span className="text-[10px] font-semibold stitch-text-secondary">
              Inbox
            </span>
          )}
          {task.weeklyIntentionId && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">
              <Target size={8} /> Intention
            </span>
          )}
          {continueFlag && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              <Clock size={8} /> Continue
            </span>
          )}
          {sessions > 0 && !continueFlag && (
            <span className="text-[9px] font-semibold stitch-text-secondary">
              {sessions} session{sessions === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </button>

      {/* Edit + Delete — hover-reveal cluster */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          title="Edit task"
          aria-label="Edit task"
          className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container hover:bg-primary/15 hover:text-primary stitch-text-secondary transition-colors"
        >
          <Pencil size={11} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete task"
          aria-label="Delete task"
          className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container hover:bg-red-100 hover:text-red-500 stitch-text-secondary transition-colors"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
