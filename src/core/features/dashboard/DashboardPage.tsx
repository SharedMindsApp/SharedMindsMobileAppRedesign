import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Calendar, StopCircle, Check, ArrowRight,
  Flame, Users, CheckCircle2, Pencil, Target, Zap,
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
import type { ProfileStats } from '../../services/ProfileService';
import type { ShippedSession, ScheduledSessionWithProfile } from '../../services/SessionService';
import type { CommunitySession } from '../../../lib/guardrails/focusTypes';

// ── Utilities ─────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'Time up';
  const m = Math.ceil(seconds / 60);
  if (m < 60) return `${m}m left`;
  return `${Math.floor(m / 60)}h ${m % 60}m left`;
}

function formatScheduledTime(iso: string): string {
  const d = new Date(iso);
  const diffMins = Math.round((d.getTime() - Date.now()) / 60000);
  if (diffMins < 0) return 'Starting now';
  if (diffMins < 60) return `In ${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `In ${diffHrs}h`;
  return d.toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
];
function avatarClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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
        {activeDaysCount > 0 && (
          <span className="text-xs font-bold text-primary">
            {activeDaysCount} day{activeDaysCount !== 1 ? 's' : ''} active
          </span>
        )}
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

// ── Active session banner ─────────────────────────────────────────

function ActiveSessionBanner() {
  const { activeSession, sessionGoal, timerSecondsRemaining } = useFocusSession();
  const navigate = useNavigate();

  const handleRejoin = useCallback(() => {
    if (!activeSession) return;
    navigate(`/session/${activeSession.id}`);
  }, [activeSession, navigate]);

  const handleEnd = useCallback(() => {
    if (!activeSession) return;
    navigate(`/session/${activeSession.id}/summary`);
  }, [activeSession, navigate]);

  if (!activeSession) return null;

  const totalSeconds = (activeSession.intended_duration_minutes ?? 50) * 60;
  const progress = totalSeconds > 0 ? Math.max(0, 1 - timerSecondsRemaining / totalSeconds) : 0;

  return (
    <div className="rounded-[1.5rem] overflow-hidden stitch-card--accent p-5">
      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={handleRejoin} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
            <p className="text-xs font-bold text-white/80 uppercase tracking-widest">
              In session · tap to rejoin
            </p>
          </div>
          {sessionGoal && (
            <p className="text-sm font-bold text-white line-clamp-2 leading-snug mb-3">{sessionGoal}</p>
          )}
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-1">
            <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="text-xs text-white/60">{formatRemaining(timerSecondsRemaining)}</p>
        </button>
        <button
          type="button"
          onClick={handleEnd}
          className="shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-2 rounded-full transition-all active:scale-95"
        >
          <StopCircle size={13} /> End
        </button>
      </div>
    </div>
  );
}

// ── New user welcome hero ─────────────────────────────────────────

function NewUserHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-[1.5rem] overflow-hidden stitch-card--accent p-6">
      {/* Top row */}
      <div className="mb-5">
        <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">Ready when you are</p>
        <h2 className="text-xl font-extrabold text-white leading-snug">
          Your first session<br />is waiting.
        </h2>
        <p className="text-sm text-white/70 mt-2 leading-relaxed">
          Name your goal, show up alongside other solopreneurs, and finish it.
        </p>
      </div>

      {/* Loop steps */}
      <div className="flex items-center gap-0 mb-6">
        {[
          { icon: Target, label: 'Declare' },
          { icon: Zap, label: 'Work' },
          { icon: CheckCircle2, label: 'Finish' },
        ].map(({ icon: Icon, label }, i) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Icon size={16} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-white/70">{label}</span>
            </div>
            {i < 2 && (
              <div className="flex items-center mx-2 mb-4">
                <ArrowRight size={12} className="text-white/30" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onStart}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white text-primary text-sm font-extrabold shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
      >
        <Play size={15} />
        Start your first session
      </button>
    </div>
  );
}

// ── Returning user focus card ─────────────────────────────────────

function DailyFocusCard({
  suggestedGoal,
  onStart,
  onSchedule,
}: {
  suggestedGoal: string;
  onStart: (goal: string) => void;
  onSchedule: () => void;
}) {
  const [goal, setGoal] = useState(suggestedGoal);

  useEffect(() => {
    if (suggestedGoal && !goal) setGoal(suggestedGoal);
  }, [suggestedGoal]);

  return (
    <SurfaceCard>
      <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">
        What are you finishing today?
      </p>
      <div className="relative mb-3">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Name the one thing you'll focus on…"
          rows={2}
          maxLength={200}
          className="w-full px-4 py-3 pr-10 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none leading-relaxed"
        />
        <Pencil size={13} className="absolute right-3.5 top-3.5 stitch-text-secondary pointer-events-none" />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onStart(goal)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl stitch-btn--primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
        >
          <Play size={14} /> Start Now
        </button>
        <button
          type="button"
          onClick={onSchedule}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container active:scale-[0.98] transition-all duration-200"
        >
          <Calendar size={14} /> Schedule
        </button>
      </div>
    </SurfaceCard>
  );
}

// ── Live peer row ─────────────────────────────────────────────────

function LivePersonRow({ session }: { session: CommunitySession }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-surface-container last:border-0">
      {session.avatar_url ? (
        <img src={session.avatar_url} alt={session.display_name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
      ) : (
        <div className={`w-9 h-9 rounded-xl ${avatarClass(session.display_name)} flex items-center justify-center shrink-0 font-extrabold text-sm`}>
          {session.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold stitch-text-primary truncate">{session.display_name}</p>
        <p className="text-xs stitch-text-secondary truncate">{session.session_goal ?? 'Working on something'}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-semibold text-emerald-600">Live</span>
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
  const { state: { tasks } } = useCoreData();
  const { sessions: liveSessions } = useCommunitySessionsSubscription();
  const navigate = useNavigate();

  const [showDeclare, setShowDeclare] = useState(false);
  const [declareGoal, setDeclareGoal] = useState<string | undefined>(undefined);
  const [showSchedule, setShowSchedule] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [weekSessions, setWeekSessions] = useState<{ start_time: string }[]>([]);
  const [myShips, setMyShips] = useState<ShippedSession[]>([]);
  const [nextSession, setNextSession] = useState<ScheduledSessionWithProfile | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchProfileStats(user.id).then((s) => { setStats(s); setStatsLoaded(true); }).catch(() => setStatsLoaded(true));
    fetchWeekSessions(user.id).then(setWeekSessions).catch(() => {});
    fetchRecentShippedSessions(user.id).then((s) => setMyShips(s.slice(0, 3))).catch(() => {});
    fetchUpcomingScheduledSessions().then((sessions) => {
      const cutoff = Date.now() + 48 * 60 * 60 * 1000;
      const next = sessions.find((s) => new Date(s.scheduled_at ?? s.start_time).getTime() <= cutoff);
      setNextSession(next ?? null);
    }).catch(() => {});
  }, [user?.id]);

  const livePeers = liveSessions.filter((s) => s.id !== activeSession?.id).slice(0, 3);
  const totalLive = liveSessions.filter((s) => s.id !== activeSession?.id).length + (activeSession ? 1 : 0);
  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';
  const workTypeLabel = profile?.work_type ? WORK_TYPE_LABELS[profile.work_type] : null;
  const isNewUser = statsLoaded && (stats?.totalSessions ?? 0) === 0;
  const suggestedGoal = tasks.filter((t) => !t.done)[0]?.title ?? '';

  function handleStartWithGoal(goal: string) {
    setDeclareGoal(goal || undefined);
    setShowDeclare(true);
  }

  return (
    <div className="space-y-4">

      {/* ── 1. Greeting ───────────────────────────────────── */}
      <div className="pt-1">
        <p className="text-sm stitch-text-secondary font-medium">{greeting()}</p>
        <h1 className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
          {firstName} 👋
        </h1>

        {/* Identity + momentum row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
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
      </div>

      {/* ── 2. Active session banner ──────────────────────── */}
      <ActiveSessionBanner />

      {/* ── 3. Hero CTA — state aware ─────────────────────── */}
      {!activeSession && (
        isNewUser
          ? <NewUserHero onStart={() => setShowDeclare(true)} />
          : <DailyFocusCard
              suggestedGoal={suggestedGoal}
              onStart={handleStartWithGoal}
              onSchedule={() => setShowSchedule(true)}
            />
      )}

      {/* ── 4. This week ──────────────────────────────────── */}
      <SurfaceCard>
        <WeekStrip weekSessions={weekSessions} />
      </SurfaceCard>

      {/* ── 5. Working now ────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {totalLive > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
              {totalLive > 0 ? `${totalLive} working now` : 'Working now'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/sessions')}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
          >
            See all <ArrowRight size={12} />
          </button>
        </div>

        {livePeers.length > 0 ? (
          <SurfaceCard>
            <div className="divide-y divide-surface-container">
              {livePeers.map((s) => <LivePersonRow key={s.id} session={s} />)}
            </div>
          </SurfaceCard>
        ) : (
          /* Empty community state — more motivating */
          <div
            className="rounded-[1.25rem] border-2 border-dashed border-surface-container-high flex flex-col items-center text-center py-8 px-6 cursor-pointer hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
            onClick={() => setShowDeclare(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowDeclare(true)}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/8 group-hover:bg-primary/12 flex items-center justify-center mb-3 transition-colors">
              <Users size={20} className="text-primary/50 group-hover:text-primary/70 transition-colors" />
            </div>
            <p className="text-sm font-bold stitch-text-primary mb-1">No one's working yet</p>
            <p className="text-xs stitch-text-secondary mb-4 max-w-[200px] leading-relaxed">
              Be the first to show up. Someone always has to start the room.
            </p>
            <span className="text-xs font-bold text-primary bg-primary/8 px-3 py-1.5 rounded-full group-hover:bg-primary/15 transition-colors">
              Start a session →
            </span>
          </div>
        )}
      </section>

      {/* ── 6. Up next (scheduled session) ───────────────── */}
      {nextSession && (
        <SurfaceCard>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">Up next</p>
            <span className="text-xs font-bold text-primary">
              {formatScheduledTime(nextSession.scheduled_at ?? nextSession.start_time)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar size={17} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold stitch-text-primary truncate">
                {nextSession.session_title ?? 'Focus session'}
              </p>
              <p className="text-xs stitch-text-secondary">
                {nextSession.intended_duration_minutes}m · {nextSession.display_name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/join/${nextSession.join_code}`)}
              className="shrink-0 text-xs font-bold text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-full transition-colors"
            >
              Join
            </button>
          </div>
        </SurfaceCard>
      )}

      {/* ── 7. Recent ships ───────────────────────────────── */}
      {myShips.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">Recent ships</p>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
            >
              All <ArrowRight size={12} />
            </button>
          </div>
          <SurfaceCard>
            <div className="divide-y divide-surface-container">
              {myShips.map((s) => <ShipRow key={s.id} ship={s} />)}
            </div>
          </SurfaceCard>
        </section>
      )}

      {/* Modals */}
      {showDeclare && (
        <DeclareSessionModal
          onClose={() => { setShowDeclare(false); setDeclareGoal(undefined); }}
          initialGoal={declareGoal}
        />
      )}
      {showSchedule && <ScheduleSessionModal onClose={() => setShowSchedule(false)} />}
    </div>
  );
}
