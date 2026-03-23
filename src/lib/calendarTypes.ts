export type EventColor = 'blue' | 'red' | 'yellow' | 'green' | 'purple' | 'gray' | 'orange' | 'pink';

export type CalendarEventType =
  | 'event'
  | 'meeting'
  | 'appointment'
  | 'time_block'
  | 'goal'
  | 'habit'
  | 'meal'
  | 'task'
  | 'reminder'
  | 'travel_segment'
  | 'milestone';

export interface CalendarEvent {
  id: string;
  household_id: string;
  created_by: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string;
  color: EventColor;
  event_type?: CalendarEventType;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventMember {
  event_id: string;
  member_profile_id: string;
}

export interface CalendarEventWithMembers extends CalendarEvent {
  members: CalendarEventMember[];
  member_profiles?: {
    id: string;
    full_name: string;
    email: string;
  }[];
}

export interface CreateEventData {
  household_id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  location?: string;
  color?: EventColor;
  event_type?: CalendarEventType;
  member_ids?: string[];
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  all_day?: boolean;
  location?: string;
  color?: EventColor;
  event_type?: CalendarEventType;
  member_ids?: string[];
}

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarFilters {
  memberIds?: string[];
  colors?: EventColor[];
  myEventsOnly?: boolean;
}

export interface DayEvent {
  event: CalendarEventWithMembers;
  startMinutes: number;
  endMinutes: number;
  isMultiDay: boolean;
  isStart: boolean;
  isEnd: boolean;
}
