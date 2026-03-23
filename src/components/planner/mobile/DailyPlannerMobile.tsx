/**
 * DailyPlannerMobile - Mobile-first daily schedule component
 * 
 * Optimized for mobile with today's schedule as primary element.
 * Focuses on quick scanning and fast interaction.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar } from 'lucide-react';
import { PersonalCalendarEvent } from '../../../lib/personalSpaces/calendarService';
import { BottomSheet } from '../../shared/BottomSheet';

export interface DailyPlannerMobileProps {
  selectedDate: Date;
  isToday: boolean;
  dayName: string;
  dayDate: string;
  timeSlots: Array<{ hour: number; minute: number }>;
  containers: PersonalCalendarEvent[];
  nested: PersonalCalendarEvent[];
  regular: PersonalCalendarEvent[];
  currentTime: Date;
  getCurrentTimePosition: () => number | null;
  onNavigateDay: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
  onTimeSlotClick: (hour: number, minute: number) => void;
  onEventClick: (event: PersonalCalendarEvent) => void;
}

export function DailyPlannerMobile({
  selectedDate,
  isToday,
  dayName,
  dayDate,
  timeSlots,
  containers,
  nested,
  regular,
  currentTime,
  getCurrentTimePosition,
  onNavigateDay,
  onGoToToday,
  onTimeSlotClick,
  onEventClick,
}: DailyPlannerMobileProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToNow, setShowScrollToNow] = useState(false);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  // Get all-day events
  const allDayEvents = [...containers, ...regular].filter(e => {
    const start = new Date(e.startAt);
    const end = e.endAt ? new Date(e.endAt) : start;
    const duration = end.getTime() - start.getTime();
    return duration >= 24 * 60 * 60 * 1000 || (start.getHours() === 0 && start.getMinutes() === 0);
  });

  // Get timed events (sorted by time)
  const timedEvents = [...nested, ...regular]
    .filter(e => {
      const start = new Date(e.startAt);
      const end = e.endAt ? new Date(e.endAt) : start;
      const duration = end.getTime() - start.getTime();
      return duration < 24 * 60 * 60 * 1000 && !(start.getHours() === 0 && start.getMinutes() === 0);
    })
    .sort((a, b) => {
      const timeA = new Date(a.startAt).getTime();
      const timeB = new Date(b.startAt).getTime();
      return timeA - timeB;
    });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getEventTimeRange = (event: PersonalCalendarEvent) => {
    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : start;
    const startTime = formatTime(start);
    const endTime = formatTime(end);
    return `${startTime} - ${endTime}`;
  };

  // Check if time indicator is visible
  const checkTimeIndicatorVisibility = () => {
    if (!isToday || !scrollContainerRef.current) {
      setShowScrollToNow(false);
      return;
    }

    const timePosition = getCurrentTimePosition();
    if (timePosition === null) {
      setShowScrollToNow(false);
      return;
    }

    const container = scrollContainerRef.current;
    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const containerBottom = containerTop + containerHeight;

    const padding = 100;
    const isVisible = timePosition >= containerTop - padding && timePosition <= containerBottom + padding;
    setShowScrollToNow(!isVisible);
  };

  // Scroll to current time
  const scrollToNow = () => {
    if (!scrollContainerRef.current) return;
    const timePosition = getCurrentTimePosition();
    if (timePosition === null) return;

    const container = scrollContainerRef.current;
    const containerHeight = container.clientHeight;
    const targetScroll = timePosition - containerHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth',
    });
  };

  // Auto-scroll to now on initial load
  useEffect(() => {
    if (!isToday || hasAutoScrolled || !scrollContainerRef.current) return;
    const timePosition = getCurrentTimePosition();
    if (timePosition === null) return;

    const hour = currentTime.getHours();
    if (hour < 6) return;

    const timer = setTimeout(() => {
      scrollToNow();
      setHasAutoScrolled(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [isToday, hasAutoScrolled, currentTime, getCurrentTimePosition]);

  // Check visibility on scroll
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const handleScroll = () => checkTimeIndicatorVisibility();
    container.addEventListener('scroll', handleScroll);
    checkTimeIndicatorVisibility();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isToday, getCurrentTimePosition]);

  // Re-check when time updates
  useEffect(() => {
    if (isToday) {
      checkTimeIndicatorVisibility();
    }
  }, [currentTime, isToday]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Compact Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            {/* Day Navigation */}
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => onNavigateDay('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Previous day"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex-1 text-center">
                <h1 className="text-lg font-semibold text-gray-900">{dayName}</h1>
                <p className="text-sm text-gray-600">{dayDate}</p>
              </div>
              <button
                onClick={() => onNavigateDay('next')}
                className="p-2 hover:bg-gray-100 rounded-lg active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Next day"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Today Button */}
            <button
              onClick={onGoToToday}
              disabled={isToday}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm min-h-[44px] ${
                isToday
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              }`}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Today's Schedule - Primary Content (visible immediately) */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="px-4 py-3 space-y-4">
          {/* All-Day Events */}
          {allDayEvents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700">All Day</h2>
              </div>
              {allDayEvents.map((event) => {
                const permissions = event.permissions;
                const canView = permissions?.can_view ?? true;
                if (!canView) return null;

                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {event.event_scope === 'container' && (
                        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          Container
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    {event.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Timed Events - Agenda Style */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">Schedule</h2>
            </div>

            {timedEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <p>No events scheduled</p>
                <button
                  onClick={() => {
                    const hour = new Date().getHours();
                    const minute = new Date().getMinutes();
                    onTimeSlotClick(hour, minute);
                  }}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors min-h-[44px]"
                >
                  Add Event
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  // Insert "Now" indicator at the right position
                  const now = new Date();
                  const currentTime = now.getTime();
                  let insertIndex = -1;
                  
                  for (let i = 0; i < timedEvents.length; i++) {
                    const eventTime = new Date(timedEvents[i].startAt).getTime();
                    if (currentTime < eventTime) {
                      insertIndex = i;
                      break;
                    }
                  }
                  
                  const eventsWithNow: Array<PersonalCalendarEvent | { type: 'now-indicator' }> = [...timedEvents];
                  if (isToday && insertIndex > 0 && insertIndex < timedEvents.length) {
                    eventsWithNow.splice(insertIndex, 0, { type: 'now-indicator' } as any);
                  }
                  
                  return eventsWithNow.map((item) => {
                    if ('type' in item && item.type === 'now-indicator') {
                      return (
                        <div key="now-indicator" className="relative my-3" data-now-indicator>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-0.5 bg-red-500"></div>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-full">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-xs text-red-600 font-medium">Now</span>
                            </div>
                            <div className="flex-1 h-0.5 bg-red-500"></div>
                          </div>
                        </div>
                      );
                    }
                    
                    const event = item as PersonalCalendarEvent;
                    const permissions = event.permissions;
                    const canView = permissions?.can_view ?? true;
                    if (!canView) return null;

                    // Hide nested if detail_level is overview
                    if (event.event_scope === 'item') {
                      const parentContainer = containers.find(
                        c => c.id === event.parent_context_event_id
                      );
                      if (parentContainer?.permissions?.detail_level === 'overview') {
                        return null;
                      }
                    }

                    const isNested = event.event_scope === 'item';
                    const isContainer = event.event_scope === 'container';
                    const start = new Date(event.startAt);
                    const end = event.endAt ? new Date(event.endAt) : start;

                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                          isContainer
                            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                            : isNested
                            ? 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="text-sm font-bold text-gray-900">
                              {formatTime(start)}
                            </div>
                            {end.getTime() !== start.getTime() && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {formatTime(end)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {isContainer && (
                                <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                  Container
                                </span>
                              )}
                              {isNested && (
                                <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                                  Nested
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                            {event.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            )}

            {/* Quick Add Time Slots */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Quick add</p>
              <div className="grid grid-cols-4 gap-2">
                {[9, 12, 15, 18].map((hour) => (
                  <button
                    key={hour}
                    onClick={() => onTimeSlotClick(hour, 0)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 active:scale-95 transition-all min-h-[44px]"
                  >
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

