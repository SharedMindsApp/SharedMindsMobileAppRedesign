/**
 * Stage 3.3: Foreground Triggers Context
 *
 * Manages foreground-only context trigger delivery.
 *
 * CRITICAL:
 * - Only processes events when app is open
 * - At most one intervention per context action
 * - No background logic
 * - No telemetry for trigger events
 * - Safe Mode blocks all triggers
 */

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import { matchInterventionForContext } from '../lib/interventions/stage3_3-foreground-router';
import { InterventionInvocationModal } from '../components/interventions/InterventionInvocationModal';
import type { InterventionRegistryEntry } from '../lib/interventions/stage3_1-types';
import type { ForegroundContextEvent } from '../lib/interventions/stage3_3-types';
import { HelpCircle } from 'lucide-react';

interface ForegroundTriggersContextType {
  emitContextEvent: (event: ForegroundContextEvent) => Promise<void>;
}

const ForegroundTriggersContext = createContext<ForegroundTriggersContextType | undefined>(
  undefined
);

export function ForegroundTriggersProvider({ children }: { children: ReactNode }) {
  const { user, safeModeEnabled } = useAuth();
  const [triggeredIntervention, setTriggeredIntervention] =
    useState<InterventionRegistryEntry | null>(null);
  const [triggerContext, setTriggerContext] = useState<string>('');
  const processingRef = useRef(false);

  const emitContextEvent = useCallback(
    async (event: ForegroundContextEvent) => {
      if (!user || safeModeEnabled || processingRef.current) {
        return;
      }

      processingRef.current = true;
      try {
        const intervention = await matchInterventionForContext(user.id, event);

        if (intervention) {
          setTriggerContext(getContextLabel(event));
          setTriggeredIntervention(intervention);
        }
      } catch (err) {
        console.error('Failed to process context event:', err);
      } finally {
        processingRef.current = false;
      }
    },
    [user, safeModeEnabled]
  );

  function handleClose() {
    setTriggeredIntervention(null);
    setTriggerContext('');
  }

  function handleInterventionChanged() {
    setTriggeredIntervention(null);
    setTriggerContext('');
  }

  return (
    <ForegroundTriggersContext.Provider value={{ emitContextEvent }}>
      {children}
      {triggeredIntervention && (
        <div>
          {triggerContext && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg shadow-lg max-w-md">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-blue-900 flex-1">Shown because: {triggerContext}</p>
                <a
                  href="/interventions/triggers"
                  className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 underline whitespace-nowrap"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = '/interventions/triggers';
                  }}
                >
                  <HelpCircle size={14} />
                  Why?
                </a>
              </div>
            </div>
          )}
          <InterventionInvocationModal
            intervention={triggeredIntervention}
            onClose={handleClose}
            onInterventionChanged={handleInterventionChanged}
          />
        </div>
      )}
    </ForegroundTriggersContext.Provider>
  );
}

export function useForegroundTriggers() {
  const context = useContext(ForegroundTriggersContext);
  if (context === undefined) {
    throw new Error('useForegroundTriggers must be used within ForegroundTriggersProvider');
  }
  return context;
}

function getContextLabel(event: ForegroundContextEvent): string {
  switch (event) {
    case 'project_opened':
      return 'Project opened';
    case 'focus_mode_started':
      return 'Focus mode started';
    case 'task_created':
      return 'Task created';
    case 'task_completed':
      return 'Task completed';
    default:
      return 'Context event';
  }
}
