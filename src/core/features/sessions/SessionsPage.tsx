import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, StopCircle, Clock, Flame, Calendar, Copy, Check, Users, UserPlus, MicOff, Loader2 } from 'lucide-react';
import { useCommunitySessionsSubscription } from './useCommunitySessionsSubscription';
import { DeclareSessionModal } from './DeclareSessionModal';
import { ScheduleSessionModal } from './ScheduleSessionModal';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useAuth } from '../../auth/AuthProvider';
import { SurfaceCard, GradientButton } from '../../ui/CorePage';
import { fetchUpcomingScheduledSessions, fetchRecentShippedSessions, joinOneOnOneSession } from '../../services/SessionService';
import type { CommunitySession } from '../../../lib/guardrails/focusTypes';
import type { ScheduledSessionWithProfile, ShippedSession } from '../../services/SessionService';

// ── Utilities ────────────────────────────────────────────────────

function formatElapsed(startTime: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const mins = Math.floor(elapsed / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'Time up';
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m left` : `${hrs}h left`;
}

function sessionProgress(session: CommunitySession): number {
  if (!session.intended_duration_minutes || !session.start_time) return 0;
  const elapsedMs = Date.now() - new Date(session.start_time).getTime();
  const totalMs = session.intended_duration_minutes * 60 * 1000;
  return Math.min(1, elapsedMs / totalMs);
}

const AVATAR_COLORS = [
  ['bg-violet-100 text-violet-700', 'bg-violet-500'],
  ['bg-blue-100 text-blue-700', 'bg-blue-500'],
  ['bg-emerald-100 text-emerald-700', 'bg-emerald-500'],
  ['bg-amber-100 text-amber-700', 'bg-amber-500'],
  ['bg-rose-100 text-rose-700', 'bg-rose-500'],
  ['bg-indigo-100 text-indigo-700', 'bg-indigo-500'],
];

function avatarClasses(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Community session card ───────────────────────────────────────

function CommunitySessionCard({ session }: { session: CommunitySession }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActiveSession } = useFocusSession();
  const [elapsed, setElapsed] = useState(() => formatElapsed(session.start_time));
  const [progress, setProgress] = useState(() => sessionProgress(session));
  const [avatarBg, progressBg] = avatarClasses(session.display_name);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(formatElapsed(session.start_time));
      setProgress(sessionProgress(session));
    }, 30000);
    return () => clearInterval(id);
  }, [session.start_time, session.intended_duration_minutes]);

  const isOneOnOne = session.session_mode === 'one_on_one';
  const isQuiet = session.quiet_mode === true;
  const isHost = session.user_id === user?.id;
  const isPartner = session.partner_user_id === user?.id;
  const partnerSlotOpen = isOneOnOne && session.partner_user_id == null;
  const partnerSlotFull = isOneOnOne && session.partner_user_id != null && !isHost && !isPartner;

  async function handleJoin() {
    if (!user || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const joined = await joinOneOnOneSession(session.id);
      // Adopt their session as ours so the Active Session page knows the mode + room
      setActiveSession(joined);
      navigate(`/session/${joined.id}`);
    } catch (err: any) {
      setJoinError(err?.message ?? 'Could not join session.');
      setTimeout(() => setJoinError(null), 5000);
      setJoining(false);
    }
  }

  return (
    <SurfaceCard>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {session.avatar_url ? (
          <img src={session.avatar_url} alt={session.display_name} className="w-10 h-10 rounded-2xl object-cover shrink-0" />
        ) : (
          <div className={`w-10 h-10 rounded-2xl ${avatarBg} flex items-center justify-center shrink-0 font-extrabold text-sm`}>
            {session.display_name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-bold stitch-text-primary truncate">
              {session.display_name}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs stitch-text-secondary flex items-center gap-0.5">
                <Clock size={10} />
                {elapsed}
              </span>
            </div>
          </div>

          {/* Mode + quiet badges */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              isOneOnOne
                ? 'bg-violet-100 text-violet-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {isOneOnOne ? <UserPlus size={9} /> : <Users size={9} />}
              {isOneOnOne ? '1-on-1' : 'Group'}
            </span>
            {isQuiet && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-bold uppercase tracking-wider">
                <MicOff size={9} /> Quiet
              </span>
            )}
            {partnerSlotFull && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-container stitch-text-secondary text-[9px] font-bold uppercase tracking-wider">
                Full
              </span>
            )}
          </div>

          <p className="text-sm stitch-text-secondary leading-snug line-clamp-2 mb-2.5">
            {session.session_goal ?? 'Working on something'}
          </p>

          {/* Progress bar + duration label */}
          {session.intended_duration_minutes && (
            <div className="space-y-1.5">
              <div className="h-1 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full ${progressBg} rounded-full transition-all duration-1000`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="text-[10px] font-medium stitch-text-secondary">
                {session.intended_duration_minutes} min session
              </p>
            </div>
          )}

          {/* Join 1-on-1 button (only when slot is open and user isn't host) */}
          {partnerSlotOpen && !isHost && (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl stitch-btn--primary text-white text-xs font-bold shadow-sm shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {joining ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
              {joining ? 'Joining…' : 'Join 1-on-1'}
            </button>
          )}

          {joinError && (
            <p className="mt-2 text-[11px] text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
              {joinError}
            </p>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

// ── Your active session banner ───────────────────────────────────

function YourActiveSessionBanner() {
  const { activeSession, sessionGoal, timerSecondsRemaining } = useFocusSession();
  const [ending, setEnding] = useState(false);
  const navigate = useNavigate();

  const handleEnd = useCallback(() => {
    if (!activeSession) return;
    setEnding(true);
    navigate(`/session/${activeSession.id}/summary`);
  }, [activeSession, navigate]);

  const handleRejoin = useCallback(() => {
    if (!activeSession) return;
    navigate(`/session/${activeSession.id}`);
  }, [activeSession, navigate]);

  if (!activeSession) return null;

  const totalSeconds = (activeSession.intended_duration_minutes ?? 50) * 60;
  const progress = totalSeconds > 0
    ? Math.max(0, 1 - timerSecondsRemaining / totalSeconds)
    : 0;

  return (
    <div className="rounded-[1.5rem] overflow-hidden stitch-card--accent p-5">
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={handleRejoin}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
            <p className="text-xs font-bold text-white/80 uppercase tracking-widest">
              In session · tap to rejoin
            </p>
          </div>
          {sessionGoal && (
            <p className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug mb-3">
              {sessionGoal}
            </p>
          )}
          {timerSecondsRemaining > 0 && (
            <>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-white/70 rounded-full transition-all"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="text-xs text-white/70">
                {formatRemaining(timerSecondsRemaining)}
              </p>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleEnd}
          disabled={ending}
          className="shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-2 rounded-full transition-all active:scale-95 disabled:opacity-50"
        >
          <StopCircle size={13} />
          End
        </button>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      {/* Simple illustration */}
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/8 flex items-center justify-center">
          <Flame size={28} className="text-primary/60" />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-surface-container-low border-2 border-surface flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-surface-container" />
        </div>
      </div>

      <p className="text-base font-bold stitch-text-primary mb-1">
        No one's working yet
      </p>
      <p className="text-sm stitch-text-secondary max-w-[220px] leading-relaxed mb-5">
        Be the first to show up today — someone always has to start.
      </p>

      <button
        type="button"
        onClick={onStart}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold stitch-btn--primary text-white shadow-md shadow-primary/20 hover:-translate-y-px transition-all active:scale-95"
      >
        <Play size={14} />
        Start the first session
      </button>
    </div>
  );
}

// ── Upcoming scheduled session card ─────────────────────────────

function formatUpcomingTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ` at ${timeStr}`;
}

function UpcomingSessionCard({ session }: { session: ScheduledSessionWithProfile }) {
  const [copied, setCopied] = useState(false);
  const joinUrl = session.join_code ? `${window.location.origin}/join/${session.join_code}` : '';
  const scheduledTime = session.scheduled_at ?? session.start_time;

  async function handleCopy() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <SurfaceCard>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Calendar size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary truncate">
            {session.session_title ?? 'Focus Session'}
          </p>
          <p className="text-xs stitch-text-secondary mt-0.5">
            {session.display_name} · {formatUpcomingTime(scheduledTime)} · {session.intended_duration_minutes}m
          </p>
          {joinUrl && (
            <button
              type="button"
              onClick={handleCopy}
              className={`mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                copied
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-surface-container stitch-text-secondary hover:bg-surface-container-high'
              }`}
            >
              {copied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

// ── Finished session card ─────────────────────────────────────────

const OUTCOME_CONFIG = {
  finished: { label: 'Finished', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  partially: { label: 'Partial', bg: 'bg-amber-100', text: 'text-amber-700' },
  something_came_up: { label: 'Interrupted', bg: 'bg-slate-100', text: 'text-slate-500' },
} as const;

function formatTimeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? '1h ago' : `${hrs}h ago`;
}

function ShippedSessionCard({ session }: { session: ShippedSession }) {
  const outcome = session.session_outcome
    ? OUTCOME_CONFIG[session.session_outcome] ?? OUTCOME_CONFIG.finished
    : OUTCOME_CONFIG.finished;
  const [avatarBg] = avatarClasses(session.display_name);
  const endedAt = session.ended_at ?? session.end_time ?? session.start_time;

  return (
    <SurfaceCard>
      <div className="flex items-start gap-3">
        {session.avatar_url ? (
          <img src={session.avatar_url} alt={session.display_name} className="w-9 h-9 rounded-2xl object-cover shrink-0" />
        ) : (
          <div className={`w-9 h-9 rounded-2xl ${avatarBg} flex items-center justify-center shrink-0 font-extrabold text-sm`}>
            {session.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-sm font-bold stitch-text-primary truncate">
              {session.display_name}
            </p>
            <span className="text-[10px] stitch-text-secondary shrink-0">{formatTimeAgo(endedAt)}</span>
          </div>
          <p className="text-sm stitch-text-secondary leading-snug line-clamp-2 mb-2">
            {session.session_goal ?? session.session_title ?? 'Worked on something'}
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${outcome.bg} ${outcome.text}`}>
              {outcome.label}
            </span>
            {session.intended_duration_minutes && (
              <span className="text-[10px] stitch-text-secondary">
                {session.intended_duration_minutes}m session
              </span>
            )}
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

// ── Main page ────────────────────────────────────────────────────

export function SessionsPage() {
  const [showDeclare, setShowDeclare] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState<ScheduledSessionWithProfile[]>([]);
  const [shippedSessions, setShippedSessions] = useState<ShippedSession[]>([]);
  const { sessions, isLoading } = useCommunitySessionsSubscription();
  const { activeSession } = useFocusSession();

  useEffect(() => {
    fetchUpcomingScheduledSessions().then(setUpcomingSessions).catch(() => {});
  }, [showSchedule]);

  useEffect(() => {
    fetchRecentShippedSessions().then(setShippedSessions).catch(() => {});
  }, []);

  const otherSessions = sessions.filter(
    (s) => !activeSession || s.id !== activeSession.id
  );

  const memberCount = otherSessions.length;

  return (
    <div className="space-y-5 sm:space-y-7">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="stitch-headline text-xl font-extrabold tracking-tight">Working Now</h1>
          {memberCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {memberCount} in session
            </span>
          )}
        </div>
      </div>

      {/* ── Your active session ───────────────────────────────── */}
      <YourActiveSessionBanner />

      {/* ── Start session CTAs ───────────────────────────────── */}
      {!activeSession && (
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setShowDeclare(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl stitch-btn--primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200"
          >
            <Play size={16} />
            Start Now
          </button>
          <button
            type="button"
            onClick={() => setShowSchedule(true)}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container active:scale-[0.98] transition-all duration-200"
          >
            <Calendar size={16} />
            Schedule
          </button>
        </div>
      )}

      {/* ── Community sessions ────────────────────────────────── */}
      <section>
        {/* Section label */}
        {!isLoading && otherSessions.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-1.5">
              {otherSessions.slice(0, 3).map((s) => {
                const [avatarBg] = avatarClasses(s.display_name);
                return s.avatar_url ? (
                  <img
                    key={s.id}
                    src={s.avatar_url}
                    alt={s.display_name}
                    className="w-6 h-6 rounded-full object-cover shrink-0 border-2 border-surface"
                  />
                ) : (
                  <div
                    key={s.id}
                    className={`w-6 h-6 rounded-full ${avatarBg} flex items-center justify-center text-[10px] font-bold border-2 border-surface`}
                  >
                    {s.display_name.charAt(0).toUpperCase()}
                  </div>
                );
              })}
              {otherSessions.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-[9px] font-bold stitch-text-secondary border-2 border-surface">
                  +{otherSessions.length - 3}
                </div>
              )}
            </div>
            <span className="text-sm font-semibold stitch-text-secondary">
              {memberCount === 1 ? '1 member in session' : `${memberCount} members in session`}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface-container-low rounded-[1.25rem] animate-pulse" />
            ))}
          </div>
        ) : otherSessions.length > 0 ? (
          <div className="space-y-3">
            {otherSessions.map((session) => (
              <CommunitySessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <SurfaceCard>
            <EmptyState onStart={() => setShowDeclare(true)} />
          </SurfaceCard>
        )}
      </section>

      {/* ── Finished feed ─────────────────────────────────────── */}
      {shippedSessions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Package size={13} className="stitch-text-secondary" />
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
              Recently finished
            </p>
          </div>
          <div className="space-y-3">
            {shippedSessions.map((s) => (
              <ShippedSessionCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {/* ── Upcoming scheduled sessions ───────────────────────── */}
      {upcomingSessions.length > 0 && (
        <section>
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-3">
            Upcoming
          </p>
          <div className="space-y-3">
            {upcomingSessions.map((s) => (
              <UpcomingSessionCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {/* Declare session modal */}
      {showDeclare && (
        <DeclareSessionModal onClose={() => setShowDeclare(false)} />
      )}

      {/* Schedule session modal */}
      {showSchedule && (
        <ScheduleSessionModal onClose={() => setShowSchedule(false)} />
      )}
    </div>
  );
}
