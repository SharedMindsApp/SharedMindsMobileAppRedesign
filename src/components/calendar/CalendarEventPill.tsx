/**
 * CalendarEventPill - Reusable event rendering component
 * 
 * Supports variants: allDay, timed, container, nested
 * Respects PermissionFlags for style + interactions
 */

import { Lock, Share2, Clock, Calendar, Users, Target, Repeat, Utensils, CheckSquare, Bell, Plane, Flag } from 'lucide-react';
import { PersonalCalendarEvent, type CalendarEventType } from '../../lib/personalSpaces/calendarService';
import type { PermissionFlags } from '../../lib/permissions/types';

export interface CalendarEventPillProps {
  event: PersonalCalendarEvent;
  variant: 'allDay' | 'timed' | 'container' | 'nested';
  permissions?: PermissionFlags;
  onClick?: () => void;
  className?: string;
  showTime?: boolean;
  isCompact?: boolean;
}

export function CalendarEventPill({
  event,
  variant,
  permissions,
  onClick,
  className = '',
  showTime = true,
  isCompact = false,
}: CalendarEventPillProps) {
  const canEdit = permissions?.can_edit ?? true;
  const isReadOnly = !canEdit;
  const isContext = event.sourceType === 'context';
  const isGuardrails = event.sourceType === 'guardrails';
  const isPersonal = event.sourceType === 'personal';
  const eventType: CalendarEventType = event.event_type ?? 'event';

  // Format time for timed events
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get event type icon (minimal, non-intrusive)
  const getEventTypeIcon = () => {
    if (eventType === 'event') return null; // No icon for default type
    
    const iconMap: Record<CalendarEventType, typeof Calendar | null> = {
      event: null,
      meeting: Users,
      appointment: Calendar,
      time_block: Clock,
      goal: Target,
      habit: Repeat,
      meal: Utensils,
      task: CheckSquare,
      reminder: Bell,
      travel_segment: Plane,
      milestone: Flag,
    };
    
    return iconMap[eventType] || null;
  };

  // Get event type label for tooltip
  const getEventTypeLabel = () => {
    if (eventType === 'event') return null;
    
    const labelMap: Record<CalendarEventType, string> = {
      event: 'Event',
      meeting: 'Meeting',
      appointment: 'Appointment',
      time_block: 'Time Block',
      goal: 'Goal',
      habit: 'Habit',
      meal: 'Meal',
      task: 'Task',
      reminder: 'Reminder',
      travel_segment: 'Travel',
      milestone: 'Milestone',
    };
    
    return labelMap[eventType] || 'Event';
  };

  const EventTypeIcon = getEventTypeIcon();
  const eventTypeLabel = getEventTypeLabel();

  // Determine base styling based on variant and permissions
  const getBaseStyles = () => {
    if (isReadOnly) {
      return 'border-dashed border-2';
    }
    return 'border-solid border';
  };

  const getColorStyles = () => {
    if (isReadOnly) {
      if (variant === 'container') {
        return 'bg-blue-50 border-blue-300 text-blue-900';
      }
      if (variant === 'nested') {
        return 'bg-gray-50 border-gray-300 text-gray-700';
      }
      return 'bg-purple-50 border-purple-300 text-purple-700';
    }

    if (variant === 'container') {
      return 'bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200';
    }
    if (variant === 'nested') {
      return 'bg-gray-100 border-gray-400 text-gray-800 hover:bg-gray-200';
    }
    if (isContext) {
      return 'bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200';
    }
    if (isGuardrails) {
      return 'bg-purple-100 border-purple-400 text-purple-900 hover:bg-purple-200';
    }
    return 'bg-purple-100 border-purple-400 text-purple-900 hover:bg-purple-200';
  };

  const baseStyles = getBaseStyles();
  const colorStyles = getColorStyles();

  if (variant === 'container') {
    // Container events render as bands
    return (
      <div
        className={`${baseStyles} ${colorStyles} rounded-md px-2 py-1 text-xs font-medium flex items-center gap-1.5 ${className} ${
          onClick ? 'cursor-pointer' : ''
        }`}
        onClick={onClick}
      >
        <span className="truncate flex-1">{event.title}</span>
        {event.contextType && (
          <span className="px-1 py-0.5 bg-white/60 rounded text-[8px] font-medium flex-shrink-0">
            {event.contextType}
          </span>
        )}
        {EventTypeIcon && eventTypeLabel && (
          <EventTypeIcon 
            size={10} 
            className="text-gray-500 flex-shrink-0" 
            title={eventTypeLabel}
          />
        )}
        {isReadOnly && <Lock size={10} className="text-orange-600 flex-shrink-0" />}
        {isContext && !isReadOnly && <Share2 size={10} className="text-blue-600 flex-shrink-0" />}
      </div>
    );
  }

  if (variant === 'nested') {
    // Nested events with indentation
    return (
      <div
        className={`${baseStyles} ${colorStyles} rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1 ${className} ${
          onClick ? 'cursor-pointer' : ''
        }`}
        onClick={onClick}
      >
        <span className="text-gray-500">└</span>
        <span className="truncate flex-1">{event.title}</span>
        {EventTypeIcon && eventTypeLabel && (
          <EventTypeIcon 
            size={8} 
            className="text-gray-500 flex-shrink-0" 
            title={eventTypeLabel}
          />
        )}
        {isReadOnly && <Lock size={8} className="text-orange-600 flex-shrink-0" />}
      </div>
    );
  }

  if (variant === 'allDay') {
    // All-day events
    return (
      <div
        className={`${baseStyles} ${colorStyles} rounded-md px-2 py-1 text-xs font-medium flex items-center gap-1.5 ${className} ${
          onClick ? 'cursor-pointer' : ''
        }`}
        onClick={onClick}
      >
        <span className="truncate flex-1">{event.title}</span>
        {EventTypeIcon && eventTypeLabel && (
          <EventTypeIcon 
            size={10} 
            className="text-gray-500 flex-shrink-0" 
            title={eventTypeLabel}
          />
        )}
        {isReadOnly && <Lock size={10} className="text-orange-600 flex-shrink-0" />}
        {isContext && !isReadOnly && <Share2 size={10} className="text-blue-600 flex-shrink-0" />}
      </div>
    );
  }

  // Timed events with time display
  return (
    <div
      className={`${baseStyles} ${colorStyles} rounded-md px-2 py-1 text-xs flex items-center gap-1.5 ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {showTime && (
        <span className="text-[10px] font-medium flex-shrink-0 flex items-center gap-0.5">
          <Clock size={9} />
          {formatTime(event.startAt)}
        </span>
      )}
      <span className="truncate flex-1 font-medium">{event.title}</span>
      {EventTypeIcon && eventTypeLabel && (
        <EventTypeIcon 
          size={10} 
          className="text-gray-500 flex-shrink-0" 
          title={eventTypeLabel}
        />
      )}
      {isReadOnly && <Lock size={10} className="text-orange-600 flex-shrink-0" />}
      {isContext && !isReadOnly && <Share2 size={10} className="text-blue-600 flex-shrink-0" />}
    </div>
  );
}

