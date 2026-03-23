/**
 * Hook for managing meal schedules
 * 
 * Ensures auth + profile + space are ready before attempting to load/create schedules
 * Prevents RLS failures from auth.uid() being NULL during inserts
 */

import { useState, useEffect, useRef } from 'react';
import { getDefaultMealScheduleForSpace, type MealSchedule } from '../lib/mealScheduleService';
import { getAllSlotsForDay, getActiveMealSlots, type MealSlot } from '../lib/mealScheduleTypes';
import { useAuth } from '../core/auth/AuthProvider';
import { supabase } from '../lib/supabase';

export function useMealSchedule(spaceId: string | null) {
  const [schedule, setSchedule] = useState<MealSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user, profile, loading: authLoading } = useAuth();

  // Track auth readiness: auth must have resolved at least once (not just session exists)
  const [authReady, setAuthReady] = useState(false);

  // Prevent double-run inserts (React StrictMode)
  // Only mark as initialized on success, allowing retries on failure
  const hasInitializedRef = useRef(false);
  const currentSpaceIdRef = useRef<string | null>(null);

  // Monitor auth readiness: auth is ready when loading is false AND user/profile are resolved
  useEffect(() => {
    if (!authLoading) {
      // Auth has resolved (either user exists or doesn't)
      // Check if we have a valid authenticated user
      const checkAuthReady = async () => {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (!error && data?.user) {
            setAuthReady(true);
          } else {
            setAuthReady(false);
          }
        } catch {
          setAuthReady(false);
        }
      };
      checkAuthReady();
    }
  }, [authLoading, user]);

  useEffect(() => {
    // Early return: wait for all prerequisites
    if (!spaceId || !authReady || !user || !profile) {
      // Don't set loading to false if we're still waiting for prerequisites
      // This prevents flickering UI
      if (!spaceId || authLoading) {
        setLoading(true);
      } else if (authReady && (!user || !profile)) {
        // Auth resolved but user/profile missing - this is an error state
        setLoading(false);
        setError(new Error('Authentication required to load meal schedule'));
      }
      hasInitializedRef.current = false;
      currentSpaceIdRef.current = null;
      return;
    }

    // Reset if spaceId changed
    if (currentSpaceIdRef.current !== spaceId) {
      hasInitializedRef.current = false;
      currentSpaceIdRef.current = spaceId;
    }

    // Guard against double-run in React StrictMode
    // Only skip if we've already successfully initialized for this spaceId
    // If first attempt failed (e.g., auth not ready), allow retry
    if (hasInitializedRef.current && currentSpaceIdRef.current === spaceId) {
      return;
    }

    let cancelled = false;

    async function loadSchedule() {
      try {
        setLoading(true);
        setError(null);
        const defaultSchedule = await getDefaultMealScheduleForSpace(spaceId);
        if (!cancelled) {
          setSchedule(defaultSchedule);
          // Mark as initialized only on success
          // This prevents React StrictMode double-run, but allows retry if first attempt failed
          hasInitializedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Failed to load meal schedule');
          setError(error);
          console.error('Failed to load meal schedule:', err);
          // Don't mark as initialized on error - allows React StrictMode retry to proceed
          // This is important: first call may fail if auth not ready, second call should succeed
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [spaceId, authReady, user, profile, authLoading]);

  const getSlotsForDay = (dayOfWeek: number): MealSlot[] => {
    if (!schedule) return [];
    return getAllSlotsForDay(schedule, dayOfWeek);
  };

  const getMealSlotsForDay = (dayOfWeek: number): MealSlot[] => {
    if (!schedule) return [];
    return getActiveMealSlots(schedule, dayOfWeek);
  };

  return {
    schedule,
    loading,
    error,
    getSlotsForDay,
    getMealSlotsForDay,
    refresh: async () => {
      if (!spaceId) return;
      try {
        setError(null);
        const defaultSchedule = await getDefaultMealScheduleForSpace(spaceId);
        setSchedule(defaultSchedule);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to refresh meal schedule'));
      }
    },
  };
}
