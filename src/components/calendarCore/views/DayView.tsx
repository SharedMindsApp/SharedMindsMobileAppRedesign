import { ChevronLeft, ChevronRight, Search, Plus, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CalendarEventWithMembers } from '../../../lib/calendarTypes';
import {
  getDayEvents,
  formatTime,
  isToday
} from '../../../lib/calendarUtils';
import { useEventTypeColors } from '../../../hooks/useEventTypeColors';
import { useSwipeGesture } from '../../../hooks/useSwipeGesture';
import type { CalendarEventType } from '../../../lib/personalSpaces/calendarService';


// Helper functions for hex color handling
function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}



interface DayViewProps {
  currentDate: Date;
  events: CalendarEventWithMembers[];
  onEventClick: (event: CalendarEventWithMembers) => void;
  onTimeSlotClick?: (date: Date, time: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  onSearchOpen?: () => void;
  onQuickAddEvent?: () => void;
}

export function DayView({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  onPrevious,
  onNext,
  onToday,
  onSearchOpen,
  onQuickAddEvent
}: DayViewProps) {
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
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = getDayEvents(events, currentDate);
  const isTodayDate = isToday(currentDate);
  const [modeBarHeight, setModeBarHeight] = useState(56); // Default fallback: py-2 (8px) + min-h-[44px] + py-2 (8px) ≈ 60px, rounded down for safety
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set()); // Track expanded collapsed sections (keyed by start hour)
  const scrollContainerRef = useRef<HTMLDivElement>(null);



  // Measure CalendarModeBar height dynamically
  useEffect(() => {
    const measureModeBar = () => {
      // Find the CalendarModeBar element (it's rendered before DayView in CalendarShell)
      const modeBar = document.querySelector('[data-calendar-mode-bar]') as HTMLElement;
      if (modeBar) {
        const height = modeBar.offsetHeight;
        setModeBarHeight(height);
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      measureModeBar();
    });

    // Re-measure on resize with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(measureModeBar, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  const handleTimeSlotClick = (hour: number) => {
    if (!onTimeSlotClick) return; // Read-only mode
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    onTimeSlotClick(currentDate, timeString);
  };

  // Format date as "Jan · Fri 9"
  const formatCompactDate = (date: Date): string => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();
    return `${month} · ${weekday} ${day}`;
  };

  // Detect mobile and add horizontal swipe gesture for navigation
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Calculate which hours have events or tasks
  const getHoursWithContent = (): Set<number> => {
    const hoursSet = new Set<number>();

    // Add hours with events
    dayEvents.forEach(({ startMinutes, endMinutes }) => {
      const startHour = Math.floor(startMinutes / 60);
      const endHour = Math.ceil(endMinutes / 60);
      for (let h = startHour; h <= endHour && h < 24; h++) {
        hoursSet.add(h);
      }
    });

    return hoursSet;
  };

  // Calculate collapsed sections
  const calculateCollapsedSections = (): Array<{ start: number; end: number }> => {
    if (!isTodayDate) {
      // For non-today dates, collapse hours before first event/task
      const hoursWithContent = getHoursWithContent();
      if (hoursWithContent.size === 0) return [];

      const firstHourWithContent = Math.min(...Array.from(hoursWithContent));
      if (firstHourWithContent > 0) {
        return [{ start: 0, end: firstHourWithContent - 1 }];
      }
      return [];
    }

    // For today, start from current hour
    const now = new Date();
    const currentHour = now.getHours();
    const hoursWithContent = getHoursWithContent();

    // Find next hour with content after current hour
    let nextHourWithContent: number | null = null;
    for (let h = currentHour + 1; h < 24; h++) {
      if (hoursWithContent.has(h)) {
        nextHourWithContent = h;
        break;
      }
    }

    // If no next hour with content, don't collapse anything
    if (nextHourWithContent === null) {
      return [];
    }

    // Collapse hours between current hour and next hour with content
    if (nextHourWithContent > currentHour + 1) {
      return [{ start: currentHour + 1, end: nextHourWithContent - 1 }];
    }

    return [];
  };

  const collapsedSections = calculateCollapsedSections();

  // Check if a section is expanded
  const isSectionExpanded = (start: number): boolean => {
    return expandedSections.has(start);
  };

