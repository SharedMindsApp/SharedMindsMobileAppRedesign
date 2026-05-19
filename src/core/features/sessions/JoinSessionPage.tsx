import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Loader2, Play, Users } from 'lucide-react';
import { fetchSessionByJoinCode, startScheduledSession } from '../../services/SessionService';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import type { ScheduledSessionWithProfile } from '../../services/SessionService';

function formatScheduledTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCountdown(iso: string): string | null {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Starts in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `Starts in ${hrs}h ${rem}m` : `Starts in ${hrs}h`;
}

export function JoinSessionPage() {
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();
  const { setActiveSession } = useFocusSession();

  const [session, setSession] = useState<ScheduledSessionWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!joinCode) return;
    fetchSessionByJoinCode(joinCode).then((s) => {
      setSession(s);
      setLoading(false);
    });
  }, [joinCode]);

  useEffect(() => {
    if (!session?.scheduled_at) return;
    const update = () => setCountdown(formatCountdown(session.scheduled_at!));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [session?.scheduled_at]);

  async function handleJoin() {
    if (!session) return;
    setJoining(true);
    setError(null);
    try {
      let activeSession = session;
      if (session.status === 'scheduled') {
        activeSession = await startScheduledSession(session.id);
      }
      setActiveSession(activeSession);
      navigate(`/session/${activeSession.id}`);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={22} className="animate-spin stitch-text-secondary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center text-center py-16 px-6">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center mb-4">
          <Calendar size={24} className="stitch-text-secondary" />
        </div>
        <h2 className="stitch-headline text-lg font-extrabold mb-2">Session not found</h2>
        <p className="text-sm stitch-text-secondary mb-6 max-w-[260px]">
          This link may have expired or the session was cancelled.
        </p>
        <button
          type="button"
          onClick={() => navigate('/sessions')}
          className="px-5 py-2.5 rounded-full text-sm font-bold stitch-btn--primary text-white"
        >
          Go to Sessions
        </button>
      </div>
    );
  }

  const isActive = session.status === 'active';
  const isScheduled = session.status === 'scheduled';
  const scheduledTime = session.scheduled_at ?? session.start_time;
  const isNearlyTime = scheduledTime
    ? new Date(scheduledTime).getTime() - Date.now() < 10 * 60 * 1000
    : false;
  const canJoin = isActive || (isScheduled && isNearlyTime);

  return (
    <div className="space-y-5 max-w-md mx-auto">
      {/* Header */}
      <div>
        <p className="text-xs font-bold stitch-text-secondary uppercase tracking-widest mb-1">
          You're invited
        </p>
        <h1 className="stitch-headline text-2xl font-extrabold tracking-tight">
          {session.session_title ?? 'Focus Session'}
        </h1>
      </div>

      {/* Session info card */}
      <div className="rounded-2xl bg-surface-container-low p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-xs stitch-text-secondary">Hosted by</p>
            <p className="text-sm font-bold stitch-text-primary">{session.display_name}</p>
          </div>
        </div>

        {scheduledTime && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
              <Calendar size={16} className="stitch-text-secondary" />
            </div>
            <div>
              <p className="text-xs stitch-text-secondary">Scheduled for</p>
              <p className="text-sm font-bold stitch-text-primary">{formatScheduledTime(scheduledTime)}</p>
            </div>
          </div>
        )}

        {session.intended_duration_minutes && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
              <Clock size={16} className="stitch-text-secondary" />
            </div>
            <div>
              <p className="text-xs stitch-text-secondary">Duration</p>
              <p className="text-sm font-bold stitch-text-primary">
                {session.intended_duration_minutes} minutes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status / countdown */}
      {isActive && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-sm font-semibold text-emerald-700">Session is live right now</p>
        </div>
      )}

      {isScheduled && !isNearlyTime && countdown && (
        <div className="flex items-center gap-2 px-4 py-3 bg-surface-container-low rounded-xl">
          <Clock size={14} className="stitch-text-secondary shrink-0" />
          <p className="text-sm font-semibold stitch-text-secondary">{countdown}</p>
        </div>
      )}

      {isScheduled && isNearlyTime && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-sm font-semibold text-amber-700">Starting very soon — you can join now</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
      )}

      {/* CTA */}
      {canJoin ? (
        <button
          type="button"
          onClick={handleJoin}
          disabled={joining}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl stitch-btn--primary text-white text-base font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:translate-y-0"
        >
          {joining ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Play size={18} />
              Join Session
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-surface-container-low stitch-text-secondary text-base font-bold cursor-not-allowed"
        >
          <Clock size={18} />
          Not started yet
        </button>
      )}

      <button
        type="button"
        onClick={() => navigate('/sessions')}
        className="w-full text-center text-sm stitch-text-secondary hover:stitch-text-primary transition-colors py-2"
      >
        ← Back to Sessions
      </button>
    </div>
  );
}
