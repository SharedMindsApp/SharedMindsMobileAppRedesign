/**
 * PlanTasksCard — the home "Today" task surface.
 *
 * Shows only what's live *today*: tasks scheduled for today, anything
 * overdue / due soon, and "continue" tasks (a session left them partway).
 * Everything else lives on the full /tasks backlog behind "All →". This is
 * the focus + urgency surface — not the whole list.
 *
 * Each row is the shared TaskCard (consistent everywhere): tap the circle to
 * mark done, tap the title to OPEN it (the "work on this" sheet) — not to
 * start a session. Scheduling a session is one optional action inside that
 * sheet, never forced. Urgency chips come from taskUrgency(). Inline "+ Add"
 * captures a new task (scheduled for today).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Loader2 } from 'lucide-react';
import { useCoreData, type CoreTask, type CoreProject } from '../../data/CoreDataContext';
import { TaskCard } from '../../ui/TaskCard';
import { TaskDetailSheet } from '../../ui/TaskDetailSheet';
import { taskUrgency, isTodayOrOverdue } from '../../../lib/taskUrgency';

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDot(token: string | null): string {
  if (!token) return '#94a3b8';
  return PROJECT_HEX[token] ?? token;
}

function isContinue(t: CoreTask): boolean {
  return t.lastSessionOutcome === 'partially'
      || t.lastSessionOutcome === 'something_came_up'
      || t.lastSessionOutcome === 'no_answer';
}

export function PlanTasksCard({
  tasks, projects, onSelectTask,
}: {
  tasks: CoreTask[];
  projects: CoreProject[];
  onSelectTask: (taskTitle: string) => void;
}) {
  const navigate = useNavigate();
  const {
    addTaskAsync, toggleTask,
    rescheduleTaskAsync, dropTaskAsync, deleteTaskAsync, updateTaskAsync,
  } = useCoreData();
  const [newTaskText, setNewTaskText] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  // The task whose "work on this" sheet is open. null = closed.
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const openTasks = tasks.filter((t) => !t.done);

  // "Today" = scheduled today / overdue / due soon, plus continue tasks
  // (a session left them partway — they're effectively today's priority).
  const todayTasks = openTasks.filter((t) => isTodayOrOverdue(t) || isContinue(t));
  todayTasks.sort((a, b) => {
    // Continue first, then by urgency weight (overdue → soonest).
    const ac = isContinue(a), bc = isContinue(b);
    if (ac !== bc) return ac ? -1 : 1;
    return taskUrgency(a).weight - taskUrgency(b).weight;
  });

  const backlogCount = openTasks.length - todayTasks.length;

  async function handleAdd() {
    const title = newTaskText.trim();
    if (!title || savingTask) return;
    setSavingTask(true);
    try {
      // New tasks captured here are for *today* — schedule them so they
      // land in this view, not the invisible backlog.
      const today = new Date();
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      await addTaskAsync(title, null, { scheduledFor: iso });
      setNewTaskText('');
    } catch (err) {
      console.warn('[PlanTasksCard] add failed:', err);
    } finally {
      setSavingTask(false);
    }
  }

  async function handleToggle(taskId: string) {
    setBusyId(taskId);
    try { await Promise.resolve(toggleTask(taskId)); }
    finally { setBusyId(null); }
  }

  const openTask = openTaskId ? todayTasks.find((t) => t.id === openTaskId) ?? null : null;
  const openTaskProject = openTask?.projectId
    ? projects.find((p) => p.id === openTask.projectId)
    : null;

  return (
    <>
    <section className="rounded-2xl bg-white ring-1 ring-surface-container p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
          Today · {todayTasks.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:opacity-70 transition-opacity"
          >
            <Plus size={11} /> Add
          </button>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:opacity-70 transition-opacity"
          >
            All <ArrowRight size={11} />
          </button>
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
            placeholder="What's the task for today?"
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
                : <Plus size={11} className="text-white rotate-45" strokeWidth={3} />}
            </button>
          )}
        </div>
      )}

      {/* Today list */}
      {todayTasks.length > 0 ? (
        <div className="space-y-1.5">
          {todayTasks.map((task) => {
            const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
            return (
              <TaskCard
                key={task.id}
                task={task}
                projectName={project?.name ?? null}
                projectColorHex={project ? projectDot(project.color) : null}
                onToggleDone={() => handleToggle(task.id)}
                onOpen={() => setOpenTaskId(task.id)}
                busy={busyId === task.id}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-5 px-2">
          <p className="text-sm font-semibold stitch-text-primary leading-tight">
            {adding ? 'Type a task above ↑' : 'Nothing scheduled for today.'}
          </p>
          <p className="text-xs stitch-text-secondary leading-relaxed mt-1">
            {backlogCount > 0
              ? `You have ${backlogCount} task${backlogCount === 1 ? '' : 's'} in your backlog. Pull one into today, or add a fresh one.`
              : 'Add the one thing you want to move today.'}
          </p>
          {backlogCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:opacity-80 transition-opacity"
            >
              Open backlog <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* Backlog hint when today has items */}
      {todayTasks.length > 0 && backlogCount > 0 && (
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="w-full text-center text-[11px] font-semibold stitch-text-secondary hover:stitch-text-primary py-2 mt-1 transition-colors"
        >
          + {backlogCount} more in backlog
        </button>
      )}
    </section>

    {/* "Work on this" sheet — tapping a task opens here, NOT a session. */}
    {openTask && (
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
        onStartSession={() => onSelectTask(openTask.title)}
      />
    )}
    </>
  );
}
