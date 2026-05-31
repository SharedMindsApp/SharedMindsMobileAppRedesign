/**
 * Phase 2: Memory Leak Prevention - Using safe hooks for timers and subscriptions
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { FocusSession, SessionEvent } from '../lib/sessions/focusTypes';
import { supabase } from '../lib/supabase';
import { useSafeInterval } from '../hooks/useSafeInterval';
import { useSupabaseSubscription } from '../hooks/useSupabaseSubscription';
import { useIsMounted } from '../hooks/useMountedState';

interface FocusSessionContextType {
  activeSession: FocusSession | null;
  sessionGoal: string | null;
  sessionProject: { id: string; title: string; color: string | null } | null;
  isPaused: boolean;
  driftActive: boolean;
  pendingNudge: { type: 'soft' | 'hard' | 'regulation'; message: string } | null;
  timerSecondsRemaining: number;
  sessionEvents: SessionEvent[];
  driftCount: number;
  distractionCount: number;
  setActiveSession: (session: FocusSession | null) => void;
  /** Update just the declared goal (match-me-now declares it in-room). */
  setSessionGoal: (goal: string | null) => void;
  setIsPaused: (paused: boolean) => void;
  setDriftActive: (active: boolean) => void;
  setPendingNudge: (nudge: { type: 'soft' | 'hard' | 'regulation'; message: string } | null) => void;
  setTimerSecondsRemaining: (seconds: number) => void;
  addSessionEvent: (event: SessionEvent) => void;
  loadSessionEvents: (sessionId: string) => Promise<void>;
  clearSession: () => void;
}

const FocusSessionContext = createContext<FocusSessionContextType | null>(null);

