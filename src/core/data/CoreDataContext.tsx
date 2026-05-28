import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthProvider';
import { SpaceService, type Space } from '../services/SpaceService';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import { DailyOSService } from '../services/DailyOSService';
import { supabase } from '../../lib/supabase';

export type BrainStateId =
  | 'hyperfocus'
  | 'energised'
  | 'steady'
  | 'distracted'
  | 'low'
  | 'brainfog';

export type BrainStateOption = {
  id: BrainStateId;
  label: string;
  emoji: string;
  tone: string;
};

export type CoreProject = {
  id: string;
  name: string;
  scope: 'personal' | 'shared';
  description: string;
  color: string | null;       // hex or token key (e.g. 'violet')
  status: 'active' | 'paused' | 'completed' | 'archived';
  targetDate: string | null;  // ISO date
  memberCount: number;        // 1 = solo, >1 = shared
  spaceId: string;            // needed for task scoping when creating tasks
  coverImageUrl: string | null; // optional banner image; falls back to color gradient
  /** Cover image focal point (0-100, percent) + zoom multiplier × 100. */
  coverX: number;
  coverY: number;
  coverZoom: number;
  /** 'cover' = crop to fill. 'contain' = fit whole image, show bands. */
  coverFit: 'cover' | 'contain';
  /** Hex colour painted behind the image when bands show; null = none. */
  coverBgColor: string | null;
  /** 'light' = white title text + dark overlay, 'dark' = near-black + light overlay. */
  coverTextColor: 'light' | 'dark';
  /** The single pre-decided next step. null = none set. */
  nextAction: string | null;
  /** ISO timestamp the next action was last set/changed. */
  nextActionUpdatedAt: string | null;
  /** ISO timestamp of last meaningful activity — drives re-entry/idle copy + momentum sort. */
  lastActivityAt: string | null;
};

export type CoreTask = {
  id: string;
  title: string;
  /** null when the task is unscoped (inbox); a project UUID when pinned. */
  projectId: string | null;
  energy: 'deep' | 'medium' | 'light';
  priority: 'high' | 'medium' | 'low';
  dueLabel: string;
  /** Hard deadline, ISO date string (YYYY-MM-DD) or null. Drives urgency chips. */
  dueOn: string | null;
  done: boolean;
  /** Set when this task is tracking a weekly intention — drives the picker badge. */
  weeklyIntentionId?: string | null;
  /** Last outcome from a debrief. Tasks marked 'partially' or 'something_came_up'
      get pinned to the top of the picker as "continue from where you left off". */
  lastSessionOutcome?: 'finished' | 'partially' | 'something_came_up' | 'no_answer' | null;
  /** Timestamp of the last session for sort ordering of "continue" tasks. */
  lastSessionAt?: string | null;
  /** How many sessions have been worked on this task — drives "3 sessions logged" chip. */
  sessionsCount?: number;
  /** Day this task is scheduled for, ISO date string (YYYY-MM-DD), or null for backlog. */
  scheduledFor: string | null;
  /** Status — preserved from the DB row. Used by the Day/Week task views to
   *  filter into the To do / Active / Done columns. */
  status: 'inbox' | 'active' | 'done' | 'dropped';
};

export type CoreResponsibility = {
  id: string;
  name: string;
  category: string;
  done: boolean;
};

export type CoreActivity = {
  id: string;
  time: string;
  title: string;
  category: string;
  durationMins: number;
};

export type CoreParkedIdea = {
  id: string;
  text: string;
};

export type CoreCheckIn = {
  id: string;
  type: 'morning' | 'afternoon' | 'evening';
  prompt: string;
  response?: string;
  createdAt: string;
};

export type CoreJournalEntry = {
  sleepQuality: number;
  exercise: string;
  wins: string;
  struggles: string;
  reflection: string;
  tomorrowIntention: string;
};

export type CoreReport = {
  id: string;
  title: string;
  summary: string;
  type: 'daily' | 'weekly';
  createdAt: string;
};

export type CoreSettings = {
  userName: string;
  location: string;
  voiceEnabled: boolean;
  voiceChoice: string;
  calendarSyncEnabled: boolean;
  sharedByDefault: boolean;
};

