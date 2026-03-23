/**
 * useRoadmapProjection Hook
 * 
 * Phase 0 Architectural Lock-In: Roadmap Projection Adapter
 * Phase 1: Projection Pipeline Rebuild (Read-Only, Hierarchy-Correct)
 * 
 * This hook is the SINGLE SOURCE OF TRUTH for Roadmap UI data.
 * All Roadmap components MUST consume this hook and MUST NOT:
 * - Call services directly
 * - Read raw database tables
 * - Apply authority logic internally
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * 
 * What this hook CAN do:
 * - ✅ Fetch domain data (tracks, instances, subtracks, items)
 * - ✅ Apply visibility_state filtering (hidden, collapsed, visible)
 * - ✅ Merge UI state from localStorage
 * - ✅ Check permissions via service calls
 * - ✅ Return fully-shaped, UI-safe projection
 * - ✅ Shape data for visualization
 * - ✅ Group items correctly under tracks/subtracks
 * 
 * What this hook MUST NOT do:
 * - ❌ Mutate domain data
 * - ❌ Filter tracks based on item presence
 * - ❌ Apply UI logic beyond shaping
 * - ❌ Persist UI state to database
 * - ❌ Create/edit/delete tracks or items
 * - ❌ Conditionally omit tracks/subtracks based on item count
 * - ❌ Filter tracks/subtracks based on items.length === 0
 * 
 * Phase 1 Projection Integrity Rules:
 * - ✅ Tracks render even with zero subtracks (subtracks array can be empty)
 * - ✅ Tracks render even with zero items (items array can be empty)
 * - ✅ Subtracks render even with zero items (items array can be empty)
 * - ✅ Items never determine visibility (visibility controlled only by visibility_state/includeInRoadmap)
 * - ✅ Visibility is controlled only by: instance visibility_state, includeInRoadmap flag
 * 
 * Empty State Validity:
 * - Empty is a valid state — absence of items is not an error
 * - Tracks with zero subtracks MUST be included
 * - Subtracks with zero items MUST be included
 * - Tracks/subtracks with zero roadmap items MUST be included
 * 
 * ⚠️ CRITICAL: uiState is NEVER persisted to database - localStorage only.
 * 
 * See: docs/ARCHITECTURE_TRACKS_ROADMAP.md for full architectural documentation.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import { getTrackTree, type TrackWithChildren } from '../lib/guardrails/trackService';
import { getTrackChildren } from '../lib/guardrails/trackService';
import { getRoadmapItemsByProject } from '../lib/guardrails/roadmapService';
import { getTracksForProject, getTrackInstance } from '../lib/guardrails/sharedTrackService';
import { checkTrackEditPermission } from '../lib/guardrails/sharedTrackService';
import type {
  RoadmapProjection,
  RoadmapProjectionTrack,
  RoadmapProjectionSubtrack,
  RoadmapUIState,
} from '../lib/guardrails/roadmapProjectionTypes';
import type { TrackProjectInstance, TrackInstanceVisibility } from '../lib/guardrails/tracksTypes';
import type { RoadmapItem } from '../lib/guardrails/coreTypes';

const UI_STATE_STORAGE_KEY_PREFIX = 'roadmap_ui_state_';

/**
 * Load UI state from localStorage
 * 
 * Phase 2: Added viewMode with default 'week'
 */
