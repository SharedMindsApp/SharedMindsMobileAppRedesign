import { useState, useRef, useEffect } from 'react';
import { CalendarEventWithMembers } from '../../../lib/calendarTypes';
import {
  getWeekDays,
  isToday,
  getDayEvents,
  formatTime,
  addDays,
  startOfWeek,
} from '../../../lib/calendarUtils';
import { moveEvent } from '../../../lib/calendar';
import { useEventTypeColors } from '../../../hooks/useEventTypeColors';
import { useSwipeGesture } from '../../../hooks/useSwipeGesture';
import type { CalendarEventType } from '../../../lib/personalSpaces/calendarService';



interface WeekViewProps {
  currentDate: Date;
  events: CalendarEventWithMembers[];
  onEventClick: (event: CalendarEventWithMembers) => void;
  onRefresh: () => void;
  onTimeSlotClick?: (date: Date, time: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  readOnly?: boolean;
}

export function WeekView({
  currentDate,
  events,
  onEventClick,
  onRefresh,
  onTimeSlotClick,
  onPrevious,
  onNext,
  readOnly = false,
}: WeekViewProps) {
  const { colors: eventTypeColors } = useEventTypeColors();

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
  const [isMobile, setIsMobile] = useState(false);
  const weekDays = getWeekDays(currentDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [draggingEvent, setDraggingEvent] = useState<string | null>(null);
  const [resizingEvent, setResizingEvent] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cancel drag operations if read-only state changes during drag
  useEffect(() => {
    if (readOnly && (draggingEvent || resizingEvent)) {
      // Cancel any in-progress drag/resize operations
      setDraggingEvent(null);
      setResizingEvent(null);
    }
  }, [readOnly, draggingEvent, resizingEvent]);

  // Horizontal swipe gesture for navigation (mobile only)
  const { ref: swipeRef } = useSwipeGesture({
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
    threshold: 50,
    enabled: isMobile,
    preventDefault: false,
    axisLock: true,
  });

  // Scroll to current time on mount (mobile)
  useEffect(() => {
    if (isMobile && scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollPosition = currentHour * 64 - 200; // 64px per hour, offset by 200px
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [isMobile]);

  const handleEventDragStart = (e: React.DragEvent, event: CalendarEventWithMembers) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('eventId', event.id);
    setDraggingEvent(event.id);
  };

  const handleDayDrop = async (e: React.DragEvent, date: Date, hour: number) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const eventId = e.dataTransfer.getData('eventId');

    if (!eventId) return;

    const event = events.find(ev => ev.id === eventId);
    if (!event) return;

    const eventStart = new Date(event.start_at);
    const eventEnd = new Date(event.end_at);
    const duration = eventEnd.getTime() - eventStart.getTime();

    const newStart = new Date(date);
    newStart.setHours(hour, 0, 0, 0);

    const newEnd = new Date(newStart.getTime() + duration);

    try {
      await moveEvent(eventId, newStart, newEnd);
      onRefresh();
    } catch (error) {
      console.error('Failed to move event:', error);
    } finally {
      setDraggingEvent(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTimeSlotClickInternal = (date: Date, hour: number) => {
    if (!onTimeSlotClick || readOnly) return;
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    onTimeSlotClick(date, timeString);
  };

  // Mobile-optimized week view
  if (isMobile) {
    return (
      <div
        className="flex-1 flex flex-col bg-white h-full overflow-hidden"
        ref={swipeRef}
      >
        {/* Week Header - Compact for mobile */}
        <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10 safe-top">
          <div className="w-12 flex-shrink-0 border-r border-gray-200"></div>
          <div className="flex-1 flex">
            {weekDays.map((date, idx) => {
              const isTodayDate = isToday(date);
              const dayEvents = getDayEvents(events, date);
              const eventCount = dayEvents.length;

              return (
                <div
                  key={idx}
                  className={`flex-1 py-2 px-1 text-center border-l border-gray-100 ${isTodayDate ? 'bg-blue-50' : 'bg-white'
                    }`}
                >
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div
                    className={`text-base font-semibold mb-1 ${isTodayDate
                      ? 'bg-blue-600 text-white w-7 h-7 rounded-full inline-flex items-center justify-center'
                      : 'text-gray-900'
                      }`}
                  >
                    {date.getDate()}
                  </div>
                  {eventCount > 0 && (
                    <div className="text-[9px] text-gray-400 font-medium">
                      {eventCount} {eventCount === 1 ? 'event' : 'events'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Time Grid */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain pb-[100px] md:pb-0">
          <div className="flex">
            {/* Time Column - Narrow on mobile */}
            <div className="w-12 flex-shrink-0 border-r border-gray-200 bg-gray-50/50">
              {hours.map(hour => {
                const isCurrentHour = new Date().getHours() === hour && isToday(currentDate);
                return (
                  <div
                    key={hour}
                    className="h-16 border-b border-gray-100 text-[10px] text-gray-500 text-center pt-1.5"
                  >
                    {hour === 0 ? '12' : hour < 12 ? `${hour}` : hour === 12 ? '12' : `${hour - 12}`}
                    <span className="text-[8px] text-gray-400 ml-0.5">
                      {hour < 12 ? 'AM' : 'PM'}
                    </span>
                    {isCurrentHour && (
                      <div className="absolute left-0 right-0 h-0.5 bg-blue-500 z-20" style={{ marginTop: '31px' }}></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Day Columns */}
            {weekDays.map((date, dayIdx) => {
              const dayEvents = getDayEvents(events, date);
              const isTodayDate = isToday(date);

              return (
                <div
                  key={dayIdx}
                  className="flex-1 relative border-l border-gray-100"
                >
                  {/* Time Slots */}
                  {hours.map(hour => {
                    const isCurrentHour = new Date().getHours() === hour && isTodayDate;
                    return (
                      <div
                        key={hour}
                        className={`h-16 border-b border-gray-100 ${isCurrentHour ? 'bg-blue-50/30' : ''
                          }`}
                        onClick={() => handleTimeSlotClickInternal(date, hour)}
                      ></div>
                    );
                  })}

                  {/* Current Time Indicator */}
                  {isTodayDate && (() => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinutes = now.getMinutes();
                    const timePosition = (currentHour * 64) + (currentMinutes / 60 * 64);

                    return (
                      <div
                        className="absolute left-0 right-0 h-[2px] bg-[var(--color-accent,#005bc4)]/80 z-20 pointer-events-none"
                        style={{
                          top: `${timePosition}px`,
                        }}
                      >
                        <div className="absolute -left-1.5 -top-1 w-3 h-3 bg-[var(--color-accent,#005bc4)] rounded-full border-2 border-white shadow-sm"></div>
                      </div>
                    );
                  })()}

                  {/* Events */}
                  {dayEvents.map(({ event, startMinutes, endMinutes }) => {
                    const top = (startMinutes / 60) * 64;
                    const height = Math.max(((endMinutes - startMinutes) / 60) * 64, 24);
                    const start = new Date(event.start_at);
                    const eventColor = getEventTypeColor(event);

                    return (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={`absolute left-0.5 right-0.5 rounded-lg shadow-sm cursor-pointer active:shadow-md active:scale-[0.98] transition-all overflow-hidden border border-white/60 bg-white/40 backdrop-blur-sm ${draggingEvent === event.id ? 'opacity-50' : ''
                          }`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          zIndex: 10,
                          backgroundColor: `${eventColor}1A`, // ~10% opacity hex
                          borderLeft: `4px solid ${eventColor}`,
                          color: '#0f172a',
                          minHeight: '24px',
                        }}
                      >
                        <div className="px-1.5 py-1 h-full flex flex-col justify-start">
                          <div className="text-[10px] sm:text-xs font-bold leading-tight break-words line-clamp-2 text-slate-900">
                            {event.title}
                          </div>
                          {!event.all_day && height >= 48 && (
                            <div className="text-[9px] font-semibold text-slate-600 opacity-90 mt-0.5 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                              {formatTime(start)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Date Picker - Mobile Navigation (Visual Only) */}
        <div className="border-t border-gray-200 bg-white safe-bottom">
          <div className="flex overflow-x-auto scrollbar-hide px-2 py-2 gap-1">
            {Array.from({ length: 14 }).map((_, i) => {
              const date = addDays(startOfWeek(currentDate), i - 7);
              const isTodayDate = isToday(date);
              const isSelected = weekDays.some(d =>
                d.getDate() === date.getDate() &&
                d.getMonth() === date.getMonth() &&
                d.getFullYear() === date.getFullYear()
              );
              const dayEvents = getDayEvents(events, date);
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={i}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg min-w-[60px] ${isTodayDate
                    ? 'bg-blue-600 text-white'
                    : isSelected
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-50 text-gray-700'
                    }`}
                >
                  <div className="text-[10px] font-medium uppercase mb-0.5">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-sm font-bold">
                    {date.getDate()}
                  </div>
                  {hasEvents && (
                    <div className="mt-1 flex justify-center gap-0.5">
                      {dayEvents.slice(0, 3).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-1 h-1 rounded-full ${isTodayDate ? 'bg-white/80' : 'bg-blue-500'
                            }`}
                        ></div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className={`text-[8px] ${isTodayDate ? 'text-white/80' : 'text-blue-500'
                          }`}>
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Week View (original design)
  return (
    <div
      className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden"
      ref={swipeRef}
    >
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="w-16 flex-shrink-0"></div>

        {weekDays.map((date, idx) => {
          const isTodayDate = isToday(date);

          return (
            <div
              key={idx}
              className={`flex-1 py-3 text-center border-l border-gray-200 ${isTodayDate ? 'bg-blue-50' : ''
                }`}
            >
              <div className="text-xs font-medium text-gray-600">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={`text-lg font-bold ${isTodayDate
                  ? 'bg-blue-600 text-white w-8 h-8 rounded-full inline-flex items-center justify-center'
                  : 'text-gray-900'
                  }`}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          <div className="w-16 flex-shrink-0 border-r border-gray-200">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-16 border-b border-gray-200 text-xs text-gray-500 text-right pr-2 pt-1"
              >
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {weekDays.map((date, dayIdx) => {
            const dayEvents = getDayEvents(events, date);

            return (
              <div
                key={dayIdx}
                className="flex-1 relative border-l border-gray-200"
              >
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="h-16 border-b border-gray-200 hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDayDrop(e, date, hour)}
                    onClick={() => handleTimeSlotClickInternal(date, hour)}
                  ></div>
                ))}

                {dayEvents.map(({ event, startMinutes, endMinutes }) => {
                  const top = (startMinutes / 60) * 64;
                  const height = Math.max(((endMinutes - startMinutes) / 60) * 64, 32);
                  const start = new Date(event.start_at);
                  const end = new Date(event.end_at);

                  return (
                    <div
                      key={event.id}
                      draggable={!readOnly}
                      onDragStart={readOnly ? undefined : (e) => handleEventDragStart(e, event)}
                      onClick={() => onEventClick(event)}
                      className={`absolute left-1 right-1 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden border border-white/60 bg-white/40 backdrop-blur-sm ${draggingEvent === event.id ? 'opacity-50' : ''}`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        zIndex: 10,
                        backgroundColor: `${getEventTypeColor(event)}1A`,
                        borderLeft: `4px solid ${getEventTypeColor(event)}`,
                        color: '#0f172a',
                      }}
                    >
                      <div className="p-2 h-full flex flex-col justify-start">
                        <div className="font-bold text-xs leading-tight line-clamp-2 text-slate-900">{event.title}</div>
                        {!event.all_day && height >= 48 && (
                          <div className="text-[10px] font-semibold text-slate-600 opacity-90 mt-1">
                            {formatTime(start)} - {formatTime(end)}
                          </div>
                        )}
                        {event.location && height >= 64 && (
                          <div className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