type CoreDataState = {
  activeSpaceId: string | null;
  spaces: Space[];
  currentBrainStateId: BrainStateId;
  activeProjectId: string | null;
  projects: CoreProject[];
  tasks: CoreTask[];
  responsibilities: CoreResponsibility[];
  activityLog: CoreActivity[];
  parkedIdeas: CoreParkedIdea[];
  checkins: CoreCheckIn[];
  journal: CoreJournalEntry;
  reports: CoreReport[];
  settings: CoreSettings;
};

type CoreDataContextValue = {
  brainStateOptions: BrainStateOption[];
  state: CoreDataState;
  switchSpace: (spaceId: string) => void;
  setCurrentBrainState: (brainStateId: BrainStateId) => void;
  setActiveProject: (projectId: string | null) => void;
  refreshProjects: () => Promise<void>;
  toggleTask: (taskId: string) => void;
  addTask: (title: string, projectId?: string | null) => void;
  /** Same as addTask, but awaits the DB insert and returns the real task id. */
  addTaskAsync: (title: string, projectId?: string | null, opts?: { scheduledFor?: string | null }) => Promise<string>;
  /** Permanently deletes a task from the DB and removes it from local state. */
  deleteTaskAsync: (taskId: string) => Promise<void>;
  /**
   * Patch a task — title, project_id, weekly_intention_id, energy_level.
   * Optimistic local update + DB write. Other fields can be added as the
   * editor surfaces grow.
   */
  updateTaskAsync: (taskId: string, updates: {
    title?: string;
    projectId?: string | null;
    weeklyIntentionId?: string | null;
    energy?: CoreTask['energy'];
  }) => Promise<void>;
  toggleResponsibility: (responsibilityId: string) => void;
  addActivityEntry: (title: string) => void;
  addParkedIdea: (text: string) => void;
  removeParkedIdea: (ideaId: string) => void;
  generateCheckIn: () => void;
  saveCheckInResponse: (checkInId: string, response: string) => void;
  updateJournal: (patch: Partial<CoreJournalEntry>) => void;
  generateReport: () => void;
  updateSettings: (patch: Partial<CoreSettings>) => void;
};

const STORAGE_KEY = 'sharedminds-core-state-v1';
const ACTIVE_PROJECT_KEY = 'sharedminds-active-project-id';

function readActiveProject(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

function writeActiveProject(id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id === null) window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    else window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch { /* ignore */ }
}

const brainStateOptions: BrainStateOption[] = [
  { id: 'hyperfocus', label: 'Hyperfocus', emoji: '🔥', tone: 'bg-orange-100 text-orange-800' },
  { id: 'energised', label: 'Energised', emoji: '⚡', tone: 'bg-emerald-100 text-emerald-800' },
  { id: 'steady', label: 'Steady', emoji: '🟢', tone: 'bg-sky-100 text-sky-800' },
  { id: 'distracted', label: 'Distracted', emoji: '🐿️', tone: 'bg-violet-100 text-violet-800' },
  { id: 'low', label: 'Low battery', emoji: '🪫', tone: 'bg-rose-100 text-rose-800' },
  { id: 'brainfog', label: 'Brain fog', emoji: '🌫️', tone: 'bg-slate-200 text-slate-700' },
];

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildCheckInPrompt(state: CoreDataState) {
  const project = state.projects.find((item) => item.id === state.activeProjectId) ?? state.projects[0];
  const openTasks = state.tasks.filter(
    (task) => !task.done && state.activeProjectId !== null && task.projectId === state.activeProjectId,
  );
  const openResponsibilities = state.responsibilities.filter((item) => !item.done);
  const brainState = brainStateOptions.find((item) => item.id === state.currentBrainStateId) ?? brainStateOptions[2];
  const latestActivity = state.activityLog[0];

  const projectName = project?.name ?? 'No project pinned';
  return `${brainState.label} right now. ${projectName} is active, ${openTasks.length} tasks are still open, ${openResponsibilities.length} responsibilities remain, and your latest activity was "${latestActivity?.title ?? 'nothing logged yet'}". What is the smallest useful next step?`;
}

function buildReportSummary(state: CoreDataState) {
  const completedTasks = state.tasks.filter((task) => task.done).length;
  const totalTasks = state.tasks.length;
  const completedResponsibilities = state.responsibilities.filter((item) => item.done).length;
  const totalResponsibilities = state.responsibilities.length;

  return `${completedTasks}/${totalTasks} tasks complete · ${completedResponsibilities}/${totalResponsibilities} responsibilities done · ${state.activityLog.length} activities logged`;
}

