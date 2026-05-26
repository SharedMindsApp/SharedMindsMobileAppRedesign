import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { StopCircle, Clock, Users, ChevronDown, ChevronUp, Loader2, MicOff, AlertTriangle, X, Plus, Lock, Unlock, Crown, Leaf } from 'lucide-react';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useCommunitySessionsSubscription } from './useCommunitySessionsSubscription';
import { ConnectButton } from '../connections/ConnectButton';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../../lib/supabase';
import type { FocusSession } from '../../../lib/sessions/focusTypes';
import { DailyMeeting } from './DailyMeeting';
import { markSessionEnded, triggerDebriefForSession, extendSession, promoteCoHost, setAcceptJoiners } from '../../services/SessionService';
import { DebriefOverlay } from './DebriefOverlay';
import { WaitingRoom } from './WaitingRoom';
import { AmbientPeersStrip } from './AmbientPeersStrip';
import { SessionMusicPlayer } from './SessionMusicPlayer';
import type { MusicCategory } from '../../services/SessionMusicService';
import { useSessionWizards } from './SessionWizards/useSessionWizards';
import { WizardLauncher } from './SessionWizards/WizardLauncher';
import { WizardOverlay } from './SessionWizards/WizardOverlay';
import { MidSessionStateRecheck } from './MidSessionStateRecheck';

