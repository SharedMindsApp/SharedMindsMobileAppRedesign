import { Check, Lock, Clock } from 'lucide-react';
import type { LifecyclePhase } from '../../../lib/guardrails/projectLifecycle';

interface PhaseProgressProps {
  currentPhase: LifecyclePhase;
}

export function PhaseProgress({ currentPhase }: PhaseProgressProps) {
  const phases = [
    { id: 'intent', label: 'Intent' },
    { id: 'feasibility', label: 'Feasibility' },
    { id: 'execution', label: 'Execution' },
  ] as const;

  const getPhaseStatus = (phaseId: string): 'completed' | 'active' | 'locked' => {
    const phaseIndex = phases.findIndex(p => p.id === phaseId);

    // Handle checked states - these mean the phase is complete
    if (currentPhase === 'intent_checked') {
      if (phaseId === 'intent') return 'completed';
      if (phaseId === 'feasibility') return 'active';
      return 'locked';
    }

    if (currentPhase === 'feasibility_checked') {
      if (phaseId === 'intent' || phaseId === 'feasibility') return 'completed';
      if (phaseId === 'execution') return 'active';
      return 'locked';
    }

    if (currentPhase === 'execution_checked') {
      return 'completed'; // All phases complete
    }

    // Handle active states
    if (currentPhase === 'intent') {
      if (phaseId === 'intent') return 'active';
      return 'locked';
    }

    if (currentPhase === 'feasibility') {
      if (phaseId === 'intent') return 'completed';
      if (phaseId === 'feasibility') return 'active';
      return 'locked';
    }

    if (currentPhase === 'execution') {
      if (phaseId === 'intent' || phaseId === 'feasibility') return 'completed';
      if (phaseId === 'execution') return 'active';
      return 'locked';
    }

    return 'locked';
  };

  return (
    <div className="flex items-center gap-4 py-2">
      {phases.map((phase, index) => {
        const status = getPhaseStatus(phase.id);
        const isLast = index === phases.length - 1;

        return (
          <div key={phase.id} className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  ${
                    status === 'completed'
                      ? 'bg-green-500 text-white'
                      : status === 'active'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {status === 'completed' ? (
                  <Check size={16} />
                ) : status === 'active' ? (
                  <Clock size={16} />
                ) : (
                  <Lock size={16} />
                )}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  status === 'completed'
                    ? 'text-green-600'
                    : status === 'active'
                    ? 'text-blue-600'
                    : 'text-gray-400'
                }`}
              >
                {phase.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`h-0.5 w-8 ${
                  status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

