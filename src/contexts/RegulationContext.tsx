import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useActiveProject } from './ActiveProjectContext';
import { useAuth } from '../core/auth/AuthProvider';
import type {
  RegulationState,
  RegulationNotification,
  BehaviorEnforcement,
  StrictnessLevelConfig,
} from '../lib/regulationTypes';
import {
  getRegulationState,
  getBehaviorEnforcement,
  getLevelConfig,
  checkBehaviorAllowed,
  logRegulationEvent,
} from '../lib/regulationEngine';
import { supabase } from '../lib/supabase';
import { recordRealtimeActivity } from '../lib/connectionHealth';

interface RegulationContextType {
  regulationState: RegulationState | null;
  isLoading: boolean;
  enforcement: BehaviorEnforcement | null;
  levelConfig: StrictnessLevelConfig | null;
  notification: RegulationNotification | null;
  refreshState: () => Promise<void>;
  checkBehavior: (behavior: keyof BehaviorEnforcement) => Promise<{ allowed: boolean; message: string | null }>;
  logEvent: (eventType: string, metadata?: Record<string, any>) => Promise<void>;
  dismissNotification: () => void;
}

const RegulationContext = createContext<RegulationContextType | null>(null);

export function RegulationProvider({ children }: { children: ReactNode }) {
  const { activeProject } = useActiveProject();
  const { user, loading: authLoading } = useAuth();
  const [regulationState, setRegulationState] = useState<RegulationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enforcement, setEnforcement] = useState<BehaviorEnforcement | null>(null);
  const [levelConfig, setLevelConfig] = useState<StrictnessLevelConfig | null>(null);
  const [notification, setNotification] = useState<RegulationNotification | null>(null);

  useEffect(() => {
    // Only load regulation state after auth is ready and user is authenticated
    if (!authLoading) {
      if (user) {
        loadRegulationState();
      } else {
        // User not authenticated - clear state and stop loading
        setRegulationState(null);
        setEnforcement(null);
        setLevelConfig(null);
        setIsLoading(false);
      }
    } else {
      // Auth still loading - keep loading state
      setIsLoading(true);
    }
  }, [activeProject?.id, user, authLoading]);

  useEffect(() => {
    if (!regulationState) return;

    const channel = supabase
      .channel(`regulation:${regulationState.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'regulation_state',
          filter: `id=eq.${regulationState.id}`,
        },
        (payload) => {
          // Record realtime activity for connection health monitoring
          recordRealtimeActivity();

          const newState = payload.new as RegulationState;
          const oldLevel = regulationState.current_level;
          const newLevel = newState.current_level;

          setRegulationState(newState);
          setEnforcement(getBehaviorEnforcement(newLevel));
          setLevelConfig(getLevelConfig(newLevel));

          if (oldLevel !== newLevel) {
            showLevelChangeNotification(oldLevel, newLevel);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [regulationState?.id]);

  async function loadRegulationState() {
    // Don't try to load if user is not authenticated
    if (!user) {
      setRegulationState(null);
      setEnforcement(null);
      setLevelConfig(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const state = await getRegulationState(undefined, activeProject?.id);

      if (state) {
        setRegulationState(state);
        setEnforcement(getBehaviorEnforcement(state.current_level));
        setLevelConfig(getLevelConfig(state.current_level));
      } else {
        // No state found - clear state but don't log as error
        setRegulationState(null);
        setEnforcement(null);
        setLevelConfig(null);
      }
    } catch (error) {
      // Only unexpected errors should reach here (getRegulationState now returns null for expected scenarios)
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Clear state on error
      setRegulationState(null);
      setEnforcement(null);
      setLevelConfig(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshState() {
    await loadRegulationState();
  }

  async function checkBehavior(behavior: keyof BehaviorEnforcement) {
    const result = await checkBehaviorAllowed(behavior, undefined, activeProject?.id);

    if (!result.allowed && result.message) {
      setNotification({
        type: 'warning',
        level: result.level,
        message: result.message,
        dismissible: true,
      });
    }

    return { allowed: result.allowed, message: result.message };
  }

  async function logEvent(eventType: string, metadata?: Record<string, any>) {
    await logRegulationEvent(eventType as any, {
      projectId: activeProject?.id,
      metadata,
    });
    await refreshState();
  }

  function showLevelChangeNotification(oldLevel: number, newLevel: number) {
    const config = getLevelConfig(newLevel as any);
    const isEscalation = newLevel > oldLevel;

    setNotification({
      type: isEscalation ? 'escalation' : 'deescalation',
      level: newLevel as any,
      message: isEscalation ? config.escalationMessage : config.deescalationMessage,
      dismissible: true,
    });
  }

  function dismissNotification() {
    setNotification(null);
  }

  return (
    <RegulationContext.Provider
      value={{
        regulationState,
        isLoading,
        enforcement,
        levelConfig,
        notification,
        refreshState,
        checkBehavior,
        logEvent,
        dismissNotification,
      }}
    >
      {children}
    </RegulationContext.Provider>
  );
}

export function useRegulation() {
  const context = useContext(RegulationContext);
  if (!context) {
    throw new Error('useRegulation must be used within RegulationProvider');
  }
  return context;
}
