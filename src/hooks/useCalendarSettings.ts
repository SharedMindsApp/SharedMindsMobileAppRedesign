/**
 * useCalendarSettings Hook
 * 
 * Manages calendar settings with localStorage persistence.
 * Shared by Planner and SpacesOS calendars.
 */

import { useState, useEffect, useCallback } from 'react';
import type { CalendarView } from '../components/calendarCore/types';

export interface CalendarSettings {
  // Display Settings
  defaultView: CalendarView;
  weekStartDay: 'monday' | 'sunday';
  timeFormat: '12h' | '24h';
  showWeekNumbers: boolean;
  
  // Behaviour Settings
  autoScrollToCurrentTime: boolean;
  monthViewDoubleTapBehavior: 'select' | 'navigate';
  defaultEventDuration: number; // in minutes
  
  // View Preferences
  rememberLastView: boolean;
  rememberLastDate: boolean;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  defaultView: 'month',
  weekStartDay: 'monday',
  timeFormat: '12h',
  showWeekNumbers: false,
  autoScrollToCurrentTime: true,
  monthViewDoubleTapBehavior: 'navigate',
  defaultEventDuration: 60,
  rememberLastView: true,
  rememberLastDate: true,
};

const STORAGE_KEY = 'calendar_settings';

export function useCalendarSettings() {
  const [settings, setSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings fields
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load calendar settings:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((updates: Partial<CalendarSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.error('Failed to save calendar settings:', error);
      }
      return next;
    });
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset calendar settings:', error);
    }
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  };
}
