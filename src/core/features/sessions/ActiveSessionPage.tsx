import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { StopCircle, Clock, Users, ChevronDown, ChevronUp, Loader2, MicOff, AlertTriangle, X, Plus, Lock, Unlock, Crown, Leaf, Minimize2, Palette, Check, DoorOpen, DoorClosed } from 'lucide-react';
import { useFocusSession } from '../../../contexts/FocusSessionContext';
import { useCommunitySessionsSubscription } from './useCommunitySessionsSubscription';
import { ConnectButton } from '../connections/ConnectButton';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../../lib/supabase';
import type { FocusSession } from '../../../lib/sessions/focusTypes';
import { DailyMeeting } from './DailyMeeting';
import { markSessionEnded, triggerDebriefForSession, extendSession, promoteCoHost, setAcceptJoiners, closeTheDoor, finishIntroPhase } from '../../services/SessionService';
import { playJoinChime, playPhaseTransition } from './sessionSounds';
import { musicAudioBus } from './musicAudioBus';
import { DebriefOverlay } from './DebriefOverlay';
import { ParkItPanel } from './ParkItPanel';
import { WaitingRoom } from './WaitingRoom';
import { AmbientPeersStrip } from './AmbientPeersStrip';
import { SoloVisualizer, readVisualizerStyle, writeVisualizerStyle, type VisualizerStyle } from './SoloVisualizer';
import { sessionChimes, readChimesEnabled, writeChimesEnabled } from './sessionChimes';
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

  // Realtime: watch the session row for partner claims + intro-phase
  // transitions. Gate widened from the original 1-on-1-only check so
  // open-to-match solo sessions also subscribe (they only become 1-on-1
  // after a joiner claims; we need the subscription up before that
  // moment to actually catch it).
  //
  // Side-effects on the host's client when a partner claims:
  //   • play join chime
  //   • duck music if the RPC set an intro_phase_ends_at (talk time)
  //   • dismiss the no-show banner
  // For both parties when intro_phase_ends_at nulls (or the timestamp
  // passes): restore music + play phase-transition chime — wired in the
  // separate intro-phase effect below.
  useEffect(() => {
    if (!session) return;
    const isParticipant = session.session_mode === 'one_on_one'
      || (session.open_to_match === true && session.status === 'active');
    if (!isParticipant) return;

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
          const wasUnpartnered = !session.partner_user_id;
          const nowPartnered   = !!updated.partner_user_id;
          // Propagate the full row so dependent UI (host pill, matched
          // pill, intro overlay) reactively flips on the same render.
          setSession(updated);
          if (nowPartnered) {
            setPartnerJoined(true);
            setShowNoShowBanner(false);
          }
          // Fresh claim — chime + duck. The duck is paired with a
          // restore in the intro-phase-end effect below. If the RPC
          // decided "no intro" (silent vibe / late arrival), we skip
          // ducking since there's nothing to talk over.
          if (wasUnpartnered && nowPartnered) {
            playJoinChime();
            if (updated.intro_phase_ends_at) {
              musicAudioBus.duck();
            }
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.id, session?.session_mode, session?.open_to_match, session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intro-phase transition watcher. While intro_phase_ends_at is set
  // and in the future, music stays ducked and the overlay is visible.
  // When the timestamp passes (timer tick) OR is nulled (someone tapped
  // "Start working now"), we restore music + play the transition chime
  // exactly once — guard via a ref so a re-render doesn't replay it.
  const introTransitionedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!session) return;
    const endsAt = session.intro_phase_ends_at;
    if (!endsAt) {
      // No intro active — but if we had one and it just got nulled,
      // we still need to handle the transition. introTransitionedRef
      // tracks per-session-id so closing one session and opening another
      // with no intro doesn't fire phantom transitions.
      if (introTransitionedRef.current && introTransitionedRef.current !== session.id) {
        introTransitionedRef.current = null;
      }
      return;
    }

    // Schedule a transition fire when the timestamp passes.
    const endsAtMs = new Date(endsAt).getTime();
    const msUntil  = Math.max(0, endsAtMs - Date.now());

    function fireTransition() {
      // Idempotency: only fire once per session id.
      if (introTransitionedRef.current === session!.id) return;
      introTransitionedRef.current = session!.id;
      playPhaseTransition();
      musicAudioBus.restore();
      // Auto-mute mics on the work-block boundary — but only when the
      // host's vibe isn't 'chatty' (chatty hosts explicitly invited
      // ongoing conversation). Silent vibe already started muted via
      // startAudioMuted below, but we mute again here as a safety
      // net in case the user manually unmuted during the silent
      // intro for some reason.
      if (session!.vibe !== 'chatty') {
        setMuteAudioSignal((n) => n + 1);
      }
    }

    if (msUntil === 0) {
      // Already past (rare — covers reload mid-intro after the timestamp).
      fireTransition();
      return;
    }
    const id = window.setTimeout(fireTransition, msUntil);
    return () => window.clearTimeout(id);
  }, [session?.id, session?.intro_phase_ends_at]); // eslint-disable-line react-hooks/exhaustive-deps

  // Belt-and-braces: if the user navigates away from a session that had
  // music ducked, restore on unmount so other surfaces don't inherit
  // a whisper-quiet volume.
  useEffect(() => () => { musicAudioBus.restore(); }, []);

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
  //
  // Sanity guard: only open if there's <30s left on the clock. Without
  // this, a stale `debrief_started_at` (from a previous run, or from a
  // session that was extended after the flag was set) pops the debrief
  // on refresh even when minutes remain. The host's explicit "End" path
  // doesn't go through this effect — it calls setShowDebrief directly
  // — so we're not gating against legitimate manual ends.
  useEffect(() => {
    if (!session?.debrief_started_at || showDebrief || ending) return;
    if (timerSecondsRemaining > 30) return;
    setShowDebrief(true);
  }, [session?.debrief_started_at, showDebrief, ending, timerSecondsRemaining]);

  // Auto-open the debrief when the session timer hits zero. We can't
  // gate purely on `timerSecondsRemaining === 0` — that value is 0 on
  // the initial render before the countdown is computed, which would
  // pop the debrief instantly. Earlier we cross-checked against
  // target_end_time > Date.now(), but the timer ticks every 1000ms
  // using floor() so remaining hits 0 a few hundred ms BEFORE the
  // wall-clock target — that race made the debrief lag by up to a
  // full second after the visible "Time up" badge.
  //
  // New gate: confirm the session has actually started (start_time in
  // the past) and the planned duration is real (>0). If both hold and
  // remaining is 0, fire immediately — no wall-clock cross-check.
  useEffect(() => {
    if (!session || showDebrief || ending || session.debrief_started_at) return;
    if (timerSecondsRemaining !== 0) return;
    const startMs = session.start_time ? new Date(session.start_time).getTime() : null;
    const durationMin = session.intended_duration_minutes ?? 0;
    if (!startMs || startMs > Date.now()) return;  // hasn't started
    if (durationMin <= 0) return;                  // unknown duration
    // CRITICAL: `timerSecondsRemaining` is 0 on the very first render — before
    // the countdown initialises — which would pop the debrief at the START of
    // a session. Only fire when wall-clock has actually reached the planned
    // end (small 1.5s tolerance for the floor() tick race), so the 0 has to be
    // a real "time's up", not an uninitialised value.
    const endMs = startMs + durationMin * 60_000;
    if (Date.now() < endMs - 1500) return;
    setShowDebrief(true);
    triggerDebriefForSession(session.id).catch(() => { /* idempotent — safe */ });
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
  /** Silent vibe = host wants no talking at all. Treat exactly like
   *  quiet_mode for the purpose of starting the meeting muted. */
  const isSilentVibe = session?.vibe === 'silent';

  /** Counter-style imperative trigger threaded into DailyMeeting. Each
   *  increment fires a single setLocalAudio(false). Bumped on the
   *  intro→work transition (see effect below) when vibe ≠ chatty. */
  const [muteAudioSignal, setMuteAudioSignal] = useState(0);

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
  //
  // The page-shell backgroundColor must match the active app theme so
  // any uncovered area (below the focus body, behind translucent top
  // bar) doesn't show hardcoded dark navy when the user is in light
  // mode. Read the app theme class on document root.
  const isLightApp = typeof document !== 'undefined'
    && document.documentElement.classList.contains('theme-light');
  const pageBackground = isLightApp ? '#ffffff' : '#1a1a2e';
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 56,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: pageBackground,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 55,
        overflow: 'hidden',
      }}
    >

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 pt-safe-or-3 pt-3 pb-3 bg-black/30 backdrop-blur-sm">
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
          {/* Open-to-match host pill — only the host of an unclaimed
              open session sees this. Tap the × to close the door
              (flip open_to_match=false) without ending the session.
              Disappears the moment a joiner claims (partner_user_id set). */}
          {isPrimaryHost
            && session?.status === 'active'
            && session?.open_to_match === true
            && !session?.partner_user_id
            && (
              <OpenToMatchHostPill sessionId={session.id} />
            )}
          {/* Matched-session pill — once a joiner arrives, both parties
              see a "Matched · their name" pill. Tiny social ack. */}
          {session?.partner_user_id && session?.session_mode === 'one_on_one' && session?.match_joined_at && (
            <div className="flex items-center gap-1.5 mt-1">
              <Users size={11} className="text-emerald-300 shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-200/90 truncate">
                Matched · co-working live
              </span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Wizard launcher. Shown to anyone who controls music in this
              session: solo users, both sides of a 1-on-1, and group hosts.
              Group participants don't see it — they can only mute. */}
          {(!isMusicGroupSession || isMusicHost) && (
            <WizardLauncher onLaunch={wizards.launchWizard} />
          )}
          {/* Header timer pill. Hidden in solo — the big circular timer in
              the focus view IS the timer there, so showing both is a
              confusing duplicate (and wastes scarce header width on mobile).
              Jitsi (group/1-on-1) sessions have no circular timer, so they
              keep this pill. */}
          {!isSolo && (
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
              <Clock size={12} className="text-white/60" />
              <span className={`text-sm font-bold tabular-nums ${timerSecondsRemaining <= 300 && timerSecondsRemaining > 0 ? 'text-amber-400' : 'text-white'}`}>
                {formatRemaining(timerSecondsRemaining)}
              </span>
            </div>
          )}

          {/* Minimize — keeps the session running in the background as
              a floating pill (FloatingTimerWidget in Layout) so the user
              can plan their next session, edit a project, etc. without
              ending the timer. Solo only — group/1-on-1 sessions need
              the video chrome to stay active. */}
          {isSolo && (
            <button
              type="button"
              onClick={() => navigate('/home')}
              title="Minimize — keep timer running in the background"
              aria-label="Minimize session"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-white/80 hover:text-white transition-colors"
            >
              <Minimize2 size={13} />
            </button>
          )}

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

      {/* ── Intro phase overlay — visible to both parties when a fresh
            matched pair are in their "say hi" window. Disappears when
            the timestamp passes OR either party taps "Start working".
            See migration 20260527000015 for intro-length rules. */}
      {session?.intro_phase_ends_at && new Date(session.intro_phase_ends_at).getTime() > Date.now() && (
        <IntroPhaseOverlay
          sessionId={session.id}
          endsAtIso={session.intro_phase_ends_at}
          vibe={session.vibe ?? 'brief_hi'}
        />
      )}

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

          {/* Solo debrief renders inline over the focus view. skipWait
              dismisses the overlay the moment the user picks an outcome —
              there are no peers to wait for. */}
          {showDebrief && user && (
            <DebriefOverlay
              sessionId={session.id}
              declaredGoal={currentGoal || null}
              currentUserId={user.id}
              taskId={session.session_task_id ?? null}
              onFinalized={handleDebriefFinalized}
              skipWait
              sessionKind={session.session_kind ?? undefined}
            />
          )}
        </div>
      ) : (
        <div style={{ flex: '1 1 0', minHeight: 0, position: 'relative' }}>
          <DailyMeeting
            roomName={roomName}
            displayName={profile?.display_name ?? 'Member'}
            isModerator={isModerator}
            startAudioMuted={isQuiet || isSilentVibe}
            startVideoMuted={false}
            avatarVerified={profile?.avatar_status === 'approved'}
            focusSessionId={session.id}
            muteAudioSignal={muteAudioSignal}
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
              sessionKind={session.session_kind ?? undefined}
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

      {/* SessionMusicPlayer is mounted by Layout (PersistentMusicMount)
          so audio survives route changes — e.g. minimising the timer
          shouldn't stop the music. The component used to live here. */}

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

      {/* Distraction parking lot — capture interruptions without chasing
          them. Hidden during the debrief (captures get triaged there). */}
      {session && !showDebrief && <ParkItPanel sessionId={session.id} />}
    </div>,
    document.body,
  );
}

