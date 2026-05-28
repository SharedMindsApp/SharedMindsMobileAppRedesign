import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Check, List, PenLine, Loader2, Timer, Zap, Leaf, Coffee, Users, UserPlus, Mic, MicOff, User, Calendar, Bell, Plus, Trash2, Clock, Video, VideoOff, Lock, Target, DoorOpen, MessageCircle, Volume2 } from 'lucide-react';
import { usePublicHostingEligibility } from '../../../hooks/usePublicHostingEligibility';
import { useCoreData } from '../../data/CoreDataContext';
import type { CoreTask } from '../../data/CoreDataContext';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { startCommunitySession, createScheduledSession, fetchConflictingSessions } from '../../services/SessionService';
import type { FocusSession } from '../../../lib/sessions/focusTypes';
import { TaskService } from '../../services/TaskService';
import { TaskLoadBadge } from '../../ui/TaskLoadBadge';
import { InputWell } from '../../ui/CorePage';
import { taskUrgency } from '../../../lib/taskUrgency';
import { SESSION_KINDS, type SessionKind } from '../../../lib/sessionMood';
import { MoodPicker } from './MoodPicker';
import { useAuth } from '../../auth/AuthProvider';
import { ConductGateModal } from '../moderation/ConductGateModal';
import { useSessionLimits } from '../../../hooks/useSessionLimits';

type GoalTab = 'pick' | 'type';

/** Preset duration chips — the easy ladder. Custom durations available
 *  via the slider below the chips (for paid / beta users). */
const DURATION_PRESETS: { value: number; label: string; sublabel: string; icon: any }[] = [
  { value: 25,  label: '25 min',  sublabel: 'Pomodoro',   icon: Coffee },
  { value: 50,  label: '50 min',  sublabel: 'Deep work',  icon: Zap    },
  { value: 90,  label: '90 min',  sublabel: 'Flow state', icon: Leaf   },
  { value: 120, label: '2 hours', sublabel: 'Long block', icon: Timer  },
];

const ENERGY_COLORS: Record<CoreTask['energy'], string> = {
  deep: 'bg-red-400',
  medium: 'bg-emerald-400',
  light: 'bg-sky-400',
};

const PROJECT_COLOR_HEX: Record<string, string> = {
  cyan: '#22d3ee',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
};

function projectSwatch(token: string | null): string {
  return PROJECT_COLOR_HEX[token ?? ''] ?? PROJECT_COLOR_HEX.blue;
}

interface Props {
  onClose: () => void;
  initialGoal?: string;
  /** Pre-fills the modal with a future start time. When set, the session is created as `scheduled` instead of `active`. */
  initialScheduledAt?: Date;
  /** Forces the mode picker to Solo and locks it (used by the sidebar Solo button). */
  forceSoloMode?: boolean;
  /** Pre-selects a project to pin the session to. */
  initialProjectId?: string;
  /** Pre-selects duration in minutes. Used by Quick Start templates. */
  initialDuration?: number;
  /** Opens the "Make this smaller" breakdown panel immediately. Used by
   *  the Quick Restart card so returning users land on the friction-
   *  reducing prompt rather than a blank goal field. */
  startWithSmallerHint?: boolean;
  /** Pre-flips "Open to match" on. Used by the new Match-me-now CTA on
   *  home/find-sessions: clicking it opens this modal with the toggle
   *  already on so the user just picks goal + duration + start. Implies
   *  forceSoloMode (open-to-match only makes sense when the host is
   *  starting solo — see open_to_match column comment in migration
   *  20260527000015). */
  startOpenToMatch?: boolean;
}

