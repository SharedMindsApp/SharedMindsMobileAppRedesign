/**
 * useSpaceContext Hook
 * 
 * Centralizes space context logic for multi-context widgets.
 * Provides a stable API for managing Personal, Household, and Team contexts.
 * 
 * Features:
 * - Defaults to provided initialSpaceId
 * - Persists last-used space in localStorage (survives app restarts and page refreshes)
 * - Provides stable API for all widgets
 * - Handles loading states
 * - Prevents cross-space data leakage
 * - User has full control over space selection - persists their choice across sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPersonalSpace, getSharedSpaces, type Household } from '../lib/household';
import { useAuth } from '../core/auth/AuthProvider';

export type SpaceType = 'personal' | 'household' | 'team';

export interface SpaceOption {
  id: string;
  name: string;
  type: SpaceType;
}

export interface UseSpaceContextReturn {
  currentSpaceId: string;
  currentSpaceType: SpaceType | null;
  availableSpaces: SpaceOption[];
  setCurrentSpace: (spaceId: string) => void;
  isLoading: boolean;
  error: string | null;
  getAbortSignal: () => AbortSignal | null;
  isSwitching: () => boolean;
}

const STORAGE_KEY = 'last_used_space_id';

export function useSpaceContext(initialSpaceId: string): UseSpaceContextReturn {
  const { user, profile } = useAuth();
  // Initialize from localStorage if available, otherwise use initialSpaceId
  const [currentSpaceId, setCurrentSpaceIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const persisted = localStorage.getItem(STORAGE_KEY);
      if (persisted) {
        return persisted;
      }
    }
    return initialSpaceId;
  });
  const [availableSpaces, setAvailableSpaces] = useState<SpaceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSpaceType, setCurrentSpaceType] = useState<SpaceType | null>(null);

  // Track if we're in the middle of a context switch to prevent race conditions
  const switchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load available spaces
  useEffect(() => {
    loadSpaces();
  }, [user, profile]);

  // Sync currentSpaceId when initialSpaceId changes (e.g., from route changes)
  // But only if there's no persisted value in localStorage
  useEffect(() => {
    if (initialSpaceId && initialSpaceId !== currentSpaceId) {
      // Only update if there's no persisted value, or if the persisted value is invalid
      if (typeof window !== 'undefined') {
        const persisted = localStorage.getItem(STORAGE_KEY);
        if (!persisted || persisted === initialSpaceId) {
          setCurrentSpaceIdState(initialSpaceId);
        }
      } else {
        setCurrentSpaceIdState(initialSpaceId);
      }
    }
  }, [initialSpaceId]);

  // Update current space type when currentSpaceId or availableSpaces change
  useEffect(() => {
    const currentSpace = availableSpaces.find(s => s.id === currentSpaceId);
    setCurrentSpaceType(currentSpace?.type || null);
  }, [currentSpaceId, availableSpaces]);

  const loadSpaces = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allSpaces: SpaceOption[] = [];

      // Get personal space
      const personalSpace = await getPersonalSpace();
      if (personalSpace) {
        allSpaces.push({
          id: personalSpace.id,
          name: profile?.full_name || 'Personal Space',
          type: 'personal',
        });
      }

      // Get shared spaces (households and teams)
      const sharedSpaces = await getSharedSpaces();
      sharedSpaces.forEach(space => {
        // Determine if it's household or team based on space_type or context_type
        const isTeam = (space as any).space_type === 'team' || (space as any).context_type === 'team';
        allSpaces.push({
          id: space.id,
          name: space.name || 'Unnamed Space',
          type: isTeam ? 'team' : 'household',
        });
      });

      setAvailableSpaces(allSpaces);

      // If currentSpaceId is not in available spaces, try to restore from storage or use first available
      if (allSpaces.length > 0) {
        const isValidSpace = allSpaces.some(s => s.id === currentSpaceId);
        if (!isValidSpace) {
          // Try to restore from localStorage (persists across app restarts)
          const lastUsedSpaceId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
          const restoredSpace = lastUsedSpaceId && allSpaces.find(s => s.id === lastUsedSpaceId);

          if (restoredSpace) {
            setCurrentSpaceIdState(restoredSpace.id);
            // Ensure it's persisted
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY, restoredSpace.id);
            }
          } else if (allSpaces.length > 0) {
            // Default to first available space (usually personal)
            const defaultSpace = allSpaces[0];
            setCurrentSpaceIdState(defaultSpace.id);
            // Persist the default selection
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY, defaultSpace.id);
            }
          }
        } else {
          // Current space is valid - ensure it's persisted
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, currentSpaceId);
          }
        }
      }
    } catch (err) {
      console.error('Error loading spaces:', err);
      setError('Failed to load spaces');
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentSpace = useCallback((spaceId: string) => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set switching flag to prevent race conditions
    switchingRef.current = true;

    // Create new abort controller for new context
    abortControllerRef.current = new AbortController();

    // Update state
    setCurrentSpaceIdState(spaceId);

    // Persist to localStorage (survives app restarts)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, spaceId);
    }

    // Clear switching flag after a brief delay
    setTimeout(() => {
      switchingRef.current = false;
    }, 100);
  }, []);

  // Get abort signal for current context (useful for canceling requests)
  const getAbortSignal = useCallback(() => {
    return abortControllerRef.current?.signal || null;
  }, []);

  // Check if we're currently switching contexts
  const isSwitching = useCallback(() => {
    return switchingRef.current;
  }, []);

  return {
    currentSpaceId,
    currentSpaceType,
    availableSpaces,
    setCurrentSpace,
    isLoading,
    error,
    getAbortSignal,
    isSwitching,
  };
}
