/**
 * CalendarCore - Unified Calendar System
 * 
 * Single source of truth for all calendar UI and logic.
 * Used by both SpacesOS and Planner contexts.
 * 
 * ❌ DO NOT create calendar views outside this module
 * ✅ All calendar rendering must come from calendarCore
 */

export { CalendarShell } from './CalendarShell';
export { CalendarQuickViewDrawer } from './CalendarQuickViewDrawer';
export { CalendarModeBar } from './CalendarModeBar';
export { CalendarSearchOverlay } from './CalendarSearchOverlay';
export type {
  CalendarView,
  CalendarContext,
  CalendarScope,
  CalendarUIConfig,
  CalendarEvent,
  CalendarEventHandlers,
} from './types';

// Re-export hooks for advanced usage
export { useCalendarEvents } from './hooks/useCalendarEvents';
export { useCalendarNavigation } from './hooks/useCalendarNavigation';
export { useCalendarGestures } from './hooks/useCalendarGestures';
