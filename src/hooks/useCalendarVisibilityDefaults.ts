/**
 * useCalendarVisibilityDefaults Hook
 * 
 * Manages calendar-level default visibility audiences (users/groups/households)
 * for the personal calendar. Stored in localStorage (client-side only).
 * 
 * NOTE: These defaults only apply when events/tasks are created from UI components
 * that have access to localStorage. Server-side creation will not apply defaults.
 */

import { useState, useEffect, useCallback } from 'react';

export type VisibilityAudienceType = 'user' | 'group' | 'household';

export interface VisibilityAudience {
  id: string;
  type: VisibilityAudienceType;
  name?: string; // For display purposes only (not persisted)
}

export interface CalendarVisibilityDefaults {
  enabled: boolean;
  audiences: VisibilityAudience[];
}

const DEFAULT_DEFAULTS: CalendarVisibilityDefaults = {
  enabled: false,
  audiences: [],
};

const STORAGE_KEY = 'calendar_visibility_defaults';

export function useCalendarVisibilityDefaults() {
  const [defaults, setDefaults] = useState<CalendarVisibilityDefaults>(DEFAULT_DEFAULTS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load defaults from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle schema changes
        setDefaults({ ...DEFAULT_DEFAULTS, ...parsed });
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load calendar visibility defaults:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save defaults to localStorage
  const updateDefaults = useCallback((updates: Partial<CalendarVisibilityDefaults>) => {
    setDefaults(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.error('Failed to save calendar visibility defaults:', error);
      }
      return next;
    });
  }, []);

  // Add audience
  const addAudience = useCallback((audience: VisibilityAudience) => {
    setDefaults(prev => {
      // Check if audience already exists (id + type must be unique)
      const exists = prev.audiences.some(
        a => a.id === audience.id && a.type === audience.type
      );
      if (exists) {
        return prev; // Idempotent
      }
      
      const next = {
        ...prev,
        audiences: [...prev.audiences, { id: audience.id, type: audience.type }],
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.error('Failed to save calendar visibility defaults:', error);
      }
      return next;
    });
  }, []);

  // Remove audience
  const removeAudience = useCallback((audienceId: string, audienceType: VisibilityAudienceType) => {
    setDefaults(prev => {
      const next = {
        ...prev,
        audiences: prev.audiences.filter(
          a => !(a.id === audienceId && a.type === audienceType)
        ),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.error('Failed to save calendar visibility defaults:', error);
      }
      return next;
    });
  }, []);

  // Reset to defaults
  const resetDefaults = useCallback(() => {
    setDefaults(DEFAULT_DEFAULTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset calendar visibility defaults:', error);
    }
  }, []);

  return {
    defaults,
    updateDefaults,
    addAudience,
    removeAudience,
    resetDefaults,
    isLoaded,
  };
}