function seedState(): CoreDataState {
  return {
    activeSpaceId: null,
    spaces: [],
    currentBrainStateId: 'steady',
    activeProjectId: null,
    projects: [],
    tasks: [],
    responsibilities: [
      { id: 'resp-meds', name: 'Medication and breakfast', category: 'health', done: false },
      { id: 'resp-review', name: 'Daily task review', category: 'routine', done: false },
      { id: 'resp-water', name: 'Drink 8 glasses water', category: 'health', done: false },
    ],
    activityLog: [
      { id: 'act-1', time: '14:00', title: 'Sessions hub design review', category: 'focus', durationMins: 45 },
      { id: 'act-2', time: '10:30', title: 'Community pivot planning session', category: 'focus', durationMins: 90 },
      { id: 'act-3', time: '09:00', title: 'Morning review and task triage', category: 'routine', durationMins: 20 },
    ],
    parkedIdeas: [
      { id: 'idea-spaces', text: 'Bring back Spaces later as an optional shared dashboard layer.' },
      { id: 'idea-graph', text: 'MindMesh should attach to projects instead of replacing the core loop.' },
    ],
    checkins: [
      {
        id: 'checkin-morning',
        type: 'morning',
        prompt:
          'You started steady, have three open tasks on the product build, and one GTM action due today. Protect one meaningful block before messages take over.',
        response: 'I will finish the Jitsi wire-up before switching to outreach.',
        createdAt: '2026-05-14T09:10:00.000Z',
      },
    ],
    journal: {
      sleepQuality: 4,
      exercise: '20 minute walk',
      wins: 'Finished the Sessions hub and declare modal.',
      struggles: 'Context switching when reviewing community feedback.',
      reflection: 'The pivot feels clear — the simpler the loop, the faster I can test it.',
      tomorrowIntention: 'Start with the Jitsi embed and then write first-session onboarding copy.',
    },
    reports: [
      {
        id: 'report-daily-1',
        title: 'Daily report · 14 May 2026',
        summary: '3/4 tasks complete · 2/3 responsibilities done · 3 activities logged',
        type: 'daily',
        createdAt: '2026-05-14T19:20:00.000Z',
      },
    ],
    settings: {
      userName: 'Matthew',
      location: 'Basingstoke, Hampshire',
      voiceEnabled: true,
      voiceChoice: 'ash',
      calendarSyncEnabled: true,
      sharedByDefault: false,
    },
  };
}

function readStoredState() {
  if (typeof window === 'undefined') {
    return seedState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? ({ ...seedState(), ...JSON.parse(raw) } as CoreDataState) : seedState();
  } catch {
    return seedState();
  }
}

const CoreDataContext = createContext<CoreDataContextValue | null>(null);

