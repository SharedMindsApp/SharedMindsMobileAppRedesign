/**
 * Phase 2: Memory Leak Prevention - Using safe hooks for timers and subscriptions
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { FocusSession, SessionEvent } from '../lib/guardrails/focusTypes';
import { supabase } from '../lib/supabase';
import { useSafeInterval } from '../hooks/useSafeInterval';
import { useSupabaseSubscription } from '../hooks/useSupabaseSubscription';
import { useIsMounted } from '../hooks/useMountedState';

interface FocusSessionContextType {
  activeSession: FocusSession | null;
  isPaused: boolean;
  driftActive: boolean;
  pendingNudge: { type: 'soft' | 'hard' | 'regulation'; message: string } | null;
  timerSecondsRemaining: number;
  sessionEvents: SessionEvent[];
  driftCount: number;
  distractionCount: number;
  setActiveSession: (session: FocusSession | null) => void;
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

  // Phase 2: Use safe subscription for session updates
  const handleSessionUpdate = useCallback((payload: any) => {
    if (isMounted()) {
      setActiveSession(payload.new as FocusSession);
    }
  }, [isMounted]);

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
        isPaused,
        driftActive,
        pendingNudge,
        timerSecondsRemaining,
        sessionEvents,
        driftCount,
        distractionCount,
        setActiveSession,
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