// ── Solo focus view ──────────────────────────────────────────────
//
// ── Solo focus themes ─────────────────────────────────────────────────
//
// User-picked background palettes for the solo focus view. Saved per
// user via localStorage so the choice survives across sessions. The
// timer ring + halo colours derive from the theme so the whole surface
// feels coherent — no more violet ring on a forest backdrop.

/** A single visual variant of a theme — either light or dark mode. */
interface SoloThemeVariant {
  /** CSS gradient for the body backdrop. */
  bg: string;
  /** Two radial accents painted on top of the bg for depth. */
  accent1: string;
  accent2: string;
  /** Hex for the halo glow + ring start colour. */
  haloHex: string;
  /** SVG linear gradient stops [start, end] for the progress arc. */
  ringStops: [string, string];
  /** Text tones for digits, labels, subtitles. */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Used by the picker swatch — small color sample. */
  swatchHex: string;
  /** Track stroke under the progress arc. */
  trackStroke: string;
  /** Tick mark stroke (12/3/6/9 cue). */
  tickStroke: string;
}

interface SoloTheme {
  id: string;
  label: string;
  dark: SoloThemeVariant;
  light: SoloThemeVariant;
}

const SOLO_THEMES: SoloTheme[] = [
  {
    id: 'midnight', label: 'Midnight',
    dark: {
      bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      accent1: 'radial-gradient(circle at 30% 20%, rgba(99,102,241,0.18), transparent 60%)',
      accent2: 'radial-gradient(circle at 70% 80%, rgba(168,85,247,0.12), transparent 60%)',
      haloHex: '#a78bfa', ringStops: ['#a78bfa', '#60a5fa'],
      textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.55)', textMuted: 'rgba(255,255,255,0.40)',
      swatchHex: '#3730a3',
      trackStroke: 'rgba(255,255,255,0.06)', tickStroke: 'rgba(255,255,255,0.15)',
    },
    light: {
      bg: 'linear-gradient(135deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)',
      accent1: 'radial-gradient(circle at 30% 20%, rgba(99,102,241,0.16), transparent 60%)',
      accent2: 'radial-gradient(circle at 70% 80%, rgba(168,85,247,0.12), transparent 60%)',
      haloHex: '#c4b5fd', ringStops: ['#8b5cf6', '#3b82f6'],
      textPrimary: '#1e1b4b', textSecondary: 'rgba(30,27,75,0.65)', textMuted: 'rgba(30,27,75,0.45)',
      swatchHex: '#c7d2fe',
      trackStroke: 'rgba(30,27,75,0.10)', tickStroke: 'rgba(30,27,75,0.25)',
    },
  },
  {
    id: 'aurora', label: 'Aurora',
    dark: {
      bg: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      accent1: 'radial-gradient(circle at 20% 30%, rgba(34,211,238,0.22), transparent 60%)',
      accent2: 'radial-gradient(circle at 80% 70%, rgba(167,139,250,0.18), transparent 60%)',
      haloHex: '#22d3ee', ringStops: ['#22d3ee', '#a78bfa'],
      textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.55)', textMuted: 'rgba(255,255,255,0.40)',
      swatchHex: '#5b21b6',
      trackStroke: 'rgba(255,255,255,0.06)', tickStroke: 'rgba(255,255,255,0.15)',
    },
    light: {
      bg: 'linear-gradient(135deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)',
      accent1: 'radial-gradient(circle at 20% 30%, rgba(34,211,238,0.18), transparent 60%)',
      accent2: 'radial-gradient(circle at 80% 70%, rgba(167,139,250,0.14), transparent 60%)',
      haloHex: '#a5f3fc', ringStops: ['#0891b2', '#7c3aed'],
      textPrimary: '#164e63', textSecondary: 'rgba(22,78,99,0.65)', textMuted: 'rgba(22,78,99,0.45)',
      swatchHex: '#cffafe',
      trackStroke: 'rgba(22,78,99,0.10)', tickStroke: 'rgba(22,78,99,0.25)',
    },
  },
  {
    id: 'forest', label: 'Forest',
    dark: {
      bg: 'linear-gradient(135deg, #064e3b 0%, #022c22 50%, #0f1f1c 100%)',
      accent1: 'radial-gradient(circle at 25% 25%, rgba(16,185,129,0.20), transparent 60%)',
      accent2: 'radial-gradient(circle at 75% 75%, rgba(45,212,191,0.14), transparent 60%)',
      haloHex: '#34d399', ringStops: ['#34d399', '#2dd4bf'],
      textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.55)', textMuted: 'rgba(255,255,255,0.40)',
      swatchHex: '#065f46',
      trackStroke: 'rgba(255,255,255,0.06)', tickStroke: 'rgba(255,255,255,0.15)',
    },
    light: {
      bg: 'linear-gradient(135deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)',
      accent1: 'radial-gradient(circle at 25% 25%, rgba(16,185,129,0.18), transparent 60%)',
      accent2: 'radial-gradient(circle at 75% 75%, rgba(45,212,191,0.12), transparent 60%)',
      haloHex: '#6ee7b7', ringStops: ['#059669', '#0d9488'],
      textPrimary: '#064e3b', textSecondary: 'rgba(6,78,59,0.65)', textMuted: 'rgba(6,78,59,0.45)',
      swatchHex: '#a7f3d0',
      trackStroke: 'rgba(6,78,59,0.10)', tickStroke: 'rgba(6,78,59,0.25)',
    },
  },
  {
    id: 'sunset', label: 'Sunset',
    dark: {
      bg: 'linear-gradient(135deg, #451a03 0%, #7c2d12 50%, #4c0519 100%)',
      accent1: 'radial-gradient(circle at 30% 20%, rgba(251,146,60,0.20), transparent 60%)',
      accent2: 'radial-gradient(circle at 70% 80%, rgba(244,63,94,0.16), transparent 60%)',
      haloHex: '#fb923c', ringStops: ['#fb923c', '#f43f5e'],
      textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.55)', textMuted: 'rgba(255,255,255,0.40)',
      swatchHex: '#c2410c',
      trackStroke: 'rgba(255,255,255,0.06)', tickStroke: 'rgba(255,255,255,0.15)',
    },
    light: {
      bg: 'linear-gradient(135deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)',
      accent1: 'radial-gradient(circle at 30% 20%, rgba(251,146,60,0.18), transparent 60%)',
      accent2: 'radial-gradient(circle at 70% 80%, rgba(244,63,94,0.14), transparent 60%)',
      haloHex: '#fdba74', ringStops: ['#ea580c', '#e11d48'],
      textPrimary: '#7c2d12', textSecondary: 'rgba(124,45,18,0.65)', textMuted: 'rgba(124,45,18,0.45)',
      swatchHex: '#fed7aa',
      trackStroke: 'rgba(124,45,18,0.10)', tickStroke: 'rgba(124,45,18,0.25)',
    },
  },
  {
    id: 'ocean', label: 'Ocean',
    dark: {
      bg: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #134e4a 100%)',
      accent1: 'radial-gradient(circle at 25% 20%, rgba(56,189,248,0.20), transparent 60%)',
      accent2: 'radial-gradient(circle at 75% 80%, rgba(45,212,191,0.14), transparent 60%)',
      haloHex: '#38bdf8', ringStops: ['#38bdf8', '#2dd4bf'],
      textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.55)', textMuted: 'rgba(255,255,255,0.40)',
      swatchHex: '#0369a1',
      trackStroke: 'rgba(255,255,255,0.06)', tickStroke: 'rgba(255,255,255,0.15)',
    },
    light: {
      bg: 'linear-gradient(135deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)',
      accent1: 'radial-gradient(circle at 25% 20%, rgba(56,189,248,0.18), transparent 60%)',
      accent2: 'radial-gradient(circle at 75% 80%, rgba(45,212,191,0.12), transparent 60%)',
      haloHex: '#7dd3fc', ringStops: ['#0284c7', '#0d9488'],
      textPrimary: '#0c4a6e', textSecondary: 'rgba(12,74,110,0.65)', textMuted: 'rgba(12,74,110,0.45)',
      swatchHex: '#bae6fd',
      trackStroke: 'rgba(12,74,110,0.10)', tickStroke: 'rgba(12,74,110,0.25)',
    },
  },
  {
    id: 'mono', label: 'Mono',
    dark: {
      bg: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #09090b 100%)',
      accent1: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06), transparent 60%)',
      accent2: 'radial-gradient(circle at 70% 80%, rgba(255,255,255,0.04), transparent 60%)',
      haloHex: '#a1a1aa', ringStops: ['#e4e4e7', '#a1a1aa'],
      textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.55)', textMuted: 'rgba(255,255,255,0.40)',
      swatchHex: '#3f3f46',
      trackStroke: 'rgba(255,255,255,0.06)', tickStroke: 'rgba(255,255,255,0.15)',
    },
    light: {
      bg: 'linear-gradient(135deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)',
      accent1: 'radial-gradient(circle at 30% 20%, rgba(0,0,0,0.04), transparent 60%)',
      accent2: 'radial-gradient(circle at 70% 80%, rgba(0,0,0,0.03), transparent 60%)',
      haloHex: '#d4d4d8', ringStops: ['#52525b', '#a1a1aa'],
      textPrimary: '#18181b', textSecondary: 'rgba(24,24,27,0.65)', textMuted: 'rgba(24,24,27,0.45)',
      swatchHex: '#e4e4e7',
      trackStroke: 'rgba(24,24,27,0.10)', tickStroke: 'rgba(24,24,27,0.25)',
    },
  },
];

