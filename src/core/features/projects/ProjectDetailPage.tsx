/**
 * ProjectDetailPage — single-project view at /projects/:projectId
 *
 * Header: color dot + title + member avatars + edit pencil
 * Tabs: Tasks / Sessions / Members
 * Primary CTA: "Start a session on this project" → DeclareSessionModal with
 * initialProjectId prefilled.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, Pencil, Play, Target, Users, Calendar, ArrowLeft,
  CheckCircle2, Circle, Plus, Pin,
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

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== 'done' && t.status !== 'dropped'), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.status === 'done' || t.status === 'dropped'), [tasks]);

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
    // optimistic
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
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="text-sm stitch-text-secondary hover:stitch-text-primary"
        >
          Back to projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold stitch-text-secondary hover:stitch-text-primary"
      >
        <ArrowLeft size={13} /> All projects
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <span
          className="mt-1 w-5 h-5 rounded-full ring-2 ring-white shadow shrink-0"
          style={{ backgroundColor: color.hex }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h1 className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight truncate">
              {project.title}
            </h1>
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center transition-colors"
              aria-label="Edit project"
            >
              <Pencil size={13} className="stitch-text-secondary" />
            </button>
          </div>
          {project.description && (
            <p className="text-sm stitch-text-secondary leading-snug mb-3">
              {project.description}
            </p>
          )}

          {/* Member avatars */}
          {members.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex -space-x-1.5">
                {members.slice(0, 5).map((m) => (
                  m.avatar_url ? (
                    <img
                      key={m.id}
                      src={m.avatar_url}
                      alt={m.display_name}
                      title={m.display_name}
                      className="w-7 h-7 rounded-full object-cover border-2 border-surface"
                    />
                  ) : (
                    <div
                      key={m.id}
                      title={m.display_name}
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-surface"
                    >
                      {m.display_name.charAt(0).toUpperCase()}
                    </div>
                  )
                ))}
                {members.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-[10px] font-bold stitch-text-secondary border-2 border-surface">
                    +{members.length - 5}
                  </div>
                )}
              </div>
              <span className="text-xs stitch-text-secondary">
                {members.length} member{members.length === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {/* CTA row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setDeclareOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full stitch-btn--primary text-white text-sm font-bold shadow-md shadow-primary/20 active:scale-[0.98]"
            >
              <Play size={13} />
              Start a session
            </button>
            <button
              type="button"
              onClick={() => setActiveProject(isPinned ? null : project.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold transition-colors ${
                isPinned
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
              }`}
            >
              <Pin size={12} fill={isPinned ? 'currentColor' : 'none'} />
              {isPinned ? 'Pinned' : 'Pin as active'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-surface-container-low rounded-full gap-1">
        {([
          { id: 'tasks' as const, label: `Tasks · ${openTasks.length}`, icon: Target },
          { id: 'sessions' as const, label: `Sessions · ${sessions.length}`, icon: Calendar },
          { id: 'members' as const, label: `Members · ${members.length}`, icon: Users },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all ${
              tab === id ? 'bg-white shadow-sm text-primary' : 'stitch-text-secondary'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab body */}
      {tab === 'tasks' && (
        <TasksTab
          openTasks={openTasks}
          doneTasks={doneTasks}
          newTaskTitle={newTaskTitle}
          setNewTaskTitle={setNewTaskTitle}
          onAdd={handleAddTask}
          onToggle={toggleTaskStatus}
          submitting={taskSubmitting}
        />
      )}
      {tab === 'sessions' && <SessionsTab sessions={sessions} />}
      {tab === 'members' && (
        <MembersTab
          members={members}
          isOwner={members.find((m) => m.user_id === user?.id)?.role === 'owner'}
          onInvite={() => setEditorOpen(true)}
        />
      )}

      {/* Modals */}
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

// ── Tasks tab ────────────────────────────────────────────────────

function TasksTab({
  openTasks, doneTasks, newTaskTitle, setNewTaskTitle, onAdd, onToggle, submitting,
}: {
  openTasks: Task[];
  doneTasks: Task[];
  newTaskTitle: string;
  setNewTaskTitle: (s: string) => void;
  onAdd: () => void;
  onToggle: (t: Task) => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-3">
      {/* Add task inline */}
      <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2">
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
            className="text-[10px] font-bold uppercase tracking-wider text-primary disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        )}
      </div>

      {openTasks.length === 0 && doneTasks.length === 0 ? (
        <SurfaceCard>
          <div className="text-center py-8 px-4">
            <Target size={24} className="mx-auto mb-3 stitch-text-secondary opacity-50" />
            <p className="text-sm font-bold stitch-text-primary mb-1">No tasks yet</p>
            <p className="text-xs stitch-text-secondary">
              Break the macro goal into smaller chunks above.
            </p>
          </div>
        </SurfaceCard>
      ) : (
        <>
          {openTasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} />
          ))}
          {doneTasks.length > 0 && (
            <>
              <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mt-5">
                Done
              </p>
              {doneTasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const isDone = task.status === 'done' || task.status === 'dropped';
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container active:scale-[0.99] transition-all text-left"
    >
      {isDone ? (
        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
      ) : (
        <Circle size={16} className="stitch-text-secondary shrink-0" />
      )}
      <span className={`flex-1 text-sm ${isDone ? 'line-through stitch-text-secondary' : 'stitch-text-primary'}`}>
        {task.title}
      </span>
    </button>
  );
}

// ── Sessions tab ─────────────────────────────────────────────────

function SessionsTab({ sessions }: { sessions: FocusSession[] }) {
  if (sessions.length === 0) {
    return (
      <SurfaceCard>
        <div className="text-center py-8 px-4">
          <Calendar size={24} className="mx-auto mb-3 stitch-text-secondary opacity-50" />
          <p className="text-sm font-bold stitch-text-primary mb-1">No sessions yet</p>
          <p className="text-xs stitch-text-secondary">
            Start one above to chip at this project.
          </p>
        </div>
      </SurfaceCard>
    );
  }
  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <SurfaceCard key={s.id} padding="sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold stitch-text-primary truncate">
                {s.session_goal ?? 'Worked on it'}
              </p>
              <p className="text-[11px] stitch-text-secondary">
                {new Date(s.start_time).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {s.intended_duration_minutes ? ` · ${s.intended_duration_minutes}m` : ''}
                {' · '}
                <span className={
                  s.status === 'active' ? 'text-emerald-600' :
                  s.status === 'scheduled' ? 'text-cyan-600' :
                  'stitch-text-secondary'
                }>
                  {s.status}
                </span>
              </p>
            </div>
            {s.session_outcome && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {s.session_outcome === 'finished' ? 'Finished' : s.session_outcome === 'partially' ? 'Partial' : 'Interrupted'}
              </span>
            )}
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}

// ── Members tab ──────────────────────────────────────────────────

function MembersTab({
  members, isOwner, onInvite,
}: {
  members: ProjectMemberWithProfile[];
  isOwner: boolean;
  onInvite: () => void;
}) {
  return (
    <div className="space-y-2">
      {members.map((m) => (
        <SurfaceCard key={m.id} padding="sm">
          <div className="flex items-center gap-3">
            {m.avatar_url ? (
              <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center text-white font-extrabold shrink-0">
                {m.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold stitch-text-primary truncate">{m.display_name}</p>
              <p className="text-[11px] stitch-text-secondary uppercase tracking-wider">{m.role}</p>
            </div>
          </div>
        </SurfaceCard>
      ))}
      {isOwner && (
        <button
          type="button"
          onClick={onInvite}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container transition-colors"
        >
          <Plus size={14} />
          Invite collaborator
        </button>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

async function fetchProjectSessions(projectId: string): Promise<FocusSession[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('project_id', projectId)
    .order('start_time', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('[ProjectDetailPage] fetchProjectSessions:', error);
    return [];
  }
  return (data ?? []) as FocusSession[];
}

// silence unused imports for types only
export type { Task, ShippedSession, ScheduledSessionWithProfile };
