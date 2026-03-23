/**
 * useRoadmapViewPreferences Hook
 * 
 * Phase 4: Manages UI-only view preferences for Roadmap.
 * 
 * Stores preferences in localStorage per-user (not per-project).
 * Preferences include:
 * - Default zoom level
 * - Display toggles (compact mode, status icons, progress bars, subtrack defaults)
 * - Show today indicator
 * 
 * ⚠️ CRITICAL: This hook does NOT know about tracks or items.
 * It only manages UI presentation preferences.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ZoomLevel } from '../lib/guardrails/infiniteTimelineUtils';

const VIEW_PREFS_STORAGE_KEY = 'roadmap_view_prefs';
const DISPLAY_PREFS_STORAGE_KEY = 'roadmap_display_prefs';

export interface RoadmapViewPreferences {
  defaultZoomLevel: ZoomLevel;
  defaultView: 'timeline' | 'list';
  showTodayIndicator: boolean;
}

export interface RoadmapDisplayPreferences {
  compactMode: boolean;
  showStatusIcons: boolean;
  showProgressBars: boolean;
  showSubtracksByDefault: boolean;
}

const DEFAULT_VIEW_PREFS: RoadmapViewPreferences = {
  defaultZoomLevel: 'week',
  defaultView: 'timeline',
  showTodayIndicator: true,
};

const DEFAULT_DISPLAY_PREFS: RoadmapDisplayPreferences = {
  compactMode: false,
  showStatusIcons: true,
  showProgressBars: true,
  showSubtracksByDefault: false,
};

function loadViewPreferences(): RoadmapViewPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_VIEW_PREFS;
  }

  try {
    const stored = localStorage.getItem(VIEW_PREFS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_VIEW_PREFS;
    }

    const parsed = JSON.parse(stored);
    return {
      defaultZoomLevel: parsed.defaultZoomLevel || DEFAULT_VIEW_PREFS.defaultZoomLevel,
      defaultView: parsed.defaultView || DEFAULT_VIEW_PREFS.defaultView,
      showTodayIndicator: parsed.showTodayIndicator ?? DEFAULT_VIEW_PREFS.showTodayIndicator,
    };
  } catch (error) {
    console.error('[useRoadmapViewPreferences] Failed to load view preferences:', error);
    return DEFAULT_VIEW_PREFS;
  }
}

function saveViewPreferences(prefs: RoadmapViewPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(VIEW_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('[useRoadmapViewPreferences] Failed to save view preferences:', error);
  }
}

function loadDisplayPreferences(): RoadmapDisplayPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_DISPLAY_PREFS;
  }

  try {
    const stored = localStorage.getItem(DISPLAY_PREFS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_DISPLAY_PREFS;
    }

    const parsed = JSON.parse(stored);
    return {
      compactMode: parsed.compactMode ?? DEFAULT_DISPLAY_PREFS.compactMode,
      showStatusIcons: parsed.showStatusIcons ?? DEFAULT_DISPLAY_PREFS.showStatusIcons,
      showProgressBars: parsed.showProgressBars ?? DEFAULT_DISPLAY_PREFS.showProgressBars,
      showSubtracksByDefault: parsed.showSubtracksByDefault ?? DEFAULT_DISPLAY_PREFS.showSubtracksByDefault,
    };
  } catch (error) {
    console.error('[useRoadmapViewPreferences] Failed to load display preferences:', error);
    return DEFAULT_DISPLAY_PREFS;
  }
}

function saveDisplayPreferences(prefs: RoadmapDisplayPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DISPLAY_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('[useRoadmapViewPreferences] Failed to save display preferences:', error);
  }
}

export function useRoadmapViewPreferences() {
  const [viewPrefs, setViewPrefs] = useState<RoadmapViewPreferences>(loadViewPreferences);
  const [displayPrefs, setDisplayPrefs] = useState<RoadmapDisplayPreferences>(loadDisplayPreferences);

  // Persist changes to localStorage
  useEffect(() => {
    saveViewPreferences(viewPrefs);
  }, [viewPrefs]);

  useEffect(() => {
    saveDisplayPreferences(displayPrefs);
  }, [displayPrefs]);

  const updateViewPrefs = useCallback((updates: Partial<RoadmapViewPreferences>) => {
    setViewPrefs(prev => ({ ...prev, ...updates }));
  }, []);

  const updateDisplayPrefs = useCallback((updates: Partial<RoadmapDisplayPreferences>) => {
    setDisplayPrefs(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    viewPrefs,
    displayPrefs,
    updateViewPrefs,
    updateDisplayPrefs,
  };
}