function loadUIState(projectId: string): RoadmapUIState {
  const defaultState: RoadmapUIState = {
    collapsedTracks: new Set(),
    expandedTracks: new Set(),
    collapsedSubtracks: new Set(),
    expandedSubtracks: new Set(),
    highlightedTracks: new Set(),
    focusedTrackId: null,
    viewMode: 'week', // Phase 2: Default to week view
    anchorDate: new Date().toISOString().split('T')[0], // Phase 3.9: Default to today
    lastWeekAnchor: undefined, // Phase 3.9: Optional last week anchor
  };

  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const key = `${UI_STATE_STORAGE_KEY_PREFIX}${projectId}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      return defaultState;
    }

    const parsed = JSON.parse(stored);
    return {
      collapsedTracks: new Set(parsed.collapsedTracks || []),
      expandedTracks: new Set(parsed.expandedTracks || []),
      collapsedSubtracks: new Set(parsed.collapsedSubtracks || []),
      expandedSubtracks: new Set(parsed.expandedSubtracks || []),
      highlightedTracks: new Set(parsed.highlightedTracks || []),
      focusedTrackId: parsed.focusedTrackId || null,
      viewMode: parsed.viewMode || 'week', // Phase 2: Default to week if not present
      anchorDate: parsed.anchorDate || new Date().toISOString().split('T')[0], // Phase 3.9: Default to today
      lastWeekAnchor: parsed.lastWeekAnchor, // Phase 3.9: Optional last week anchor
    };
  } catch (error) {
    console.error('[useRoadmapProjection] Failed to load UI state:', error);
    return defaultState;
  }
}

/**
 * Save UI state to localStorage
 * 
 * Phase 2: Added viewMode persistence
 */
function saveUIState(projectId: string, uiState: RoadmapUIState): void {
  if (typeof window === 'undefined') return;

  try {
    const key = `${UI_STATE_STORAGE_KEY_PREFIX}${projectId}`;
    const serializable = {
      collapsedTracks: Array.from(uiState.collapsedTracks),
      expandedTracks: Array.from(uiState.expandedTracks),
      collapsedSubtracks: Array.from(uiState.collapsedSubtracks),
      expandedSubtracks: Array.from(uiState.expandedSubtracks),
      highlightedTracks: Array.from(uiState.highlightedTracks),
      focusedTrackId: uiState.focusedTrackId,
      viewMode: uiState.viewMode, // Phase 2: Persist view mode
      anchorDate: uiState.anchorDate, // Phase 3.9: Persist anchor date
      lastWeekAnchor: uiState.lastWeekAnchor, // Phase 3.9: Persist last week anchor
    };
    localStorage.setItem(key, JSON.stringify(serializable));

    // Phase 2: Dispatch custom event for same-window updates
    window.dispatchEvent(new CustomEvent('roadmap-ui-state-changed', {
      detail: { key, projectId },
    }));
  } catch (error) {
    console.error('[useRoadmapProjection] Failed to save UI state:', error);
  }
}

/**
 * Check if track should be included in projection based on visibility_state
 */
function shouldIncludeTrack(
  instance: TrackProjectInstance | null,
  includeInRoadmap: boolean | undefined
): boolean {
  // If no instance, use track's includeInRoadmap flag
  // Default to true if undefined (tracks should be visible by default)
  if (!instance) {
    return includeInRoadmap !== undefined ? includeInRoadmap : true;
  }

  // Check instance includeInRoadmap flag
  if (!instance.includeInRoadmap) {
    return false;
  }

  // Exclude hidden tracks
  if (instance.visibilityState === 'hidden') {
    return false;
  }

  // Exclude archived tracks
  if (instance.visibilityState === 'archived') {
    return false;
  }

  return true;
}

/**
 * Build projection track from domain data
 */
async function buildProjectionTrack(
  track: TrackWithChildren,
  instance: TrackProjectInstance | null,
  allItems: RoadmapItem[],
  projectId: string,
  userId: string | null,
  uiState: RoadmapUIState
): Promise<RoadmapProjectionTrack> {
  // Check edit permission
  let canEdit = false;
  if (userId) {
    try {
      const permission = await checkTrackEditPermission(track.id, projectId);
      canEdit = permission.canEdit;
    } catch (error) {
      console.error(`[useRoadmapProjection] Error checking permission for track ${track.id}:`, error);
      canEdit = false;
    }
  }

  // Get items for this track
  // Items belong to this track if:
  // 1. item.trackId === track.id AND item.subtrackId is null/undefined, OR
  // 2. item.trackId === track.id AND item.subtrackId doesn't match any child track
  // (In unified system, subtracks are child tracks, so we check if subtrackId matches a child)
  const childTrackIds = track.children?.map(c => c.id) || [];
  const trackItems = allItems.filter(item => {
    if (item.trackId !== track.id) return false;
    // If item has subtrackId, it belongs to a subtrack, not the parent track
    if (item.subtrackId && childTrackIds.includes(item.subtrackId)) return false;
    return true;
  });

  // Build subtrack projections
  // Phase 1: Tracks with zero subtracks are valid (subtrackProjections array can be empty)
  const subtrackProjections: RoadmapProjectionSubtrack[] = [];
  if (track.children && track.children.length > 0) {
    for (const childTrack of track.children) {
      // Get instance for child track
      let childInstance: TrackProjectInstance | null = null;
      try {
        childInstance = await getTrackInstance(childTrack.id, projectId);
      } catch (error) {
        console.error(`[useRoadmapProjection] Error getting instance for subtrack ${childTrack.id}:`, error);
      }

      // Check if subtrack should be included (based ONLY on visibility_state/includeInRoadmap)
      // Phase 1: Visibility is NEVER determined by item presence
      if (!shouldIncludeTrack(childInstance, childTrack.includeInRoadmap)) {
        continue;
      }

      // Get items for this subtrack
      // Items belong to this subtrack if:
      // 1. item.trackId === childTrack.id (unified system), OR
      // 2. item.subtrackId === childTrack.id (legacy system)
      // 
      // Phase 1: Empty is a valid state — subtracks with zero items MUST be included
      // Items are grouped but never determine subtrack visibility
      const subtrackItems = allItems.filter(
        item => item.trackId === childTrack.id || item.subtrackId === childTrack.id
      );

      // Check edit permission for subtrack
      let subtrackCanEdit = false;
      if (userId) {
        try {
          const subtrackPermission = await checkTrackEditPermission(childTrack.id, projectId);
          subtrackCanEdit = subtrackPermission.canEdit;
        } catch (error) {
          console.error(`[useRoadmapProjection] Error checking permission for subtrack ${childTrack.id}:`, error);
          subtrackCanEdit = false;
        }
      }

      // Determine collapse state for subtrack
      // Phase 2: Manual UI collapse overrides instance 'collapsed' state
      // Rules same as tracks (priority order)
      const userCollapsedSubtrack = uiState.collapsedSubtracks.has(childTrack.id);
      const userExpandedSubtrack = uiState.expandedSubtracks.has(childTrack.id);
      const instanceDefaultCollapsedSubtrack = childInstance?.visibilityState === 'collapsed';

      let subtrackCollapsed: boolean;
      if (userCollapsedSubtrack) {
        subtrackCollapsed = true;  // User explicitly collapsed
      } else if (userExpandedSubtrack) {
        subtrackCollapsed = false;  // User explicitly expanded (overrides instance)
      } else {
        subtrackCollapsed = instanceDefaultCollapsedSubtrack;  // Use instance default
      }

      subtrackProjections.push({
        track: childTrack,
        instance: childInstance,
        items: subtrackItems,
        itemCount: subtrackItems.length,
        canEdit: subtrackCanEdit,
        uiState: {
          collapsed: subtrackCollapsed,
          highlighted: uiState.highlightedTracks.has(childTrack.id),
        },
      });
    }
  }

  // Calculate total item count (track items + subtrack items)
  const subtrackItemCount = subtrackProjections.reduce(
    (sum, subtrack) => sum + subtrack.itemCount,
    0
  );
  const totalItemCount = trackItems.length + subtrackItemCount;

  // Determine collapse state for track
  // Phase 2: Manual UI collapse overrides instance 'collapsed' state
  // Rules (priority order):
  // 1. If in collapsedTracks → collapsed = true (user action)
  // 2. If in expandedTracks → collapsed = false (user action overrides instance)
  // 3. Otherwise → use instance default (collapsed if visibility_state is 'collapsed')
  const userCollapsed = uiState.collapsedTracks.has(track.id);
  const userExpanded = uiState.expandedTracks.has(track.id);
  const instanceDefaultCollapsed = instance?.visibilityState === 'collapsed';

  let trackCollapsed: boolean;
  if (userCollapsed) {
    trackCollapsed = true;  // User explicitly collapsed
  } else if (userExpanded) {
    trackCollapsed = false;  // User explicitly expanded (overrides instance)
  } else {
    trackCollapsed = instanceDefaultCollapsed;  // Use instance default
  }

  return {
    track,
    instance,
    subtracks: subtrackProjections,
    items: trackItems,
    canEdit,
    itemCount: trackItems.length,
    totalItemCount,
    uiState: {
      collapsed: trackCollapsed,
      highlighted: uiState.highlightedTracks.has(track.id),
      focused: uiState.focusedTrackId === track.id,
    },
  };
}

/**
 * Main hook: useRoadmapProjection
 */
export function useRoadmapProjection(masterProjectId: string): RoadmapProjection {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tracks, setTracks] = useState<RoadmapProjectionTrack[]>([]);
  const [uiState, setUIState] = useState<RoadmapUIState>(() => loadUIState(masterProjectId));

  // Load UI state when project changes
  useEffect(() => {
    setUIState(loadUIState(masterProjectId));
  }, [masterProjectId]);

  // Persist UI state changes to localStorage
  useEffect(() => {
    saveUIState(masterProjectId, uiState);
  }, [masterProjectId, uiState]);

  const loadProjection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current UI state (fresh read, not from dependency)
      const currentUIState = loadUIState(masterProjectId);

      // Fetch domain data in parallel
      const [trackTree, allItems, tracksWithInstances] = await Promise.all([
        getTrackTree(masterProjectId),
        getRoadmapItemsByProject(masterProjectId),
        getTracksForProject(masterProjectId, true), // includeInstances = true
      ]);

      // Build a map of track instances for quick lookup
      const instanceMap = new Map<string, TrackProjectInstance>();
      tracksWithInstances.forEach(trackWithInstance => {
        if (trackWithInstance.instance) {
          instanceMap.set(trackWithInstance.id, trackWithInstance.instance);
        }
      });

      // Build projection tracks
      const projectionTracks: RoadmapProjectionTrack[] = [];

      // Helper function to process tracks recursively (only top-level tracks)
      // Child tracks (subtracks) are handled within buildProjectionTrack
      async function processRootTracks(trackNodes: TrackWithChildren[]): Promise<void> {
        for (const track of trackNodes) {
          // Get instance for this track
          const instance = instanceMap.get(track.id) || null;

          // Check if track should be included in projection
          if (!shouldIncludeTrack(instance, track.includeInRoadmap)) {
            continue;
          }

          // Build projection track (this will handle subtracks recursively)
          const projectionTrack = await buildProjectionTrack(
            track,
            instance,
            allItems,
            masterProjectId,
            user?.id || null,
            currentUIState
          );

          projectionTracks.push(projectionTrack);
        }
      }

      await processRootTracks(trackTree);

      // Sort by order (from instance or track orderingIndex)
      projectionTracks.sort((a, b) => {
        const orderA = a.instance?.orderIndex ?? a.track.orderingIndex;
        const orderB = b.instance?.orderIndex ?? b.track.orderingIndex;
        return orderA - orderB;
      });

      setTracks(projectionTracks);
    } catch (err) {
      console.error('[useRoadmapProjection] Error loading projection:', err);
      setError(err instanceof Error ? err : new Error('Failed to load roadmap projection'));
    } finally {
      setLoading(false);
    }
  }, [masterProjectId, user?.id]);

  // Load projection on mount and when dependencies change
  useEffect(() => {
    loadProjection();
  }, [loadProjection]);

  // Phase 2: Refresh projection when UI state changes in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storageKey = `${UI_STATE_STORAGE_KEY_PREFIX}${masterProjectId}`;

    const handleStorageChange = (e: StorageEvent) => {
      // Only react to changes to this project's UI state
      if (e.key === storageKey && e.newValue !== e.oldValue) {
        // Refresh projection to pick up new UI state
        loadProjection();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event for same-window updates
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail?.key === storageKey) {
        loadProjection();
      }
    };

    window.addEventListener('roadmap-ui-state-changed' as any, handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('roadmap-ui-state-changed' as any, handleCustomStorageChange);
    };
  }, [masterProjectId, loadProjection]);

  // Calculate totals
  const totalTracks = tracks.length;
  const totalItems = tracks.reduce((sum, track) => sum + track.totalItemCount, 0);

  return {
    tracks,
    totalTracks,
    totalItems,
    loading,
    error,
    refresh: loadProjection,
  };
}

/**
 * Helper hook to update UI state (collapse/highlight tracks)
 * 
 * This is the ONLY way UI components should modify UI state.
 * Never directly mutate the projection's uiState.
 */
export function useRoadmapUIState(projectId: string) {
  const [uiState, setUIState] = useState<RoadmapUIState>(() => loadUIState(projectId));

  // Load UI state when project changes
  useEffect(() => {
    setUIState(loadUIState(projectId));
  }, [projectId]);

  // Persist changes
  useEffect(() => {
    saveUIState(projectId, uiState);
  }, [projectId, uiState]);

  // Phase 2: Track collapse methods
  const toggleTrackCollapse = useCallback((trackId: string) => {
    setUIState(prev => {
      const next = { ...prev };
      next.collapsedTracks = new Set(prev.collapsedTracks);
      next.expandedTracks = new Set(prev.expandedTracks);

      if (next.collapsedTracks.has(trackId)) {
        // Currently collapsed → expand it
        next.collapsedTracks.delete(trackId);
        // Add to expanded set to override instance default if needed
        next.expandedTracks.add(trackId);
      } else {
        // Currently expanded → collapse it
        next.collapsedTracks.add(trackId);
        // Remove from expanded set
        next.expandedTracks.delete(trackId);
      }
      return next;
    });
  }, []);

  const setTrackCollapsed = useCallback((trackId: string, collapsed: boolean) => {
    setUIState(prev => {
      const next = { ...prev };
      next.collapsedTracks = new Set(prev.collapsedTracks);
      next.expandedTracks = new Set(prev.expandedTracks);

      if (collapsed) {
        next.collapsedTracks.add(trackId);
        next.expandedTracks.delete(trackId);
      } else {
        next.collapsedTracks.delete(trackId);
        next.expandedTracks.add(trackId);
      }
      return next;
    });
  }, []);

  const isTrackCollapsed = useCallback((trackId: string): boolean => {
    // This is a helper - actual collapse state comes from projection
    return uiState.collapsedTracks.has(trackId);
  }, [uiState.collapsedTracks]);

  // Phase 2: Subtrack collapse methods
  const toggleSubtrackCollapse = useCallback((subtrackId: string) => {
    setUIState(prev => {
      const next = { ...prev };
      next.collapsedSubtracks = new Set(prev.collapsedSubtracks);
      next.expandedSubtracks = new Set(prev.expandedSubtracks);

      if (next.collapsedSubtracks.has(subtrackId)) {
        // Currently collapsed → expand it
        next.collapsedSubtracks.delete(subtrackId);
        next.expandedSubtracks.add(subtrackId);
      } else {
        // Currently expanded → collapse it
        next.collapsedSubtracks.add(subtrackId);
        next.expandedSubtracks.delete(subtrackId);
      }
      return next;
    });
  }, []);

  const isSubtrackCollapsed = useCallback((subtrackId: string): boolean => {
    // This is a helper - actual collapse state comes from projection
    return uiState.collapsedSubtracks.has(subtrackId);
  }, [uiState.collapsedSubtracks]);

  // Legacy method for backward compatibility (maps to track collapse)
  const toggleCollapse = toggleTrackCollapse;

  const setHighlighted = useCallback((trackId: string, highlighted: boolean) => {
    setUIState(prev => {
      const next = { ...prev };
      next.highlightedTracks = new Set(prev.highlightedTracks);
      if (highlighted) {
        next.highlightedTracks.add(trackId);
      } else {
        next.highlightedTracks.delete(trackId);
      }
      return next;
    });
  }, []);

  const setFocused = useCallback((trackId: string | null) => {
    setUIState(prev => ({
      ...prev,
      focusedTrackId: trackId,
    }));
  }, []);

  // Phase 2: View mode setter
  const setViewMode = useCallback((viewMode: 'day' | 'week' | 'month') => {
    setUIState(prev => ({
      ...prev,
      viewMode,
    }));
  }, []);

  // Phase 3.9: Set anchor date
  const setAnchorDate = useCallback((anchorDate: string) => {
    setUIState(prev => ({
      ...prev,
      anchorDate,
    }));
  }, []);

  // Phase 3.9: Navigate week window (shift by weeks)
  const navigateWeekWindow = useCallback((weeks: number) => {
    setUIState(prev => {
      const currentDate = new Date(prev.anchorDate);
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (weeks * 7));
      return {
        ...prev,
        anchorDate: newDate.toISOString().split('T')[0],
      };
    });
  }, []);

  // Phase 3.9: Navigate to day view (save current week anchor)
  const navigateToDayView = useCallback((weekStartDate: string) => {
    setUIState(prev => ({
      ...prev,
      viewMode: 'day',
      lastWeekAnchor: prev.anchorDate, // Save current week anchor
      anchorDate: weekStartDate, // Set anchor to week start
    }));
  }, []);

  // Phase 3.9: Navigate back to week view from day view
  const navigateBackToWeekView = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      viewMode: 'week',
      anchorDate: prev.lastWeekAnchor || prev.anchorDate, // Restore last week anchor
      lastWeekAnchor: undefined, // Clear last week anchor
    }));
  }, []);

  // Phase 4.0: Navigate month window (shift by months)
  const navigateMonthWindow = useCallback((months: number) => {
    setUIState(prev => {
      const currentDate = new Date(prev.anchorDate);
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + months);
      return {
        ...prev,
        anchorDate: newDate.toISOString().split('T')[0],
      };
    });
  }, []);

  // Phase 4.0: Navigate to today
  const navigateToToday = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      anchorDate: new Date().toISOString().split('T')[0],
    }));
  }, []);

  // Phase 2: Bulk actions (manual only)
  const expandAllTracks = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      collapsedTracks: new Set(),
      collapsedSubtracks: new Set(),
      // Keep expandedTracks to preserve user overrides
    }));
  }, []);

  const collapseAllTracks = useCallback((trackIds: string[]) => {
    setUIState(prev => {
      const next = { ...prev };
      next.collapsedTracks = new Set(trackIds);
      // Remove from expanded set when collapsing
      next.expandedTracks = new Set(
        Array.from(prev.expandedTracks).filter(id => !trackIds.includes(id))
      );
      return next;
    });
  }, []);

  return {
    uiState,
    // Track collapse methods
    toggleTrackCollapse,
    setTrackCollapsed,
    isTrackCollapsed,
    // Subtrack collapse methods
    toggleSubtrackCollapse,
    isSubtrackCollapsed,
    // Bulk actions
    expandAllTracks,
    collapseAllTracks,
    // Phase 2: View mode
    setViewMode,
    // Phase 3.9: Time navigation
    setAnchorDate,
    navigateWeekWindow,
    navigateToDayView,
    navigateBackToWeekView,
    // Phase 4.0: Additional time navigation
    navigateMonthWindow,
    navigateToToday,
    // Legacy methods
    toggleCollapse, // Maps to toggleTrackCollapse for backward compatibility
    setHighlighted,
    setFocused,
  };
}
