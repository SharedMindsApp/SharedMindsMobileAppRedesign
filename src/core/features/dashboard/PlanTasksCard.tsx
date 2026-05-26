/**
 * PlanTasksCard — the "Tasks" surface inside the home page Plan tab.
 *
 * Up to 6 open tasks, sorted so the right thing is on top:
 *   1. "Continue" tasks — last session ended partially / something_came_up
 *   2. Tasks linked to a weekly intention (strategic)
 *   3. Tasks in the user's pinned active project
 *   4. Everything else (newest first)
 *
 * Each row click opens the DeclareSessionModal with that task's title
 * pre-filled. "+ Add task" + "View all" link out.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Loader2, Sparkles, Target, Clock, Check, X, Pencil } from 'lucide-react';
import { useCoreData, type CoreTask, type CoreProject } from '../../data/CoreDataContext';
import { TaskEditModal } from '../tasks/TaskEditModal';
import { showToast } from '../../../components/Toast';

const MAX_VISIBLE = 6;

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDot(token: string | null): string {
  if (!token) return '#94a3b8';
  return PROJECT_HEX[token] ?? token;
}

const ENERGY_BARS: Record<CoreTask['energy'], string> = {
  deep:   'bg-violet-400',
  medium: 'bg-blue-400',
  light:  'bg-amber-400',
};

export function PlanTasksCard({
  tasks, projects, onSelectTask,
}: {
  tasks: CoreTask[];
  projects: CoreProject[];
  onSelectTask: (taskTitle: string) => void;
}) {
  const navigate = useNavigate();
  const { state: { activeProjectId }, addTaskAsync, toggleTask, deleteTaskAsync } = useCoreData();
  const [newTaskText, setNewTaskText] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<CoreTask | null>(null);

  // Sort tasks by priority signal
  const openTasks = tasks.filter((t) => !t.done);
  const sorted = [...openTasks].sort((a, b) => {
    // Continue tasks first (last_session_outcome in partial/something_came_up/no_answer)
    const aContinue = isContinue(a);
    const bContinue = isContinue(b);
    if (aContinue !== bContinue) return aContinue ? -1 : 1;
    // Then intention-linked
    const aIntention = !!a.weeklyIntentionId;
    const bIntention = !!b.weeklyIntentionId;
    if (aIntention !== bIntention) return aIntention ? -1 : 1;
    // Then active project
    const aActive = a.projectId === activeProjectId;
    const bActive = b.projectId === activeProjectId;
    if (aActive !== bActive) return aActive ? -1 : 1;
    // Continue tasks ordered by recency
    if (aContinue && bContinue) {
      const at = a.lastSessionAt ? new Date(a.lastSessionAt).getTime() : 0;
      const bt = b.lastSessionAt ? new Date(b.lastSessionAt).getTime() : 0;
      return bt - at;
    }
    return 0;
  });

  const visible = sorted.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, openTasks.length - visible.length);

  async function handleAdd() {
    const title = newTaskText.trim();
    if (!title || savingTask) return;
    setSavingTask(true);
    try {
      await addTaskAsync(title, activeProjectId);
      setNewTaskText('');
    } catch (err) {
      console.warn('[PlanTasksCard] add failed:', err);
    } finally {
      setSavingTask(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-surface-container p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
            Tasks · {openTasks.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:opacity-70 transition-opacity"
          >
            <Plus size={11} /> Add
          </button>
          {openTasks.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:opacity-70 transition-opacity"
            >
              All <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Inline add row */}
      {adding && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-surface-container-low ring-1 ring-primary/20 mb-2">
          <Plus size={12} className="stitch-text-secondary shrink-0" />
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
              if (e.key === 'Escape') { setAdding(false); setNewTaskText(''); }
            }}
            autoFocus
            placeholder="What's the task?"
            className="flex-1 bg-transparent text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none min-w-0"
          />
          {newTaskText.trim() && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={savingTask}
              className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
            >
              {savingTask
                ? <Loader2 size={11} className="text-white animate-spin" />
                : <Plus size={11} className="text-white rotate-45" strokeWidth={3} />
              }
            </button>
          )}
        </div>
      )}

      {/* Task list */}
      {visible.length > 0 ? (
        <div className="space-y-1">
          {visible.map((task) => {
            const project = task.projectId
              ? projects.find((p) => p.id === task.projectId)
              : null;
            const continueFlag = isContinue(task);

            return (
              <div
                key={task.id}
                className={`group relative flex items-center gap-2 px-2 py-2 rounded-xl transition-all ${
                  continueFlag
                    ? 'bg-amber-50/60 hover:bg-amber-50 ring-1 ring-amber-200/40'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                {/* Energy bar */}
                <div className={`w-0.5 self-stretch rounded-full shrink-0 ${ENERGY_BARS[task.energy]}`} />

                {/* Checkbox — tap to mark done without doing a session */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                  title="Mark as done"
                  aria-label="Mark as done"
                  className="shrink-0 w-5 h-5 rounded-full border-2 border-surface-container hover:border-emerald-500 hover:bg-emerald-50 flex items-center justify-center transition-colors"
                >
                  <Check size={11} className="text-emerald-500 opacity-0 group-hover:opacity-60 transition-opacity" strokeWidth={3} />
                </button>

                {/* Main clickable area: starts a session pre-filled */}
                <button
                  type="button"
                  onClick={() => onSelectTask(task.title)}
                  className="flex-1 min-w-0 text-left active:scale-[0.99] transition-transform pr-16"
                  title="Start a session on this task"
                >
                  <p className="text-sm font-semibold stitch-text-primary truncate leading-tight">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {project && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary truncate max-w-[100px]">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: projectDot(project.color) }}
                        />
                        {project.name}
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
                    {(task.sessionsCount ?? 0) > 0 && !continueFlag && (
                      <span className="text-[9px] font-semibold stitch-text-secondary">
                        {task.sessionsCount} session{task.sessionsCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </button>

                {/* Sparkles icon — visual hint that the row is clickable to start */}
                <Sparkles size={11} className="text-primary shrink-0 opacity-60 absolute right-9 top-1/2 -translate-y-1/2 group-hover:opacity-0 transition-opacity pointer-events-none" />

                {/* Edit + Delete — hover-reveal cluster */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                    title="Edit task"
                    aria-label="Edit task"
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-surface-container hover:bg-primary/15 hover:text-primary stitch-text-secondary transition-colors"
                  >
                    <Pencil size={10} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTaskAsync(task.id).catch((err) => {
                        console.error('[PlanTasksCard] delete failed:', err);
                        showToast('error', "Couldn't delete that task.");
                      });
                    }}
                    title="Delete task"
                    aria-label="Delete task"
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-surface-container hover:bg-red-100 hover:text-red-500 stitch-text-secondary transition-colors"
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="w-full text-center text-[11px] font-semibold stitch-text-secondary hover:stitch-text-primary py-1.5 transition-colors"
            >
              + {hiddenCount} more
            </button>
          )}
        </div>
      ) : (
        <p className="text-center text-xs stitch-text-secondary py-4 leading-relaxed">
          {adding
            ? 'Type a task above ↑'
            : 'No open tasks. Tap “Add” to capture one.'}
        </p>
      )}

      {editingTask && (
        <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </section>
  );
}

function isContinue(t: CoreTask): boolean {
  return t.lastSessionOutcome === 'partially'
      || t.lastSessionOutcome === 'something_came_up'
      || t.lastSessionOutcome === 'no_answer';
}
