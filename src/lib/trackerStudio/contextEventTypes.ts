/**
 * Context Event Types
 * 
 * Context events (life states) annotate time periods to explain tracker deviations.
 * They never modify tracker data or enforce behavior.
 */

export type ContextEventType = 'illness' | 'recovery' | 'travel' | 'injury' | 'stress' | 'custom';
export type ContextEventSeverity = 'low' | 'medium' | 'high';

export interface ContextEvent {
  id: string;
  owner_id: string; // auth.uid
  type: ContextEventType;
  label: string;
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date: string | null; // ISO date string (YYYY-MM-DD) or null for open-ended
  severity: ContextEventSeverity | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateContextEventInput {
  type: ContextEventType;
  label: string;
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date?: string | null; // ISO date string (YYYY-MM-DD) or null for open-ended
  severity?: ContextEventSeverity | null;
  notes?: string | null;
}

export interface UpdateContextEventInput {
  type?: ContextEventType;
  label?: string;
  start_date?: string; // ISO date string (YYYY-MM-DD)
  end_date?: string | null; // ISO date string (YYYY-MM-DD) or null for open-ended
  severity?: ContextEventSeverity | null;
  notes?: string | null;
}

export interface ListContextEventsOptions {
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  include_archived?: boolean;
}

/**
 * Context event type labels for UI
 */
export const CONTEXT_EVENT_TYPE_LABELS: Record<ContextEventType, string> = {
  illness: 'Illness',
  recovery: 'Recovery',
  travel: 'Travel',
  injury: 'Injury',
  stress: 'Stress Period',
  custom: 'Custom',
};

/**
 * Context event severity labels for UI
 */
export const CONTEXT_EVENT_SEVERITY_LABELS: Record<ContextEventSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/**
 * Get color for context event type (for timeline visualization)
 */
export function getContextEventTypeColor(type: ContextEventType): string {
  switch (type) {
    case 'illness':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'recovery':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'travel':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'injury':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'stress':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'custom':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Check if a context event is active on a given date
 */
export function isContextEventActiveOnDate(
  event: ContextEvent,
  date: string // ISO date string
): boolean {
  if (event.archived_at) {
    return false;
  }

  const eventStart = new Date(event.start_date);
  const eventEnd = event.end_date ? new Date(event.end_date) : null;
  const checkDate = new Date(date);

  if (checkDate < eventStart) {
    return false;
  }

  if (eventEnd && checkDate > eventEnd) {
    return false;
  }

  return true;
}

/**
 * Check if a context event overlaps with a date range
 */
export function doesContextEventOverlapRange(
  event: ContextEvent,
  startDate: string,
  endDate: string
): boolean {
  if (event.archived_at) {
    return false;
  }

  const eventStart = new Date(event.start_date);
  const eventEnd = event.end_date ? new Date(event.end_date) : null;
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);

  // Event starts within range
  if (eventStart >= rangeStart && eventStart <= rangeEnd) {
    return true;
  }

  // Event ends within range
  if (eventEnd && eventEnd >= rangeStart && eventEnd <= rangeEnd) {
    return true;
  }

  // Event spans entire range
  if (eventStart <= rangeStart && (eventEnd === null || eventEnd >= rangeEnd)) {
    return true;
  }

  return false;
}
