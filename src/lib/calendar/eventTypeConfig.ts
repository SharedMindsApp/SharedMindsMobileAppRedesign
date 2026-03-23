/**
 * Event Type Configuration
 * 
 * Defines semantic behavior for calendar event types.
 * This is logic-only configuration - no UI changes yet.
 * 
 * ⚠️ This file must not change behavior yet - it only describes semantics
 * for later UI/logic use when feature flags are enabled.
 */

import type { CalendarEventType } from '../personalSpaces/calendarService';

export interface EventTypeConfig {
  timeMode: 'fixed' | 'flexible' | 'deadline' | 'recurring' | 'trigger' | 'point';
  canBeContainer?: boolean;
  canContainNested?: boolean;
  requiresParticipants?: boolean;
  readOnlyByDefault?: boolean;
  noDuration?: boolean;
  completionBased?: boolean;
  category?: 'life' | 'work' | 'personal' | 'social';
  isNestedOnly?: boolean;
}

export const EVENT_TYPE_CONFIG: Record<CalendarEventType, EventTypeConfig> = {
  event: {
    timeMode: 'fixed',
    canBeContainer: false,
  },
  meeting: {
    timeMode: 'fixed',
    requiresParticipants: true,
  },
  appointment: {
    timeMode: 'fixed',
    readOnlyByDefault: true,
  },
  time_block: {
    timeMode: 'flexible',
    canContainNested: true,
  },
  goal: {
    timeMode: 'deadline',
    noDuration: true,
  },
  habit: {
    timeMode: 'recurring',
    completionBased: true,
  },
  meal: {
    timeMode: 'fixed',
    category: 'life',
  },
  task: {
    timeMode: 'deadline',
    noDuration: true,
  },
  reminder: {
    timeMode: 'trigger',
    noDuration: true,
  },
  travel_segment: {
    timeMode: 'fixed',
    isNestedOnly: true,
  },
  milestone: {
    timeMode: 'point',
    noDuration: true,
  },
} as const;

/**
 * Get configuration for an event type
 * Returns default 'event' config if type is not recognized
 */
export function getEventTypeConfig(eventType?: CalendarEventType): EventTypeConfig {
  if (!eventType || !(eventType in EVENT_TYPE_CONFIG)) {
    return EVENT_TYPE_CONFIG.event;
  }
  return EVENT_TYPE_CONFIG[eventType];
}

/**
 * Feature flag for event type behavior
 * When false: Types exist but behave like normal events
 * When true: Types have semantic behavior based on config
 */
export const FEATURE_EVENT_TYPES = false;

