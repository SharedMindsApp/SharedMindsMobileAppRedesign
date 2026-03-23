import { useState, useEffect, useRef } from 'react';
import { CalendarEventWithMembers } from '../../../lib/calendarTypes';
import { getMonthDays, isSameDay, isToday, getEventsForDay } from '../../../lib/calendarUtils';
import { useEventTypeColors } from '../../../hooks/useEventTypeColors';
import { useSwipeGesture } from '../../../hooks/useSwipeGesture';
import { useContextEvents } from '../../../hooks/trackerStudio/useContextEvents';
import { getContextEventTypeColor, CONTEXT_EVENT_TYPE_LABELS } from '../../../lib/trackerStudio/contextEventTypes';
import { isContextEventActiveOnDate } from '../../../lib/trackerStudio/contextEventTypes';
import type { CalendarEventType } from '../../../lib/personalSpaces/calendarService';

// Helper functions for hex color handling
function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastColor(hex: string): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1F2937' : '#FFFFFF';
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEventWithMembers[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEventWithMembers) => void;
  onDayDoubleClick?: (date: Date) => void;
  selectedDate?: Date | null;
  onDaySelect?: (date: Date | null) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function MonthView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
  onDayDoubleClick,
  selectedDate,
  onDaySelect,
  onPrevious,
  onNext,
}: MonthViewProps) {
  const { colors: eventTypeColors } = useEventTypeColors();
  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Load context events for the month
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const { contextEvents } = useContextEvents(
    monthStart.toISOString().split('T')[0],
    monthEnd.toISOString().split('T')[0]
  );
  
  // Month expansion state (mobile only)
  const [isMonthExpanded, setIsMonthExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Double-tap detection for mobile
  const lastTapRef = useRef<{ date: Date; time: number } | null>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset expansion state when switching away from month view or when date changes significantly
  useEffect(() => {
    // Reset when month/year changes (but not when just navigating within the same month)
    // This ensures expansion persists when swiping between months
    return () => {
      // Component unmounting - state will reset naturally
    };
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  // Cleanup tap timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  // Swipe gesture for expanding/collapsing month view and horizontal navigation (mobile only)
  // Attach to the grid container so it only triggers when swiping within the calendar grid
  const { ref: swipeRef } = useSwipeGesture({
    onSwipeDown: () => {
      if (isMobile && !isMonthExpanded) {
        // Only expand if swipe started within the calendar grid
        setIsMonthExpanded(true);
      }
    },
    onSwipeUp: () => {
      if (isMobile && isMonthExpanded) {
        setIsMonthExpanded(false);
      }
    },
    onSwipeLeft: () => {
      if (isMobile && onNext) {
        onNext();
      }
    },
    onSwipeRight: () => {
      if (isMobile && onPrevious) {
        onPrevious();
      }
    },
    threshold: 50, // Minimum 50px swipe distance
    enabled: isMobile,
    preventDefault: false, // Don't prevent default to allow normal scrolling
    axisLock: true, // Lock to one axis to prevent conflicts between horizontal and vertical
  });

  // Helper to get event type color
  const getEventTypeColor = (event: CalendarEventWithMembers): string => {
    const eventType = (event as any).event_type as CalendarEventType | undefined;
    if (eventType && eventTypeColors[eventType]) {
      return eventTypeColors[eventType];
    }
    // Fallback to event.color if available, otherwise default
    if (typeof event.color === 'string' && event.color.startsWith('#')) {
      return event.color;
    }
    return eventTypeColors.event; // Default to 'event' type color
  };

  const handleDayClick = (date: Date, e: React.MouseEvent) => {
    // Single click: select day (only in month view)
    // Note: On mobile, touch handler may also fire, but that's okay
    // The touch handler will handle double-tap detection
    if (onDaySelect) {
      onDaySelect(date);
    }
    onDayClick(date);
  };

  const handleDayDoubleClick = (date: Date) => {
    if (!onDayDoubleClick) return;
    // Double click: navigate to day view
    onDayDoubleClick(date);
    // Clear selection when navigating
    if (onDaySelect) {
      onDaySelect(null);
    }
  };

  // Handle touch for double-tap detection (mobile)
  // This provides better double-tap detection on mobile devices
  const handleDayTouchEnd = (date: Date, e: React.TouchEvent) => {
    // Only handle touch events, not mouse events
    if (e.type !== 'touchend') return;
    
    const now = Date.now();
    const lastTap = lastTapRef.current;

    // Check if this is a double-tap (within 300ms and same date)
    if (
      lastTap &&
      lastTap.date.getTime() === date.getTime() &&
      now - lastTap.time < 300
    ) {
      // Clear timeout for single tap
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      // Prevent default click behavior
      e.preventDefault();
      // Trigger double-click handler
      handleDayDoubleClick(date);
      lastTapRef.current = null;
      return;
    }

    // Store this tap for potential double-tap
    lastTapRef.current = { date, time: now };

    // Set timeout for single tap (if no second tap comes)
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    tapTimeoutRef.current = setTimeout(() => {
      // Single tap - select day (only if still the last tap)
      if (lastTapRef.current && lastTapRef.current.date.getTime() === date.getTime()) {
        if (onDaySelect) {
          onDaySelect(date);
        }
        onDayClick(date);
      }
      lastTapRef.current = null;
      tapTimeoutRef.current = null;
    }, 300);
  };

  // Check if a day is selected
  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <div 
      className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden"
      ref={swipeRef}
    >
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekDays.map(day => (
          <div
            key={day}
            className="py-3 text-center text-sm font-semibold text-gray-700"
          >
            {day}
          </div>
        ))}
      </div>

      <div 
        ref={gridRef}
        className={`grid grid-cols-7 transition-all duration-300 ease-out ${
          isMobile && isMonthExpanded 
            ? 'auto-rows-[minmax(120px,1fr)]' 
            : 'auto-rows-fr'
        } pb-[100px] md:pb-0`}
        style={{
          minHeight: isMobile && isMonthExpanded ? '600px' : undefined,
        }}
      >
        {days.map((date, idx) => {
          const dayEvents = getEventsForDay(events, date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isTodayDate = isToday(date);

          const isSelectedDate = isSelected(date);
          
          // Get active context events for this day
          const activeContexts = contextEvents.filter(event =>
            isContextEventActiveOnDate(event, date.toISOString().split('T')[0])
          );

          return (
            <div
              key={idx}
              className={`border-b border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                isMobile && isMonthExpanded ? 'p-3' : 'p-2'
              } ${
                !isCurrentMonth ? 'bg-gray-50/50' : ''
              } ${isTodayDate ? 'bg-blue-50/30' : ''} ${
                isSelectedDate && !isTodayDate ? 'bg-blue-50' : ''
              } ${isSelectedDate && isTodayDate ? 'bg-blue-100/50' : ''}`}
              onClick={(e) => handleDayClick(date, e)}
              onDoubleClick={() => handleDayDoubleClick(date)}
              onTouchEnd={(e) => handleDayTouchEnd(date, e)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span
                    className={`${isMobile && isMonthExpanded ? 'text-base' : 'text-sm'} font-medium ${
                      !isCurrentMonth
                        ? 'text-gray-400'
                        : isTodayDate
                        ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                        : 'text-gray-900'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {/* Context event indicators */}
                  {activeContexts.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {activeContexts.slice(0, 2).map(context => (
                        <div
                          key={context.id}
                          className={`w-1.5 h-1.5 rounded-full ${getContextEventTypeColor(context.type).split(' ')[0]}`}
                          title={`${context.label} (${CONTEXT_EVENT_TYPE_LABELS[context.type]})`}
                        />
                      ))}
                      {activeContexts.length > 2 && (
                        <span className="text-[8px] text-gray-500">+{activeContexts.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Event Type Dots - Show more dots when expanded */}
              {(() => {
                // Get unique event types for this day
                const eventTypes = new Map<CalendarEventType, string>();
                dayEvents.forEach(event => {
                  const eventType = (event as any).event_type as CalendarEventType | undefined;
                  const type = eventType || 'event';
                  if (!eventTypes.has(type)) {
                    eventTypes.set(type, getEventTypeColor(event));
                  }
                });

                // Show more dots when expanded (up to 6), otherwise 3
                const maxDots = isMobile && isMonthExpanded ? 6 : 3;
                const uniqueTypes = Array.from(eventTypes.entries()).slice(0, maxDots);
                const remainingCount = eventTypes.size - maxDots;

                return (
                  <div className={`flex items-center gap-1 flex-wrap ${isMobile && isMonthExpanded ? 'mt-2' : ''}`}>
                    {uniqueTypes.map(([eventType, color], idx) => (
                      <div
                        key={`${eventType}-${idx}`}
                        className={`${isMobile && isMonthExpanded ? 'w-2.5 h-2.5' : 'w-2 h-2'} rounded-full flex-shrink-0`}
                        style={{ backgroundColor: color }}
                        title={eventType.charAt(0).toUpperCase() + eventType.slice(1).replace('_', ' ')}
                      />
                    ))}
                    {remainingCount > 0 && (
                      <span className={`${isMobile && isMonthExpanded ? 'text-xs' : 'text-[10px]'} text-gray-500 font-medium`}>
                        +{remainingCount}
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Show event previews when expanded (mobile only) */}
              {isMobile && isMonthExpanded && dayEvents.length > 0 && (
                <div className="mt-2 space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map(event => {
                    const eventType = (event as any).event_type as CalendarEventType | undefined;
                    const color = getEventTypeColor(event);
                    return (
                      <div
                        key={event.id}
                        className="text-xs px-1.5 py-0.5 rounded truncate"
                        style={{
                          backgroundColor: `${color}20`,
                          color: color,
                          borderLeft: `2px solid ${color}`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-500 px-1.5">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
