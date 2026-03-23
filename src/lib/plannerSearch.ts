/**
 * Planner Search Service
 * 
 * Centralized search for planner-scoped items:
 * - Calendar events
 * - Tasks / todos
 * - Daily alignment entries
 * - Planner notes
 * 
 * Phase 1: Client-side search only, planner scope only
 */

import { getPersonalCalendarEvents } from './personalSpaces/calendarService';
import type { PersonalCalendarEvent } from './personalSpaces/calendarService';

export type PlannerSearchResultType = 'event' | 'task' | 'note' | 'alignment';

export interface PlannerSearchResult {
  id: string;
  type: PlannerSearchResultType;
  title: string;
  subtitle?: string;
  date?: Date;
  route: string;
  metadata?: {
    description?: string;
    location?: string;
    tags?: string[];
  };
}

/**
 * Normalize search query for matching
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim();
}

/**
 * Check if text matches query (case-insensitive, partial match)
 */
function matchesQuery(text: string | null | undefined, query: string): boolean {
  if (!text) return false;
  return normalizeQuery(text).includes(normalizeQuery(query));
}

/**
 * Search calendar events
 */
async function searchEvents(
  userId: string,
  query: string
): Promise<PlannerSearchResult[]> {
  try {
    const events = await getPersonalCalendarEvents(userId);
    const normalizedQuery = normalizeQuery(query);
    
    return events
      .filter(event => {
        // Search in title, description
        return (
          matchesQuery(event.title, query) ||
          matchesQuery(event.description, query)
        );
      })
      .map(event => {
        const startDate = new Date(event.startAt);
        const dateStr = startDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: startDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
        
        // Format date for route (YYYY-MM-DD)
        const dateParam = startDate.toISOString().split('T')[0];
        
        return {
          id: event.id,
          type: 'event' as PlannerSearchResultType,
          title: event.title,
          subtitle: dateStr,
          date: startDate,
          route: `/planner/calendar?view=day&date=${dateParam}`,
          metadata: {
            description: event.description || undefined,
          },
        };
      });
  } catch (error) {
    console.error('[plannerSearch] Error searching events:', error);
    return [];
  }
}

/**
 * Search tasks (placeholder - to be implemented when task data structure is available)
 */
async function searchTasks(
  userId: string,
  query: string
): Promise<PlannerSearchResult[]> {
  // TODO: Implement when task/todo data structure is available
  return [];
}

/**
 * Search daily alignment entries (placeholder - to be implemented)
 */
async function searchDailyAlignment(
  userId: string,
  query: string
): Promise<PlannerSearchResult[]> {
  // TODO: Implement when daily alignment data structure is available
  return [];
}

/**
 * Search planner notes (placeholder - to be implemented)
 */
async function searchNotes(
  userId: string,
  query: string
): Promise<PlannerSearchResult[]> {
  // TODO: Implement when notes/journal data structure is available
  return [];
}

/**
 * Main search function - searches all planner items
 * 
 * @param userId - User ID to search for
 * @param query - Search query string
 * @returns Array of search results grouped by type
 */
export async function searchPlannerItems(
  userId: string,
  query: string
): Promise<PlannerSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  // Search all types in parallel
  const [events, tasks, notes, alignment] = await Promise.all([
    searchEvents(userId, query),
    searchTasks(userId, query),
    searchNotes(userId, query),
    searchDailyAlignment(userId, query),
  ]);

  // Combine and return all results
  return [...events, ...tasks, ...notes, ...alignment];
}

/**
 * Group results by type for display
 */
export function groupResultsByType(
  results: PlannerSearchResult[]
): Record<PlannerSearchResultType, PlannerSearchResult[]> {
  const grouped: Record<PlannerSearchResultType, PlannerSearchResult[]> = {
    event: [],
    task: [],
    note: [],
    alignment: [],
  };

  results.forEach(result => {
    grouped[result.type].push(result);
  });

  return grouped;
}