export function CoreDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<CoreDataState>(() => readStoredState());
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);

  // Sync state to local storage to maintain immediate rendering behavior for legacy keys not yet synchronized
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Load backend space — gracefully handle missing profile / DB errors
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    (async () => {
      try {
        await SpaceService.bootstrapPersonalSpace(user.id);
      } catch (e) {
        // Space bootstrap can fail if the profile row doesn't exist yet (FK constraint).
        // This is non-fatal — the app works fine in a profile-only mode.
        console.warn('[CoreData] Space bootstrap skipped (profile may not exist in DB):', (e as any)?.message || e);
        return; // Don't try to fetch spaces if bootstrap failed
      }

      try {
        const spaces = await SpaceService.getMySpaces();
        if (isMounted && spaces.length > 0) {
          setState((s) => ({
            ...s,
            spaces: spaces,
            activeSpaceId: s.activeSpaceId || spaces.find(sp => sp.type === 'personal')?.id || spaces[0].id
          }));

          if (!activeSpaceId) {
            setActiveSpaceId(spaces.find(sp => sp.type === 'personal')?.id || spaces[0].id);
          }
        }
      } catch (e) {
        console.warn('[CoreData] Failed to fetch spaces:', (e as any)?.message || e);
      }
    })();
    return () => { isMounted = false; };
  }, [user]);

  // Refresh projects across all spaces the user can see (own + shared).
  // Exposed via context so list pages / editor modals can re-trigger after CUD.
  //
  // Coalesce concurrent calls: on a cold load both the provider mount and
  // the ProjectsPage mount (and any editor) can call this within the same
  // tick. Without dedup that fires N identical fetches at once, saturating
  // the connection pool and serialising them (the "1 row in 4s ×3" we saw).
  // If a refresh is already in flight, return the same promise.
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshProjects = async (): Promise<void> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const run = (async () => {
    try {
      const _t0 = performance.now();
      const rows = await ProjectService.getProjectsForUser();
      const _t1 = performance.now();
      console.log(`[perf] getProjectsForUser: ${(_t1 - _t0).toFixed(0)}ms (${rows.length} rows)`);

      // Member counts in one round-trip
      const memberCounts = new Map<string, number>();
      if (rows.length > 0) {
        const { data: memberRows } = await supabase
          .from('project_members')
          .select('project_id')
          .in('project_id', rows.map(r => r.id));
        for (const m of memberRows ?? []) {
          memberCounts.set(m.project_id, (memberCounts.get(m.project_id) ?? 0) + 1);
        }
      }
      console.log(`[perf] member counts: ${(performance.now() - _t1).toFixed(0)}ms`);

      const mapped: CoreProject[] = rows.map(p => {
        const count = memberCounts.get(p.id) ?? 1;
        return {
          id: p.id,
          name: p.title,
          scope: count > 1 ? 'shared' : 'personal',
          description: p.description ?? '',
          color: p.color,
          status: p.status,
          targetDate: p.target_date,
          memberCount: count,
          spaceId: p.space_id,
          coverImageUrl: p.cover_image_url ?? null,
          coverX: p.cover_x ?? 50,
          coverY: p.cover_y ?? 50,
          coverZoom: p.cover_zoom ?? 100,
          coverFit: (p.cover_fit ?? 'cover') as 'cover' | 'contain',
          coverBgColor: p.cover_bg_color ?? null,
          coverTextColor: (p.cover_text_color ?? 'light') as 'light' | 'dark',
          nextAction: p.next_action ?? null,
          nextActionUpdatedAt: p.next_action_updated_at ?? null,
          lastActivityAt: p.last_activity_at ?? null,
        };
      });

      setState(s => {
        // Reconcile stored active project against fresh list — drop stale id
        const storedActive = s.activeProjectId;
        const nextActive = storedActive && mapped.some(p => p.id === storedActive)
          ? storedActive
          : null;
        if (nextActive !== storedActive) writeActiveProject(nextActive);
        return { ...s, projects: mapped, activeProjectId: nextActive };
      });
    } catch (err) {
      console.warn('[CoreData] refreshProjects failed:', err);
    }
    })();
    refreshInFlight.current = run;
    try { await run; } finally { refreshInFlight.current = null; }
  };

  // Load backend models (projects, tasks, daily OS)
  useEffect(() => {
    if (!activeSpaceId) return;
    let isMounted = true;
    const todayStr = new Date().toISOString().split('T')[0];

    // ── Critical: tasks (the Today view needs them). Load on the boot path. ──
    (async () => {
      try {
        const tasks = await TaskService.getTasksBySpace(activeSpaceId);
        if (!isMounted) return;
        // Tasks keep null projectId when unscoped (fixes earlier bug that
        // silently re-pointed inbox tasks at the first project).
        const mappedTasks: CoreTask[] = tasks.map(t => ({
          id: t.id,
          title: t.title,
          projectId: t.project_id ?? null,
          energy: t.energy_level === 'high' ? 'deep' : t.energy_level === 'medium' ? 'medium' : 'light',
          priority: t.priority,
          dueLabel: t.due_on ? new Date(t.due_on).toLocaleDateString() : 'Inbox',
          dueOn: t.due_on ?? null,
          done: t.status === 'done' || t.status === 'dropped',
          weeklyIntentionId: t.weekly_intention_id ?? null,
          lastSessionOutcome: t.last_session_outcome ?? null,
          lastSessionAt: t.last_session_at ?? null,
          sessionsCount: t.sessions_count ?? 0,
          scheduledFor: t.scheduled_for ?? null,
          status: t.status,
        }));
        const restoredActive = readActiveProject();
        setState(s => ({ ...s, tasks: mappedTasks, activeProjectId: restoredActive }));
      } catch (err) {
        console.error('[CoreData] Task load error:', err);
      }
    })();

    // ── Deferred: DailyOS extras (activity log, responsibilities, check-ins,
    //    journal). Nothing on the home screen consumes these — responsibilities
    //    + check-ins have no consumers at all; activity log + journal are only
    //    read by JournalPage. Loading them at boot was four wasted concurrent
    //    queries contending the pool (which was stalling getProjectsForUser).
    //    Defer them to idle time so they're off the cold-load critical path. ──
    let idleHandle: number | undefined;
    const schedule = (cb: () => void) =>
      (typeof (window as any).requestIdleCallback === 'function'
        ? (window as any).requestIdleCallback(cb, { timeout: 4000 })
        : window.setTimeout(cb, 1500)) as number;
    idleHandle = schedule(() => {
      (async () => {
        try {
          const [activities, responsibilities, checkins, journal] = await Promise.all([
            DailyOSService.getActivityLogs(user!.id, todayStr),
            DailyOSService.getResponsibilities(activeSpaceId, user!.id, todayStr),
            DailyOSService.getCheckins(user!.id, todayStr),
            DailyOSService.getJournalEntry(user!.id, todayStr),
          ]);
          if (!isMounted) return;
          setState(s => ({
            ...s,
            activityLog: activities.length > 0 ? activities : s.activityLog,
            responsibilities: responsibilities.length > 0 ? responsibilities : s.responsibilities,
            checkins: checkins.length > 0 ? checkins : s.checkins,
            journal: journal || s.journal,
          }));
        } catch (err) {
          console.error('[CoreData] Deferred DailyOS sync error:', err);
        }
      })();
    });

    return () => {
      isMounted = false;
      if (idleHandle !== undefined && typeof (window as any).cancelIdleCallback === 'function') {
        (window as any).cancelIdleCallback(idleHandle);
      } else if (idleHandle !== undefined) {
        clearTimeout(idleHandle);
      }
    };
  }, [activeSpaceId, user]);

  // Projects load independently of space — they may live in another user's space.
  useEffect(() => {
    if (!user) return;
    refreshProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value = useMemo<CoreDataContextValue>(
    () => ({
      brainStateOptions,
      state: {
        ...state,
        activeSpaceId // merge active node back for readers to use strictly
      },
      switchSpace: (spaceId) => {
        setActiveSpaceId(spaceId);
        setState((current) => ({ ...current, activeSpaceId: spaceId }));
      },
      setCurrentBrainState: (brainStateId) => {
        setState((current) => ({ ...current, currentBrainStateId: brainStateId }));
      },
      setActiveProject: (projectId) => {
        writeActiveProject(projectId);
        setState((current) => ({ ...current, activeProjectId: projectId }));
      },
      refreshProjects,
      toggleTask: (taskId) => {
        setState((current) => ({
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === taskId ? { ...task, done: !task.done } : task,
          ),
        }));

        // Fire & Forget DB operation
        const targetTask = state.tasks.find(t => t.id === taskId);
        if (targetTask && activeSpaceId && targetTask.id.includes('-')) {
          TaskService.updateTask(taskId, {
            status: !targetTask.done ? 'done' : 'active'
          }).catch(console.error);
        }
      },
      addTask: (title, projectIdOverride) => {
        const cleanedTitle = title.trim();
        if (!cleanedTitle) {
          return;
        }

        // Resolve which project (if any) the task belongs to:
        //   - explicit override wins (e.g. from a project detail page)
        //   - else fall back to the active project (if pinned)
        //   - else null (inbox)
        const pinnedProjectId =
          projectIdOverride !== undefined ? projectIdOverride : state.activeProjectId;

        // If creating into a shared project, scope the task to *that*
        // project's space, not the user's personal space — RLS allows
        // either, but task visibility hooks off space_id.
        const project = pinnedProjectId
          ? state.projects.find((p) => p.id === pinnedProjectId)
          : null;
        const targetSpaceId = project?.spaceId ?? activeSpaceId;

        const fakeId = makeId('task');
        setState((current) => ({
          ...current,
          tasks: [
            {
              id: fakeId,
              title: cleanedTitle,
              projectId: pinnedProjectId,
              energy: 'medium',
              priority: 'medium',
              dueLabel: 'Inbox',
              dueOn: null,
              done: false,
              scheduledFor: null,
              status: 'inbox',
            },
            ...current.tasks,
          ],
        }));

        if (targetSpaceId && user) {
          TaskService.createTask({
            space_id: targetSpaceId,
            created_by: user.id,
            title: cleanedTitle,
            project_id: pinnedProjectId,
            status: 'inbox',
            priority: 'medium',
            energy_level: 'medium',
            sort_order: 0
          }).then(realTask => {
            setState(current => ({
              ...current,
              tasks: current.tasks.map(t => t.id === fakeId ? { ...t, id: realTask.id } : t)
            }));
          }).catch(console.error);
        }
      },
      addTaskAsync: async (title, projectIdOverride, opts) => {
        const cleanedTitle = title.trim();
        if (!cleanedTitle) throw new Error('Task title required');

        const pinnedProjectId =
          projectIdOverride !== undefined ? projectIdOverride : state.activeProjectId;
        const project = pinnedProjectId
          ? state.projects.find((p) => p.id === pinnedProjectId)
          : null;
        const targetSpaceId = project?.spaceId ?? activeSpaceId;

        if (!targetSpaceId || !user) throw new Error('Personal space not ready');

        const scheduledFor = opts?.scheduledFor ?? null;

        const realTask = await TaskService.createTask({
          space_id: targetSpaceId,
          created_by: user.id,
          title: cleanedTitle,
          project_id: pinnedProjectId,
          status: 'inbox',
          priority: 'medium',
          energy_level: 'medium',
          scheduled_for: scheduledFor,
          sort_order: 0,
        });

        // Optimistically mirror to local state so the next modal-open includes it
        setState((current) => ({
          ...current,
          tasks: [
            {
              id: realTask.id,
              title: cleanedTitle,
              projectId: pinnedProjectId,
              energy: 'medium',
              priority: 'medium',
              dueLabel: 'Inbox',
              dueOn: null,
              done: false,
              scheduledFor,
              status: 'inbox',
            },
            ...current.tasks,
          ],
        }));

        return realTask.id;
      },
      deleteTaskAsync: async (taskId) => {
        // Snapshot the task before optimistic removal so we can put it
        // back if the DB delete fails (RLS, network error, etc.).
        let snapshot: CoreTask | undefined;
        setState((current) => {
          snapshot = current.tasks.find((t) => t.id === taskId);
          return {
            ...current,
            tasks: current.tasks.filter((t) => t.id !== taskId),
          };
        });
        try {
          await TaskService.deleteTask(taskId);
        } catch (err) {
          console.error('[CoreDataContext] deleteTaskAsync failed, restoring task:', err);
          // Restore the snapshot so the UI doesn't pretend the row is gone
          // until the next page-load refetch contradicts it.
          if (snapshot) {
            const t = snapshot;
            setState((current) => ({
              ...current,
              tasks: current.tasks.some((x) => x.id === taskId)
                ? current.tasks
                : [...current.tasks, t],
            }));
          }
          throw err;
        }
      },
      updateTaskAsync: async (taskId, updates) => {
        // Optimistic patch — reflect the edit immediately
        const prevTask = state.tasks.find((t) => t.id === taskId);
        setState((current) => ({
          ...current,
          tasks: current.tasks.map((t) =>
            t.id !== taskId
              ? t
              : {
                  ...t,
                  ...(updates.title !== undefined ? { title: updates.title } : {}),
                  ...(updates.projectId !== undefined ? { projectId: updates.projectId } : {}),
                  ...(updates.weeklyIntentionId !== undefined ? { weeklyIntentionId: updates.weeklyIntentionId } : {}),
                  ...(updates.energy !== undefined ? { energy: updates.energy } : {}),
                },
          ),
        }));

        // Map UI fields → DB columns
        const dbUpdates: Record<string, unknown> = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
        if (updates.weeklyIntentionId !== undefined) dbUpdates.weekly_intention_id = updates.weeklyIntentionId;
        if (updates.energy !== undefined) {
          dbUpdates.energy_level =
            updates.energy === 'deep' ? 'high'
            : updates.energy === 'light' ? 'low'
            : 'medium';
        }

        try {
          await TaskService.updateTask(taskId, dbUpdates as Partial<import('../services/TaskService').Task>);
        } catch (err) {
          console.error('[CoreDataContext] updateTaskAsync failed, reverting:', err);
          // Revert local change if the DB write failed
          if (prevTask) {
            setState((current) => ({
              ...current,
              tasks: current.tasks.map((t) => (t.id === taskId ? prevTask : t)),
            }));
          }
        }
      },
      toggleResponsibility: (responsibilityId) => {
        const target = state.responsibilities.find(r => r.id === responsibilityId);
        if (!target) return;

        setState((current) => ({
          ...current,
          responsibilities: current.responsibilities.map((item) =>
            item.id === responsibilityId ? { ...item, done: !item.done } : item,
          ),
        }));

        if (user) {
          const todayStr = new Date().toISOString().split('T')[0];
          DailyOSService.toggleResponsibilityCompletion(responsibilityId, user.id, todayStr, !target.done);
        }
      },
      addActivityEntry: (title) => {
        const cleanedTitle = title.trim();
        if (!cleanedTitle) {
          return;
        }

        const now = new Date();
        const time = now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const todayStr = now.toISOString().split('T')[0];

        const fakeId = makeId('activity');
        setState((current) => ({
          ...current,
          activityLog: [
            {
              id: fakeId,
              time,
              title: cleanedTitle,
              category: 'manual',
              durationMins: 30,
            },
            ...current.activityLog,
          ],
        }));

        if (user && activeSpaceId) {
          DailyOSService.createActivityLog(user.id, activeSpaceId, todayStr, {
            time, title: cleanedTitle, category: 'manual', durationMins: 30
          }).then(res => {
            if (res) {
              setState(current => ({
                ...current,
                activityLog: current.activityLog.map(a => a.id === fakeId ? { ...a, id: res.id } : a)
              }));
            }
          });
        }
      },
      addParkedIdea: (text) => {
        const cleanedText = text.trim();
        if (!cleanedText) {
          return;
        }

        setState((current) => ({
          ...current,
          parkedIdeas: [{ id: makeId('idea'), text: cleanedText }, ...current.parkedIdeas],
        }));
      },
      removeParkedIdea: (ideaId) => {
        setState((current) => ({
          ...current,
          parkedIdeas: current.parkedIdeas.filter((item) => item.id !== ideaId),
        }));
      },
      generateCheckIn: () => {
        const prompt = buildCheckInPrompt(state);
        const nextId = makeId('checkin');
        const todayStr = new Date().toISOString().split('T')[0];

        setState((current) => ({
          ...current,
          checkins: [
            {
              id: nextId,
              type: 'afternoon',
              prompt,
              createdAt: new Date().toISOString(),
            },
            ...current.checkins,
          ],
        }));

        if (user && activeSpaceId) {
          DailyOSService.createCheckin(user.id, activeSpaceId, todayStr, { prompt, type: 'afternoon', createdAt: new Date().toISOString() })
            .then(res => {
              if (res) {
                setState(current => ({
                  ...current,
                  checkins: current.checkins.map(c => c.id === nextId ? { ...c, id: res.id } : c)
                }));
              }
            });
        }
      },
      saveCheckInResponse: (checkInId, response) => {
        setState((current) => ({
          ...current,
          checkins: current.checkins.map((item) =>
            item.id === checkInId ? { ...item, response } : item,
          ),
        }));

        if (!checkInId.includes('-')) {
          DailyOSService.updateCheckinResponse(checkInId, response);
        }
      },
      updateJournal: (patch) => {
        setState((current) => ({
          ...current,
          journal: { ...current.journal, ...patch },
        }));

        if (user && activeSpaceId) {
          const todayStr = new Date().toISOString().split('T')[0];
          DailyOSService.upsertJournalEntry(user.id, activeSpaceId, todayStr, patch);
        }
      },
      generateReport: () => {
        setState((current) => ({
          ...current,
          reports: [
            {
              id: makeId('report'),
              title: `Daily report · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
              summary: buildReportSummary(current),
              type: 'daily',
              createdAt: new Date().toISOString(),
            },
            ...current.reports,
          ],
        }));
      },
      updateSettings: (patch) => {
        setState((current) => ({
          ...current,
          settings: { ...current.settings, ...patch },
        }));
      },
    }),
    [state, activeSpaceId, user],
  );

  return <CoreDataContext.Provider value={value}>{children}</CoreDataContext.Provider>;
}

export function useCoreData() {
  const context = useContext(CoreDataContext);

  if (!context) {
    throw new Error('useCoreData must be used within CoreDataProvider');
  }

  return context;
}