  // Toggle section expansion
  const toggleSection = (start: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(start)) {
        next.delete(start);
      } else {
        next.add(start);
      }
      return next;
    });
  };

  // Check if an hour should be visible
  const isHourVisible = (hour: number): boolean => {
    if (!isTodayDate) {
      // For non-today, show all hours (or collapse before first event)
      const section = collapsedSections.find(s => hour >= s.start && hour <= s.end);
      if (section) {
        return hour === section.start || hour === section.end || isSectionExpanded(section.start);
      }
      return true;
    }

    const now = new Date();
    const currentHour = now.getHours();

    // Always show current hour
    if (hour === currentHour) return true;

    // Check if hour is in a collapsed section
    const section = collapsedSections.find(s => hour >= s.start && hour <= s.end);
    if (section) {
      // Show first and last hour of section (for expand/collapse buttons)
      if (hour === section.start || hour === section.end) {
        return true;
      }
      // Show middle hours only if expanded
      return isSectionExpanded(section.start);
    }

    // Show hours with content
    const hoursWithContent = getHoursWithContent();
    if (hoursWithContent.has(hour)) return true;

    // Show next hour after current hour (for collapsed section start)
    if (hour === currentHour + 1 && collapsedSections.length > 0) {
      return true;
    }

    return false;
  };

  // Get collapsed section for an hour
  const getCollapsedSection = (hour: number): { start: number; end: number } | null => {
    return collapsedSections.find(s => hour >= s.start && hour <= s.end) || null;
  };

  // Calculate pixel position for a given hour and minutes (accounting for collapsed sections)
  const calculatePixelPosition = (hour: number, minutes: number = 0): number => {
    let position = 0;

    // Sum up heights of all visible hours before this one
    for (let h = 0; h < hour; h++) {
      if (isHourVisible(h)) {
        const section = getCollapsedSection(h);
        const isSectionStart = section && h === section.start;
        const isExpanded = isSectionStart ? isSectionExpanded(section.start) : true;

        if (isSectionStart && !isExpanded) {
          position += 48; // Collapsed height
        } else {
          position += 80; // Normal height
        }
      }
    }

    // Add position within the current hour
    if (isHourVisible(hour)) {
      const section = getCollapsedSection(hour);
      const isSectionStart = section && hour === section.start;
      const isExpanded = isSectionStart ? isSectionExpanded(section.start) : true;

      const hourHeight = (isSectionStart && !isExpanded) ? 48 : 80;
      position += (minutes / 60) * hourHeight;
    }

    return position;
  };

  // Auto-scroll to current hour on mount (today only)
  // Show the entire current hour (from :00 to :59), not just the current time
  useEffect(() => {
    if (isTodayDate && scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();

      // Calculate position of the start of the current hour (0 minutes)
      const hourStartPosition = calculatePixelPosition(currentHour, 0);

      // Scroll to the start of the current hour with a small offset for better visibility
      // This ensures the whole hour is visible, not cut off
      const scrollOffset = Math.max(0, hourStartPosition - 20); // Small offset to avoid cutting off at the very top

      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollOffset;
        }
      }, 150); // Slightly longer timeout to ensure collapsed sections are rendered
    }
  }, [isTodayDate, collapsedSections.length, expandedSections.size]);

  return (
    <div
      className="flex flex-col h-full bg-white overflow-hidden"
      ref={swipeRef}
    >
      {/* Compact Sticky Day Header */}
      {/* Sticky position accounts for CalendarModeBar height (measured dynamically) */}
      <div
        className="sticky z-30 bg-white border-b border-gray-200 flex-shrink-0"
        style={{ top: `${modeBarHeight}px` }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevious}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft size={20} className="text-gray-700" />
              </button>

              {onToday && (
                <button
                  onClick={onToday}
                  className="px-3 py-1.5 min-h-[44px] text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg active:bg-blue-100 transition-colors"
                >
                  Today
                </button>
              )}

              <button
                onClick={onNext}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Next day"
              >
                <ChevronRight size={20} className="text-gray-700" />
              </button>
            </div>

            {/* Compact Date Display */}
            <div className="flex-1 text-center">
              <div className={`text-base font-semibold ${isTodayDate ? 'text-blue-600' : 'text-gray-900'}`}>
                {formatCompactDate(currentDate)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Quick Add Event button */}
              {onQuickAddEvent && (
                <button
                  onClick={onQuickAddEvent}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  aria-label="Add event"
                  title="Add event"
                >
                  <Plus size={20} className="text-gray-700" />
                </button>
              )}
              {/* Search button */}
              {onSearchOpen && (
                <button
                  onClick={onSearchOpen}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  aria-label="Search calendar events"
                  title="Search events"
                >
                  <Search size={20} className="text-gray-700" />
                </button>
              )}
              {/* Spacer for balance if no buttons */}
              {!onQuickAddEvent && !onSearchOpen && <div className="w-[100px]"></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Hourly Grid - ONLY this scrolls */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain min-h-0 pb-[100px] md:pb-0"
      >
        <div className="flex">
          {/* Time Column */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50/30">
            {hours.map(hour => {
              const section = getCollapsedSection(hour);
              const isVisible = isHourVisible(hour);

              if (!isVisible) return null;

              // Check if this is the start of a collapsed section
              const isSectionStart = section && hour === section.start;

              return (
                <div
                  key={hour}
                  className={`border-b border-gray-100 text-xs text-gray-500 text-right pr-2 pt-1 ${isSectionStart && !isSectionExpanded(section.start)
                    ? 'h-12'
                    : 'h-20'
                    }`}
                >
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
              );
            })}
          </div>

          {/* Events Column */}
          <div className="flex-1 relative">
            {/* Time Slots - Regular block elements that stack */}
            {hours.map(hour => {
              const section = getCollapsedSection(hour);
              const isVisible = isHourVisible(hour);

              if (!isVisible) return null;

              const isSectionStart = section && hour === section.start;
              const isExpanded = isSectionStart ? isSectionExpanded(section.start) : true;

              return (
                <div key={hour} className="relative">
                  {/* Time Slot */}
                  <div
                    className={`border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer transition-colors relative z-0 ${isSectionStart && !isExpanded ? 'h-12' : 'h-20'
                      }`}
                    onClick={() => handleTimeSlotClick(hour)}
                  ></div>

                  {/* Collapsed Section Indicator */}
                  {isSectionStart && section && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(section.start);
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-1.5 min-h-[32px]"
                      aria-label={isExpanded ? 'Collapse hours' : 'Expand hours'}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} className="text-gray-600" />
                          <span className="text-xs font-medium text-gray-600">
                            Collapse {section.end - section.start + 1} hours
                          </span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} className="text-gray-600" />
                          <span className="text-xs font-medium text-gray-600">
                            {section.end - section.start + 1} hours
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Maintain full height for proper scrolling calculations */}
            <div style={{ minHeight: `${hours.length * 80}px` }} className="absolute inset-0 pointer-events-none" />

            {/* Current Time Indicator */}
            {isTodayDate && (() => {
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinutes = now.getMinutes();

              // Only show if current hour is visible
              if (!isHourVisible(currentHour)) {
                return null;
              }

              const timePosition = calculatePixelPosition(currentHour, currentMinutes);

              return (
                <div
                  className="absolute left-2 right-0 h-[2px] bg-[var(--color-accent,#005bc4)]/80 z-20 pointer-events-none"
                  style={{
                    top: `${timePosition}px`,
                  }}
                >
                  <div className="absolute -left-2 -top-1.5 w-4 h-4 bg-[var(--color-accent,#005bc4)] rounded-full border-2 border-white shadow-md shadow-[var(--color-accent,#005bc4)]/40"></div>
                </div>
              );
            })()}

            {/* Events */}
            {dayEvents.map(({ event, startMinutes, endMinutes }) => {
              const startHour = Math.floor(startMinutes / 60);
              const startMin = startMinutes % 60;
              const endHour = Math.floor(endMinutes / 60);
              const endMin = endMinutes % 60;

              // Calculate pixel positions accounting for collapsed sections
              const top = calculatePixelPosition(startHour, startMin);
              const bottom = calculatePixelPosition(endHour, endMin);
              const height = Math.max(bottom - top, 40);

              // Skip event if start hour is not visible
              if (!isHourVisible(startHour)) {
                return null;
              }

              const start = new Date(event.start_at);
              const end = new Date(event.end_at);
              const eventColor = getEventTypeColor(event);

              const isShort = height <= 50;
              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="absolute left-3 right-3 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all overflow-hidden border border-white/60 bg-white/40 backdrop-blur-md"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    zIndex: 10,
                    backgroundColor: hexToRgba(eventColor, 0.12),
                    borderLeft: `5px solid ${eventColor}`,
                  }}
                >
                  <div className={`flex flex-col h-full ${isShort ? 'p-1.5 justify-center' : 'p-3'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className={`font-bold stitch-text-primary ${isShort ? 'text-xs truncate' : 'text-sm mb-1 shadow-sm'}`} style={{ color: '#0f172a' }}>{event.title}</div>
                      {!isShort && height > 60 && (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-white/70 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm" style={{ color: eventColor }}>
                          {event.event_type || 'Event'}
                        </span>
                      )}
                    </div>

                    {!event.all_day && !isShort && (
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 mt-auto pt-1">
                        <span className="flex items-center gap-1 opacity-80">
                          <Clock size={12} /> {formatTime(start)} - {formatTime(end)}
                        </span>
                      </div>
                    )}
                    {event.location && !isShort && height > 80 && (
                      <div className="text-xs font-medium text-slate-500 truncate mt-1">
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