/** Resolves a theme to the right variant based on the active app
 *  theme class on document root. Falls back to dark if no class is
 *  set or running on the server. */
function resolveThemeVariant(theme: SoloTheme): SoloThemeVariant {
  if (typeof document === 'undefined') return theme.dark;
  return document.documentElement.classList.contains('theme-light') ? theme.light : theme.dark;
}

const LS_SOLO_THEME = 'sm.solo.theme';

function readSoloTheme(): SoloTheme {
  if (typeof window === 'undefined') return SOLO_THEMES[0];
  const id = window.localStorage.getItem(LS_SOLO_THEME);
  return SOLO_THEMES.find((t) => t.id === id) ?? SOLO_THEMES[0];
}

// ── OpenToMatchHostPill ────────────────────────────────────────────
//
// Tiny status pill rendered in the session header for hosts of an
// open-to-match session that no one's joined yet. Shows "Door open"
// with an animated pulse + a one-tap close button. Calling
// closeTheDoor() flips open_to_match=false server-side; the realtime
// subscription on session changes makes the pill disappear after the
// next tick.
//
// Lives in this file rather than a separate component because it's
// scoped to one render slot and shares the dark-on-light theming
// conventions used elsewhere in the header.

function OpenToMatchHostPill({ sessionId }: { sessionId: string }) {
  const [closing, setClosing] = useState(false);

  async function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    if (closing) return;
    setClosing(true);
    try {
      await closeTheDoor(sessionId);
      // No local state to clear — the realtime subscription in
      // ActiveSessionPage will pick up the open_to_match=false flip
      // and re-render without the pill.
    } catch (err) {
      console.warn('[OpenToMatchHostPill] closeTheDoor failed:', err);
      setClosing(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="relative flex w-2 h-2 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60 animate-ping" />
        <span className="relative inline-flex w-2 h-2 rounded-full bg-amber-400" />
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300/90 truncate">
        <DoorOpen size={11} />
        Door open · waiting for a drop-in
      </span>
      <button
        type="button"
        onClick={handleClose}
        disabled={closing}
        title="Close the door — finish solo without drop-ins"
        className="ml-1 inline-flex items-center gap-1 text-[10px] font-bold text-white/60 hover:text-white px-1.5 py-0.5 rounded-full bg-white/5 hover:bg-white/15 transition-colors shrink-0 disabled:opacity-50"
      >
        {closing ? <Loader2 size={10} className="animate-spin" /> : <DoorClosed size={10} />}
        Close
      </button>
    </div>
  );
}

// ── IntroPhaseOverlay ──────────────────────────────────────────────
//
// Renders a soft "Say hi — N:NN" countdown banner across the top of the
// session view when a fresh matched pair is in their intro window
// (session.intro_phase_ends_at > now). Both parties see it. Either can
// tap "Start working" to end the intro immediately via finish_intro_phase()
// — useful when the chat finished early or one party is already heads-down.
//
// Visual style: amber gradient strip with a soft glow + a tabular-nums
// countdown. Stacks below the session header (so the goal stays visible).

function IntroPhaseOverlay({
  sessionId,
  endsAtIso,
  vibe,
}: {
  sessionId: string;
  endsAtIso: string;
  vibe: 'silent' | 'brief_hi' | 'chatty' | null | undefined;
}) {
  const [remaining, setRemaining] = useState(() => {
    return Math.max(0, Math.round((new Date(endsAtIso).getTime() - Date.now()) / 1000));
  });
  const [skipping, setSkipping] = useState(false);

  // 1s tick down to zero. We stop the interval at zero — the parent
  // effect handles the phase-transition chime/music restore once
  // intro_phase_ends_at passes.
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = Math.max(0, Math.round((new Date(endsAtIso).getTime() - Date.now()) / 1000));
      setRemaining(next);
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAtIso]);

  async function handleSkip() {
    if (skipping) return;
    setSkipping(true);
    try {
      await finishIntroPhase(sessionId);
      // Realtime sub fires on parent → overlay unmounts after the
      // null propagates. No local state to clear here.
    } catch (err) {
      console.warn('[IntroPhaseOverlay] finishIntroPhase failed:', err);
      setSkipping(false);
    }
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const vibeCopy = vibe === 'chatty'
    ? 'Take a few minutes to chat — focus block starts when this hits zero.'
    : 'Say hi + share your goal, then heads-down when the timer ends.';

  return (
    <div className="shrink-0 px-4 pt-2 pb-1">
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 ring-1 ring-amber-300/30 backdrop-blur-sm px-4 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-400/20 ring-1 ring-amber-300/40 grid place-items-center shrink-0">
          <span className="text-base">👋</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-amber-200 leading-none">
            Say hi · intro phase
          </p>
          <p className="text-[11px] text-amber-100/80 leading-tight mt-0.5 truncate">
            {vibeCopy}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-extrabold tabular-nums text-white">
            {minutes}:{String(seconds).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping}
            title="Skip the intro and start focusing now"
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-100 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            {skipping ? <Loader2 size={10} className="animate-spin" /> : null}
            Start working
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const radius = 118;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  // Theme — persisted choice, hot-swappable. Lazy init from localStorage.
  const [theme, setTheme] = useState<SoloTheme>(() => readSoloTheme());
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Audio visualizer style — persisted alongside the theme. Defaults
   *  to bars; users sensitive to motion can switch to pulse, particles,
   *  or 'off' for distraction-free focus. */
  const [vizStyle, setVizStyle] = useState<VisualizerStyle>(() => readVisualizerStyle());
  function pickVizStyle(s: VisualizerStyle) {
    setVizStyle(s);
    writeVisualizerStyle(s);
  }
  /** End-of-session audio chimes — on/off, persisted. */
  const [chimesOn, setChimesOn] = useState<boolean>(() => readChimesEnabled());
  function toggleChimes() {
    const next = !chimesOn;
    setChimesOn(next);
    writeChimesEnabled(next);
  }
  function pickTheme(t: SoloTheme) {
    setTheme(t);
    try { window.localStorage.setItem(LS_SOLO_THEME, t.id); } catch { /* private */ }
  }

  // Light/dark variant of the active theme. Listens to <html> class
  // mutations so toggling app theme in Settings re-renders this view
  // without needing to navigate away.
  const [variant, setVariant] = useState<SoloThemeVariant>(() => resolveThemeVariant(theme));
  useEffect(() => {
    setVariant(resolveThemeVariant(theme));
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => setVariant(resolveThemeVariant(theme)));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [theme]);

  // Responsive ring size — scales to viewport so mobile gets a smaller
  // (but still dominant) timer. Recomputed on resize so the page rotates
  // gracefully without re-mount.
  const [vp, setVp] = useState<number>(() => {
    if (typeof window === 'undefined') return 320;
    return Math.min(360, Math.max(220, window.innerWidth - 48));
  });
  useEffect(() => {
    const fn = () => setVp(Math.min(360, Math.max(220, window.innerWidth - 48)));
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  const ringPx = Math.min(320, vp);          // SVG render size (viewBox stays 280)
  // Visualizer math — anchored to the ring's actual displayed radius
  // (not the canvas size) so bars start just outside the ring edge
  // regardless of viewport. ringRadiusPx = the rendered radius in CSS
  // pixels; the SVG's intrinsic radius is 118 within a 280-unit viewBox.
  const ringRadiusPx = 118 * (ringPx / 280);
  const vizInnerRadius = Math.round(ringRadiusPx + 8);     // small gap from the ring
  const vizBarHeight = Math.round(ringPx * 0.13);          // bar height proportional to ring
  const haloPx = (vizInnerRadius + vizBarHeight) * 2 + 12; // canvas just big enough for the bars

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

  // ── Audio chimes + completion burst ────────────────────────────
  // Three cues: warning at T-10s and T-5s, plus a complete chime at
  // T-0. Each fires exactly once per session — guarded with refs so
  // re-renders or seconds-remaining recalculation can't double-fire.
  const warned10Ref = useRef(false);
  const warned5Ref = useRef(false);
  const completedRef = useRef(false);
  const [burstTriggered, setBurstTriggered] = useState(false);
  useEffect(() => {
    if (secondsRemaining <= 0) return; // complete chime handled below
    if (!warned10Ref.current && secondsRemaining <= 10 && secondsRemaining > 5) {
      warned10Ref.current = true;
      sessionChimes.playWarning();
    }
    if (!warned5Ref.current && secondsRemaining <= 5) {
      warned5Ref.current = true;
      sessionChimes.playWarning();
    }
  }, [secondsRemaining]);
  useEffect(() => {
    if (completedRef.current) return;
    if (secondsRemaining > 0 || totalSeconds <= 0) return;
    completedRef.current = true;
    sessionChimes.playComplete();
    setBurstTriggered(true);
  }, [secondsRemaining, totalSeconds]);

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
      {/* Theme backdrop — three layered fills (base gradient + two
          radial accents). Inline styles so we can swap on theme change
          without rebuilding the Tailwind atom list. */}
      <div className="absolute inset-0" style={{ background: variant.bg }} />
      <div className="absolute inset-0" style={{ background: variant.accent1 }} />
      <div className="absolute inset-0" style={{ background: variant.accent2 }} />

      {/* Ambient peers strip — recreates the "body double" effect by
          showing other members currently working solo. Pure presence,
          no interaction. Hidden on mobile to keep the focus circle
          breathing room. Also hidden when body-double video mode is on
          (the silent video grid already serves the presence purpose). */}
      {!hideAmbientStrip && <AmbientPeersStrip />}

      {/* Theme picker — small palette button bottom-right. Opens a tiny
          panel of swatches; click one to apply + persist. Sits above
          the music button (which is bottom-right but lower z-index of
          the page surface; the music player portals separately). */}
      <div className="absolute top-3 right-3 z-20">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          aria-label="Change background theme"
          title="Background"
          className="w-8 h-8 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
        >
          <Palette size={13} />
        </button>
        {pickerOpen && (
          <div
            className="absolute right-0 mt-2 w-48 rounded-2xl bg-black/70 backdrop-blur-md ring-1 ring-white/10 shadow-2xl p-2"
            onMouseLeave={() => setPickerOpen(false)}
          >
            <p className="px-2 pt-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white/50">
              Background
            </p>
            <div className="grid grid-cols-3 gap-1.5 px-1 pb-1">
              {SOLO_THEMES.map((t) => {
                const active = t.id === theme.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pickTheme(t)}
                    aria-label={t.label}
                    title={t.label}
                    className={`relative aspect-square rounded-lg overflow-hidden ring-1 transition-all ${
                      active ? 'ring-white shadow-md' : 'ring-white/15 hover:ring-white/40'
                    }`}
                    style={{ background: resolveThemeVariant(t).bg }}
                  >
                    {active && (
                      <span className="absolute inset-0 grid place-items-center text-white">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold text-white/60 text-center">
              {theme.label}
            </p>

            {/* ── Visualizer style picker ─────────────────────────
                Distinct from theme — controls only what reacts to
                the music. 'Off' for distraction-free focus. */}
            <div className="border-t border-white/10 mt-1 pt-2 px-2 pb-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/50 mb-1.5">
                Audio visualizer
              </p>
              <div className="grid grid-cols-4 gap-1">
                {(['bars','pulse','particles','off'] as VisualizerStyle[]).map((s) => {
                  const active = vizStyle === s;
                  const label = s === 'off' ? 'Off' : s.charAt(0).toUpperCase() + s.slice(1);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pickVizStyle(s)}
                      aria-label={label}
                      title={label}
                      className={`relative h-9 rounded-lg overflow-hidden ring-1 transition-all text-[9px] font-bold uppercase tracking-wider grid place-items-center ${
                        active ? 'bg-white/15 text-white ring-white/40' : 'bg-white/5 text-white/60 ring-white/10 hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── End-of-session chimes toggle ────────────────────
                Two soft synthesized tones at T-10s/T-5s and a warm
                two-note bell at T-0. Off for quiet/shared environments. */}
            <div className="border-t border-white/10 mt-1 pt-2 px-2 pb-1.5">
              <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/50">
                  End-of-session chime
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={chimesOn}
                  onClick={toggleChimes}
                  className={`relative w-8 h-4 rounded-full transition-colors ${
                    chimesOn ? 'bg-emerald-500/70' : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      chimesOn ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="relative h-full flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8 text-center">
        {/* Circular timer — ring around a live mm:ss countdown. The
            ring colour shifts amber → rose as time runs low so the
            user gets peripheral-vision feedback without reading the
            digits. Outer faint ring breathes so even a static timer
            feels alive. */}
        <div
          className="relative mb-6 sm:mb-8"
          style={{ width: ringPx, height: ringPx }}
        >
          {/* Audio-reactive visualizer — orbits the timer with live
              frequency bars driven by the session music player. Fades
              to nothing when music isn't playing. Pure ambient layer:
              pointer-events: none, no DOM overhead. */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <SoloVisualizer size={haloPx} innerRadius={vizInnerRadius} barHeight={vizBarHeight} style={vizStyle} />
          </div>
          {/* Soft outer halo — slow breathing glow, themed */}
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-40 pointer-events-none animate-pulse"
            style={{
              background: `radial-gradient(circle, ${variant.haloHex}73 0%, transparent 65%)`,
              animationDuration: '4s',
            }}
          />
          {/* Completion burst — fires once when secondsRemaining hits 0.
              Two expanding rings + a flash, all using the theme halo
              colour. Pure CSS animations (no JS frame loop) so it
              vanishes cleanly after ~1.5s. */}
          {burstTriggered && (
            <>
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${variant.haloHex}aa 0%, transparent 70%)`,
                  animation: 'sm-burst-flash 1200ms ease-out forwards',
                }}
              />
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  border: `2px solid ${variant.haloHex}`,
                  animation: 'sm-burst-ring 1400ms ease-out forwards',
                }}
              />
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  border: `1.5px solid ${variant.haloHex}`,
                  animation: 'sm-burst-ring 1800ms 200ms ease-out forwards',
                }}
              />
              <style>{`
                @keyframes sm-burst-flash {
                  0%   { opacity: 0; transform: scale(0.9); }
                  30%  { opacity: 1; transform: scale(1.05); }
                  100% { opacity: 0; transform: scale(1.15); }
                }
                @keyframes sm-burst-ring {
                  0%   { opacity: 0; transform: scale(0.95); }
                  20%  { opacity: 0.85; }
                  100% { opacity: 0; transform: scale(1.6); }
                }
              `}</style>
            </>
          )}
          <svg width={ringPx} height={ringPx} viewBox="0 0 280 280" className="-rotate-90 relative">
            {/* Track */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              stroke={variant.trackStroke}
              strokeWidth="10"
              fill="none"
            />
            {/* Tick marks at 12 / 3 / 6 / 9 — subtle clock-face hint */}
            {[0, 90, 180, 270].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const r1 = radius + 8;
              const r2 = radius + 14;
              return (
                <line
                  key={deg}
                  x1={140 + r1 * Math.cos(rad)}
                  y1={140 + r1 * Math.sin(rad)}
                  x2={140 + r2 * Math.cos(rad)}
                  y2={140 + r2 * Math.sin(rad)}
                  stroke={variant.tickStroke}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })}
            {/* Progress arc */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              stroke={secondsRemaining <= 60
                ? 'url(#solo-grad-end)'
                : secondsRemaining <= 300
                ? 'url(#solo-grad-warn)'
                : 'url(#solo-grad)'}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              style={{
                transition: 'stroke-dashoffset 1s linear, stroke 600ms ease',
                filter: `drop-shadow(0 0 8px ${variant.haloHex}59)`,
              }}
            />
            <defs>
              <linearGradient id="solo-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={variant.ringStops[0]} />
                <stop offset="100%" stopColor={variant.ringStops[1]} />
              </linearGradient>
              <linearGradient id="solo-grad-warn" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
              <linearGradient id="solo-grad-end" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            <p
              className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-1 sm:mb-2"
              style={{ color: variant.textSecondary }}
            >
              {phase}
            </p>
            {/* Live mm:ss — the hero number. Clamped so it scales with
                the ring across viewports without overflowing. */}
            <p
              className="font-extrabold tabular-nums leading-none tracking-tight"
              style={{ fontSize: `clamp(44px, ${ringPx * 0.24}px, 76px)`, color: variant.textPrimary }}
            >
              {formatRemaining(secondsRemaining)}
            </p>
            <p
              className="text-[10px] sm:text-[11px] mt-2 sm:mt-3 tabular-nums"
              style={{ color: variant.textMuted }}
            >
              {elapsedMin} / {totalMin} min in
            </p>
          </div>
        </div>

        {/* Goal */}
        <div className="max-w-md px-2">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
            style={{ color: variant.textMuted }}
          >
            You declared
          </p>
          <p
            className="text-base sm:text-lg font-bold leading-snug"
            style={{ color: variant.textPrimary }}
          >
            {goal || 'Your session'}
          </p>
        </div>

        <p
          className="text-[11px] sm:text-xs mt-6 sm:mt-8 max-w-xs leading-relaxed px-4"
          style={{ color: variant.textMuted }}
        >
          No room, no audience. Just you and the work. Come back when you're done.
        </p>
      </div>
    </div>
  );
}