// Sessions become joinable 5 minutes before their scheduled start.
const JOIN_WINDOW_MS = 5 * 60 * 1000;

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
  const location = useLocation();
  const { profile, user } = useAuth();
  const { activeSession, sessionGoal, sessionProject, timerSecondsRemaining, setActiveSession, clearSession } = useFocusSession();
  // Music category is now driven by the user's ARRIVAL STATE, not the
  // task's cognitive load — the old deep/medium/light axis confused the
  // two. Default to 'flow' (neutral/ready target). The user picks their
  // actual state via the player's 6-pill grid; that choice persists.
  // Future: a "How are you arriving?" wizard at session start can pre-set
  // this without the user having to open the player.
  const musicCategory: MusicCategory = 'flow';

  // Host = the user_id on the focus_sessions row, OR the promoted co-host.
  // In group sessions either can control music + wizards + extend + lock.
  const isPrimaryHost = !!user && !!activeSession && activeSession.user_id === user.id;
  const isCoHost = !!user && !!activeSession && activeSession.co_host_user_id === user.id;
  const isMusicHost = isPrimaryHost || isCoHost;
  const isMusicGroupSession = activeSession?.session_mode === 'group';

  // Session wizards (breathing, intentions, etc.) — host launches, all
  // participants see the overlay. Solo/1-on-1 sessions skip this entirely.
  const wizards = useSessionWizards({
    sessionId: activeSession?.id ?? null,
    isGroupSession: isMusicGroupSession,
    isHost: isMusicHost,
  });

  // Extend session — host updates target_end_time, realtime subscription
  // pushes the change to every participant so their timers re-derive.
  const [extending, setExtending] = useState(false);
  async function handleExtend(addMinutes: number) {
    if (!activeSession || extending) return;
    setExtending(true);
    try {
      const updated = await extendSession(activeSession.id, addMinutes);
      setActiveSession({ ...activeSession, ...updated });
    } catch (e) {
      console.error('[ActiveSession] extend failed', e);
    } finally {
      setExtending(false);
    }
  }

  // Lock / unlock joins — only meaningful for group + 1-on-1 sessions where
  // someone else could potentially join. Solo sessions never expose it.
  async function handleToggleLock() {
    if (!activeSession) return;
    const next = !(activeSession.accept_joiners ?? true);
    try {
      const updated = await setAcceptJoiners(activeSession.id, next);
      setActiveSession({ ...activeSession, ...updated });
    } catch (e) {
      console.error('[ActiveSession] toggle lock failed', e);
    }
  }

  // Promote / demote co-host. Surfaced from the participant strip when
  // present; this handler just wraps the service call so the strip can
  // be dumb. Only the primary host can promote (RLS enforces).
  async function handleSetCoHost(userId: string | null) {
    if (!activeSession || !isPrimaryHost) return;
    try {
      const updated = await promoteCoHost(activeSession.id, userId);
      setActiveSession({ ...activeSession, ...updated });
    } catch (e) {
      console.error('[ActiveSession] promote co-host failed', e);
    }
  }
  const { sessions: otherSessions } = useCommunitySessionsSubscription();
  const [showParticipants, setShowParticipants] = useState(true);
  const [ending, setEnding] = useState(false);
  // Debrief is shown when the user clicks End OR the timer reaches 0.
  // It overlays the live video; only after it finalizes do we navigate.
  const [showDebrief, setShowDebrief] = useState(false);

  // Prefer router state (passed by DeclareSessionModal) → context → null.
  // Router state is synchronously available on first render and avoids the
  // React 18 batching race where context flushes after the component mounts.
  const routerSession = (location.state as { session?: FocusSession } | null)?.session ?? null;
  const [session, setSession] = useState<FocusSession | null>(activeSession ?? routerSession);
  const [loadingSession, setLoadingSession] = useState(!(activeSession ?? routerSession));
  const [partnerJoined, setPartnerJoined] = useState<boolean>(
    (activeSession?.partner_user_id ?? null) !== null,
  );
  const [showNoShowBanner, setShowNoShowBanner] = useState(false);

  // Load session if not in context (e.g. hard refresh).
  // activeSession wins over routerSession; both skip the Supabase fetch.
  useEffect(() => {
    if (activeSession) {
      setSession(activeSession);
      setLoadingSession(false);
      return;
    }
    if (routerSession) {
      // Context hasn't flushed yet — use router state; sync to context too.
      setSession(routerSession);
      setActiveSession(routerSession);
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
        .select('*, project:projects(id, title, color)')
        .eq('id', sessionId)
        .single();

      if (!data) {
        navigate('/sessions', { replace: true });
        return;
      }

      // Allow loading scheduled sessions only inside the join window so a
      // stale URL doesn't dump someone into a lobby for a session two days out.
      if (data.status === 'scheduled') {
        const startMs = new Date(data.scheduled_at ?? data.start_time).getTime();
        const earliestJoin = startMs - JOIN_WINDOW_MS;
        if (Date.now() < earliestJoin) {
          navigate('/sessions', { replace: true });
          return;
        }
      } else if (data.status !== 'active') {
        navigate('/sessions', { replace: true });
        return;
      }
      setActiveSession(data);
      setSession(data);
      setLoadingSession(false);
    })();
  }, [sessionId, activeSession, routerSession, navigate, setActiveSession]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Clicking "End" broadcasts the debrief to ALL participants by writing
  // debrief_started_at to the DB. Their clients listen via the existing
  // focus_sessions UPDATE Realtime stream and open their own debrief
  // simultaneously. Same write happens when the timer hits zero — first
  // person to reach 0 sets the timestamp; everyone else sees it instantly.
  const handleEnd = useCallback(() => {
    if (!session || ending || showDebrief) return;
    setShowDebrief(true);
    triggerDebriefForSession(session.id).catch((err) =>
      console.warn('[ActiveSessionPage] triggerDebrief failed:', err),
    );
  }, [session, ending, showDebrief]);

  // Watch for debrief broadcasts from any participant (host's End click,
  // timer-zero trigger, or another user reaching 0 first). The session
  // row updates via Realtime → context updates → this effect fires.
  useEffect(() => {
    if (session?.debrief_started_at && !showDebrief && !ending) {
      setShowDebrief(true);
    }
  }, [session?.debrief_started_at, showDebrief, ending]);

  // Auto-open the debrief when the session timer hits zero
  useEffect(() => {
    if (timerSecondsRemaining === 0 && session && !showDebrief && !ending && !session.debrief_started_at) {
      setShowDebrief(true);
      triggerDebriefForSession(session.id).catch(() => { /* idempotent — safe */ });
    }
  }, [timerSecondsRemaining, session, showDebrief, ending]);

  // Called by DebriefOverlay once everyone has answered OR the 60s timer expires
  const handleDebriefFinalized = useCallback(async () => {
    if (!session || ending) return;
    setEnding(true);
    try {
      await markSessionEnded(session.id);
    } catch {
      // Best-effort — the row was at least flagged via the outcome insert
    }
    clearSession();
    navigate(`/session/${session.id}/summary`, { replace: true });
  }, [session, ending, navigate, clearSession]);

  const currentGoal = sessionGoal ?? session?.session_goal ?? '';
  const totalSeconds = (session?.intended_duration_minutes ?? 50) * 60;
  const progress = totalSeconds > 0
    ? Math.max(0, 1 - timerSecondsRemaining / totalSeconds)
    : 0;

  const isSolo = session?.session_mode === 'solo';
  const isOneOnOne = session?.session_mode === 'one_on_one';
  const isQuiet = session?.quiet_mode === true;

  // ── Waiting-room state ─────────────────────────────────────────────────────
  // A session is in "waiting room" mode if it's still scheduled (not promoted
  // to active yet). The WaitingRoom component drives the auto-transition: when
  // the clock hits the start time it marks the row active and re-fetches.
  const isPreStart = session?.status === 'scheduled';
  const [waitingRoomDismissed, setWaitingRoomDismissed] = useState(false);

  // When the parent of the waiting room signals "session started", we flip
  // the local copy to status='active' so DailyMeeting takes over without
  // waiting on a Supabase refetch.
  const handleSessionStarted = useCallback(() => {
    setSession((prev) => prev ? { ...prev, status: 'active' } : prev);
    setWaitingRoomDismissed(true);
  }, []);

  // In solo or 1-on-1 the community peers panel is irrelevant.
  const peers = (isSolo || isOneOnOne) ? [] : otherSessions.filter((s) => s.id !== session?.id);

  const roomName = session
    ? (isOneOnOne ? oneOnOneRoomName(session.id) : dailyRoomName())
    : dailyRoomName();

  // Session creator is always the moderator; they can admit/mute/remove others
  const isModerator = !!(session && user && session.user_id === user.id);

  const modeBadgeLabel = isSolo ? 'Solo' : isOneOnOne ? '1-on-1' : 'Group';

  if (loadingSession) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-14 sm:top-16 bg-[#1a1a2e] flex items-center justify-center z-[55]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-white/50">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    // Should rarely hit this — belt-and-suspenders redirect
    navigate('/sessions', { replace: true });
    return null;
  }

  // Portal to document.body so we escape Layout's <main> containing block.
  // (.core-main has a CSS animation, which traps position:fixed descendants.)
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 56,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 55,
        overflow: 'hidden',
      }}
    >

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
          {/* Wizard launcher. Shown to anyone who controls music in this
              session: solo users, both sides of a 1-on-1, and group hosts.
              Group participants don't see it — they can only mute. */}
          {(!isMusicGroupSession || isMusicHost) && (
            <WizardLauncher onLaunch={wizards.launchWizard} />
          )}
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <Clock size={12} className="text-white/60" />
            <span className={`text-sm font-bold tabular-nums ${timerSecondsRemaining <= 300 && timerSecondsRemaining > 0 ? 'text-amber-400' : 'text-white'}`}>
              {formatRemaining(timerSecondsRemaining)}
            </span>
          </div>

          {/* Extend buttons. Owner-only: hosts in group sessions, the
              user in solo, and either user in 1-on-1. RLS rejects others. */}
          {(!isMusicGroupSession || isMusicHost) && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleExtend(15)}
                disabled={extending || ending}
                className="flex items-center gap-0.5 bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold px-2 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-40"
                title="Extend session by 15 minutes"
              >
                <Plus size={11} />
                15
              </button>
              <button
                type="button"
                onClick={() => handleExtend(30)}
                disabled={extending || ending}
                className="flex items-center gap-0.5 bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold px-2 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-40"
                title="Extend session by 30 minutes"
              >
                <Plus size={11} />
                30
              </button>
              {/* Lock/unlock joins — only meaningful for sessions where
                  someone else could potentially join (not solo). */}
              {activeSession?.session_mode !== 'solo' && (
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className={`w-7 h-7 rounded-full grid place-items-center transition-colors ${
                    activeSession?.accept_joiners === false
                      ? 'bg-amber-500/30 text-amber-200 hover:bg-amber-500/40'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                  title={activeSession?.accept_joiners === false ? 'Joins locked — click to allow new joiners' : 'Lock joins — no new participants'}
                  aria-pressed={activeSession?.accept_joiners === false}
                >
                  {activeSession?.accept_joiners === false ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
              )}
            </div>
          )}

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

      {/* ── Waiting room (scheduled, not yet started) ───────────── */}
      {isPreStart && !waitingRoomDismissed && user && (
        <div style={{ flex: '1 1 0', minHeight: 0, position: 'relative' }}>
          <WaitingRoom
            sessionId={session.id}
            sessionTitle={(session as { session_title?: string }).session_title ?? currentGoal ?? 'Session'}
            declaredGoal={currentGoal || null}
            scheduledStart={(session as { scheduled_at?: string }).scheduled_at ?? session.start_time}
            isModerator={isModerator}
            currentUserId={user.id}
            displayName={profile?.display_name ?? 'Member'}
            avatarUrl={profile?.avatar_url ?? null}
            onLeave={() => navigate('/sessions')}
            onSessionStart={handleSessionStarted}
          />
        </div>
      )}

      {/* ── Body: Jitsi for group/1-on-1, focused view for solo ── */}
      {/* Skip rendering the live body until the waiting room finishes —
          we don't want to burn Daily.co minutes during the pre-start lobby. */}
      {(isPreStart && !waitingRoomDismissed) ? null : isSolo ? (
        <div style={{ flex: '1 1 0', minHeight: 0, position: 'relative' }}>
          <SoloFocusView
            goal={currentGoal}
            secondsRemaining={timerSecondsRemaining}
            totalSeconds={totalSeconds}
            hideAmbientStrip={!!session.body_double || !!session.is_offline}
            isOffline={!!session.is_offline}
          />

          {/* Body-double mode: silent video grid sidebar.
              All body-doublers share the same persistent Daily room
              (mic forced off via Daily token permissions, camera required). */}
          {session.body_double && user && profile && (
            <aside
              className="absolute right-0 top-0 bottom-0 w-72 md:w-80 z-10 bg-black/30 backdrop-blur-sm border-l border-white/5 hidden md:block"
              aria-label="Silent body-double video"
            >
              <div className="px-3 pt-3 pb-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300/80">
                  Body double · silent
                </p>
                <p className="text-[10px] text-white/40 leading-snug mt-0.5">
                  Mic is locked off. Just presence.
                </p>
              </div>
              <div className="absolute inset-0 top-12">
                <DailyMeeting
                  roomName="sharedminds-bodydouble"
                  displayName={profile.display_name ?? 'Member'}
                  isModerator={false}
                  startAudioMuted
                  startVideoMuted={false}
                  avatarVerified={profile.avatar_status === 'approved'}
                  bodyDouble
                  chromeless
                  onLeave={() => navigate('/sessions')}
                />
              </div>
            </aside>
          )}

          {/* Solo debrief renders inline over the focus view */}
          {showDebrief && user && (
            <DebriefOverlay
              sessionId={session.id}
              declaredGoal={currentGoal || null}
              currentUserId={user.id}
              taskId={session.session_task_id ?? null}
              onFinalized={handleDebriefFinalized}
            />
          )}
        </div>
      ) : (
        <div style={{ flex: '1 1 0', minHeight: 0, position: 'relative' }}>
          <DailyMeeting
            roomName={roomName}
            displayName={profile?.display_name ?? 'Member'}
            isModerator={isModerator}
            startAudioMuted={isQuiet}
            startVideoMuted={false}
            avatarVerified={profile?.avatar_status === 'approved'}
            focusSessionId={session.id}
            onParticipantJoined={() => {
              setPartnerJoined(true);
              setShowNoShowBanner(false);
            }}
            // Just-leave-the-call: navigate this user out without ending
            // the session for everyone else. The host uses the top-bar
            // "End" button (handleEnd) to trigger the debrief.
            onLeave={() => navigate('/sessions')}
          />
          {/* Group/1-on-1 debrief renders over the live video so everyone
              sees each other's answers while still in the call */}
          {showDebrief && user && (
            <DebriefOverlay
              sessionId={session.id}
              declaredGoal={currentGoal || null}
              currentUserId={user.id}
              taskId={session.session_task_id ?? null}
              onFinalized={handleDebriefFinalized}
            />
          )}
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
                    <p className="text-[11px] font-bold text-white/80 truncate flex items-center gap-1">
                      {p.display_name}
                      {activeSession?.co_host_user_id === p.user_id && (
                        <span title="Co-host">
                          <Crown size={10} className="text-amber-300 shrink-0" />
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-white/50 truncate">
                      {p.session_goal ?? 'Working on something'}
                    </p>
                  </div>
                  {/* Primary host can promote / demote any participant.
                      Co-host themselves can't reshuffle to avoid coups. */}
                  {isPrimaryHost && p.user_id !== user?.id && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSetCoHost(
                          activeSession?.co_host_user_id === p.user_id ? null : p.user_id,
                        )
                      }
                      className={`w-7 h-7 rounded-full grid place-items-center transition-colors ${
                        activeSession?.co_host_user_id === p.user_id
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                      title={
                        activeSession?.co_host_user_id === p.user_id
                          ? 'Remove co-host'
                          : 'Make co-host'
                      }
                      aria-label="Toggle co-host"
                    >
                      <Crown size={11} />
                    </button>
                  )}
                  <ConnectButton otherUserId={p.user_id} variant="dark" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating music mini-bar — opt-in background tracks. In hosted
          group sessions the host controls the track; participants can only
          mute on their device. Solo / 1-on-1 sessions stay per-user. */}
      <SessionMusicPlayer
        category={musicCategory}
        sessionId={activeSession?.id ?? null}
        isGroupSession={isMusicGroupSession}
        isHost={isMusicHost}
      />

      {/* Wizard overlay — covers the session when a guided experience is
          running. Host launches via the top-bar sparkles button. */}
      <WizardOverlay
        wizardId={wizards.activeWizardId}
        isHost={isMusicHost}
        onLocalDismiss={wizards.dismissLocally}
        onBroadcastEnd={wizards.broadcastEnd}
      />

      {/* Mid-session state recheck — only for users who control music,
          only when music is currently audible, only past the 60-min mark. */}
      <MidSessionStateRecheck
        totalSeconds={totalSeconds}
        remainingSeconds={timerSecondsRemaining}
        applicable={!isMusicGroupSession || isMusicHost}
        onRepick={() => wizards.launchWizard('arrival_state')}
      />
    </div>,
    document.body,
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
  hideAmbientStrip = false,
  isOffline = false,
}: {
  goal: string;
  secondsRemaining: number;
  totalSeconds: number;
  /** Hide the avatars-only ambient peers strip — used when body-double
      mode is on and the silent video grid already provides presence. */
  hideAmbientStrip?: boolean;
  /** Real-world / away-from-screen mode. Renders a phone-optimised
      chrome: bigger timer text, no animated focus circle (which only
      makes sense on a glance back), warmer language. */
  isOffline?: boolean;
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

  // Web Notifications when offline — fire a phone notification at timer
  // zero so the user knows their session is up even with the app
  // backgrounded. Request permission lazily on entry; degrade silently
  // if denied (we still always show the in-app debrief). One-shot guard
  // prevents repeated notifications if the timer re-enters 0 across
  // re-renders.
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (!isOffline) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => {});
    }
  }, [isOffline]);
  useEffect(() => {
    if (!isOffline) return;
    if (notifiedRef.current) return;
    if (secondsRemaining > 0) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    notifiedRef.current = true;
    try {
      new Notification('Session complete', {
        body: goal ? `Done with: ${goal}` : 'Time to come back and log your progress.',
        icon: '/favicon-192.png',
        tag: 'sharedminds-session-complete',
        requireInteraction: false,
      });
    } catch { /* ignore — desktop browsers can be picky about icons */ }
  }, [isOffline, secondsRemaining, goal]);

  // ── Real-world / offline chrome ─────────────────────────────────────
  // Stripped-down phone-first layout: warm gradient, big tabular timer,
  // no focus circle (it's a glance-back surface, not a watch-the-counter
  // experience). Goal pinned at the top so it's the first thing the
  // user sees when they pop their phone back on.
  if (isOffline) {
    return (
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.18),transparent_60%)]" />
        <div className="relative h-full flex flex-col items-center justify-center px-6 py-8 text-center gap-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-200 text-[10px] font-bold uppercase tracking-widest">
            <Leaf size={11} /> Real world
          </span>
          <p className="text-base sm:text-lg font-semibold text-white/90 leading-snug max-w-md">
            {goal || 'Focusing offline'}
          </p>
          <p className="text-6xl sm:text-7xl font-extrabold text-white tabular-nums leading-none">
            {formatRemaining(secondsRemaining)}
          </p>
          <p className="text-[11px] text-white/55 max-w-xs leading-snug">
            Put your phone down. We'll ping you when the timer's up — then come back to log how it went.
          </p>
          {elapsedMin > 0 && (
            <p className="text-[10px] text-white/40 uppercase tracking-widest">
              {elapsedMin} / {totalMin} min in
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-0 overflow-hidden">
      {/* Ambient gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.12),transparent_60%)]" />

      {/* Ambient peers strip — recreates the "body double" effect by
          showing other members currently working solo. Pure presence,
          no interaction. Hidden on mobile to keep the focus circle
          breathing room. Also hidden when body-double video mode is on
          (the silent video grid already serves the presence purpose). */}
      {!hideAmbientStrip && <AmbientPeersStrip />}

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
