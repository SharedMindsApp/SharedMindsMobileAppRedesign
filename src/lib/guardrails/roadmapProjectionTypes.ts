/**
 * Roadmap Projection Types
 * 
 * Phase 0 Architectural Lock-In: UI Boundary Types
 * 
 * These types define the UI-safe projection structure that separates:
 * - Domain data (tracks, instances, subtracks, items)
 * - Per-project configuration (visibility_state, includeInRoadmap)
 * - UI-only state (collapse, highlights) - NEVER persisted to database
 * 
 * ⚠️ CRITICAL: uiState must NEVER be written to the database.
 * It is purely transient UI state managed in localStorage only.
 */

import type { Track } from './coreTypes';
import type { TrackProjectInstance } from './tracksTypes';
import type { RoadmapItem } from './coreTypes';

/**
 * Subtrack projection
 * 
 * ARCHITECTURAL NOTE: Subtracks are child tracks in the hierarchy.
 * This is a PROJECTION LAYER type - it represents shaped data for visualization,
 * not domain data.
 * 
 * Empty State Validity:
 * - Empty is a valid state — subtracks with zero items MUST be included
 * 
 * See: docs/ARCHITECTURE_TRACKS_ROADMAP.md for full architectural documentation.
 */
export interface RoadmapProjectionSubtrack {
  track: Track;
  instance: TrackProjectInstance | null;
  // ARCHITECTURAL NOTE: Empty array is valid — subtracks with zero items render
  items: RoadmapItem[];
  itemCount: number; // For display only, not for filtering
  
  // Derived (read-only)
  canEdit: boolean;
  
  // UI-only (NOT persisted)
  // ARCHITECTURAL NOTE: UI state lives in localStorage, never in Supabase
  uiState: {
    collapsed: boolean;
    highlighted: boolean;
  };
}

/**
 * Roadmap Projection Track
 * 
 * ARCHITECTURAL NOTE: This is the UI-safe structure consumed by Roadmap components.
 * All data shaping happens here - components receive fully-shaped data.
 * 
 * Empty State Validity:
 * - Empty is a valid state — absence of items is not an error
 * - tracks with zero subtracks MUST be included
 * - tracks with zero roadmap items MUST be included
 * 
 * See: docs/ARCHITECTURE_TRACKS_ROADMAP.md for full architectural documentation.
 */
export interface RoadmapProjectionTrack {
  // Domain data (read-only)
  track: Track;
  instance: TrackProjectInstance | null;
  
  // Subtracks (child tracks in hierarchy)
  // ARCHITECTURAL NOTE: Empty array is valid — tracks with zero subtracks render
  subtracks: RoadmapProjectionSubtrack[];
  
  // Items directly assigned to this track (not to subtracks)
  // ARCHITECTURAL NOTE: Empty array is valid — tracks with zero items render
  items: RoadmapItem[];
  
  // Derived (read-only)
  canEdit: boolean;
  itemCount: number; // For display only, not for filtering
  totalItemCount: number; // Includes items in subtracks, for display only
  
  // UI-only (NOT persisted to database)
  // ARCHITECTURAL NOTE: UI state lives in localStorage, never in Supabase
  uiState: {
    collapsed: boolean;
    highlighted: boolean;
    focused: boolean;
  };
}

/**
 * Roadmap Projection
 * 
 * ARCHITECTURAL NOTE: The complete projection structure returned by useRoadmapProjection hook.
 * 
 * This is a PROJECTION LAYER type - it represents shaped data for visualization,
 * not domain data. The Roadmap uses this to render tracks, subtracks, and items.
 * 
 * Empty State Validity:
 * - Empty is a valid state — tracks array can be empty (shows empty state)
 * - totalItems can be 0 (tracks render even with zero items)
 * 
 * See: docs/ARCHITECTURE_TRACKS_ROADMAP.md for full architectural documentation.
 */
export interface RoadmapProjection {
  // ARCHITECTURAL NOTE: Empty array is valid
  tracks: RoadmapProjectionTrack[]; // All tracks in projection (filtered by visibility_state and includeInRoadmap)
  
  // Total counts (for display only, not for filtering)
  totalTracks: number; // For display only, not for filtering
  totalItems: number; // For display only, not for filtering - zero is valid
  
  // Loading state
  loading: boolean;
  error: Error | null;
  
  // Refresh function (re-fetches data)
  // ARCHITECTURAL NOTE: Refreshes projection, does NOT mutate domain data
  refresh: () => Promise<void>;
}

/**
 * UI State Persistence
 * 
 * Stored in localStorage with key: roadmap_ui_state_<projectId>
 * 
 * Phase 2: Enhanced structure for track and subtrack collapse state + view mode
 * 
 * Collapse state tracking (manual override system):
 * - collapsedTracks: Set of track IDs user has explicitly collapsed
 * - expandedTracks: Set of track IDs user has explicitly expanded (overrides instance 'collapsed')
 * - Logic: If in collapsedTracks → collapsed. If in expandedTracks → expanded. Otherwise → instance default.
 */
export interface RoadmapUIState {
  // Track collapse state - Set of track IDs user has explicitly collapsed
  collapsedTracks: Set<string>;
  // Track expand state - Set of track IDs user has explicitly expanded (overrides instance 'collapsed')
  expandedTracks: Set<string>;
  // Subtrack collapse state - Set of subtrack IDs user has explicitly collapsed
  collapsedSubtracks: Set<string>;
  // Subtrack expand state - Set of subtrack IDs user has explicitly expanded
  expandedSubtracks: Set<string>;
  highlightedTracks: Set<string>;
  focusedTrackId: string | null;
  // Phase 2: View mode (day/week/month)
  viewMode: 'day' | 'week' | 'month';
  // Phase 3.9: Anchor date for time navigation (ISO date string)
  anchorDate: string;
  // Phase 3.9: Last week anchor for returning from day view (optional ISO date string)
  lastWeekAnchor?: string;
}
