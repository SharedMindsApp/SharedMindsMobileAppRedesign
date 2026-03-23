import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthProvider';
import { SpaceService, type Space } from '../services/SpaceService';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import { DailyOSService } from '../services/DailyOSService';

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
};

export type CoreTask = {
  id: string;
  title: string;
  projectId: string;
  energy: 'deep' | 'medium' | 'light';
  priority: 'high' | 'medium' | 'low';
  dueLabel: string;
  done: boolean;
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
  activeProjectId: string;
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
  setActiveProject: (projectId: string) => void;
  toggleTask: (taskId: string) => void;
  addTask: (title: string) => void;
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
  const openTasks = state.tasks.filter((task) => !task.done && task.projectId === state.activeProjectId);
  const openResponsibilities = state.responsibilities.filter((item) => !item.done);
  const brainState = brainStateOptions.find((item) => item.id === state.currentBrainStateId) ?? brainStateOptions[2];
  const latestActivity = state.activityLog[0];

  return `${brainState.label} right now. ${project.name} is active, ${openTasks.length} tasks are still open, ${openResponsibilities.length} responsibilities remain, and your latest activity was "${latestActivity?.title ?? 'nothing logged yet'}". What is the smallest useful next step?`;
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
    activeProjectId: 'project-home-rhythm',
    projects: [
      {
        id: 'project-sharedminds',
        name: 'SharedMinds product build',
        scope: 'personal',
        description: 'Core product decisions, migration work, and design iterations.',
      },
      {
        id: 'project-home-rhythm',
        name: 'Home and family rhythm',
        scope: 'shared',
        description: 'Calendar planning, responsibilities, appointments, and shared routines.',
      },
      {
        id: 'project-health-reset',
        name: 'Health reset',
        scope: 'personal',
        description: 'Sleep, movement, recovery, and low-friction routines.',
      },
    ],
    tasks: [
      {
        id: 'task-calendar',
        title: 'Confirm family calendar for next week',
        projectId: 'project-home-rhythm',
        energy: 'light',
        priority: 'high',
        dueLabel: 'Today',
        done: false,
      },
      {
        id: 'task-copy',
        title: 'Finish shared calendar onboarding copy',
        projectId: 'project-sharedminds',
        energy: 'deep',
        priority: 'high',
        dueLabel: 'This week',
        done: false,
      },
      {
        id: 'task-pickup',
        title: 'Reply about nursery pickup plan',
        projectId: 'project-home-rhythm',
        energy: 'light',
        priority: 'medium',
        dueLabel: 'Today',
        done: true,
      },
      {
        id: 'task-walk',
        title: 'Take a short recovery walk',
        projectId: 'project-health-reset',
        energy: 'medium',
        priority: 'low',
        dueLabel: 'This evening',
        done: false,
      },
    ],
    responsibilities: [
      { id: 'resp-meds', name: 'Medication and breakfast', category: 'health', done: true },
      { id: 'resp-dinner', name: 'Shared dinner plan', category: 'home', done: false },
      { id: 'resp-school', name: 'School bag prep', category: 'family', done: false },
    ],
    activityLog: [
      { id: 'act-1', time: '14:00', title: 'AI check-in with context from tasks and journal', category: 'reflection', durationMins: 15 },
      { id: 'act-2', time: '11:30', title: 'Shared household planning sync', category: 'shared', durationMins: 20 },
      { id: 'act-3', time: '09:00', title: 'Focus block on core product work', category: 'focus', durationMins: 90 },
      { id: 'act-4', time: '08:10', title: 'Morning reset and calendar check', category: 'routine', durationMins: 20 },
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
          'You started steady, completed one shared task, and still have dinner planning open. Protect one meaningful block before messages take over.',
        response: 'I will finish the shared calendar review before lunch.',
        createdAt: '2026-03-18T09:10:00.000Z',
      },
    ],
    journal: {
      sleepQuality: 4,
      exercise: '20 minute walk',
      wins: 'Protected a clean focus block in the morning.',
      struggles: 'Context switching after lunch.',
      reflection: 'The day went better once I made one shared commitment visible.',
      tomorrowIntention: 'Start with the family calendar and then move into product writing.',
    },
    reports: [
      {
        id: 'report-daily-1',
        title: 'Daily report · 18 Mar 2026',
        summary: '2/4 tasks complete · 1/3 responsibilities done · 4 activities logged',
        type: 'daily',
        createdAt: '2026-03-18T19:20:00.000Z',
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

  // Load backend models (projects, tasks)
  useEffect(() => {
    if (!activeSpaceId) return;
    let isMounted = true;
    (async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        const [projects, tasks, activities, responsibilities, checkins, journal] = await Promise.all([
          ProjectService.getProjectsBySpace(activeSpaceId),
          TaskService.getTasksBySpace(activeSpaceId),
          DailyOSService.getActivityLogs(user!.id, todayStr),
          DailyOSService.getResponsibilities(activeSpaceId, user!.id, todayStr),
          DailyOSService.getCheckins(user!.id, todayStr),
          DailyOSService.getJournalEntry(user!.id, todayStr)
        ]);
        if (!isMounted) return;

        const mappedProjects: CoreProject[] = projects.map(p => ({
          id: p.id,
          name: p.title,
          scope: 'personal',
          description: p.description || ''
        }));

        const mappedTasks: CoreTask[] = tasks.map(t => ({
          id: t.id,
          title: t.title,
          projectId: t.project_id || mappedProjects[0]?.id || 'project-home-rhythm',
          energy: t.energy_level === 'high' ? 'deep' : t.energy_level === 'medium' ? 'medium' : 'light',
          priority: t.priority,
          dueLabel: t.due_on ? new Date(t.due_on).toLocaleDateString() : 'Inbox',
          done: t.status === 'done' || t.status === 'dropped'
        }));

        setState(s => ({
          ...s,
          // Only overwrite if backend has items, otherwise we start with seed so app isn't strictly empty yet
          projects: mappedProjects.length > 0 ? mappedProjects : s.projects,
          tasks: mappedTasks.length > 0 ? mappedTasks : s.tasks,
          activeProjectId: mappedProjects.length > 0 ? mappedProjects[0].id : s.activeProjectId,
          activityLog: activities.length > 0 ? activities : s.activityLog,
          responsibilities: responsibilities.length > 0 ? responsibilities : s.responsibilities,
          checkins: checkins.length > 0 ? checkins : s.checkins,
          journal: journal || s.journal,
        }));
      } catch (err) {
        console.error('[CoreData] Background sync error:', err);
      }
    })();
    return () => { isMounted = false; };
  }, [activeSpaceId, user]);

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
        setState((current) => ({ ...current, activeProjectId: projectId }));
      },
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
      addTask: (title) => {
        const cleanedTitle = title.trim();
        if (!cleanedTitle) {
          return;
        }

        const fakeId = makeId('task');
        setState((current) => ({
          ...current,
          tasks: [
            {
              id: fakeId,
              title: cleanedTitle,
              projectId: current.activeProjectId,
              energy: 'medium',
              priority: 'medium',
              dueLabel: 'Inbox',
              done: false,
            },
            ...current.tasks,
          ],
        }));

        if (activeSpaceId && user) {
          TaskService.createTask({
            space_id: activeSpaceId,
            created_by: user.id,
            title: cleanedTitle,
            project_id: state.activeProjectId.startsWith('project-') ? null : state.activeProjectId,
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
