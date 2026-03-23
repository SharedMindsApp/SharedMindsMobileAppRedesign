/**
 * Roadmap Items Helpers
 * 
 * Phase 3.7: Roadmap Items Micro-App Helper Functions
 * 
 * Workspace-scoped roadmap items utilities.
 * All database access goes through roadmapService.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * - ✅ All DB access through roadmapService
 * - ✅ UI components never query Supabase directly
 * - ✅ Helpers are pure functions or thin service wrappers
 */

import {
  getRoadmapItemsByProject,
  type RoadmapItem,
} from '../roadmapService';

/**
 * Get roadmap items for a workspace context (track or subtrack)
 */
export async function getRoadmapItemsForWorkspace(
  projectId: string,
  trackId: string,
  subtrackId?: string | null
): Promise<RoadmapItem[]> {
  // Get all items for the project
  const allItems = await getRoadmapItemsByProject(projectId);

  // Filter by workspace context
  const workspaceItems = allItems.filter((item) => {
    if (subtrackId !== undefined && subtrackId !== null) {
      // Subtrack workspace: must match track_id AND subtrack_id
      return item.trackId === trackId && item.subtrackId === subtrackId;
    } else {
      // Track workspace: must match track_id AND subtrack_id IS NULL
      return item.trackId === trackId && item.subtrackId === null;
    }
  });

  // Sort: primary by relevant date (start_date if exists else end_date) ascending,
  // secondary by created_at descending
  workspaceItems.sort((a, b) => {
    // Primary sort: relevant date
    const aDate = a.startDate || a.endDate;
    const bDate = b.startDate || b.endDate;

    if (aDate && bDate) {
      const dateCompare = new Date(aDate).getTime() - new Date(bDate).getTime();
      if (dateCompare !== 0) return dateCompare;
    } else if (aDate && !bDate) {
      return -1; // a has date, b doesn't - a comes first
    } else if (!aDate && bDate) {
      return 1; // b has date, a doesn't - b comes first
    }

    // Secondary sort: created_at descending (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return workspaceItems;
}

/**
 * Format date for display (handles null/undefined)
 */
export function formatRoadmapItemDate(date: string | null | undefined): string {
  if (!date) return 'No date';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date range for display
 */
export function formatRoadmapItemDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): string {
  if (!startDate && !endDate) return 'No date';
  if (startDate && endDate) {
    const start = new Date(startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = new Date(endDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `${start} → ${end}`;
  }
  if (startDate) return `Starts: ${formatRoadmapItemDate(startDate)}`;
  if (endDate) return `Due: ${formatRoadmapItemDate(endDate)}`;
  return 'No date';
}

/**
 * Get type badge label
 */
export function getRoadmapItemTypeLabel(type: RoadmapItem['type']): string {
  const labels: Record<RoadmapItem['type'], string> = {
    task: 'Task',
    event: 'Event',
    milestone: 'Milestone',
    goal: 'Goal',
  };
  return labels[type] || type;
}

/**
 * Get status badge label
 */
export function getRoadmapItemStatusLabel(status: RoadmapItem['status']): string {
  const labels: Record<RoadmapItem['status'], string> = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    blocked: 'Blocked',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Get type badge color (for UI styling)
 */
export function getRoadmapItemTypeColor(type: RoadmapItem['type']): string {
  const colors: Record<RoadmapItem['type'], string> = {
    task: 'bg-blue-100 text-blue-700',
    event: 'bg-purple-100 text-purple-700',
    milestone: 'bg-green-100 text-green-700',
    goal: 'bg-yellow-100 text-yellow-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
}

/**
 * Get status badge color (for UI styling)
 */
export function getRoadmapItemStatusColor(status: RoadmapItem['status']): string {
  const colors: Record<RoadmapItem['status'], string> = {
    pending: 'bg-gray-100 text-gray-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    blocked: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Focus roadmap on a track/subtrack (UI-only, writes to localStorage)
 */
export function focusRoadmapOnTrack(
  projectId: string,
  trackId: string,
  subtrackId?: string | null
): void {
  const storageKey = `roadmap_ui_state_${projectId}`;
  
  try {
    const existing = localStorage.getItem(storageKey);
    const uiState = existing ? JSON.parse(existing) : {};
    
    // Set focused track
    uiState.focusedTrackId = trackId;
    
    // Optionally highlight the track/subtrack
    if (!uiState.highlightedTracks) {
      uiState.highlightedTracks = [];
    }
    if (!uiState.highlightedTracks.includes(trackId)) {
      uiState.highlightedTracks.push(trackId);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(uiState));
  } catch (error) {
    console.error('[roadmapItemsHelpers] Error saving roadmap UI state:', error);
  }
}
