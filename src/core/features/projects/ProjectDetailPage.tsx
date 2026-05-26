/**
 * ProjectDetailPage — single-project view at /projects/:projectId
 *
 * Redesigned with a richer header: color gradient banner, stat chips,
 * task-completion ring, member avatars. Tabs: Tasks / Sessions / Members.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, Pencil, Play, Target, Calendar, ArrowLeft,
  CheckCircle2, Plus, Pin, Clock, Zap,
  Archive, UserPlus, ChevronRight, Trash2, X, Check,
  Columns, Flag, NotebookPen, Activity,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  ProjectService,
  type Project,
  type ProjectMemberWithProfile,
  type ProjectGoal,
  type ProjectNote,
} from '../../services/ProjectService';
import { TaskService, type Task } from '../../services/TaskService';
import type { ShippedSession, ScheduledSessionWithProfile } from '../../services/SessionService';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';
import { ProjectEditorModal } from './ProjectEditorModal';
import { DeclareSessionModal } from '../sessions/DeclareSessionModal';
import { projectColorMeta } from './ProjectsPage';
import { SurfaceCard } from '../../ui/CorePage';
import type { FocusSession } from '../../../lib/sessions/focusTypes';

// Project = organising your work to be productive. Sessions live on
// /sessions; the project page is about decomposing the work itself.
//   • Tasks    — flat list view (most familiar)
//   • Kanban   — same data, swimlanes by status
//   • Goals    — phases / deliverables this project is chasing
//   • Notes    — project thinking + docs
//   • Activity — chronological event feed
type Tab = 'tasks' | 'kanban' | 'goals' | 'notes' | 'activity';

// ── Priority / energy labels ─────────────────────────────────────

const PRIORITY_META: Record<string, { label: string; dot: string }> = {
  urgent: { label: 'Urgent', dot: 'bg-red-500' },
  high:   { label: 'High',   dot: 'bg-orange-400' },
  medium: { label: 'Medium', dot: 'bg-amber-400' },
  low:    { label: 'Low',    dot: 'bg-slate-300' },
};

const ENERGY_META: Record<string, { label: string; color: string }> = {
  high:   { label: 'High energy',   color: 'text-rose-600 bg-rose-50' },
  medium: { label: 'Medium energy', color: 'text-amber-600 bg-amber-50' },
  low:    { label: 'Low energy',    color: 'text-blue-600 bg-blue-50' },
};

// ── Page ─────────────────────────────────────────────────────────

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    state: { activeProjectId },
    setActiveProject,
    refreshProjects,
  } = useCoreData();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('tasks');
  /** Brain-dump descriptions can run 300-500 words. We collapse to ~150
   *  characters by default so the hero stays digestible; user can expand. */
  const [descExpanded, setDescExpanded] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      ProjectService.getProjectById(projectId),
      ProjectService.getProjectMembers(projectId),
      TaskService.getTasksByProject(projectId),
      fetchProjectSessions(projectId),
    ])
      .then(([p, m, t, s]) => {
        if (cancelled) return;
        setProject(p);
        setMembers(m);
        setTasks(t);
        setSessions(s);
      })
      .catch((err) => console.error('[ProjectDetailPage] load failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [projectId]);

  const color = useMemo(() => projectColorMeta(project?.color ?? null), [project]);
  const isPinned = activeProjectId === projectId;

  const openTasks = useMemo(() =>
    tasks.filter((t) => t.status !== 'done' && t.status !== 'dropped')
         .sort((a, b) => {
           const order = { urgent: 0, high: 1, medium: 2, low: 3 };
           return (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2);
         }),
    [tasks]);
  const doneTasks = useMemo(() =>
    tasks.filter((t) => t.status === 'done' || t.status === 'dropped'),
    [tasks]);
  const taskProgress = tasks.length > 0
    ? Math.round((doneTasks.length / tasks.length) * 100)
    : 0;

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const totalSessionMinutes = completedSessions.reduce((sum, s) =>
    sum + (s.actual_duration_minutes ?? s.intended_duration_minutes ?? 0), 0);

  async function handleAddTask() {
    if (!project || !user || !newTaskTitle.trim() || taskSubmitting) return;
    setTaskSubmitting(true);
    try {
      const created = await TaskService.createTask({
        space_id: project.space_id,
        project_id: project.id,
        created_by: user.id,
        title: newTaskTitle.trim(),
        status: 'inbox',
        priority: 'medium',
        energy_level: 'medium',
        sort_order: 0,
      });
      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setTaskSubmitting(false);
    }
  }

  async function toggleTaskStatus(task: Task) {
    const next = task.status === 'done' ? 'active' : 'done';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    try {
      await TaskService.updateTask(task.id, { status: next });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center stitch-text-secondary">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-md mx-auto pt-16 px-5 text-center">
        <p className="text-base font-bold stitch-text-primary mb-2">Project not found</p>
        <button type="button" onClick={() => navigate('/projects')}
          className="text-sm stitch-text-secondary hover:stitch-text-primary">
          Back to projects
        </button>
      </div>
    );
  }

  const isArchived = project.status !== 'active';

  return (
    <div className="space-y-0">

      {/* ── Back link ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold stitch-text-secondary hover:stitch-text-primary mb-4"
      >
        <ArrowLeft size={13} /> All projects
      </button>

      {/* ── Hero header ────────────────────────────────────────── */}
      {/* Stack: gradient banner on top, stats band below (sharing the same
          card so they read as one piece). Previous design used an absolutely
          positioned stats band that overlapped the gradient and got clipped
          by the wrapper's overflow-hidden — leaving the bottom half of every
          stat value invisible. */}
      <div className="rounded-2xl overflow-hidden mb-5 shadow-md bg-surface ring-1 ring-surface-container/60">

        {/* Gradient banner */}
        <div className={`bg-gradient-to-br ${color.gradient} px-5 pt-5 pb-6`}>

          {/* Top bar: archived badge + edit */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isArchived && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-black/20 text-white/90 px-2.5 py-1 rounded-full">
                  <Archive size={9} /> Archived
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              aria-label="Edit project"
            >
              <Pencil size={13} className="text-white" />
            </button>
          </div>

          {/* Title + collapsible description (brain dumps can be 300-500 words) */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-1 drop-shadow-sm">
            {project.title}
          </h1>
          {project.description && (() => {
            const desc = project.description.trim();
            const PREVIEW_CHARS = 150;
            const needsTruncate = desc.length > PREVIEW_CHARS;
            const shown = !needsTruncate || descExpanded
              ? desc
              : desc.slice(0, PREVIEW_CHARS).replace(/\s+\S*$/, '') + '…';
            return (
              <div className="max-w-lg">
                <p className="text-sm text-white/75 leading-snug whitespace-pre-wrap">
                  {shown}
                </p>
                {needsTruncate && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-1.5 text-xs font-bold text-white/90 hover:text-white underline-offset-2 hover:underline transition-colors"
                  >
                    {descExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── Stats band (below the banner, inside the same card) ─
            Equal-width tiles with consistent icon-box treatment so the row
            reads as a balanced strip, not three different-shaped widgets.
            Each tile: tinted square icon + label/value stacked next to it. */}
        <div className="px-4 py-3 grid grid-cols-3 gap-3 border-t border-surface-container/40">

          <StatTile
            icon={<Target size={16} style={{ color: color.hex }} />}
            label="Tasks"
            value={
              <>
                {doneTasks.length}
                <span className="text-xs font-medium stitch-text-secondary">/{tasks.length}</span>
              </>
            }
            tintHex={color.hex}
            footer={tasks.length > 0 ? <ProgressBar pct={taskProgress} hex={color.hex} /> : null}
          />

          <StatTile
            icon={<Zap size={16} style={{ color: color.hex }} />}
            label="Sessions"
            value={completedSessions.length}
            tintHex={color.hex}
          />

          <StatTile
            icon={<Clock size={16} style={{ color: color.hex }} />}
            label="Time logged"
            value={
              totalSessionMinutes >= 60
                ? `${Math.floor(totalSessionMinutes / 60)}h ${totalSessionMinutes % 60}m`
                : `${totalSessionMinutes}m`
            }
            tintHex={color.hex}
          />

          {/* Members avatar strip — full-width row below the 3-up grid,
              only when the project is actually shared. */}
          {members.length > 1 && (
            <div className="col-span-3 flex items-center gap-2 pt-2 border-t border-surface-container/40">
              <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider">
                Members
              </p>
              <div className="flex -space-x-1.5">
                {members.slice(0, 5).map((m) => (
                  m.avatar_url ? (
                    <img key={m.id} src={m.avatar_url} alt={m.display_name}
                      className="w-6 h-6 rounded-full object-cover border-2 border-surface" />
                  ) : (
                    <div key={m.id}
                      className={`w-6 h-6 rounded-full bg-gradient-to-br ${color.gradient} flex items-center justify-center text-[9px] font-bold text-white border-2 border-surface`}>
                      {m.display_name.charAt(0).toUpperCase()}
                    </div>
                  )
                ))}
                {members.length > 5 && (
                  <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-[9px] font-bold stitch-text-secondary border-2 border-surface">
                    +{members.length - 5}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold stitch-text-secondary">{members.length}</span>
            </div>
          )}
        </div>

        {/* ── Action row (inside the same hero card) ─────────────
            One primary CTA (Start a session) anchored full-width on the
            left, with a small secondary Pin toggle on the right. Reads as
            "primary action + state toggle" rather than two competing pills. */}
        {!isArchived && (
          <div className="px-4 pb-4 pt-2 flex items-center gap-2 border-t border-surface-container/40">
            <button
              type="button"
              onClick={() => setDeclareOpen(true)}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-extrabold transition-all active:scale-[0.98] bg-gradient-to-r ${color.gradient}`}
              style={{ boxShadow: `0 4px 14px ${color.hex}40` }}
            >
              <Play size={14} fill="currentColor" strokeWidth={0} />
              Start a session
            </button>
            <button
              type="button"
              onClick={() => setActiveProject(isPinned ? null : project.id)}
              title={isPinned ? 'Unpin from active' : 'Pin as your active project'}
              className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-xs font-bold transition-colors ${
                isPinned
                  ? `${color.soft} ${color.textDark}`
                  : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
              }`}
            >
              <Pin size={13} fill={isPinned ? 'currentColor' : 'none'} />
              {isPinned ? 'Pinned' : 'Pin'}
            </button>
          </div>
        )}
      </div>

      {/* Breathing room before the tab strip */}
      <div className="h-4" />

      {/* ── Tabs ───────────────────────────────────────────────── */}
      {/* Tab strip — horizontally scrollable on mobile so all 5 fit. */}
      <div className="flex p-1 bg-surface-container-low rounded-full gap-1 mb-4 overflow-x-auto scrollbar-thin">
        {([
          { id: 'tasks'    as const, label: 'Tasks',    count: openTasks.length, icon: Target,       hint: 'Flat list' },
          { id: 'kanban'   as const, label: 'Kanban',   count: tasks.length,     icon: Columns,      hint: 'Board view' },
          { id: 'goals'    as const, label: 'Goals',    count: 0,                icon: Flag,         hint: 'Phases this project is chasing' },
          { id: 'notes'    as const, label: 'Notes',    count: 0,                icon: NotebookPen,  hint: 'Project thinking' },
          { id: 'activity' as const, label: 'Activity', count: 0,                icon: Activity,     hint: 'What happened' },
        ]).map(({ id, label, count, icon: Icon, hint }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            title={hint}
            className={`shrink-0 flex-1 min-w-[88px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-semibold transition-all ${
              tab === id ? 'bg-white shadow-sm text-primary' : 'stitch-text-secondary hover:stitch-text-primary'
            }`}
          >
            <Icon size={12} />
            {label}
            {count > 0 && (
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                tab === id ? 'bg-primary/10 text-primary' : 'bg-surface-container stitch-text-secondary'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab body ───────────────────────────────────────────── */}
      {tab === 'tasks' && (
        <TasksTab
          openTasks={openTasks}
          doneTasks={doneTasks}
          newTaskTitle={newTaskTitle}
          setNewTaskTitle={setNewTaskTitle}
          onAdd={handleAddTask}
          onToggle={toggleTaskStatus}
          submitting={taskSubmitting}
          colorHex={color.hex}
          colorGradient={color.gradient}
        />
      )}
      {tab === 'kanban' && (
        <KanbanTab
          tasks={tasks}
          onToggle={toggleTaskStatus}
          newTaskTitle={newTaskTitle}
          setNewTaskTitle={setNewTaskTitle}
          onAdd={handleAddTask}
          submitting={taskSubmitting}
          colorHex={color.hex}
        />
      )}
      {tab === 'goals' && (
        <GoalsTab projectId={project.id} colorHex={color.hex} />
      )}
      {tab === 'notes' && (
        <NotesTab projectId={project.id} colorHex={color.hex} />
      )}
      {tab === 'activity' && (
        <ActivityTab
          projectId={project.id}
          tasks={tasks}
          sessions={sessions}
          members={members}
          colorHex={color.hex}
        />
      )}
      {/* Members tab removed — member management moves into the Settings
          drawer next phase. Member preview already lives on the editor modal. */}
      {false && (
        <MembersTab
          members={members}
          isOwner={members.find((m) => m.user_id === user?.id)?.role === 'owner'}
          onInvite={() => setEditorOpen(true)}
          colorGradient={color.gradient}
        />
      )}

      {/* ── Modals ─────────────────────────────────────────────── */}
      {editorOpen && (
        <ProjectEditorModal
          project={project}
          members={members}
          onClose={() => setEditorOpen(false)}
          onSaved={(p) => { setProject(p); setEditorOpen(false); refreshProjects(); }}
          onArchived={() => navigate('/projects')}
        />
      )}
      {declareOpen && (
        <DeclareSessionModal
          onClose={() => setDeclareOpen(false)}
          initialProjectId={project.id}
        />
      )}
    </div>
  );
}

// ── Progress ring ─────────────────────────────────────────────────

// ── Stats sub-components ───────────────────────────────────────────────
//
// StatTile is the unified tile used across the header stats band. Every
// stat (Tasks / Sessions / Time logged) renders the same shape so the row
// reads as a balanced 3-up grid rather than three different-looking widgets.
// `footer` lets the Tasks tile slip a thin progress bar under the value.

function StatTile({
  icon, label, value, tintHex, footer,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tintHex: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: tintHex + '20' }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-sm font-extrabold stitch-text-primary leading-tight">
          {value}
        </p>
        {footer && <div className="mt-1.5">{footer}</div>}
      </div>
    </div>
  );
}

function ProgressBar({ pct, hex }: { pct: number; hex: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-surface-container-low overflow-hidden">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: hex }}
      />
    </div>
  );
}

// ── Tasks tab ─────────────────────────────────────────────────────

function TasksTab({
  openTasks, doneTasks, newTaskTitle, setNewTaskTitle,
  onAdd, onToggle, submitting, colorHex, colorGradient,
}: {
  openTasks: Task[];
  doneTasks: Task[];
  newTaskTitle: string;
  setNewTaskTitle: (s: string) => void;
  onAdd: () => void;
  onToggle: (t: Task) => void;
  submitting: boolean;
  colorHex: string;
  colorGradient: string;
}) {
  return (
    <div className="space-y-2">
      {/* Add task row */}
      <div className="flex items-center gap-2 bg-surface rounded-xl ring-1 ring-surface-container/80 px-4 py-3 shadow-sm">
        <Plus size={14} className="stitch-text-secondary shrink-0" />
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
          placeholder="Add a task to this project…"
          className="flex-1 bg-transparent outline-none text-sm stitch-text-primary placeholder:stitch-text-secondary"
        />
        {newTaskTitle.trim() && (
          <button
            type="button"
            onClick={onAdd}
            disabled={submitting}
            className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full text-white bg-gradient-to-r ${colorGradient} disabled:opacity-50`}
          >
            {submitting ? '…' : 'Add'}
          </button>
        )}
      </div>

      {openTasks.length === 0 && doneTasks.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10 px-4 bg-surface rounded-2xl ring-1 ring-surface-container/80">
          <Target size={24} className="mb-3 stitch-text-secondary opacity-40" />
          <p className="text-sm font-bold stitch-text-primary mb-1">No tasks yet</p>
          <p className="text-xs stitch-text-secondary">Break the macro goal into smaller chunks above.</p>
        </div>
      ) : (
        <>
          {openTasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} colorHex={colorHex} />
          ))}

          {doneTasks.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-4 mb-2">
                <div className="h-px flex-1 bg-surface-container" />
                <span className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
                  Done · {doneTasks.length}
                </span>
                <div className="h-px flex-1 bg-surface-container" />
              </div>
              {doneTasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} colorHex={colorHex} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, colorHex }: { task: Task; onToggle: () => void; colorHex: string }) {
  const isDone = task.status === 'done' || task.status === 'dropped';
  const priorityMeta = PRIORITY_META[task.priority ?? 'medium'];
  const energyMeta = ENERGY_META[task.energy_level ?? 'medium'];

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-start gap-3 px-4 py-3 rounded-xl bg-surface ring-1 ring-surface-container/60 hover:ring-surface-container active:scale-[0.99] transition-all text-left shadow-sm group"
    >
      {/* Checkbox */}
      <div className="mt-0.5 shrink-0">
        {isDone ? (
          <CheckCircle2 size={16} className="text-emerald-500" />
        ) : (
          <div
            className="w-4 h-4 rounded-full border-2 group-hover:scale-110 transition-transform"
            style={{ borderColor: colorHex }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm leading-snug ${isDone ? 'line-through stitch-text-secondary' : 'stitch-text-primary font-medium'}`}>
          {task.title}
        </span>
        {!isDone && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {priorityMeta && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary">
                <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
                {priorityMeta.label}
              </span>
            )}
            {task.energy_level && task.energy_level !== 'medium' && energyMeta && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${energyMeta.color}`}>
                {energyMeta.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Arrow hint */}
      <ChevronRight size={13} className="stitch-text-secondary opacity-0 group-hover:opacity-60 mt-0.5 shrink-0 transition-opacity" />
    </button>
  );
}

// ── Sessions tab ──────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  finished:           { label: 'Finished',    color: 'bg-emerald-100 text-emerald-700' },
  partially:          { label: 'Partial',     color: 'bg-amber-100 text-amber-700' },
  something_came_up:  { label: 'Interrupted', color: 'bg-slate-100 text-slate-600' },
};

function SessionsTab({
  sessions, colorHex, colorGradient, onDeclare,
}: {
  sessions: FocusSession[];
  colorHex: string;
  colorGradient: string;
  onDeclare: () => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-10 px-4 bg-surface rounded-2xl ring-1 ring-surface-container/80">
        <Zap size={24} className="mb-3 stitch-text-secondary opacity-40" />
        <p className="text-sm font-bold stitch-text-primary mb-1">No sessions yet</p>
        <p className="text-xs stitch-text-secondary mb-4">Start one to chip at this project.</p>
        <button
          type="button"
          onClick={onDeclare}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-bold bg-gradient-to-r ${colorGradient}`}
        >
          <Play size={13} fill="currentColor" strokeWidth={0} />
          Start a session
        </button>
      </div>
    );
  }

  // Group by date
  const grouped = sessions.reduce<Record<string, FocusSession[]>>((acc, s) => {
    const d = new Date(s.start_time).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, group]) => (
        <div key={date}>
          <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-widest mb-2">{date}</p>
          <div className="space-y-2">
            {group.map((s) => {
              const duration = s.actual_duration_minutes ?? s.intended_duration_minutes ?? 0;
              const outcomeMeta = s.session_outcome ? OUTCOME_CONFIG[s.session_outcome] : null;
              const timeStr = new Date(s.start_time).toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit',
              });
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3 bg-surface rounded-xl ring-1 ring-surface-container/60 shadow-sm"
                >
                  {/* Duration bar */}
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: colorHex }} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold stitch-text-primary truncate">
                      {s.session_goal ?? 'Worked on it'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] stitch-text-secondary">
                        <Clock size={10} />
                        {timeStr} · {duration}m
                      </span>
                      <span className={`text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded-full ${
                        s.status === 'active'     ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'scheduled'  ? 'bg-cyan-100 text-cyan-700' :
                        'bg-surface-container stitch-text-secondary'
                      }`}>
                        {s.status}
                      </span>
                      {outcomeMeta && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${outcomeMeta.color}`}>
                          {outcomeMeta.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Members tab ───────────────────────────────────────────────────

function MembersTab({
  members, isOwner, onInvite, colorGradient,
}: {
  members: ProjectMemberWithProfile[];
  isOwner: boolean;
  onInvite: () => void;
  colorGradient: string;
}) {
  const ROLE_META: Record<string, { label: string; color: string }> = {
    owner:        { label: 'Owner',        color: 'bg-violet-100 text-violet-700' },
    collaborator: { label: 'Collaborator', color: 'bg-blue-100 text-blue-700' },
    viewer:       { label: 'Viewer',       color: 'bg-slate-100 text-slate-600' },
  };

  return (
    <div className="space-y-2">
      {members.map((m) => {
        const roleMeta = ROLE_META[m.role ?? 'viewer'];
        return (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-surface rounded-xl ring-1 ring-surface-container/60 shadow-sm">
            {m.avatar_url ? (
              <img src={m.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
            ) : (
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorGradient} flex items-center justify-center text-white font-extrabold text-sm shrink-0`}>
                {m.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold stitch-text-primary truncate">{m.display_name}</p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${roleMeta.color}`}>
              {roleMeta.label}
            </span>
          </div>
        );
      })}

      {isOwner && (
        <button
          type="button"
          onClick={onInvite}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container transition-colors ring-1 ring-surface-container/60"
        >
          <UserPlus size={14} />
          Invite collaborator
        </button>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

async function fetchProjectSessions(projectId: string): Promise<FocusSession[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('project_id', projectId)
    .order('start_time', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[ProjectDetailPage] fetchProjectSessions:', error);
    return [];
  }
  return (data ?? []) as FocusSession[];
}

export type { Task, ShippedSession, ScheduledSessionWithProfile };

// ── Kanban tab ──────────────────────────────────────────────────────────
//
// Same task data as the flat Tasks tab, visualised as three columns by
// status. Tasks move with explicit ←/→ buttons rather than drag-drop —
// drag would add ~50 LOC + dnd-kit dep for a marginal UX win at this
// scale. If task volume grows, drag becomes worth it.

const KANBAN_COLUMNS = [
  { key: 'inbox' as const,  label: 'Inbox',  desc: 'Captured. Not started.', tint: 'bg-surface-container-low' },
  { key: 'active' as const, label: 'Active', desc: 'In progress.',           tint: 'bg-blue-50/60' },
  { key: 'done' as const,   label: 'Done',   desc: 'Finished.',              tint: 'bg-emerald-50/60' },
];

type KanbanStatus = 'inbox' | 'active' | 'done';

function KanbanTab({
  tasks, onToggle, newTaskTitle, setNewTaskTitle, onAdd, submitting, colorHex,
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  newTaskTitle: string;
  setNewTaskTitle: (s: string) => void;
  onAdd: () => void;
  submitting: boolean;
  colorHex: string;
}) {
  async function moveTask(task: Task, next: KanbanStatus) {
    if (task.status === next) return;
    try {
      await TaskService.updateTask(task.id, { status: next });
      // Optimistic local mutation through the parent toggle isn't quite
      // right here (different target), so we let the parent re-fetch by
      // toggling and using the lazy refresh path. For now, mutate via the
      // direct service call — the parent's `tasks` state will re-sync on
      // next load. If this feels stale, lift state into the parent.
      onToggle({ ...task, status: next } as Task);
    } catch (err) {
      console.error('[KanbanTab] move failed:', err);
    }
  }

  // Group tasks by status; treat unknown as 'inbox'.
  const grouped: Record<KanbanStatus, Task[]> = { inbox: [], active: [], done: [] };
  for (const t of tasks) {
    const s = (t.status as KanbanStatus) || 'inbox';
    if (s === 'inbox' || s === 'active' || s === 'done') grouped[s].push(t);
    else grouped.inbox.push(t);
  }

  return (
    <div className="space-y-3">
      {/* Inline add — fires straight into inbox */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container-low ring-1 ring-surface-container">
        <Plus size={13} className="stitch-text-secondary shrink-0" />
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
          placeholder="Add a task to this project…"
          className="flex-1 bg-transparent text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none border-0"
          disabled={submitting}
        />
        {newTaskTitle.trim().length > 0 && (
          <button
            type="button"
            onClick={onAdd}
            disabled={submitting}
            className="shrink-0 px-3 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: colorHex }}
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        )}
      </div>

      {/* Three columns side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.key} className={`rounded-2xl ${col.tint} p-3 min-h-[200px]`}>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-widest">
                {col.label}
              </p>
              <span className="text-[10px] font-bold stitch-text-secondary tabular-nums">
                {grouped[col.key].length}
              </span>
            </div>
            <div className="space-y-1.5">
              {grouped[col.key].length === 0 ? (
                <p className="text-[11px] stitch-text-secondary italic px-1 py-2 opacity-60">
                  {col.desc}
                </p>
              ) : (
                grouped[col.key].map((t) => (
                  <KanbanCard
                    key={t.id}
                    task={t}
                    columnKey={col.key}
                    onMove={(next) => moveTask(t, next)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  task, columnKey, onMove,
}: {
  task: Task;
  columnKey: KanbanStatus;
  onMove: (next: KanbanStatus) => void;
}) {
  // Allowed transitions — keep cards moving forward easily and back if needed.
  const canPrev = columnKey !== 'inbox';
  const canNext = columnKey !== 'done';
  const prevTarget: KanbanStatus = columnKey === 'done' ? 'active' : 'inbox';
  const nextTarget: KanbanStatus = columnKey === 'inbox' ? 'active' : 'done';

  return (
    <div className="group bg-white rounded-xl ring-1 ring-surface-container px-3 py-2 hover:shadow-sm transition-shadow">
      <p className={`text-xs font-semibold leading-snug ${columnKey === 'done' ? 'line-through stitch-text-secondary' : 'stitch-text-primary'}`}>
        {task.title}
      </p>
      <div className="flex items-center justify-between mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => canPrev && onMove(prevTarget)}
          disabled={!canPrev}
          className="text-[10px] font-bold stitch-text-secondary hover:stitch-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          title={canPrev ? `Move to ${prevTarget}` : ''}
        >
          ← {canPrev ? prevTarget : ''}
        </button>
        <button
          type="button"
          onClick={() => canNext && onMove(nextTarget)}
          disabled={!canNext}
          className="text-[10px] font-bold stitch-text-secondary hover:stitch-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          title={canNext ? `Move to ${nextTarget}` : ''}
        >
          {canNext ? nextTarget : ''} →
        </button>
      </div>
    </div>
  );
}

// ── Goals tab ───────────────────────────────────────────────────────────
//
// A goal = a phase / deliverable the project is chasing, with an optional
// target date. Kept deliberately lite: inline add row at top, vertical list
// below, complete by clicking the circle. Edit-in-place is intentionally
// deferred — if a goal's title is wrong, delete it and re-add. Keeps the
// surface tiny.

function GoalsTab({ projectId, colorHex }: { projectId: string; colorHex: string }) {
  const [goals, setGoals] = useState<ProjectGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ProjectService.listMilestones(projectId)
      .then((rows) => { if (!cancelled) setGoals(rows); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handleAdd() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await ProjectService.createMilestone({
        project_id: projectId,
        title: title.trim(),
        target_date: targetDate || null,
      });
      setGoals((prev) => [created, ...prev]);
      setTitle('');
      setTargetDate('');
    } catch (err) {
      console.error('[GoalsTab] add:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(g: ProjectGoal) {
    const prev = goals;
    const optimistic: ProjectGoal = {
      ...g,
      completed_at: g.completed_at ? null : new Date().toISOString(),
    };
    setGoals((cur) => cur.map((x) => (x.id === g.id ? optimistic : x)));
    try {
      const updated = await ProjectService.toggleMilestoneComplete(g);
      setGoals((cur) => cur.map((x) => (x.id === g.id ? updated : x)));
    } catch (err) {
      console.error('[GoalsTab] toggle:', err);
      setGoals(prev);
    }
  }

  async function handleDelete(g: ProjectGoal) {
    if (!confirm(`Delete goal "${g.title}"?`)) return;
    const prev = goals;
    setGoals((cur) => cur.filter((x) => x.id !== g.id));
    try {
      await ProjectService.deleteMilestone(g.id);
    } catch (err) {
      console.error('[GoalsTab] delete:', err);
      setGoals(prev);
      alert('Could not delete that goal.');
    }
  }

  return (
    <div className="space-y-2">
      {/* Inline add row */}
      <div className="bg-surface rounded-xl ring-1 ring-surface-container/80 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Plus size={14} className="stitch-text-secondary shrink-0" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="Add a goal…"
            className="flex-1 bg-transparent outline-none text-sm stitch-text-primary placeholder:stitch-text-secondary"
          />
          {title.trim() && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={submitting}
              className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full text-white disabled:opacity-50"
              style={{ backgroundColor: colorHex }}
            >
              {submitting ? '…' : 'Add'}
            </button>
          )}
        </div>
        {title.trim() && (
          <div className="flex items-center gap-2 mt-2 pl-6">
            <Calendar size={12} className="stitch-text-secondary" />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="text-xs bg-transparent stitch-text-secondary outline-none"
            />
            <span className="text-[10px] stitch-text-secondary italic">optional</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={16} className="animate-spin stitch-text-secondary" />
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10 px-4 bg-surface rounded-2xl ring-1 ring-surface-container/80">
          <Flag size={24} className="mb-3 stitch-text-secondary opacity-40" />
          <p className="text-sm font-bold stitch-text-primary mb-1">No goals yet</p>
          <p className="text-xs stitch-text-secondary">Map out the phases of getting this done.</p>
        </div>
      ) : (
        goals.map((g) => {
          const isDone = !!g.completed_at;
          const overdue = !isDone && g.target_date && new Date(g.target_date) < new Date();
          return (
            <div
              key={g.id}
              className="group flex items-start gap-3 px-4 py-3 rounded-xl bg-surface ring-1 ring-surface-container/60 shadow-sm hover:ring-surface-container transition-all"
            >
              <button
                type="button"
                onClick={() => handleToggle(g)}
                className="mt-0.5 shrink-0"
                aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
              >
                {isDone ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <div
                    className="w-[18px] h-[18px] rounded-full border-2 hover:scale-110 transition-transform"
                    style={{ borderColor: colorHex }}
                  />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${isDone ? 'line-through stitch-text-secondary' : 'stitch-text-primary font-semibold'}`}>
                  {g.title}
                </p>
                {g.description && !isDone && (
                  <p className="text-xs stitch-text-secondary mt-0.5 leading-snug">{g.description}</p>
                )}
                {g.target_date && (
                  <div className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    overdue
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-surface-container-low stitch-text-secondary'
                  }`}>
                    <Calendar size={9} />
                    {new Date(g.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {overdue && ' · overdue'}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDelete(g)}
                className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity shrink-0 stitch-text-secondary hover:text-rose-600"
                aria-label="Delete goal"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Notes tab ───────────────────────────────────────────────────────────
//
// Freeform text blocks per project. Inline composer at top; each note is
// an editable card. Only the author can edit / delete their own (enforced
// at the RLS layer — the UI just respects it).

function NotesTab({ projectId, colorHex }: { projectId: string; colorHex: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ProjectService.listNotes(projectId)
      .then((rows) => { if (!cancelled) setNotes(rows); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handleCreate() {
    if (!composerBody.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await ProjectService.createNote({
        project_id: projectId,
        title: composerTitle || null,
        body: composerBody.trim(),
      });
      setNotes((prev) => [created, ...prev]);
      setComposerTitle('');
      setComposerBody('');
      setComposerOpen(false);
    } catch (err) {
      console.error('[NotesTab] create:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(n: ProjectNote) {
    setEditingId(n.id);
    setEditTitle(n.title ?? '');
    setEditBody(n.body);
  }

  async function saveEdit(n: ProjectNote) {
    if (!editBody.trim()) return;
    try {
      const updated = await ProjectService.updateNote(n.id, {
        title: editTitle || null,
        body: editBody.trim(),
      });
      setNotes((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
      setEditingId(null);
    } catch (err) {
      console.error('[NotesTab] save:', err);
      alert('Could not save that note. You can only edit your own notes.');
    }
  }

  async function handleDelete(n: ProjectNote) {
    if (!confirm('Delete this note?')) return;
    const prev = notes;
    setNotes((cur) => cur.filter((x) => x.id !== n.id));
    try {
      await ProjectService.deleteNote(n.id);
    } catch (err) {
      console.error('[NotesTab] delete:', err);
      setNotes(prev);
      alert('Could not delete that note. You can only delete your own.');
    }
  }

  return (
    <div className="space-y-2">
      {/* Composer */}
      <div className="bg-surface rounded-xl ring-1 ring-surface-container/80 shadow-sm overflow-hidden">
        {!composerOpen ? (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm stitch-text-secondary hover:stitch-text-primary"
          >
            <Plus size={14} />
            Capture a thought, decision, or block of research…
          </button>
        ) : (
          <div className="p-3 space-y-2">
            <input
              value={composerTitle}
              onChange={(e) => setComposerTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full bg-transparent outline-none text-sm font-bold stitch-text-primary placeholder:stitch-text-secondary"
            />
            <textarea
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              placeholder="Write a note…"
              rows={4}
              autoFocus
              className="w-full bg-transparent outline-none text-sm stitch-text-primary placeholder:stitch-text-secondary resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-surface-container/60">
              <button
                type="button"
                onClick={() => { setComposerOpen(false); setComposerTitle(''); setComposerBody(''); }}
                className="text-xs font-bold stitch-text-secondary hover:stitch-text-primary px-2.5 py-1.5 rounded-full"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!composerBody.trim() || submitting}
                className="text-xs font-extrabold text-white px-3 py-1.5 rounded-full disabled:opacity-50"
                style={{ backgroundColor: colorHex }}
              >
                {submitting ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={16} className="animate-spin stitch-text-secondary" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10 px-4 bg-surface rounded-2xl ring-1 ring-surface-container/80">
          <NotebookPen size={24} className="mb-3 stitch-text-secondary opacity-40" />
          <p className="text-sm font-bold stitch-text-primary mb-1">No notes yet</p>
          <p className="text-xs stitch-text-secondary">Park decisions and research where the project lives.</p>
        </div>
      ) : (
        notes.map((n) => {
          const isMine = n.author_id === user?.id;
          const isEditing = editingId === n.id;
          const when = new Date(n.updated_at).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          });
          return (
            <div
              key={n.id}
              className="group bg-surface rounded-xl ring-1 ring-surface-container/60 shadow-sm px-4 py-3"
            >
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full bg-transparent outline-none text-sm font-bold stitch-text-primary placeholder:stitch-text-secondary"
                  />
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={4}
                    className="w-full bg-transparent outline-none text-sm stitch-text-primary placeholder:stitch-text-secondary resize-none"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-surface-container/60">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs font-bold stitch-text-secondary hover:stitch-text-primary px-2 py-1 rounded-full inline-flex items-center gap-1"
                    >
                      <X size={11} /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(n)}
                      className="text-xs font-extrabold text-white px-3 py-1 rounded-full inline-flex items-center gap-1"
                      style={{ backgroundColor: colorHex }}
                    >
                      <Check size={11} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {n.title && (
                        <p className="text-sm font-bold stitch-text-primary mb-1">{n.title}</p>
                      )}
                      <p className="text-sm stitch-text-primary leading-relaxed whitespace-pre-wrap break-words">
                        {n.body}
                      </p>
                    </div>
                    {isMine && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(n)}
                          className="stitch-text-secondary hover:stitch-text-primary p-1"
                          aria-label="Edit note"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(n)}
                          className="stitch-text-secondary hover:text-rose-600 p-1"
                          aria-label="Delete note"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-container/40">
                    {n.author?.avatar_url ? (
                      <img src={n.author.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: colorHex }}
                      >
                        {(n.author?.display_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] font-semibold stitch-text-secondary">
                      {n.author?.display_name ?? 'Someone'} · {when}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Activity tab ────────────────────────────────────────────────────────
//
// Derived chronological feed — no `activity_log` table. We merge events
// from the data the parent already loaded (tasks, sessions, members) plus
// goals we fetch here, then sort by date desc. If a feature needs
// audit-grade history, that's a different problem and gets its own table.

type ActivityEvent = {
  id: string;
  kind: 'task_added' | 'task_done' | 'session_completed' | 'member_joined' | 'goal_added' | 'goal_done';
  at: string;
  title: string;
  subtitle?: string;
};

function ActivityTab({
  projectId, tasks, sessions, members, colorHex,
}: {
  projectId: string;
  tasks: Task[];
  sessions: FocusSession[];
  members: ProjectMemberWithProfile[];
  colorHex: string;
}) {
  const [goals, setGoals] = useState<ProjectGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ProjectService.listMilestones(projectId)
      .then((rows) => { if (!cancelled) setGoals(rows); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const events = useMemo<ActivityEvent[]>(() => {
    const out: ActivityEvent[] = [];

    for (const t of tasks) {
      out.push({
        id: `task-add-${t.id}`,
        kind: 'task_added',
        at: t.created_at,
        title: t.title,
        subtitle: 'Task added',
      });
      if (t.status === 'done' && t.completed_at) {
        out.push({
          id: `task-done-${t.id}`,
          kind: 'task_done',
          at: t.completed_at,
          title: t.title,
          subtitle: 'Task finished',
        });
      }
    }

    for (const s of sessions) {
      if (s.status === 'completed') {
        const mins = s.actual_duration_minutes ?? s.intended_duration_minutes ?? 0;
        out.push({
          id: `session-${s.id}`,
          kind: 'session_completed',
          at: s.end_time ?? s.start_time,
          title: s.session_goal ?? 'Focus session',
          subtitle: `${mins}m logged`,
        });
      }
    }

    for (const m of members) {
      out.push({
        id: `member-${m.id}`,
        kind: 'member_joined',
        at: m.created_at,
        title: m.display_name,
        subtitle: m.role === 'owner' ? 'Created the project' : 'Joined as ' + m.role,
      });
    }

    for (const g of goals) {
      out.push({
        id: `goal-add-${g.id}`,
        kind: 'goal_added',
        at: g.created_at,
        title: g.title,
        subtitle: 'Goal added',
      });
      if (g.completed_at) {
        out.push({
          id: `goal-done-${g.id}`,
          kind: 'goal_done',
          at: g.completed_at,
          title: g.title,
          subtitle: 'Goal hit',
        });
      }
    }

    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [tasks, sessions, members, goals]);

  const KIND_META: Record<ActivityEvent['kind'], { icon: React.ReactNode; tint: string }> = {
    task_added:        { icon: <Plus size={11} />,         tint: 'bg-slate-100 text-slate-600' },
    task_done:         { icon: <CheckCircle2 size={11} />, tint: 'bg-emerald-100 text-emerald-700' },
    session_completed: { icon: <Zap size={11} />,          tint: 'bg-amber-100 text-amber-700' },
    member_joined:     { icon: <UserPlus size={11} />,     tint: 'bg-blue-100 text-blue-700' },
    goal_added:        { icon: <Flag size={11} />,         tint: 'bg-violet-100 text-violet-700' },
    goal_done:         { icon: <CheckCircle2 size={11} />, tint: 'bg-violet-100 text-violet-700' },
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 size={16} className="animate-spin stitch-text-secondary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-10 px-4 bg-surface rounded-2xl ring-1 ring-surface-container/80">
        <Activity size={24} className="mb-3 stitch-text-secondary opacity-40" />
        <p className="text-sm font-bold stitch-text-primary mb-1">Nothing happened yet</p>
        <p className="text-xs stitch-text-secondary">Add a task or run a session — the timeline starts filling in.</p>
      </div>
    );
  }

  // Group by date so the feed reads like a timeline rather than a wall.
  const grouped = events.reduce<Record<string, ActivityEvent[]>>((acc, e) => {
    const d = new Date(e.at).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, group]) => (
        <div key={date}>
          <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-widest mb-2">{date}</p>
          <div className="space-y-1.5">
            {group.map((e) => {
              const meta = KIND_META[e.kind];
              const time = new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={e.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-surface ring-1 ring-surface-container/60 shadow-sm"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${meta.tint}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold stitch-text-primary truncate">{e.title}</p>
                    <p className="text-[11px] stitch-text-secondary">
                      {e.subtitle} · {time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {/* tint marker to silence unused-var lint when colorHex isn't used directly */}
      <div className="h-0" style={{ borderColor: colorHex }} />
    </div>
  );
}

// ── ComingSoon tab — placeholder for tabs that need a migration ────────
//
// Used for Roadmap / Notes / Activity until their DB tables ship. Better
// than hiding the tab because users learn the future shape of the page.

function ComingSoonTab({
  icon, title, body, colorHex,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  colorHex: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-container-low/50 ring-1 ring-dashed ring-outline-variant/30 p-8 text-center">
      <div
        className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
        style={{ backgroundColor: colorHex + '20', color: colorHex }}
      >
        {icon}
      </div>
      <p className="text-base font-bold stitch-text-primary mb-1.5">
        {title} <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded ml-1.5">Coming soon</span>
      </p>
      <p className="text-xs stitch-text-secondary leading-relaxed max-w-md mx-auto">
        {body}
      </p>
    </div>
  );
}
