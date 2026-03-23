/**
 * CalendarCore Types
 * 
 * Shared type definitions for the unified calendar system.
 * These types are used across SpacesOS and Planner contexts.
 */

export type CalendarView = 'day' | 'week' | 'month' | 'year' | 'agenda';

export type CalendarContext = 'spaces' | 'planner';

export interface CalendarScope {
  spaceId?: string;
  projectId?: string;
  userId?: string;
  householdId?: string | null;
}

export interface CalendarUIConfig {
  showQuickActions?: boolean;
  showHeader?: boolean;
  showFilters?: boolean;
  showViewSelector?: boolean;
  defaultView?: CalendarView;
  enableGestures?: boolean;
  enableOffline?: boolean;
  filters?: CalendarFilters;
  readOnly?: boolean; // When true, disables create/edit/delete/drag/resize
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string;
  created_by: string;
  household_id: string | null;
  created_at?: string;
  updated_at?: string;
  members?: Array<{
    id: string;
    member_profile_id: string;
    full_name: string;
    email: string;
  }>;
}

export interface CalendarFilters {
  memberIds?: string[];
  colors?: string[];
  myEventsOnly?: boolean;
}

export interface CalendarNavigationState {
  currentDate: Date;
  view: CalendarView;
}

export interface CalendarEventHandlers {
  onEventClick?: (event: CalendarEvent) => void;
  onEventCreate?: (date?: Date, startTime?: string, endTime?: string) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
  onTimeSlotClick?: (date: Date, time: string) => void;
  onDayClick?: (date: Date) => void;
  onDayDoubleClick?: (date: Date) => void;
}