export function FocusSessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [sessionGoal, setSessionGoal] = useState<string | null>(null);
  const [sessionProject, setSessionProject] = useState<{ id: string; title: string; color: string | null } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [driftActive, setDriftActive] = useState(false);
  const [pendingNudge, setPendingNudge] = useState<{ type: 'soft' | 'hard' | 'regulation'; message: string } | null>(null);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState(0);
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [driftCount, setDriftCount] = useState(0);
  const [distractionCount, setDistractionCount] = useState(0);
  const isMounted = useIsMounted();

  // Define addSessionEvent before it's used in subscriptions
  const addSessionEvent = useCallback((event: SessionEvent) => {
    if (isMounted()) {
      setSessionEvents(prev => [...prev, event]);
    }
  }, [isMounted]);

  // Phase 2: Use safe interval for timer updates
  const updateTimer = useCallback(() => {
    if (!activeSession || !isMounted()) return;
    
    const targetTime = new Date(activeSession.target_end_time).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));
    
    if (isMounted()) {
      setTimerSecondsRemaining(remaining);

      if (remaining === 0 && !activeSession.ended_at && isMounted()) {
        setPendingNudge({
          type: 'hard',
          message: 'Session time is up! End your session or extend it.',
        });
      }
    }
  }, [activeSession, isMounted]);

  useSafeInterval(
    updateTimer,
    activeSession ? 1000 : null,
    [activeSession?.id, activeSession?.target_end_time, activeSession?.ended_at]
  );

  // ── Session restoration on mount ─────────────────────────────────────────
  // When the page is refreshed or the user navigates back from outside the app,
  // React state is gone but the row in Supabase still has status='active'.
  // This effect runs once on mount and restores the in-progress session so the
  // "Back to session" chip appears and the session page is accessible again.
  useEffect(() => {
    let cancelled = false;

    async function tryRestoreSession() {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.user || cancelled) return;

        const uid = authSession.user.id;

        const { data, error } = await supabase
          .from('focus_sessions')
          .select('*, project:projects(id, title, color)')
          .eq('status', 'active')
          .is('ended_at', null)
          .or(`user_id.eq.${uid},partner_user_id.eq.${uid}`)
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('[FocusSessionContext] Could not restore session:', error.message);
          return;
        }

        if (data && !cancelled && isMounted()) {
          // Don't restore a session whose timer has already run out — it's
          // effectively finished, so showing it as "live" with nothing to
          // rejoin is the zombie-session bug. Auto-close it. A 90s grace lets
          // a reload right at the buzzer still land on the debrief.
          const targetEnd = data.target_end_time ? new Date(data.target_end_time).getTime() : null;
          const expiredCutoff = Date.now() - 90 * 1000;
          if (targetEnd && targetEnd < expiredCutoff) {
            console.warn('[FocusSessionContext] Found expired session, auto-closing:', data.id);
            supabase
              .from('focus_sessions')
              .update({ status: 'completed', ended_at: new Date().toISOString(), end_time: new Date().toISOString() })
              .eq('id', data.id)
              .then(() => {}); // fire-and-forget
            return;
          }
          console.log('[FocusSessionContext] Restored active session', data.id);
          handleSetActiveSession(data as FocusSession);
        }
      } catch (err) {
        console.warn('[FocusSessionContext] Session restoration error:', err);
      }
    }

    tryRestoreSession();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  const handleSetActiveSession = useCallback((session: FocusSession | null) => {
    setActiveSession(session);
    setSessionGoal(session?.session_goal ?? null);
    // Pre-set project from the join if it's already on the session object.
    // If not, we fetch lazily below so the active session header shows the chip.
    setSessionProject(session?.project ?? null);
    if (session?.project_id && !session.project) {
      // Lazy fetch the project meta so the active session UI can show it.
      supabase
        .from('projects')
        .select('id, title, color')
        .eq('id', session.project_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setSessionProject(data as any);
        });
    }
  }, []);

  // Phase 2: Use safe subscription for session updates
  const handleSessionUpdate = useCallback((payload: any) => {
    if (isMounted()) {
      handleSetActiveSession(payload.new as FocusSession);
    }
  }, [isMounted, handleSetActiveSession]);

  useSupabaseSubscription({
    channelName: activeSession ? `focus_session:${activeSession.id}` : undefined,
    table: 'focus_sessions',
    event: 'UPDATE',
    filter: activeSession ? `id=eq.${activeSession.id}` : undefined,
    onEvent: handleSessionUpdate,
  });

  // Phase 2: Use safe subscription for session events
  const handleSessionEvent = useCallback((payload: any) => {
    addSessionEvent(payload.new as SessionEvent);
  }, [addSessionEvent]);

  useSupabaseSubscription({
    channelName: activeSession ? `session_events:${activeSession.id}` : undefined,
    table: 'session_events',
    event: 'INSERT',
    filter: activeSession ? `session_id=eq.${activeSession.id}` : undefined,
    onEvent: handleSessionEvent,
  });

  useEffect(() => {
    if (!isMounted()) return;
    
    const counts = sessionEvents.reduce(
      (acc, event) => {
        if (event.event_type === 'drift') acc.driftCount++;
        if (event.event_type === 'distraction') acc.distractionCount++;
        return acc;
      },
      { driftCount: 0, distractionCount: 0 }
    );
    
    if (isMounted()) {
      setDriftCount(counts.driftCount);
      setDistractionCount(counts.distractionCount);
    }
  }, [sessionEvents, isMounted]);

  async function loadSessionEvents(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('session_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (isMounted()) {
        setSessionEvents(data || []);
      }
    } catch (error) {
      console.error('Failed to load session events:', error);
    }
  }

  function clearSession() {
    setActiveSession(null);
    setSessionGoal(null);
    setSessionProject(null);
    setIsPaused(false);
    setDriftActive(false);
    setPendingNudge(null);
    setTimerSecondsRemaining(0);
    setSessionEvents([]);
    setDriftCount(0);
    setDistractionCount(0);
  }

  return (
    <FocusSessionContext.Provider
      value={{
        activeSession,
        sessionGoal,
        sessionProject,
        isPaused,
        driftActive,
        pendingNudge,
        timerSecondsRemaining,
        sessionEvents,
        driftCount,
        distractionCount,
        setActiveSession: handleSetActiveSession,
        setSessionGoal,
        setIsPaused,
        setDriftActive,
        setPendingNudge,
        setTimerSecondsRemaining,
        addSessionEvent,
        loadSessionEvents,
        clearSession,
      }}
    >
      {children}
    </FocusSessionContext.Provider>
  );
}

export function useFocusSession() {
  const context = useContext(FocusSessionContext);
  if (!context) {
    throw new Error('useFocusSession must be used within FocusSessionProvider');
  }
  return context;
}
