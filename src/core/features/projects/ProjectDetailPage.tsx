/**
 * ProjectDetailPage — single-project view at /projects/:projectId
 *
 * Redesigned with a richer header: color gradient banner, stat chips,
 * task-completion ring, member avatars. Tabs: Tasks / Sessions / Members.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, Pencil, Play, Target, Users, Calendar, ArrowLeft,
  CheckCircle2, Circle, Plus, Pin, Clock, Zap, TrendingUp,
  Archive, UserPlus, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { ProjectService, type Project, type ProjectMemberWithProfile } from '../../services/ProjectService';
import { TaskService, type Task } from '../../services/TaskService';
import type { ShippedSession, ScheduledSessionWithProfile } from '../../services/SessionService';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';
import { ProjectEditorModal } from './ProjectEditorModal';
import { DeclareSessionModal } from '../sessions/DeclareSessionModal';
import { projectColorMeta } from './ProjectsPage';
import { SurfaceCard } from '../../ui/CorePage';
import type { FocusSession } from '../../../lib/sessions/focusTypes';

type Tab = 'tasks' | 'sessions' | 'members';

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
      <div className="relative rounded-2xl overflow-hidden mb-5 shadow-md">

        {/* Gradient background */}
        <div className={`bg-gradient-to-br ${color.gradient} px-5 pt-5 pb-14`}>

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

          {/* Title + description */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-1 drop-shadow-sm">
            {project.title}
          </h1>
          {project.description && (
            <p className="text-sm text-white/75 leading-snug max-w-lg">
              {project.description}
            </p>
          )}
        </div>

        {/* ── Stats band (overlapping the gradient) ────────────── */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 px-4">
          <div className="bg-surface rounded-2xl shadow-lg ring-1 ring-surface-container/60 px-4 py-3 flex items-center gap-4 overflow-x-auto">

            {/* Task progress ring */}
            <div className="flex items-center gap-3 shrink-0">
              <ProgressRing pct={taskProgress} hex={color.hex} size={44} />
              <div>
                <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider">Tasks</p>
                <p className="text-sm font-extrabold stitch-text-primary">
                  {doneTasks.length}<span className="text-xs font-medium stitch-text-secondary">/{tasks.length}</span>
                </p>
              </div>
            </div>

            <div className="w-px h-8 bg-surface-container shrink-0" />

            {/* Sessions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color.hex + '20' }}>
                <Zap size={16} style={{ color: color.hex }} />
              </div>
              <div>
                <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider">Sessions</p>
                <p className="text-sm font-extrabold stitch-text-primary">{completedSessions.length}</p>
              </div>
            </div>

            <div className="w-px h-8 bg-surface-container shrink-0" />

            {/* Time logged */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color.hex + '20' }}>
                <Clock size={16} style={{ color: color.hex }} />
              </div>
              <div>
                <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider">Time logged</p>
                <p className="text-sm font-extrabold stitch-text-primary">
                  {totalSessionMinutes >= 60
                    ? `${Math.floor(totalSessionMinutes / 60)}h ${totalSessionMinutes % 60}m`
                    : `${totalSessionMinutes}m`}
                </p>
              </div>
            </div>

            {/* Members (if shared) */}
            {members.length > 1 && (
              <>
                <div className="w-px h-8 bg-surface-container shrink-0" />
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex -space-x-1.5">
                    {members.slice(0, 3).map((m) => (
                      m.avatar_url ? (
                        <img key={m.id} src={m.avatar_url} alt={m.display_name}
                          className="w-7 h-7 rounded-full object-cover border-2 border-surface" />
                      ) : (
                        <div key={m.id}
                          className={`w-7 h-7 rounded-full bg-gradient-to-br ${color.gradient} flex items-center justify-center text-[10px] font-bold text-white border-2 border-surface`}>
                          {m.display_name.charAt(0).toUpperCase()}
                        </div>
                      )
                    ))}
                    {members.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-[9px] font-bold stitch-text-secondary border-2 border-surface">
                        +{members.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold stitch-text-secondary">{members.length}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Spacer for the overlapping stats band */}
      <div className="h-10 mb-1" />

      {/* ── CTA row ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {!isArchived && (
          <button
            type="button"
            onClick={() => setDeclareOpen(true)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-bold shadow-md active:scale-[0.98] bg-gradient-to-r ${color.gradient}`}
            style={{ boxShadow: `0 4px 14px ${color.hex}40` }}
          >
            <Play size={13} fill="currentColor" strokeWidth={0} />
            Start a session
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveProject(isPinned ? null : project.id)}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold transition-colors ${
            isPinned
              ? `${color.soft} ${color.textDark}`
              : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
          }`}
        >
          <Pin size={12} fill={isPinned ? 'currentColor' : 'none'} />
          {isPinned ? 'Pinned as active' : 'Pin as active'}
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="flex p-1 bg-surface-container-low rounded-full gap-1 mb-4">
        {([
          { id: 'tasks' as const,   label: 'Tasks',   count: openTasks.length, icon: Target },
          { id: 'sessions' as const, label: 'Sessions', count: sessions.length,  icon: Zap },
          { id: 'members' as const, label: 'Members', count: members.length,   icon: Users },
        ]).map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all ${
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
      {tab === 'sessions' && (
        <SessionsTab
          sessions={sessions}
          colorHex={color.hex}
          colorGradient={color.gradient}
          onDeclare={() => setDeclareOpen(true)}
        />
      )}
      {tab === 'members' && (
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

function ProgressRing({ pct, hex, size }: { pct: number; hex: string; size: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r}
        stroke="var(--color-surface-container)" strokeWidth="5" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r}
        stroke={hex} strokeWidth="5" fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
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
