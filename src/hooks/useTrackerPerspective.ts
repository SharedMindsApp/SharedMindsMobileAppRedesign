/**
 * Tracker Perspective Hook
 * 
 * Standardized pattern for switching between tracker perspectives without navigation.
 * 
 * This hook formalizes the pattern used for:
 * - Tasks ↔ Habits
 * - Habits ↔ Goals
 * - Habits ↔ Skills
 * 
 * Rules:
 * - No navigation (perspective change only)
 * - No remounts (UI state preserved)
 * - Perspective = interpretation, not entity change
 * 
 * This pattern is reusable for:
 * - Goals → Habits
 * - Skills → Habits
 * - (Future) Social views
 * 
 * @see src/lib/habits/habitContract.ts for the canonical habit contract
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

export type TrackerPerspective = 'tasks' | 'habits' | 'goals' | 'skills';

export interface UseTrackerPerspectiveOptions {
  initialPerspective?: TrackerPerspective;
  onPerspectiveChange?: (perspective: TrackerPerspective) => void;
}

export interface UseTrackerPerspectiveReturn {
  currentPerspective: TrackerPerspective;
  setPerspective: (perspective: TrackerPerspective) => void;
  isPerspective: (perspective: TrackerPerspective) => boolean;
}

/**
 * Hook for managing tracker perspective switching
 * 
 * Perspective switching changes how data is interpreted, not what data is shown.
 * All perspectives operate on the same underlying entities (habits, goals, skills, tasks).
 * 
 * Example usage:
 * ```tsx
 * const { currentPerspective, setPerspective, isPerspective } = useTrackerPerspective({
 *   initialPerspective: 'habits',
 * });
 * 
 * // Switch perspective
 * setPerspective('tasks');
 * 
 * // Check current perspective
 * if (isPerspective('habits')) {
 *   // Render habits view
 * }
 * ```
 */
export function useTrackerPerspective(
  options: UseTrackerPerspectiveOptions = {}
): UseTrackerPerspectiveReturn {
  const { initialPerspective = 'habits', onPerspectiveChange } = options;

  const [currentPerspective, setCurrentPerspectiveState] = useState<TrackerPerspective>(
    initialPerspective
  );

  // Use ref to avoid stale closures in setPerspective
  const currentPerspectiveRef = useRef(currentPerspective);
  useEffect(() => {
    currentPerspectiveRef.current = currentPerspective;
  }, [currentPerspective]);

  const setPerspective = useCallback(
    (perspective: TrackerPerspective) => {
      if (perspective !== currentPerspectiveRef.current) {
        setCurrentPerspectiveState(perspective);
        onPerspectiveChange?.(perspective);
      }
    },
    [onPerspectiveChange]
  );

  const isPerspective = useCallback(
    (perspective: TrackerPerspective) => {
      return currentPerspective === perspective;
    },
    [currentPerspective]
  );

  return useMemo(
    () => ({
      currentPerspective,
      setPerspective,
      isPerspective,
    }),
    [currentPerspective, setPerspective, isPerspective]
  );
}
