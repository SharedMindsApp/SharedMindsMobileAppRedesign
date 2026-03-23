import { useState } from 'react';
import { useRegulation } from '../contexts/RegulationContext';
import type { BehaviorEnforcement } from './regulationTypes';

export function useRegulationCheck() {
  const { checkBehavior, enforcement, levelConfig, regulationState } = useRegulation();
  const [isChecking, setIsChecking] = useState(false);

  async function checkAndWarn(
    behavior: keyof BehaviorEnforcement,
    onAllowed?: () => void,
    onBlocked?: (message: string) => void
  ): Promise<boolean> {
    setIsChecking(true);
    try {
      const result = await checkBehavior(behavior);

      if (result.allowed) {
        onAllowed?.();
        return true;
      } else {
        if (result.message) {
          onBlocked?.(result.message);
        }
        return false;
      }
    } finally {
      setIsChecking(false);
    }
  }

  function canDo(behavior: keyof BehaviorEnforcement): boolean {
    if (!enforcement) return true;
    return enforcement[behavior] as boolean;
  }

  function getWarningMessage(): string | null {
    return enforcement?.warningMessage || null;
  }

  function getRestrictionMessage(behavior: keyof BehaviorEnforcement): string | null {
    if (!enforcement || !levelConfig) return null;

    if (!canDo(behavior)) {
      if (behavior === 'canCreateOffshootIdea') {
        if (regulationState?.current_level === 4) {
          return 'You can create up to 3 Offshoot Ideas per day in Strict Mode. This helps you stay focused!';
        } else if (regulationState?.current_level === 5) {
          return 'Guardian Mode: Let\'s focus on your main project first. You can add 1 offshoot per day.';
        }
      } else if (behavior === 'canAccessMindMesh') {
        return 'Mind Mesh is temporarily locked. Complete a task to unlock it and get back to exploring!';
      } else if (behavior === 'canAddNewTask') {
        return 'Finish your current task before adding more. One step at a time, you\'ve got this!';
      } else if (behavior === 'canSwitchToSideProject') {
        return 'Focus on your main project for now. Side projects will be here when you\'re ready!';
      } else if (behavior === 'canAddNewTrack') {
        return 'Let\'s keep things simple for now. Complete some progress before adding new tracks.';
      }

      return `This action is restricted in ${levelConfig.name}. ${levelConfig.mainMessage}`;
    }

    return null;
  }

  return {
    checkAndWarn,
    canDo,
    getWarningMessage,
    getRestrictionMessage,
    enforcement,
    levelConfig,
    regulationState,
    isChecking,
  };
}
