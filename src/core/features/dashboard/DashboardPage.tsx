/**
 * DashboardPage — the home page.
 *
 * Two distinct layouts:
 *
 *   ──── Day-0 (zero sessions ever) ────────────────────────────────
 *   1. Greeting
 *   2. DayZeroWelcome hero
 *   3. TodayPlannerCard (hour grid + quick-add + intention)
 *   4. WeeklyIntentionsCard (weekly priorities + microtasks)
 *   5. CommunityPulseCard → UpcomingStrip → Feed → Finishes → Checklist
 *
 *   ──── Returning (≥1 sessions) ───────────────────────────────────
 *   1. Greeting + momentum chips
 *   2. SmartNextCard
 *   3. TodayPlannerCard
 *   4. WeeklyIntentionsCard
 *   5. CommunityPulseCard → UpcomingStrip → Feed → Finishes → Projects →
 *      Checklist → WeekStrip → Recent finishes
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, Flame, CheckCircle2, Plus, Target, Users, Flag, Layers,
} from 'lucide-react';
import { ProjectService, type ProjectStats } from '../../services/ProjectService';
import { EMPTY_PROJECT_STATS, deriveProjectProgress, projectColorMeta } from '../projects/ProjectsPage';
import { useAuth } from '../../auth/AuthProvider';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useCoreData } from '../../data/CoreDataContext';
import { useCommunitySessionsSubscription } from '../sessions/useCommunitySessionsSubscription';
import { DeclareSessionModal } from '../sessions/DeclareSessionModal';
import { ScheduleSessionModal } from '../sessions/ScheduleSessionModal';
import { fetchHomeDashboard } from '../../services/HomeDashboardService';
// fetchRecentShippedSessions + fetchUpcomingScheduledSessions are no
// longer called from this file — both are now bundled into the
// fetchHomeDashboard RPC. The types are still imported below.
import { SurfaceCard } from '../../ui/CorePage';
import { HomeHero } from './HomeHero';
import { QuickTimerButton } from './QuickTimerButton';
import { SmartNextCard } from './SmartNextCard';
import { CommunityPulseCard } from './CommunityPulseCard';
import { DayZeroWelcome } from './DayZeroWelcome';
import { TodayPlannerCard } from './TodayPlannerCard';
import { UpcomingSessionCountdown } from './UpcomingSessionCountdown';
import { UpcomingPublicSessionsStrip } from './UpcomingPublicSessionsStrip';
import { RecentFinishesCarousel } from './RecentFinishesCarousel'; // legacy, no longer used in layout
import { ShippedFeedStrip } from './ShippedFeedStrip';
import { DashboardTabs } from './DashboardTabs';
import { StatsTab } from './StatsTab';
import { WeeklyIntentionsCard } from './WeeklyIntentionsCard';
import { PlanTasksCard } from './PlanTasksCard';
import { PulsePeopleTab } from './PulsePeopleTab';
// OnboardingChecklist + ProfileCompletenessCard removed — the wizard now
// handles all setup before the user reaches the home screen.
import { FoundingMemberBadge } from './FoundingMemberBadge';
import { WeeklyReviewPromptCard } from './WeeklyReviewPromptCard';
import { FirstWeekIntentionsCard, useFirstWeekIntentionsEligible } from './FirstWeekIntentionsCard';
import { deriveMomentum, momentumChipClasses } from './momentum';
import { QuickRestartCard } from './QuickRestartCard';
import { CommunityFeedStrip } from './CommunityFeedStrip';
import type { ProfileStats } from '../../services/ProfileService';
import type { ShippedSession, ScheduledSessionWithProfile } from '../../services/SessionService';

// ── Utilities ─────────────────────────────────────────────────────

/** Time-of-day flavour line, used to season the welcome hero. */
function timeOfDayHint(): string {
  const h = new Date().getHours();
  if (h < 11)  return 'Mornings are your best window for deep work. Block it out before the inbox does.';
  if (h < 14)  return 'Midday is perfect for one 25-min focus chunk. Pick the next obvious thing.';
  if (h < 18)  return 'Afternoon slump? A 25-min focus block beats another coffee.';
  if (h < 21)  return 'Evenings are quiet — perfect for a wind-down focus block to close the day.';
  return 'Late session? Pick something small you’ll actually finish.';
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? '1h ago' : `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const WORK_TYPE_LABELS: Record<string, string> = {
  designer: 'Designer', developer: 'Developer', writer: 'Writer / Creator',
  founder: 'Founder', filmmaker: 'Filmmaker / Producer', marketer: 'Marketer',
  consultant: 'Consultant', researcher: 'Researcher', other: 'Creative',
};

const OUTCOME_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  finished: { label: 'Finished', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  partially: { label: 'Partial', bg: 'bg-amber-100', text: 'text-amber-700' },
  something_came_up: { label: 'Interrupted', bg: 'bg-slate-100', text: 'text-slate-500' },
};

// ── Week dots ─────────────────────────────────────────────────────

function WeekStrip({ weekSessions }: { weekSessions: { start_time: string }[] }) {
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date();
  const todayDow = today.getDay();
  const mondayOffset = todayDow === 0 ? 6 : todayDow - 1;

  const activeDayIndices = new Set(
    weekSessions.map((s) => {
      const d = new Date(s.start_time);
      const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
      return mondayOffset - diffDays;
    }).filter((i) => i >= 0 && i <= 6)
  );

  const activeDaysCount = activeDayIndices.size;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">This week</p>
        <span className="text-xs font-bold text-primary">
          {activeDaysCount} day{activeDaysCount !== 1 ? 's' : ''} active
        </span>
      </div>
      <div className="flex items-center justify-between">
        {DAY_LABELS.map((label, i) => {
          const isPast = i <= mondayOffset;
          const isActive = activeDayIndices.has(i);
          const isToday = i === mondayOffset;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-primary shadow-md shadow-primary/30'
                  : isToday
                  ? 'bg-surface-container ring-2 ring-primary/30'
                  : isPast
                  ? 'bg-surface-container-low'
                  : 'bg-surface-container-low opacity-25'
              }`}>
                {isActive
                  ? <CheckCircle2 size={16} className="text-white" strokeWidth={2.5} />
                  : isToday
                  ? <div className="w-2 h-2 rounded-full bg-primary/50" />
                  : null
                }
              </div>
              <span className={`text-[10px] font-bold ${isToday ? 'text-primary' : 'stitch-text-secondary'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Projects mini-grid (returning users only) ─────────────────────

const PROJECT_DOT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDotHex(token: string | null) {
  return PROJECT_DOT_HEX[token ?? ''] ?? PROJECT_DOT_HEX.blue;
}

function ProjectsMiniGrid({
  projects,
}: {
  projects: import('../../data/CoreDataContext').CoreProject[];
}) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Map<string, ProjectStats>>(new Map());

  // Fetch real project-level aggregates (goals/phases/tasks across all
  // statuses) so the mini-card matches the Projects list page. Without
  // this we'd be reading from CoreDataContext.tasks which excludes done
  // rows and would always show 0% progress.
  useEffect(() => {
    if (projects.length === 0) return;
    let cancelled = false;
    ProjectService.getProjectStats(projects.map((p) => p.id))
      .then((m) => { if (!cancelled) setStats(m); })
      .catch((e) => console.warn('[Home/ProjectsMiniGrid] getProjectStats failed', e));
    return () => { cancelled = true; };
  }, [projects]);

  if (projects.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate('/projects')}
        className="w-full inline-flex items-center gap-3 rounded-2xl border-2 border-dashed border-surface-container-high hover:border-primary/30 hover:bg-primary/[0.02] transition-all p-4 text-left group"
      >
        <div className="w-10 h-10 rounded-2xl bg-primary/8 group-hover:bg-primary/12 flex items-center justify-center shrink-0 transition-colors">
          <Target size={17} className="text-primary/60 group-hover:text-primary/80 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary leading-tight">No projects yet</p>
          <p className="text-xs stitch-text-secondary mt-0.5">Capture the macro goal your sessions are chipping at.</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/8 px-2.5 py-1.5 rounded-full group-hover:bg-primary/15 transition-colors">
          <Plus size={11} strokeWidth={3} /> New
        </span>
      </button>
    );
  }

  const visible = projects.slice(0, 4);
  const hiddenCount = projects.length - visible.length;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">Your projects</p>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
        >
          See all <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {visible.map((p) => (
          <MiniProjectCard
            key={p.id}
            project={p}
            stats={stats.get(p.id) ?? EMPTY_PROJECT_STATS}
            onOpen={() => navigate(`/projects/${p.id}`)}
          />
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="rounded-2xl p-3 bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col items-center justify-center text-center"
          >
            <p className="text-sm font-bold stitch-text-primary">+{hiddenCount} more</p>
            <p className="text-[10px] stitch-text-secondary mt-0.5">See all projects</p>
          </button>
        )}
      </div>
    </section>
  );
}

/** Compact version of the ProjectsPage card. Same progress + chip
 *  language so the home view and the dedicated page feel like one
 *  surface, just at two zoom levels. */
function MiniProjectCard({
  project: p,
  stats,
  onOpen,
}: {
  project: import('../../data/CoreDataContext').CoreProject;
  stats: ProjectStats;
  onOpen: () => void;
}) {
  const color = projectColorMeta(p.color);
  const progress = deriveProjectProgress(stats);
  const isShared = p.scope === 'shared';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      className="group relative rounded-2xl p-3 cursor-pointer transition-all bg-surface-container-low hover:bg-surface-container hover:shadow-md space-y-2"
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <span
          className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white shadow"
          style={{ backgroundColor: color.hex }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary leading-tight line-clamp-1">
            {p.name}
          </p>
        </div>
        {isShared && (
          <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-violet-100 px-1.5 py-px rounded-full">
            <Users size={8} /> {p.memberCount}
          </span>
        )}
      </div>

      {/* Progress bar — only when there's something to measure */}
      {progress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold stitch-text-secondary uppercase tracking-wider">
              {progress.basis === 'goals' ? 'Goal progress' : progress.basis === 'phases' ? 'Phase progress' : 'Task progress'}
            </span>
            <span className={`text-[10px] font-extrabold tabular-nums ${color.textDark}`}>
              {progress.pct}%
            </span>
          </div>
          <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${color.bar}`}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {stats.milestones.total > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary">
            <Flag size={9} /> {stats.milestones.done}/{stats.milestones.total}
          </span>
        )}
        {stats.phases.total > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary">
            <Layers size={9} /> {stats.phases.done}/{stats.phases.total}
          </span>
        )}
        {stats.tasks.total > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary">
            <CheckCircle2 size={9} /> {stats.tasks.done}/{stats.tasks.total}
          </span>
        )}
        {!progress && (
          <span className="text-[10px] stitch-text-secondary italic">No goals or tasks yet</span>
        )}
      </div>
    </div>
  );
}