export function DeclareSessionModal({ onClose, initialGoal, initialScheduledAt, forceSoloMode, initialProjectId, initialDuration, startWithSmallerHint, startOpenToMatch }: Props) {
  const navigate = useNavigate();
  const { state: { tasks, projects, activeProjectId }, addTaskAsync, deleteTaskAsync } = useCoreData();
  const { setActiveSession } = useFocusSession();

  // "when" state — if initialScheduledAt was passed (calendar slot click), pre-fill it.
  // Otherwise default to "now". User can toggle to "schedule" to pick a custom time.
  const [whenMode, setWhenMode] = useState<'now' | 'schedule'>(
    initialScheduledAt ? 'schedule' : 'now'
  );
  // Initialise the datetime-local input to either the passed-in time or +1 hour from now
  const defaultScheduled = initialScheduledAt
    ?? (() => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d; })();
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [scheduledAt, setScheduledAt] = useState<string>(toLocalInput(defaultScheduled));

  const isScheduling = whenMode === 'schedule';
  const resolvedScheduledAt = isScheduling ? new Date(scheduledAt) : null;

  // Default to 'type' when:
  //   • we have an initial goal (caller pre-filled it), OR
  //   • the caller asked for the breakdown helper (Quick Restart), OR
  //   • the user has no open tasks (an empty picker is a dead-end).
  // Otherwise lead with the task picker so users can pull from existing work.
  const hasAnyOpenTasks = tasks.some((t) => !t.done);
  const [tab, setTab] = useState<GoalTab>(
    initialGoal || startWithSmallerHint || !hasAnyOpenTasks ? 'type' : 'pick'
  );
  const [selectedTask, setSelectedTask] = useState<CoreTask | null>(null);
  const [goalText, setGoalText] = useState(initialGoal ?? '');

  // ── "Make this smaller" breakdown helper ────────────────────────────
  // Per the ADHD design principles: when a goal feels too big, offer
  // three forcing-function prompts that bias the user toward the
  // tiniest first step. Not AI — just well-framed questions that
  // reliably unstick people.
  const [showBreakdown, setShowBreakdown] = useState<boolean>(!!startWithSmallerHint);
  // When the user picks a prompt, we mirror it as a placeholder so they
  // can see the framing while they type the smaller version.
  const [breakdownPlaceholder, setBreakdownPlaceholder] = useState<string | null>(null);
  const BREAKDOWN_PROMPTS = [
    { id: 'tiniest', label: "What's the tiniest first step?",          hint: 'e.g. "Open the deck and write the first slide title"' },
    { id: 'tenmin',  label: 'Could it be done in 10–15 minutes?',      hint: 'e.g. "Choose 3 hero images for the homepage"' },
    { id: 'unblock', label: "What's the one thing blocking you?",      hint: 'e.g. "Decide on the colour palette so I can start"' },
  ];
  // Session length in minutes. Free text — bounded by useSessionLimits()
  // below. Default 50 = Pomodoro+ baseline. Capped on submit.
  const limits = useSessionLimits();
  const [duration, setDuration] = useState<number>(() => {
    const requested = initialDuration ?? 50;
    return Math.min(requested, limits.maxMinutes);
  });
  // Visible preset chips — filtered to the user's tier so free users
  // never see 2hr greyed-out (cleaner than disabled chips).
  const visiblePresets = DURATION_PRESETS.filter((p) => p.value <= limits.maxMinutes);
  // Custom = current value isn't on a chip. We only show the slider when
  // the tier allows it.
  const isCustomDuration = !visiblePresets.some((p) => p.value === duration);
  const [sessionMode, setSessionMode] = useState<'group' | 'one_on_one' | 'solo'>(
    forceSoloMode || startOpenToMatch ? 'solo' : 'one_on_one'
  );
  // Solo-only sub-toggles. Mutually exclusive: a user picks one of
  //   • Just me (default, neither toggled)
  //   • Body double (shared silent video room)
  //   • Real world (no screen, mobile chrome, offline-friendly)
  const [bodyDouble, setBodyDouble] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  /** Open-to-match: "I'm starting solo, but if someone wants to drop in
   *  for a body-double, the door's open." See migration 20260527000015. */
  const [openToMatch, setOpenToMatch] = useState<boolean>(!!startOpenToMatch);
  /** Host's vibe — only meaningful when openToMatch is on. Drives intro-
   *  phase length + mic behaviour if a joiner arrives. Default 'brief_hi'
   *  matches the "balanced" middle option most users will want. */
  const [vibe, setVibe] = useState<'silent' | 'brief_hi' | 'chatty'>('brief_hi');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId ?? activeProjectId ?? null
  );
  /** When the user types a free-form goal, optionally also save it as a
   *  real task so it shows up in "From my tasks" next time. Default OFF
   *  — if the user wanted a task, they'd have picked one from the task
   *  tab. The two tabs are intentionally distinct: tasks = tracked work,
   *  typed goal = one-off. Toggle on for goals worth keeping. */
  const [saveAsTask, setSaveAsTask] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** What this session is FOR — drives the mood axis. Defaults to 'do'. */
  const [sessionKind, setSessionKind] = useState<SessionKind>('do');
  /** Optional "before" mood, captured for immediate sessions only (a
   *  scheduled session's start mood is captured when it actually begins). */
  const [startMood, setStartMood] = useState<string | null>(null);

  // ── Conflict detection ─────────────────────────────────────────
  // Checks the proposed time window against the user's existing
  // scheduled/active sessions. Shown as a warning banner — the user
  // can still proceed (some people genuinely want overlapping
  // sessions; this is a hint, not a hard block).
  //
  // Debounced 300ms so typing in the datetime input doesn't fire a
  // query on every keystroke.
  const [conflicts, setConflicts] = useState<FocusSession[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  useEffect(() => {
    // Only check when scheduling — "now" sessions implicitly start at
    // the current minute and conflicts there are rare + handled by
    // the active-session redirect anyway.
    if (!isScheduling || !resolvedScheduledAt) {
      setConflicts([]);
      return;
    }
    if (Number.isNaN(resolvedScheduledAt.getTime())) {
      setConflicts([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setCheckingConflicts(true);
      fetchConflictingSessions({
        start: resolvedScheduledAt,
        durationMinutes: duration,
      })
        .then(setConflicts)
        .catch(() => setConflicts([]))
        .finally(() => setCheckingConflicts(false));
    }, 300);
    return () => window.clearTimeout(handle);
    // resolvedScheduledAt is a fresh Date each render — depend on the
    // underlying string to dedupe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScheduling, scheduledAt, duration]);

  // Public-hosting gate: hosts of 'group' (community-visible) sessions must
  // have attended N qualifying sessions first. The hook returns admin bypass
  // so we don't need to special-case that here.
  const hostingEligibility = usePublicHostingEligibility();
  const [showGateNotice, setShowGateNotice] = useState(false);
  // Pending-start guard for the conduct gate. If the user hasn't accepted
  // the conduct rules yet, clicking Start opens this gate first; on
  // acceptance we re-enter handleStart() to actually create the session.
  const { profile } = useAuth();
  const [showConductGate, setShowConductGate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After a future session is scheduled, show a 2.5s confirmation before closing
  const [scheduledConfirm, setScheduledConfirm] = useState(false);

  // Inline task creation in the "From my tasks" tab
  const [newTaskText, setNewTaskText] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  async function handleAddTask() {
    const title = newTaskText.trim();
    if (!title || savingTask) return;
    setSavingTask(true);
    try {
      await addTaskAsync(title, selectedProjectId);
      setNewTaskText('');
      // Keep focus in the input so users can keep adding tasks quickly
      newTaskInputRef.current?.focus();
    } catch (err) {
      console.warn('[DeclareSessionModal] Add task failed:', err);
    } finally {
      setSavingTask(false);
    }
  }

  const allOpenTasks = tasks.filter((t) => !t.done);

  // Project filter: lets the user narrow the task picker to one project's
  // tasks. Default to the activeProject if any (so "What am I working on?"
  // is one tap), else "All" (no filter).
  // Special value 'unscoped' = tasks not in any project (inbox).
  type ProjectFilterValue = string | 'all' | 'unscoped';
  const [projectFilter, setProjectFilter] = useState<ProjectFilterValue>(
    activeProjectId ?? 'all',
  );

  // Compute which projects actually have open tasks — no point showing
  // a chip for a project with nothing to pick.
  const projectsWithTasks = projects.filter((p) =>
    allOpenTasks.some((t) => t.projectId === p.id),
  );
  const hasUnscopedTasks = allOpenTasks.some((t) => !t.projectId);

  // Apply the project filter. If no projects exist OR the user picked
  // "All", show everything (current behavior).
  const openTasks = (() => {
    if (projectsWithTasks.length === 0) return allOpenTasks;
    if (projectFilter === 'all') return allOpenTasks;
    if (projectFilter === 'unscoped') return allOpenTasks.filter((t) => !t.projectId);
    return allOpenTasks.filter((t) => t.projectId === projectFilter);
  })();

  // Split into "continue" (in-progress from a previous session that wasn't
  // finished) and "all other open" — and pin continue-tasks to the top
  // sorted by most-recent-session first. This is the ADHD-friendly nudge:
  // the picker remembers what you were in the middle of, so you don't have
  // to.
  const continueTasks = openTasks
    .filter((t) =>
      t.lastSessionOutcome === 'partially'
      || t.lastSessionOutcome === 'something_came_up'
      || t.lastSessionOutcome === 'no_answer',
    )
    .sort((a, b) => {
      const aTime = a.lastSessionAt ? new Date(a.lastSessionAt).getTime() : 0;
      const bTime = b.lastSessionAt ? new Date(b.lastSessionAt).getTime() : 0;
      return bTime - aTime;
    });
  const otherTasks = openTasks.filter((t) => !continueTasks.includes(t));

  const resolvedGoal = tab === 'pick' ? (selectedTask?.title ?? '') : goalText.trim();
  const canSubmit = resolvedGoal.length > 0 && !submitting;

  // ── Mini-wizard state ──────────────────────────────────────────
  // Step 1 ("goal") covers task picking / typing + project pin.
  // Step 2 ("settings") covers when, duration, mode, body-double, quiet.
  // Splitting in two reduces cognitive load on the modal — what you'll
  // work on is a separate decision from how the session will run.
  const [wizardStep, setWizardStep] = useState<'goal' | 'settings'>('goal');
  const hasGoal = resolvedGoal.length > 0;

  async function handleStart() {
    if (!canSubmit) return;
    // Public-hosting gate: block scheduled-session submission for ineligible
    // users and surface the explainer instead of a raw RLS error. Live
    // sessions of any mode are always allowed.
    if (isScheduling && !hostingEligibility.eligible && !hostingEligibility.loading) {
      setShowGateNotice(true);
      setError('Publishing to the community calendar unlocks after a few attended sessions. You can still Start now.');
      return;
    }
    // Conduct gate: block the first session until the user has explicitly
    // accepted the community ground rules. The modal calls back into
    // handleStart() on accept (the profile column will be set by then so
    // we skip this branch). No-op for repeat sessions.
    if (!profile?.conduct_accepted_at) {
      setShowConductGate(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Resolve task id: either a pre-existing task the user picked, OR a
      // brand-new task we create on the fly (when "Save as task" is on).
      let resolvedTaskId: string | undefined;
      if (tab === 'pick' && selectedTask) {
        resolvedTaskId = selectedTask.id;
      } else if (tab === 'type' && saveAsTask && goalText.trim()) {
        try {
          // Dedupe by title: if the user already has an open task with this
          // exact title (case-insensitive), reuse it instead of creating a
          // duplicate. Without this, declaring "Write blog post" every day
          // would create N copies of the same task in their inbox.
          const normalized = goalText.trim().toLowerCase();
          const existing = openTasks.find(
            (t) => t.title.trim().toLowerCase() === normalized,
          );
          if (existing) {
            resolvedTaskId = existing.id;
          } else {
            resolvedTaskId = await addTaskAsync(goalText.trim(), selectedProjectId);
          }
        } catch (taskErr) {
          // Don't block session start if task save fails — log + continue
          console.warn('[DeclareSessionModal] Save-as-task failed:', taskErr);
        }
      }

      if (isScheduling && resolvedScheduledAt) {
        // Future slot → create scheduled session, show reminder confirmation then close
        await createScheduledSession({
          title: resolvedGoal,
          scheduledAt: resolvedScheduledAt,
          durationMinutes: Math.min(duration, limits.maxMinutes),
          projectId: selectedProjectId ?? undefined,
          sessionKind,
        });
        setScheduledConfirm(true);
        setTimeout(onClose, 2500);
        return;
      }
      const session = await startCommunitySession({
        goalText: resolvedGoal,
        taskId: resolvedTaskId,
        projectId: selectedProjectId ?? undefined,
        durationMinutes: Math.min(duration, limits.maxMinutes),
        sessionMode,
        // Solo has no audio room — quiet mode is meaningless there
        quietMode: sessionMode === 'solo' ? false : quietMode,
        bodyDouble: sessionMode === 'solo' && !isOffline ? bodyDouble : false,
        isOffline: sessionMode === 'solo' ? isOffline : false,
        // Open-to-match is solo-only (service layer enforces too). Offline
        // sessions don't accept joiners because there's no screen to share.
        openToMatch: sessionMode === 'solo' && !isOffline && openToMatch,
        vibe: openToMatch ? vibe : undefined,
        sessionKind,
        startMood,
      });
      // Bump the linked task to 'active' + increment sessions_count.
      // Fire-and-forget — the DB write isn't worth blocking navigation on.
      if (resolvedTaskId) {
        TaskService.markTaskStartedForSession(resolvedTaskId).catch(() => { /* non-fatal */ });
      }
      setActiveSession(session);
      onClose();
      // Pass the session object in router state so ActiveSessionPage has it
      // immediately on first render — the context update may flush async in
      // React 18 batching, causing a blank-loading-state flash otherwise.
      navigate(`/session/${session.id}`, { state: { session } });
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  // Format the scheduled time for the header subtitle
  const scheduledLabel = resolvedScheduledAt
    ? resolvedScheduledAt.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // Track desktop vs mobile so we can use inline styles for centering —
  // Tailwind responsive `sm:bottom-auto` was failing to unset `bottom-0`
  // reliably, leaving the modal stretched between top:50% and bottom:0.
  // Inline styles bypass that entirely.
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Render into document.body via portal — escapes any ancestor with a
  // transform/filter/contain style that would otherwise turn our `position:
  // fixed` into `position: absolute` relative to that ancestor (which is why
  // `top: 50%` was landing well below viewport center — the Layout or one of
  // the wrapping providers creates a containing block).
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40"
        onClick={onClose}
      />
      {/* Modal — explicit inline positioning, no Tailwind responsive
          shenanigans. Desktop: centered. Mobile: anchored to bottom. */}
      <div
        className="fixed z-[101] w-full sm:w-auto sm:max-w-xl bg-surface flex flex-col max-h-[88vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={
          isDesktop
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            : { bottom: 0, left: 0, right: 0 }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-surface-container-high" />
        </div>

        {/* ── Scheduled confirmation overlay ───────────────── */}
        {scheduledConfirm && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-surface rounded-3xl px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Bell size={28} className="text-emerald-600" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xl font-extrabold stitch-text-primary mb-1">Session scheduled!</p>
              <p className="text-sm stitch-text-secondary leading-relaxed">
                We'll remind you <span className="font-bold text-primary">15 minutes before</span> it starts
                — via in-app notification and email.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs stitch-text-secondary">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Closing in a moment…
            </div>
          </div>
        )}

        {/* ── Header ───────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl stitch-card--accent flex items-center justify-center shrink-0">
              <Timer size={18} className="text-white" />
            </div>
            <div>
              <h2 className="stitch-headline text-base font-extrabold leading-tight">
                {isScheduling ? 'Schedule a session' : forceSoloMode ? 'Solo focus session' : 'Declare your focus'}
              </h2>
              <p className="text-xs stitch-text-secondary">
                {scheduledLabel ?? "What's the one thing you'll finish?"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors shrink-0"
          >
            <X size={15} className="stitch-text-secondary" />
          </button>
        </div>

        {/* ── Step indicator ───────────────────────────────── */}
        <div className="shrink-0 px-5 pb-2 flex items-center gap-1.5">
          <div className={`h-1 flex-1 rounded-full transition-all ${
            wizardStep === 'goal' ? 'bg-primary' : 'bg-primary/30'
          }`} />
          <div className={`h-1 flex-1 rounded-full transition-all ${
            wizardStep === 'settings' ? 'bg-primary' : 'bg-primary/15'
          }`} />
          <span className="text-[10px] font-bold stitch-text-secondary uppercase tracking-widest ml-1 tabular-nums">
            {wizardStep === 'goal' ? '1 / 2' : '2 / 2'}
          </span>
        </div>

        {/* Open-to-match banner — when launched from "Match me now", make it
            obvious the door's open + point to the vibe control on step 2. */}
        {startOpenToMatch && openToMatch && (
          <div className="shrink-0 mx-5 mb-2 flex items-center gap-2 rounded-xl bg-amber-50 ring-1 ring-amber-200/70 px-3 py-2">
            <DoorOpen size={15} className="text-amber-600 shrink-0" />
            <p className="text-[11px] font-semibold text-amber-800 leading-snug">
              Your door's open — anyone can drop in to work alongside you.
              {wizardStep === 'goal' ? ' Set your vibe on the next step.' : ' Pick your vibe below.'}
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            STEP 1 — Goal: pick a task / type one + pin to project
            ═══════════════════════════════════════════════════════ */}
        {wizardStep === 'goal' && (<>

        {/* ── Goal source tabs ─────────────────────────────── */}
        <div className="shrink-0 px-5 pb-3">
          <div className="flex p-1 bg-surface-container-low rounded-full gap-1">
            {([
              { id: 'pick', label: 'From my tasks', icon: List },
              { id: 'type', label: 'Type a goal', icon: PenLine },
            ] as { id: GoalTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id as GoalTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                  tab === id
                    ? 'bg-white shadow-sm text-primary'
                    : 'stitch-text-secondary hover:stitch-text-primary'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Task list / free text (fills remaining space) ── */}
        <div className="flex-1 overflow-y-auto px-5 min-h-0">
          {tab === 'pick' ? (
            <div className="space-y-1.5 pb-2">
              {/* ── Project filter chips (only if user has projects) ── */}
              {projectsWithTasks.length > 0 && (
                <div className="flex flex-wrap gap-1 pb-1 sticky top-0 bg-white z-10 -mx-5 px-5 pt-1">
                  <ProjectChip
                    label="All"
                    selected={projectFilter === 'all'}
                    onClick={() => setProjectFilter('all')}
                  />
                  {projectsWithTasks.map((p) => (
                    <ProjectChip
                      key={p.id}
                      label={p.name}
                      color={p.color}
                      selected={projectFilter === p.id}
                      onClick={() => setProjectFilter(p.id)}
                    />
                  ))}
                  {hasUnscopedTasks && (
                    <ProjectChip
                      label="Inbox"
                      selected={projectFilter === 'unscoped'}
                      onClick={() => setProjectFilter('unscoped')}
                    />
                  )}
                </div>
              )}

              {/* ── Continue section: tasks you've started but not finished ── */}
              {continueTasks.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 pt-1 pb-1">
                    <Clock size={9} className="text-amber-600" />
                    <p className="text-[9px] font-bold text-amber-700 tracking-widest uppercase">
                      Continue where you left off
                    </p>
                  </div>
                  {continueTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isSelected={selectedTask?.id === task.id}
                      isContinue
                      onSelect={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                      onDelete={() => {
                        if (selectedTask?.id === task.id) setSelectedTask(null);
                        deleteTaskAsync(task.id).catch(() => {});
                      }}
                    />
                  ))}
                  {otherTasks.length > 0 && (
                    <div className="pt-2 pb-1">
                      <p className="text-[9px] font-bold stitch-text-secondary tracking-widest uppercase">
                        All tasks
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── Everything else ── */}
              {otherTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isSelected={selectedTask?.id === task.id}
                  onSelect={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                  onDelete={() => {
                    if (selectedTask?.id === task.id) setSelectedTask(null);
                    deleteTaskAsync(task.id).catch(() => {});
                  }}
                />
              ))}

              {/* ── Inline task creation row ── */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                newTaskText ? 'bg-surface-container ring-1 ring-primary/20' : 'bg-surface-container-low'
              }`}>
                <Plus size={14} className="stitch-text-secondary shrink-0" />
                <input
                  ref={newTaskInputRef}
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); }
                    if (e.key === 'Escape') setNewTaskText('');
                  }}
                  placeholder={openTasks.length === 0 ? 'Add your first task…' : 'Add another task…'}
                  className="flex-1 bg-transparent text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none min-w-0"
                />
                {newTaskText.trim() && (
                  <button
                    type="button"
                    onClick={handleAddTask}
                    disabled={savingTask}
                    className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
                  >
                    {savingTask
                      ? <Loader2 size={11} className="text-white animate-spin" />
                      : <Check size={11} className="text-white" strokeWidth={3} />
                    }
                  </button>
                )}
              </div>

              {openTasks.length === 0 && !newTaskText && (
                <p className="text-center text-xs stitch-text-secondary pt-1 pb-2">
                  Type a task above, or switch to "Type a goal" for a one-off.
                </p>
              )}
            </div>
          ) : (
            <div className="pb-2">
              <InputWell
                value={goalText}
                onChange={setGoalText}
                onSubmit={handleStart}
                placeholder={breakdownPlaceholder ?? 'e.g. Finish the first draft of the pitch deck'}
              />
              <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
                <p className="text-xs stitch-text-secondary">
                  Be specific — you'll report back when you're done.
                </p>
                <button
                  type="button"
                  onClick={() => setShowBreakdown((v) => !v)}
                  className="text-[11px] font-bold uppercase tracking-wider text-violet-600 hover:text-violet-700 whitespace-nowrap shrink-0"
                  title="Help break this down into something smaller"
                >
                  {showBreakdown ? '✕ Hide' : '↓ Make this smaller'}
                </button>
              </div>

              {/* Breakdown panel — three forcing-function prompts that
                  reliably reduce task-initiation friction for ADHD
                  users. Click a prompt → its example becomes the
                  placeholder so the user sees framing while typing the
                  smaller version. */}
              {showBreakdown && (
                <div className="mt-3 rounded-2xl bg-violet-50 ring-1 ring-violet-100 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700">
                    Pick the angle that helps
                  </p>
                  {BREAKDOWN_PROMPTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setBreakdownPlaceholder(p.hint);
                        // Don't auto-clear goalText — preserve what they typed
                        // so they can edit it down rather than rewriting.
                      }}
                      className="w-full text-left rounded-xl bg-white hover:bg-violet-100/40 ring-1 ring-violet-100 px-3 py-2 transition-colors"
                    >
                      <p className="text-xs font-extrabold text-violet-900 leading-tight">
                        {p.label}
                      </p>
                      <p className="text-[10px] text-violet-700/70 mt-0.5 leading-snug">
                        {p.hint}
                      </p>
                    </button>
                  ))}
                  <p className="text-[10px] text-violet-700/60 leading-snug pt-1">
                    Tip: a session that finishes a tiny thing beats one that almost-but-not-quite finishes a big thing.
                  </p>
                </div>
              )}

              {/* Save-as-task toggle — only shown when there's something to save */}
              {goalText.trim() && (
                <button
                  type="button"
                  onClick={() => setSaveAsTask((v) => !v)}
                  className={`mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                    saveAsTask
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200/60 dark:ring-emerald-800/40'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                    saveAsTask ? 'bg-emerald-500 text-white' : 'bg-white ring-1 ring-surface-container-high'
                  }`}>
                    {saveAsTask && <Check size={11} strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold stitch-text-primary leading-tight">
                      Also save as a task
                    </p>
                    <p className="text-[11px] stitch-text-secondary leading-tight mt-0.5">
                      {saveAsTask
                        ? selectedProjectId
                          ? <>Will save to <span className="font-semibold">{projects.find((p) => p.id === selectedProjectId)?.name ?? 'project'}</span> · appears in "From my tasks" next time</>
                          : <>Will save to <span className="font-semibold">Inbox</span> · appears in "From my tasks" next time</>
                        : 'One-off goal — stays on this session only'}
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Project pin (optional) ───────────────────────── */}
        {projects.length > 0 && (
          <div className="shrink-0 px-5 pt-3">
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
              Pin to project <span className="opacity-60 normal-case font-medium">(optional)</span>
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  selectedProjectId === null
                    ? 'stitch-btn--primary text-white shadow-sm'
                    : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
                }`}
              >
                None
              </button>
              {projects.map((p) => {
                const isSel = p.id === selectedProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                      isSel
                        ? 'stitch-btn--primary text-white shadow-sm'
                        : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: projectSwatch(p.color) }}
                    />
                    <span className="truncate max-w-[140px]">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── What's this session for? — drives the mood axis ── */}
        <div className="shrink-0 px-5 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-2">
            What's this for?
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {SESSION_KINDS.map((k) => {
              const active = sessionKind === k.kind;
              return (
                <button
                  key={k.kind}
                  type="button"
                  // Changing kind switches the mood axis, so clear any prior pick.
                  onClick={() => { setSessionKind(k.kind); setStartMood(null); }}
                  title={k.hint}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] font-bold transition-all ${
                    active ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                  }`}
                >
                  <span className="text-base leading-none">{k.emoji}</span>
                  {k.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Step 1 footer: Next button ─────────────────────── */}
        <div className="shrink-0 px-5 pt-3 pb-6">
          <button
            type="button"
            onClick={() => setWizardStep('settings')}
            disabled={!hasGoal}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold transition-all duration-200 ${
              hasGoal
                ? 'stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98]'
                : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
            }`}
          >
            {hasGoal ? 'Next: session settings →' : 'Pick a goal to continue'}
          </button>
        </div>

        </>)}

        {/* ═══════════════════════════════════════════════════════
            STEP 2 — Settings: when, duration, mode, quiet
            ═══════════════════════════════════════════════════════ */}
        {wizardStep === 'settings' && (<>

        {/* ── Selected-goal recap (shown atop step 2) ───────── */}
        <div className="shrink-0 px-5 pb-2">
          <div className="rounded-2xl bg-primary/5 ring-1 ring-primary/15 px-3 py-2 flex items-center gap-2">
            <Target size={13} className="text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-widest mb-0.5">Focus</p>
              <p className="text-sm font-semibold stitch-text-primary truncate">{resolvedGoal}</p>
            </div>
            <button
              type="button"
              onClick={() => setWizardStep('goal')}
              className="shrink-0 text-[10px] font-bold text-primary hover:opacity-70 transition-opacity uppercase tracking-wider"
            >
              Edit
            </button>
          </div>
        </div>

        {/* ── When picker ──────────────────────────────────── */}
        <div className="shrink-0 px-5 pt-3">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
            When
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWhenMode('now')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                whenMode === 'now'
                  ? 'stitch-btn--primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
              }`}
            >
              <Zap size={13} className={whenMode === 'now' ? 'text-white/80' : 'stitch-text-secondary'} />
              Start now
            </button>
            <button
              type="button"
              onClick={() => {
                // Scheduled sessions publish to the community calendar, so
                // they're gated. Ineligible users get the explainer instead
                // of switching the toggle — they can still Start now.
                if (!hostingEligibility.eligible && !hostingEligibility.loading) {
                  setShowGateNotice(true);
                  return;
                }
                setWhenMode('schedule');
                setShowGateNotice(false);
              }}
              className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                whenMode === 'schedule'
                  ? 'stitch-btn--primary text-white shadow-md shadow-primary/20'
                  : !hostingEligibility.eligible && !hostingEligibility.loading
                    ? 'bg-surface-container-low/60 stitch-text-secondary hover:bg-surface-container-low'
                    : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
              }`}
              aria-label={!hostingEligibility.eligible && !hostingEligibility.loading ? 'Schedule (locked — attend more sessions to unlock)' : 'Schedule a session'}
            >
              {!hostingEligibility.eligible && !hostingEligibility.loading && whenMode !== 'schedule' && (
                <Lock size={11} className="stitch-text-secondary" />
              )}
              {(hostingEligibility.eligible || hostingEligibility.loading || whenMode === 'schedule') && (
                <Clock size={13} className={whenMode === 'schedule' ? 'text-white/80' : 'stitch-text-secondary'} />
              )}
              Schedule
            </button>
          </div>
          {whenMode === 'schedule' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={toLocalInput(new Date())}
              className="mt-2 w-full px-4 py-2.5 rounded-xl bg-surface-container-low stitch-text-primary text-sm outline-none focus:ring-2 ring-primary/25 transition-all"
            />
          )}

          {/* Conflict warning — non-blocking hint when the proposed
              window overlaps an existing session. User can proceed
              anyway (the create button stays enabled) but knows up-
              front they'll be double-booked. */}
          {whenMode === 'schedule' && conflicts.length > 0 && (
            <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs">
              <p className="font-extrabold text-amber-900 mb-1">
                ⚠ You already have {conflicts.length === 1 ? 'a session' : `${conflicts.length} sessions`} at this time
              </p>
              <ul className="space-y-1 text-amber-800">
                {conflicts.slice(0, 3).map((c) => {
                  const start = new Date(c.scheduled_at ?? c.start_time);
                  const startStr = start.toLocaleString('en-GB', {
                    weekday: 'short', hour: '2-digit', minute: '2-digit',
                  });
                  const title = c.session_title ?? c.session_goal ?? 'Untitled session';
                  return (
                    <li key={c.id} className="leading-tight">
                      <span className="font-semibold">{startStr}</span>
                      <span className="opacity-70"> · {c.intended_duration_minutes}m · </span>
                      <span className="truncate">{title}</span>
                    </li>
                  );
                })}
                {conflicts.length > 3 && (
                  <li className="opacity-60">+{conflicts.length - 3} more…</li>
                )}
              </ul>
              <p className="text-[10px] text-amber-700/80 mt-1.5 leading-snug">
                You can still proceed — this is a heads-up, not a block.
              </p>
            </div>
          )}
          {whenMode === 'schedule' && checkingConflicts && conflicts.length === 0 && (
            <p className="mt-2 text-[10px] stitch-text-secondary italic">Checking calendar…</p>
          )}

          {/* ── Scheduled-hosting gate notice ──────────────────────
              Inspired by Flown's two-card moment: explain *why* the user
              can't publish to the community calendar yet, and surface
              the escape valve (Start now) in the same breath. */}
          {showGateNotice && !hostingEligibility.eligible && (
            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-amber-400/15 grid place-items-center flex-shrink-0">
                  <Lock size={13} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold stitch-text-primary leading-tight">
                    Scheduling unlocks at {hostingEligibility.threshold} sessions attended
                  </p>
                  <p className="text-[11px] stitch-text-secondary leading-snug mt-0.5">
                    You've attended <span className="font-bold tabular-nums">{hostingEligibility.attendedCount}</span> so far. We keep the public calendar curated by letting members publish sessions once they've experienced the format a few times. You can still Start now any time — solo, 1-on-1, or group.
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-surface-container-low overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (hostingEligibility.attendedCount / hostingEligibility.threshold) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWhenMode('now');
                    setShowGateNotice(false);
                  }}
                  className="flex-1 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wide stitch-btn--primary text-white"
                >
                  Start now instead
                </button>
                <button
                  type="button"
                  onClick={() => setShowGateNotice(false)}
                  className="px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide stitch-text-secondary hover:bg-surface-container-low"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Duration picker ──────────────────────────────── */}
        <div className="shrink-0 px-5 pt-3">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
              Session length
            </p>
            {/* Live readout — useful when the slider is in play */}
            <p className="text-[11px] font-bold stitch-text-secondary tabular-nums">
              {duration < 60 ? `${duration} min` : `${Math.floor(duration / 60)}h ${duration % 60 ? `${duration % 60}m` : ''}`.trim()}
            </p>
          </div>
          <div className="flex gap-2">
            {visiblePresets.map(({ value, label, sublabel, icon: Icon }) => {
              const isActive = duration === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDuration(value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'stitch-btn--primary text-white shadow-md shadow-primary/20'
                      : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.97]'
                  }`}
                >
                  <Icon size={13} className={isActive ? 'text-white/80' : 'stitch-text-secondary'} />
                  <div className="text-left">
                    <p className="text-sm font-extrabold leading-none">{label}</p>
                    <p className={`text-[10px] leading-none mt-0.5 ${isActive ? 'text-white/70' : 'stitch-text-secondary'}`}>
                      {sublabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom-duration slider — only shown when the tier allows it.
              Lets deep workers dial in exact lengths (e.g. 75 min, 135 min)
              that don't fit a preset. Capped to the tier's maxMinutes. */}
          {limits.canUseCustomDuration && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
                  Custom
                </span>
                <button
                  type="button"
                  onClick={() => setDuration(50)}
                  className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    isCustomDuration
                      ? 'stitch-text-secondary hover:stitch-text-primary'
                      : 'stitch-text-secondary/40'
                  }`}
                  disabled={!isCustomDuration}
                >
                  ↺ Use preset
                </button>
              </div>
              <input
                type="range"
                min={15}
                max={limits.maxMinutes}
                step={5}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                className="w-full h-1.5 accent-primary"
                aria-label={`Session length: ${duration} minutes`}
              />
              <div className="flex justify-between text-[9px] stitch-text-secondary/60 mt-0.5 tabular-nums">
                <span>15m</span>
                <span>{Math.floor(limits.maxMinutes / 60)}h</span>
              </div>
            </div>
          )}

          {/* Free-tier upgrade nudge — only shown once paywall is live and
              the user hits the cap. During beta this is silent. */}
          {!limits.isPaid && limits.tier === 'free' && (
            <p className="mt-2 text-[10px] stitch-text-secondary/70 leading-snug">
              Free plan caps sessions at {limits.maxMinutes} min. Upgrade for longer focus blocks.
            </p>
          )}
        </div>

        {/* ── Start-of-session mood check-in (immediate sessions only) ── */}
        {!isScheduling && (
          <div className="shrink-0 px-5 pt-3">
            <MoodPicker kind={sessionKind} value={startMood} onChange={setStartMood} when="before" />
          </div>
        )}

        {/* ── Session mode (hidden when locked to Solo or when scheduling) ── */}
        {!forceSoloMode && !isScheduling && (
        <div className="shrink-0 px-5 pt-3">
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
            Mode
          </p>
          <div className="flex gap-2">
            {([
              { id: 'solo',       label: 'Solo',   sublabel: 'Just you',         icon: User },
              { id: 'one_on_one', label: '1-on-1', sublabel: 'One partner',      icon: UserPlus },
              { id: 'group',      label: 'Group',  sublabel: 'Anyone can join',  icon: Users },
            ] as const).map(({ id, label, sublabel, icon: Icon }) => {
              const isActive = sessionMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSessionMode(id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'stitch-btn--primary text-white shadow-md shadow-primary/20'
                      : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.97]'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white/90' : 'stitch-text-secondary'} />
                  <div className="text-center">
                    <p className="text-sm font-extrabold leading-none">{label}</p>
                    <p className={`text-[10px] leading-none mt-0.5 ${isActive ? 'text-white/70' : 'stitch-text-secondary'}`}>
                      {sublabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* ── Solo sub-toggles: Body double + Real world ──────────
            Mutually exclusive. Picking one forces the other off. */}
        {sessionMode === 'solo' && (
          <div className="shrink-0 px-5 pt-3 space-y-2">
            <button
              type="button"
              onClick={() => {
                setBodyDouble((v) => !v);
                if (!bodyDouble) setIsOffline(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                bodyDouble
                  ? 'bg-violet-500/10 ring-2 ring-violet-400/30'
                  : 'bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                bodyDouble ? 'bg-violet-500 text-white' : 'bg-white stitch-text-secondary'
              }`}>
                {bodyDouble ? <Video size={14} /> : <VideoOff size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold stitch-text-primary leading-tight">
                  Body double · silent video {bodyDouble && <span className="text-violet-600">· on</span>}
                </p>
                <p className="text-[11px] stitch-text-secondary leading-tight mt-0.5">
                  {bodyDouble
                    ? 'Camera required. See other solo folks silently. Mic locked off.'
                    : 'Optional: feel less alone with silent video. Camera required.'}
                </p>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                bodyDouble ? 'bg-violet-500' : 'bg-surface-container'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  bodyDouble ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </button>

            {/* Real-world / offline session — for tasks away from the
                screen (allotment, exercise, household, parenting prep).
                Switches the active session UI to a phone-optimised chrome
                and fires a Web Notification when the timer completes. */}
            <button
              type="button"
              onClick={() => {
                setIsOffline((v) => !v);
                if (!isOffline) setBodyDouble(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                isOffline
                  ? 'bg-emerald-500/10 ring-2 ring-emerald-400/30'
                  : 'bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isOffline ? 'bg-emerald-500 text-white' : 'bg-white stitch-text-secondary'
              }`}>
                <Leaf size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold stitch-text-primary leading-tight">
                  Real world · away from screen {isOffline && <span className="text-emerald-600">· on</span>}
                </p>
                <p className="text-[11px] stitch-text-secondary leading-tight mt-0.5">
                  {isOffline
                    ? "We'll ping your phone when the timer's up. Walk away — your session keeps running."
                    : 'For gardening, exercise, errands — anything that isn\'t at your screen.'}
                </p>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                isOffline ? 'bg-emerald-500' : 'bg-surface-container'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  isOffline ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </button>

            {/* ── Open to match: solo session that anyone can drop into ──
                Mutually exclusive with offline mode (no screen = no room
                for a joiner). Hidden when isOffline is on. When toggled,
                expands a 3-way vibe picker so the host signals their
                social preference upfront. See migration 20260527000015. */}
            {!isOffline && (<>
              <button
                type="button"
                onClick={() => setOpenToMatch((v) => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                  openToMatch
                    ? 'bg-amber-500/10 ring-2 ring-amber-400/30'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  openToMatch ? 'bg-amber-500 text-white' : 'bg-white stitch-text-secondary'
                }`}>
                  <DoorOpen size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold stitch-text-primary leading-tight">
                    Open the door {openToMatch && <span className="text-amber-600">· on</span>}
                  </p>
                  <p className="text-[11px] stitch-text-secondary leading-tight mt-0.5">
                    {openToMatch
                      ? 'Anyone online can drop in to body-double. You start working either way.'
                      : 'Solo by default. Open it to let someone drop in mid-session.'}
                  </p>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                  openToMatch ? 'bg-amber-500' : 'bg-surface-container'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    openToMatch ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </button>

              {/* Vibe picker — only relevant when the door is open.
                  Three options drive intro-phase + auto-mute behavior
                  if a joiner arrives. Default brief_hi covers most cases.  */}
              {openToMatch && (
                <div className="pl-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary px-2 pt-1 pb-1.5">
                    Vibe when they arrive
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { id: 'silent',   label: 'Silent',    icon: Volume2,       sub: 'No talk' },
                      { id: 'brief_hi', label: 'Brief hi',  icon: MessageCircle, sub: '2 min hi' },
                      { id: 'chatty',   label: 'Chatty',    icon: Users,         sub: '5 min hi' },
                    ] as { id: 'silent' | 'brief_hi' | 'chatty'; label: string; icon: any; sub: string }[]).map(({ id, label, icon: Icon, sub }) => {
                      const isActive = vibe === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setVibe(id)}
                          className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all text-center ${
                            isActive
                              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
                              : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.97]'
                          }`}
                        >
                          <Icon size={13} className={isActive ? 'text-white/90' : 'stitch-text-secondary'} />
                          <p className="text-[11px] font-extrabold leading-none">{label}</p>
                          <p className={`text-[9px] leading-none ${isActive ? 'text-white/70' : 'stitch-text-secondary'}`}>{sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>)}
          </div>
        )}

        {/* ── Quiet mode toggle (hidden for Solo — no audio room) ── */}
        {sessionMode !== 'solo' && (
          <div className="shrink-0 px-5 pt-3">
            <button
              type="button"
              onClick={() => setQuietMode((v) => !v)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                quietMode
                  ? 'bg-primary/8 ring-2 ring-primary/25'
                  : 'bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                quietMode ? 'bg-primary text-white' : 'bg-white stitch-text-secondary'
              }`}>
                {quietMode ? <MicOff size={14} /> : <Mic size={14} />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold stitch-text-primary leading-tight">
                  Quiet mode {quietMode && <span className="text-primary">· on</span>}
                </p>
                <p className="text-[11px] stitch-text-secondary leading-tight mt-0.5">
                  Start with mic muted — presence only, chat for talking
                </p>
              </div>
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                quietMode ? 'bg-primary' : 'bg-surface-container'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  quietMode ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </button>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <p className="shrink-0 mx-5 mt-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
        )}

        {/* ── Step 2 footer: Back + Start ─────────────────────── */}
        <div className="shrink-0 px-5 pt-3 pb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setWizardStep('goal')}
            disabled={submitting}
            className="shrink-0 px-4 py-3.5 rounded-2xl text-sm font-bold bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-50"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={!canSubmit}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold transition-all duration-200 ${
              canSubmit
                ? 'stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]'
                : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {isScheduling ? <Calendar size={18} /> : <Timer size={18} />}
                {!canSubmit
                  ? 'Pick a goal first'
                  : isScheduling
                  ? `Schedule for ${scheduledLabel ?? `${duration} min`}`
                  : `Start ${duration}-min session`}
              </>
            )}
          </button>
        </div>

        </>)}

      </div>

      {/* Blocking conduct gate for first-session users. Rendered alongside
          the declare modal in the portal so it appears above everything. */}
      {showConductGate && (
        <ConductGateModal
          onAccepted={() => {
            setShowConductGate(false);
            // Re-trigger start now that the profile column is set. We let
            // React flush state first by deferring the call to the next tick.
            setTimeout(() => { void handleStart(); }, 0);
          }}
          onCancel={() => setShowConductGate(false)}
        />
      )}
    </>,
    document.body
  );
}

// ── TaskRow ────────────────────────────────────────────────────────
// Renders a single task in the picker. Variants:
//   - Default: plain row with hover-reveal delete
//   - isContinue: amber-tinted with "continue" + session count chip
// Both show the "intention" chip when linked to a weekly intention.
function TaskRow({
  task, isSelected, isContinue = false, onSelect, onDelete,
}: {
  task: CoreTask;
  isSelected: boolean;
  isContinue?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const sessions = task.sessionsCount ?? 0;

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 pr-10 ${
          isSelected
            ? 'bg-primary/8 ring-2 ring-primary/25 shadow-sm'
            : isContinue
            ? 'bg-amber-50/60 hover:bg-amber-50 ring-1 ring-amber-200/40 active:scale-[0.99]'
            : 'bg-surface-container-low hover:bg-surface-container active:scale-[0.99]'
        }`}
      >
        <div className={`w-1 self-stretch rounded-full shrink-0 ${ENERGY_COLORS[task.energy]}`} />
        <div className="flex-1 min-w-0">
          <span className="block text-sm font-medium stitch-text-primary leading-snug truncate">
            {task.title}
          </span>
          {/* Chip row: energy level + urgency + intention badge + session count */}
          {(() => {
            const u = taskUrgency(task);
            const showUrgency = u.kind === 'overdue' || u.kind === 'due-today' || u.kind === 'due-soon' || u.kind === 'today';
            return (
            <div className="flex items-center flex-wrap gap-1 mt-1">
              <TaskLoadBadge load={task.energy} />
              {showUrgency && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${u.tone}`}>
                  {u.label}
                </span>
              )}
              {task.weeklyIntentionId && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px] font-bold">
                  ✦ Intention
                </span>
              )}
              {sessions > 0 && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  isContinue
                    ? 'bg-amber-200/50 text-amber-800'
                    : 'bg-surface-container stitch-text-secondary'
                }`}>
                  {sessions} session{sessions !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            );
          })()}
        </div>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
          isSelected ? 'bg-primary' : 'border-2 border-surface-container'
        }`}>
          {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
        </div>
      </button>
      {/* Delete on hover */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Remove task"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-surface-container hover:bg-red-100 hover:text-red-500 stitch-text-secondary"
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ── ProjectChip ──────────────────────────────────────────────────────
// Filter pill at the top of the "From my tasks" picker. Shown only when
// the user has 1+ projects with open tasks. Lets them narrow the picker
// to one project (or 'all' / 'unscoped inbox').
const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDotColor(token: string | null): string {
  if (!token) return '#94a3b8';
  return PROJECT_HEX[token] ?? token; // accept either a token key or a raw hex
}

function ProjectChip({
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
        selected
          ? 'bg-primary text-white shadow-sm'
          : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
      }`}
    >
      {color && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: projectDotColor(color) }}
        />
      )}
      <span className="truncate max-w-[120px]">{label}</span>
    </button>
  );
}
