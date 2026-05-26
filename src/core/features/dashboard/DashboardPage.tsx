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
  ArrowRight, Check, Flame, CheckCircle2, Plus, Pin, Target, Users,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useCoreData } from '../../data/CoreDataContext';
import { useCommunitySessionsSubscription } from '../sessions/useCommunitySessionsSubscription';
import { DeclareSessionModal } from '../sessions/DeclareSessionModal';
import { ScheduleSessionModal } from '../sessions/ScheduleSessionModal';
import { fetchProfileStats, fetchWeekSessions } from '../../services/ProfileService';
import { fetchRecentShippedSessions, fetchUpcomingScheduledSessions } from '../../services/SessionService';
import { SurfaceCard } from '../../ui/CorePage';
import { HomeHero } from './HomeHero';
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
  projects, tasks, activeProjectId, onPin,
}: {
  projects: import('../../data/CoreDataContext').CoreProject[];
  tasks: import('../../data/CoreDataContext').CoreTask[];
  activeProjectId: string | null;
  onPin: (id: string | null) => void;
}) {
  const navigate = useNavigate();

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

  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (!t.projectId || t.done) continue;
    counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1);
  }

  const sorted = [...projects].sort((a, b) => {
    if (a.id === activeProjectId) return -1;
    if (b.id === activeProjectId) return 1;
    return 0;
  });
  const visible = sorted.slice(0, 4);
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

      <div className="grid grid-cols-2 gap-2.5">
        {visible.map((p) => {
          const isPinned = p.id === activeProjectId;
          const openCount = counts.get(p.id) ?? 0;
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl p-3 cursor-pointer transition-all hover:shadow-md ${
                isPinned
                  ? 'bg-primary/5 ring-1 ring-primary/30'
                  : 'bg-surface-container-low hover:bg-surface-container'
              }`}
              onClick={() => navigate(`/projects/${p.id}`)}
              role="button"
              tabIndex={0}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onPin(isPinned ? null : p.id); }}
                title={isPinned ? 'Unpin' : 'Pin as active'}
                className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isPinned ? 'text-primary bg-white shadow-sm' : 'text-transparent hover:text-primary hover:bg-surface-container'
                }`}
              >
                <Pin size={10} fill={isPinned ? 'currentColor' : 'none'} strokeWidth={2.5} />
              </button>
              <div className="flex items-start gap-2 pr-6">
                <span
                  className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white shadow"
                  style={{ backgroundColor: projectDotHex(p.color) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold stitch-text-primary leading-tight line-clamp-2 mb-1">
                    {p.name}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary">
                      <Target size={9} /> {openCount}
                    </span>
                    {p.scope === 'shared' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-violet-100 px-1.5 py-px rounded-full">
                        <Users size={8} /> {p.memberCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

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
  // Unified load gate. We deliberately await ALL queries before painting
  // the dashboard so sections don't pop in one at a time. Trade-off: the
  // slowest query (usually fetchUpcomingScheduledSessions) gates the
  // whole page — but on Pro/Micro that's well under a second, and the
  // single-paint feels dramatically less janky.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const [s, w, ships, upcoming] = await Promise.all([
          fetchProfileStats(user.id).catch(() => null),
          fetchWeekSessions(user.id).catch(() => [] as { start_time: string }[]),
          fetchRecentShippedSessions(user.id).catch(() => [] as ShippedSession[]),
          fetchUpcomingScheduledSessions().catch(() => [] as ScheduledSessionWithProfile[]),
        ]);
        if (cancelled) return;
        // Batch the updates inside an effect callback so React 18 commits
        // them in a single render. No partial paints.
        setStats(s);
        setWeekSessions(w);
        setMyShips(ships.slice(0, 3));
        setUpcomingScheduled(upcoming);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';
  const workTypeLabel = profile?.work_type ? WORK_TYPE_LABELS[profile.work_type] : null;
  const isDayZero = loaded && (stats?.totalSessions ?? 0) === 0;
  // Coordinate the two intentions-related cards so we never show both.
  // First-week is more contextual (it knows the user is in their first
  // partial week and offers a softer ask) so it wins when both apply.
  const firstWeekShowing = useFirstWeekIntentionsEligible();

  function openDeclare(initialGoal?: string) {
    setDeclareGoal(initialGoal);
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

      {/* ── Load-gated content ───────────────────────────────── */}
      {!loaded ? (
        <div className="space-y-4 animate-pulse">
          <div className="flex gap-2">
            <div className="h-6 w-24 rounded-full bg-surface-container-low" />
            <div className="h-6 w-20 rounded-full bg-surface-container-low" />
            <div className="h-6 w-28 rounded-full bg-surface-container-low" />
          </div>
          <div className="h-32 rounded-2xl bg-surface-container-low/60" />
          <div className="h-40 rounded-2xl bg-surface-container-low/60" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 rounded-xl bg-surface-container-low/60" />
            <div className="h-20 rounded-xl bg-surface-container-low/60" />
          </div>
          <div className="h-48 rounded-2xl bg-surface-container-low/60" />
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
            {stats && stats.currentStreak > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                <Flame size={11} /> {stats.currentStreak} day streak
              </span>
            )}
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
                <ProjectsMiniGrid
                  projects={projects}
                  tasks={tasks}
                  activeProjectId={activeProjectId}
                  onPin={setActiveProject}
                />
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
          onClose={() => { setShowDeclare(false); setDeclareGoal(undefined); setTemplateDuration(undefined); }}
          initialGoal={declareGoal}
          initialDuration={templateDuration}
        />
      )}
      {showSchedule && <ScheduleSessionModal onClose={() => setShowSchedule(false)} />}
    </div>
  );
}