// ── Finish row ────────────────────────────────────────────────────

function ShipRow({ ship }: { ship: ShippedSession }) {
  const outcome = ship.session_outcome ? OUTCOME_CONFIG[ship.session_outcome] : null;
  const endedAt = ship.ended_at ?? ship.end_time;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-container last:border-0">
      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
        <Check size={14} className="text-emerald-600" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold stitch-text-primary truncate">
          {ship.session_goal ?? ship.session_title ?? 'Worked on something'}
        </p>
        {outcome && (
          <span className={`text-[10px] font-bold px-1.5 py-px rounded-full ${outcome.bg} ${outcome.text}`}>
            {outcome.label}
          </span>
        )}
      </div>
      {endedAt && <span className="text-[10px] stitch-text-secondary shrink-0">{formatTimeAgo(endedAt)}</span>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function DashboardPage() {
  const { user, profile } = useAuth();
  const { activeSession } = useFocusSession();
  const {
    state: { tasks, projects, activeProjectId },
    setActiveProject,
  } = useCoreData();
  const { sessions: liveSessions } = useCommunitySessionsSubscription();
  const navigate = useNavigate();

  const [showDeclare, setShowDeclare] = useState(false);
  const [declareGoal, setDeclareGoal] = useState<string | undefined>(undefined);
  const [showSchedule, setShowSchedule] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [weekSessions, setWeekSessions] = useState<{ start_time: string }[]>([]);
  const [myShips, setMyShips] = useState<ShippedSession[]>([]);
  const [upcomingScheduled, setUpcomingScheduled] = useState<ScheduledSessionWithProfile[]>([]);
  // Single-call home dashboard. The previous progressive-render approach
  // had four separate queries paint sections at different times, which
  // felt janky. Now: one server-side RPC bundles everything into a
  // single ~30-80 ms round-trip, and the whole page renders together
  // when it resolves. Returns to the "load all at once" feel — but
  // fast, because there's only ONE network call and the heavy
  // aggregation happens server-side.
  const [hasAnySession, setHasAnySession] = useState<boolean | null>(null);
  const [lastActiveAt, setLastActiveAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchHomeDashboard(user.id).then((dash) => {
      if (cancelled || !dash) return;
      // One batched setState call — React 18 commits these atomically
      // so the whole dashboard paints in a single render.
      setHasAnySession(dash.hasAnySession);
      setUpcomingScheduled(dash.upcomingScheduled);
      setMyShips(dash.recentShips);
      setWeekSessions(dash.weekSessions);
      setLastActiveAt(dash.lastActiveAt);
      // Synthesize a partial ProfileStats from the home RPC for the
      // identity chips. Full stats (best day/week, longest streak, etc.)
      // still loads lazily when the user opens the Stats tab.
      setStats({
        totalSessions:     dash.totalSessions,
        completedSessions: dash.totalSessions,
        completionRate:    dash.completionRate,
        finishedCount:     dash.finishedCount,
        currentStreak:     dash.currentStreak,
        longestStreak:     0,
        connectionCount:   dash.connectionCount,
        totalFocusMinutes: 0,
        avgSessionMinutes: 0,
        bestDayOfWeek:     null,
        bestWeekCount:     0,
        bestWeekStart:     null,
        peopleAlongsideThisMonth: 0,
      });
    }).catch(() => {
      // Soft-fail: leave hasAnySession null so the skeleton stays put
      // briefly, then resolves on a retry. Don't lock the user out.
      if (!cancelled) setHasAnySession(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';
  const workTypeLabel = profile?.work_type ? WORK_TYPE_LABELS[profile.work_type] : null;
  // Day-zero decision uses the cheap count check. Stays null while that
  // tiny query is in flight (~10ms typically) so we don't flicker the
  // wrong branch into view first.
  const isDayZero = hasAnySession === false;
  const dayZeroResolved = hasAnySession !== null;

  // Derive the warmth-band from stats + activity. Replaces the old
  // "X day streak" chip with a forgiving "Cruising / Warming up /
  // Coming back" band that doesn't break catastrophically on a single
  // missed day.
  const momentum = stats ? deriveMomentum({
    totalSessions:     stats.totalSessions,
    currentStreak:     stats.currentStreak,
    lastActiveAt,
    sessionsLast7Days: weekSessions.length,
  }) : null;
  // Coordinate the two intentions-related cards so we never show both.
  // First-week is more contextual (it knows the user is in their first
  // partial week and offers a softer ask) so it wins when both apply.
  const firstWeekShowing = useFirstWeekIntentionsEligible();

  // Tracks whether to open DeclareSessionModal with the "Make this smaller"
  // breakdown panel already expanded. Set by Quick Restart so returning
  // users land directly on the friction-reduction prompts.
  const [declareSmallerHint, setDeclareSmallerHint] = useState(false);
  function openDeclare(initialGoal?: string, opts?: { smallerHint?: boolean }) {
    setDeclareGoal(initialGoal);
    setDeclareSmallerHint(!!opts?.smallerHint);
    setShowDeclare(true);
  }

  // Quick-start templates pre-fill goal AND duration
  const [templateDuration, setTemplateDuration] = useState<25 | 50 | 90 | undefined>(undefined);
  function openDeclareWithTemplate(goal: string, duration: 25 | 50 | 90) {
    setDeclareGoal(goal);
    setTemplateDuration(duration);
    setShowDeclare(true);
  }

  // ── Single-paint loader ──────────────────────────────────────────────
  // Hold render until all queries resolve so the dashboard appears as one
  // composed view, not as five sections popping in independently. The
  // skeleton mirrors the rough vertical rhythm of the real page so the
  // layout doesn't shift when content arrives.
  return (
    <div className="space-y-4">

      {/* ── Hero ─────────────────────────────────────────────────
           Always renders immediately — firstName comes from cached auth,
           liveSessions from the realtime subscription. No load gate.    */}
      <HomeHero
        firstName={firstName}
        liveSessions={liveSessions}
        onStart={() => openDeclare()}
        onFind={() => navigate('/sessions')}
      />

      {/* Quick Timer — single-tap entry for "I just want to focus
          right now, no ceremony." Sits below the hero so it's the
          first thing in reach without competing with the primary
          Start/Find CTAs above. */}
      <div className="flex justify-end -mt-2">
        <QuickTimerButton />
      </div>

      {/* Progressive render — sections paint as their data arrives. The
          hero above is always-on, and the day-zero branch waits only for
          the cheap count query (not the full stats aggregation). */}
      {!dayZeroResolved ? (
        <div className="space-y-4 animate-pulse">
          <div className="flex gap-2">
            <div className="h-6 w-24 rounded-full bg-surface-container-low" />
            <div className="h-6 w-20 rounded-full bg-surface-container-low" />
            <div className="h-6 w-28 rounded-full bg-surface-container-low" />
          </div>
          <div className="h-40 rounded-2xl bg-surface-container-low/60" />
        </div>
      ) : (
        <>
          {/* Identity + momentum chips */}
          <div className="flex flex-wrap items-center gap-2">
            <FoundingMemberBadge createdAt={(profile as any)?.created_at} />
            {workTypeLabel && (
              <span className="text-xs font-semibold text-primary bg-primary/8 px-2.5 py-1 rounded-full">
                {workTypeLabel}
              </span>
            )}
            {/* Momentum chip — forgiving warmth band, never a streak count.
                A single missed day shifts the band gently, never resets it. */}
            {momentum && momentum.band !== 'building' && (() => {
              const cls = momentumChipClasses(momentum.band);
              return (
                <span
                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cls.bg} ${cls.text}`}
                  title={momentum.hint}
                >
                  <Flame size={11} /> {momentum.label}
                </span>
              );
            })()}
            {stats && stats.totalSessions > 0 && (
              <span className="text-xs font-semibold stitch-text-secondary bg-surface-container-low px-2.5 py-1 rounded-full">
                {stats.totalSessions} session{stats.totalSessions !== 1 ? 's' : ''}
              </span>
            )}
            {stats && stats.completionRate > 0 && (
              <span className="text-xs font-semibold stitch-text-secondary bg-surface-container-low px-2.5 py-1 rounded-full">
                {stats.completionRate}% finish rate
              </span>
            )}
          </div>

          {/* ── Day-0 vs Returning split ──────────────────────── */}
          {isDayZero ? (
        <>
          {/* Weekly review prompt (auto-hides outside Sun/Mon window).
              Suppressed when FirstWeekIntentionsCard is showing — they
              both prompt around intentions and showing both is confusing. */}
          {!firstWeekShowing && <WeeklyReviewPromptCard />}

          {/* 1. Welcome hero — time-of-day aware copy + ambient gradient */}
          <DayZeroWelcome onStart={() => openDeclare()} hint={timeOfDayHint()} />

          {/* Countdown banner — shows only when a session is within 24 h */}
          <UpcomingSessionCountdown />

          {/* 2. Today — hour grid + one-liner intention + quick-add templates */}
          <TodayPlannerCard onStartSession={openDeclareWithTemplate} />

          {/* (Weekly intentions are now integrated into TodayPlannerCard as a sidebar) */}

          {/* 4. Community pulse — the room is alive (or "be the first") */}
          <CommunityPulseCard
            sessions={liveSessions}
            excludeSessionId={activeSession?.id}
            onStart={() => openDeclare()}
          />

          {/* 5. Upcoming sessions on the calendar */}
          <UpcomingPublicSessionsStrip
            sessions={upcomingScheduled}
            myUserId={user?.id}
          />

          {/* 5b. Community feed teaser */}
          <CommunityFeedStrip />

          {/* 6. Just shipped — live debrief outcomes from across the community */}
          <ShippedFeedStrip />

        </>
      ) : (
        <>
          {/* Quick Restart — warm welcome-back for users returning after
              a 3+ day gap. Fires before everything else so it's the first
              thing they see. No streak-broken language anywhere. */}
          {momentum?.isReturning && user?.id && (
            <QuickRestartCard
              userId={user.id}
              onQuickStart={() => { setTemplateDuration(25); openDeclare(undefined, { smallerHint: true }); }}
            />
          )}

          {/* First-week bridge — only renders during the window between
              wizard completion and the user's first intentions day.
              Self-hides outside that window or once the user dismisses. */}
          <FirstWeekIntentionsCard />

          {/* Returning user: weekly review prompt + SmartNextCard sit side-by-side
              on desktop to reduce wasted vertical space. Stacked on mobile.
              When the review prompt is hidden (outside Sun/Mon window or already
              completed), SmartNextCard takes the full width naturally. */}
          <div className="flex flex-col md:flex-row gap-4 md:items-stretch">
            {!firstWeekShowing && <WeeklyReviewPromptCard className="md:flex-1 md:basis-0" />}
            <div className="md:flex-1 md:basis-0">
              <SmartNextCard
                liveSessions={liveSessions}
                upcomingScheduled={upcomingScheduled}
                myUserId={user?.id}
                onDeclareCustom={openDeclare}
                onSchedule={() => setShowSchedule(true)}
              />
            </div>
          </div>

          <UpcomingSessionCountdown />

          <DashboardTabs
            now={
              <div className="space-y-4">
                {/* "Today" — hour grid + one-liner intention + quick-start templates */}
                <TodayPlannerCard onStartSession={openDeclareWithTemplate} />
              </div>
            }
            plan={
              <div className="space-y-4">
                {/* 1. Goals — weekly intentions (strategic, 1-3 per week) */}
                <WeeklyIntentionsCard />

                {/* 2. Tasks — operational backlog with quick-start */}
                <PlanTasksCard
                  tasks={tasks}
                  projects={projects}
                  onSelectTask={(title) => openDeclare(title)}
                />

                {/* 3. Projects — containers */}
                <ProjectsMiniGrid projects={projects} />
              </div>
            }
            stats={<StatsTab />}
            pulse={<PulsePeopleTab />}
          />
        </>
      )}
        </>
      )}

      {/* Modals */}
      {showDeclare && (
        <DeclareSessionModal
          onClose={() => { setShowDeclare(false); setDeclareGoal(undefined); setTemplateDuration(undefined); setDeclareSmallerHint(false); }}
          initialGoal={declareGoal}
          initialDuration={templateDuration}
          startWithSmallerHint={declareSmallerHint}
        />
      )}
      {showSchedule && <ScheduleSessionModal onClose={() => setShowSchedule(false)} />}
    </div>
  );
}
