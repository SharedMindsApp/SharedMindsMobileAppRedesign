import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StopCircle, Clock, Users, ChevronDown, ChevronUp, Loader2, MicOff, AlertTriangle, X } from 'lucide-react';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useCommunitySessionsSubscription } from './useCommunitySessionsSubscription';
import { ConnectButton } from '../connections/ConnectButton';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../../lib/supabase';
import type { FocusSession } from '../../../lib/sessions/focusTypes';
import { JitsiMeeting } from './JitsiMeeting';

// Daily shared room — everyone in a group session today joins the same Jitsi room.
function dailyRoomName(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `sharedminds-coworking-${y}-${m}-${day}`;
}

// 1-on-1 room — per-session unique name so only the host + claimed partner share it.
function oneOnOneRoomName(sessionId: string): string {
  // Strip non-alphanumerics for a clean Jitsi room slug.
  const safeId = sessionId.replace(/[^a-zA-Z0-9]/g, '');
  return `sharedminds-1on1-${safeId}`;
}

const PROJECT_CHIP_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectChipColor(token: string | null): string {
  return PROJECT_CHIP_HEX[token ?? ''] ?? PROJECT_CHIP_HEX.blue;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'Time up';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
];

function avatarClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ActiveSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeSession, sessionGoal, sessionProject, timerSecondsRemaining, setActiveSession } = useFocusSession();
  const { sessions: otherSessions } = useCommunitySessionsSubscription();
  const [showParticipants, setShowParticipants] = useState(true);
  const [ending, setEnding] = useState(false);
  const [session, setSession] = useState<FocusSession | null>(activeSession);
  const [loadingSession, setLoadingSession] = useState(!activeSession);
  const [partnerJoined, setPartnerJoined] = useState<boolean>(
    (activeSession?.partner_user_id ?? null) !== null,
  );
  const [showNoShowBanner, setShowNoShowBanner] = useState(false);

  // Load session if not in context (e.g. hard refresh)
  useEffect(() => {
    if (activeSession) {
      setSession(activeSession);
      setLoadingSession(false);
      return;
    }
    if (!sessionId) {
      navigate('/sessions', { replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!data || data.status !== 'active') {
        navigate('/sessions', { replace: true });
        return;
      }
      setActiveSession(data);
      setSession(data);
      setLoadingSession(false);
    })();
  }, [sessionId, activeSession, navigate, setActiveSession]);

  // Redirect to summary when time is up
  useEffect(() => {
    if (timerSecondsRemaining === 0 && session && !ending) {
      // Give a moment for the user to see "Time up" before redirecting
    }
  }, [timerSecondsRemaining, session, ending]);

  // 1-on-1: subscribe to session row so we know when the partner claims the slot
  useEffect(() => {
    if (!session || session.session_mode !== 'one_on_one') return;

    // Initialise from loaded session data
    setPartnerJoined((session.partner_user_id ?? null) !== null);

    const channel = supabase
      .channel(`session-partner-watch:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'focus_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updated = payload.new as FocusSession;
          if (updated.partner_user_id) {
            setPartnerJoined(true);
            setShowNoShowBanner(false); // partner is here — dismiss any warning
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.id, session?.session_mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // 1-on-1: show "partner hasn't joined" banner after 5 minutes if still no partner
  useEffect(() => {
    if (!session || session.session_mode !== 'one_on_one' || partnerJoined) return;

    const FIVE_MINUTES = 5 * 60 * 1000;
    const id = setTimeout(() => {
      if (!partnerJoined) setShowNoShowBanner(true);
    }, FIVE_MINUTES);

    return () => clearTimeout(id);
  }, [session?.id, session?.session_mode, partnerJoined]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnd = useCallback(() => {
    if (!session || ending) return;
    setEnding(true);
    navigate(`/session/${session.id}/summary`, { replace: true });
  }, [session, ending, navigate]);

  const currentGoal = sessionGoal ?? session?.session_goal ?? '';
  const totalSeconds = (session?.intended_duration_minutes ?? 50) * 60;
  const progress = totalSeconds > 0
    ? Math.max(0, 1 - timerSecondsRemaining / totalSeconds)
    : 0;

  const isSolo = session?.session_mode === 'solo';
  const isOneOnOne = session?.session_mode === 'one_on_one';
  const isQuiet = session?.quiet_mode === true;

  // In solo or 1-on-1 the community peers panel is irrelevant.
  const peers = (isSolo || isOneOnOne) ? [] : otherSessions.filter((s) => s.id !== session?.id);

  const roomName = session
    ? (isOneOnOne ? oneOnOneRoomName(session.id) : dailyRoomName())
    : dailyRoomName();

  const modeBadgeLabel = isSolo ? 'Solo' : isOneOnOne ? '1-on-1' : 'Group';

  if (loadingSession) {
    return (
      <div className="fixed inset-0 bg-surface flex items-center justify-center z-40">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col z-40 overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 pt-safe-or-3 pt-3 pb-3 bg-black/30 backdrop-blur-sm">
        {/* Goal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Working on
            </p>
            {/* Mode + quiet badges */}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-white/80 uppercase tracking-wider">
              {modeBadgeLabel}
            </span>
            {isQuiet && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-white/80 uppercase tracking-wider">
                <MicOff size={9} /> Quiet
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-white truncate leading-snug">
            {currentGoal || 'Your session'}
          </p>
          {sessionProject && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: projectChipColor(sessionProject.color) }}
              />
              <span className="text-[11px] font-semibold text-white/70 truncate">
                {sessionProject.title}
              </span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <Clock size={12} className="text-white/60" />
            <span className={`text-sm font-bold tabular-nums ${timerSecondsRemaining <= 300 && timerSecondsRemaining > 0 ? 'text-amber-400' : 'text-white'}`}>
              {formatRemaining(timerSecondsRemaining)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleEnd}
            disabled={ending}
            className="flex items-center gap-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-50"
          >
            <StopCircle size={13} />
            End
          </button>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────── */}
      <div className="shrink-0 h-0.5 bg-white/10">
        <div
          className="h-full bg-primary transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* ── Partner no-show banner (1-on-1 only) ────────────── */}
      {showNoShowBanner && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-amber-500/20 border-b border-amber-400/30">
          <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          <p className="flex-1 text-xs text-amber-200 leading-snug">
            Your partner hasn't joined yet — you can keep going solo or end early.
          </p>
          <button
            type="button"
            onClick={() => setShowNoShowBanner(false)}
            className="shrink-0 text-amber-400/70 hover:text-amber-300 transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Body: Jitsi for group/1-on-1, focused view for solo ── */}
      {isSolo ? (
        <SoloFocusView
          goal={currentGoal}
          secondsRemaining={timerSecondsRemaining}
          totalSeconds={totalSeconds}
        />
      ) : (
        <div className="flex-1 relative min-h-0">
          <JitsiMeeting
            roomName={roomName}
            displayName={profile?.display_name ?? 'Member'}
            startAudioMuted={isQuiet}
            startVideoMuted={false}
            onParticipantJoined={() => {
              setPartnerJoined(true);
              setShowNoShowBanner(false);
            }}
            onHangup={handleEnd}
          />
        </div>
      )}

      {/* ── Participants panel ───────────────────────────────── */}
      {peers.length > 0 && (
        <div className="shrink-0 bg-black/40 backdrop-blur-sm border-t border-white/10">
          {/* Toggle header */}
          <button
            type="button"
            onClick={() => setShowParticipants((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-white/70 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users size={13} />
              <span className="text-xs font-semibold">
                {peers.length} {peers.length === 1 ? 'person' : 'people'} working now
              </span>
              {/* Live avatars */}
              <div className="flex -space-x-1">
                {peers.slice(0, 4).map((p) => (
                  p.avatar_url ? (
                    <img
                      key={p.id}
                      src={p.avatar_url}
                      alt={p.display_name}
                      className="w-5 h-5 rounded-full object-cover shrink-0 border border-black/20"
                    />
                  ) : (
                    <div
                      key={p.id}
                      className={`w-5 h-5 rounded-full ${avatarClass(p.display_name)} flex items-center justify-center text-[9px] font-bold border border-black/20`}
                    >
                      {p.display_name.charAt(0).toUpperCase()}
                    </div>
                  )
                ))}
              </div>
            </div>
            {showParticipants ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          {/* Participant goal cards */}
          {showParticipants && (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
              {peers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 bg-white/8 rounded-xl px-3 py-2"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.display_name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className={`w-7 h-7 rounded-full ${avatarClass(p.display_name)} flex items-center justify-center text-[11px] font-bold shrink-0`}>
                      {p.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-white/80 truncate">
                      {p.display_name}
                    </p>
                    <p className="text-[10px] text-white/50 truncate">
                      {p.session_goal ?? 'Working on something'}
                    </p>
                  </div>
                  <ConnectButton otherUserId={p.user_id} variant="dark" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Solo focus view ──────────────────────────────────────────────
//
// Distraction-free presentation for solo sessions: ambient gradient,
// big circular progress, the goal in the centre. No Jitsi, no peers.
// The top bar (with goal, timer, end button) is still rendered above this.

function SoloFocusView({
  goal,
  secondsRemaining,
  totalSeconds,
}: {
  goal: string;
  secondsRemaining: number;
  totalSeconds: number;
}) {
  const progress = totalSeconds > 0 ? Math.max(0, 1 - secondsRemaining / totalSeconds) : 0;
  const elapsedMin = Math.max(0, Math.floor((totalSeconds - secondsRemaining) / 60));
  const totalMin = Math.round(totalSeconds / 60);
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  // Friendly "phase" hint based on progress
  const phase =
    progress < 0.1
      ? 'Getting started'
      : progress < 0.5
      ? 'Building momentum'
      : progress < 0.9
      ? 'In the zone'
      : 'Bring it home';

  return (
    <div className="flex-1 relative min-h-0 overflow-hidden">
      {/* Ambient gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.12),transparent_60%)]" />

      <div className="relative h-full flex flex-col items-center justify-center px-6 py-8 text-center">
        {/* Circular progress + elapsed/total in centre */}
        <div className="relative mb-8">
          <svg width="260" height="260" viewBox="0 0 260 260" className="-rotate-90">
            <circle
              cx="130"
              cy="130"
              r={radius}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="130"
              cy="130"
              r={radius}
              stroke="url(#solo-grad)"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
            <defs>
              <linearGradient id="solo-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
              {phase}
            </p>
            <p className="text-5xl font-extrabold text-white tabular-nums">
              {elapsedMin}
              <span className="text-2xl text-white/50">/{totalMin}</span>
            </p>
            <p className="text-xs text-white/50 mt-1">minutes</p>
          </div>
        </div>

        {/* Goal */}
        <div className="max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
            You declared
          </p>
          <p className="text-lg font-bold text-white leading-snug">
            {goal || 'Your session'}
          </p>
        </div>

        <p className="text-xs text-white/40 mt-10 max-w-xs leading-relaxed">
          No room, no audience. Just you and the work. Come back when you're done.
        </p>
      </div>
    </div>
  );
}
