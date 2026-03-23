/**
 * CalendarShell - Core Calendar Container
 * 
 * This is the SINGLE SOURCE OF TRUTH for calendar UI.
 * Used by both SpacesOS and Planner contexts.
 * 
 * ❌ DO NOT create calendar views outside this module
 * ✅ All calendar rendering must come from calendarCore
 */

import { useState, useEffect } from 'react';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import { useCalendarGestures } from './hooks/useCalendarGestures';
import { DayView, WeekView, MonthView, YearView, AgendaView } from './views';
import { CalendarModeBar } from './CalendarModeBar';
import { CalendarSearchOverlay } from './CalendarSearchOverlay';
import { CalendarQuickAddBar } from './CalendarQuickAddBar';
import { useAuth } from '../../core/auth/AuthProvider';
import { useCalendarSettings } from '../../hooks/useCalendarSettings';
import type {
  CalendarContext,
  CalendarScope,
  CalendarUIConfig,
  CalendarEventHandlers,
  CalendarFilters,
} from './types';
import type { CalendarEventWithMembers } from '../../lib/calendarTypes';

// Helper function to apply filters to events
function applyFilters(
  events: CalendarEventWithMembers[],
  filters: CalendarFilters,
  user: { id: string } | null
): CalendarEventWithMembers[] {
  if (!filters) return events;

  let filtered = [...events];

  if (filters.memberIds && filters.memberIds.length > 0) {
    filtered = filtered.filter(event =>
      event.members?.some(m => filters.memberIds?.includes(m.member_profile_id))
    );
  }

  if (filters.colors && filters.colors.length > 0) {
    filtered = filtered.filter(event => filters.colors?.includes(event.color as any));
  }

  // NOTE: created_by is a profile ID, not auth.users ID
  // We can't reliably filter by created_by without a profile lookup
  // For now, skip this filter for personal calendar events
  // TODO: Add profile lookup if myEventsOnly filter is needed
  if (filters.myEventsOnly && user) {
    // For personal calendar events, created_by is a profile ID
    // We would need to look up the user's profile ID to filter correctly
    // For now, we'll use user_id if available, or skip filtering
    // This is a known limitation - the filter may not work correctly for personal events
    console.warn('[CalendarShell] myEventsOnly filter may not work correctly for personal calendar events (created_by is profile ID, not user ID)');
    // Skip the filter for now since we can't reliably match profile ID to user ID without a lookup
    // filtered = filtered.filter(event => event.created_by === user.id);
  }

  return filtered;
}

export interface CalendarShellProps {
  context: CalendarContext;
  scope: CalendarScope;
  ui?: CalendarUIConfig;
  handlers?: CalendarEventHandlers;
  className?: string;
}

export function CalendarShell({
  context,
  scope,
  ui = {},
  handlers = {},
  className = '',
}: CalendarShellProps) {
  const {
    showHeader = true,
    showViewSelector = true,
    defaultView: propDefaultView,
    enableGestures = true,
    filters,
    readOnly = false,
  } = ui;

  const { user } = useAuth();
  const { settings, isLoaded: settingsLoaded } = useCalendarSettings();

  // Use settings default view if available, otherwise use prop or fallback
  const effectiveDefaultView = settingsLoaded && settings.defaultView
    ? settings.defaultView
    : (propDefaultView || 'month');

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Month view day selection state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Navigation state - use effective default view
  const navigation = useCalendarNavigation(undefined, effectiveDefaultView);

  // Load events
  const { events: rawEvents, loading, error, reload } = useCalendarEvents(
    context,
    scope,
    navigation.currentDate,
    navigation.view
  );

  // Apply filters if provided
  const events = filters ? applyFilters(rawEvents, filters, user) : rawEvents;

  // Gesture handling
  const gestures = useCalendarGestures(
    navigation.handleNext,
    navigation.handlePrevious
  );

  // Event handlers
  const handleEventClick = (event: CalendarEventWithMembers) => {
    if (handlers.onEventClick) {
      handlers.onEventClick(event as any);
    }
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    // Permission check: Don't allow creating events in read-only mode
    // This prevents mutations when viewing shared calendars with read-only access
    if (readOnly) return;

    if (handlers.onTimeSlotClick) {
      handlers.onTimeSlotClick(date, time);
    }
  };

  const handleDayClick = (date: Date) => {
    // Permission logic:
    // - Month view: Single click selects day (read-only allowed, no mutation)
    // - Other views: Navigation/creation requires write access
    if (navigation.view === 'month') {
      setSelectedDate(date);
    } else if (!readOnly && handlers.onDayClick) {
      handlers.onDayClick(date);
    } else if (!readOnly && navigation.view !== 'day') {
      navigation.setCurrentDate(date);
      navigation.setView('day');
    }
  };

  const handleDayDoubleClick = (date: Date) => {
    // Double-click in month view: navigate to day view for that date
    if (navigation.view === 'month') {
      navigation.setCurrentDate(date);
      navigation.setView('day');
      // Clear selection when navigating
      setSelectedDate(null);
      return;
    }

    // Permission check: Double-click creates events, requires write access
    // This is a mutation operation, so read-only mode must block it
    if (readOnly) return;

    if (handlers.onDayDoubleClick) {
      handlers.onDayDoubleClick(date);
    }
  };

  // Search event handler
  const handleSearchEventSelect = (event: CalendarEventWithMembers) => {
    const eventDate = new Date(event.start_at);
    navigation.setCurrentDate(eventDate);
    navigation.setView('day');
    setIsSearchOpen(false);
  };

  // Quick add event handler (for Month view inline bar)
  const handleQuickAdd = (_title: string, date: Date) => {
    // Permission check: Quick add creates events, requires write access
    // Guard: Ensure handler exists and we're not in read-only mode
    if (readOnly || !handlers.onEventCreate) return;

    // Open event creation modal with the selected date
    // Note: title is captured but modals don't support pre-filled titles yet
    // This can be enhanced later to pass title to modal
    handlers.onEventCreate(date);
    // Clear selection after submitting
    setSelectedDate(null);
  };

  // Global quick add event handler (for header button)
  const handleQuickAddEvent = () => {
    // Don't allow creating events in read-only mode
    if (readOnly || !handlers.onEventCreate) return;

    let date: Date;

    switch (navigation.view) {
      case 'day':
        // Use current date being viewed
        date = navigation.currentDate;
        break;
      case 'week': {
        // Use today if in current week, else week start
        const today = new Date();
        const weekStart = startOfWeek(navigation.currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        if (today >= weekStart && today <= weekEnd) {
          date = today;
        } else {
          date = weekStart;
        }
        break;
      }
      case 'month':
        // Use selectedDate if exists, else today
        date = selectedDate ?? new Date();
        break;
      case 'year':
      case 'agenda':
      default:
        // Use today for year and events views
        date = new Date();
        break;
    }

    handlers.onEventCreate(date);
  };

  // Render view
  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Loading events...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center">
            <p className="text-red-600 text-sm font-medium mb-2">{error}</p>
            <button
              onClick={reload}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    switch (navigation.view) {
      case 'day':
        return (
          <DayView
            currentDate={navigation.currentDate}
            events={events}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
            onPrevious={navigation.handlePrevious}
            onNext={navigation.handleNext}
            onToday={navigation.handleToday}
            onSearchOpen={() => setIsSearchOpen(true)}
            onQuickAddEvent={handleQuickAddEvent}
          />
        );
      case 'week':
        return (
          <WeekView
            currentDate={navigation.currentDate}
            events={events}
            onEventClick={handleEventClick}
            onRefresh={reload}
            onTimeSlotClick={readOnly ? undefined : handleTimeSlotClick}
            onPrevious={navigation.handlePrevious}
            onNext={navigation.handleNext}
            readOnly={readOnly}
          />
        );
      case 'month':
        return (
          <MonthView
            currentDate={navigation.currentDate}
            events={events}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            onDayDoubleClick={handleDayDoubleClick}
            selectedDate={selectedDate}
            onDaySelect={setSelectedDate}
            onPrevious={navigation.handlePrevious}
            onNext={navigation.handleNext}
          />
        );
      case 'year':
        return (
          <YearView
            currentDate={navigation.currentDate}
            events={events}
            onMonthSelect={(date) => {
              navigation.setCurrentDate(date);
              navigation.setView('month');
            }}
            onDaySelect={(date) => {
              navigation.setCurrentDate(date);
              navigation.setView('day');
            }}
          />
        );
      case 'agenda':
        return (
          <AgendaView
            events={events}
            onEventClick={handleEventClick}
          />
        );
    }
  };

  return (
    <div
      ref={gestures.containerRef}
      className={`flex flex-col h-full overflow-hidden bg-white ${className}`}
      onTouchStart={enableGestures ? gestures.handleTouchStart : undefined}
      onTouchMove={enableGestures ? gestures.handleTouchMove : undefined}
      onTouchEnd={enableGestures ? gestures.handleTouchEnd : undefined}
      style={{
        transform: gestures.swipeOffset !== 0 ? `translateX(${gestures.swipeOffset}px)` : undefined,
        transition: 'transform 0.2s ease-out',
      }}
    >
      {/* Calendar Mode Navigation Bar - Top-level view switcher */}
      <CalendarModeBar
        currentView={navigation.view}
        onModeChange={navigation.setView}
      />

      {/* Hide CalendarHeader for day view - DayView has its own compact header */}
      {showHeader && navigation.view !== 'day' && (
        <CalendarHeader
          currentDate={navigation.currentDate}
          view={navigation.view}
          onPrevious={navigation.handlePrevious}
          onNext={navigation.handleNext}
          onToday={navigation.handleToday}
          onViewChange={navigation.setView}
          showViewSelector={showViewSelector}
          events={events}
          onDateSelect={(date) => {
            navigation.setCurrentDate(date);
            if (navigation.view !== 'day') {
              navigation.setView('day');
            }
          }}
          onSearchOpen={() => setIsSearchOpen(true)}
          onQuickAddEvent={readOnly ? undefined : handleQuickAddEvent}
        />
      )}

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden pb-[100px] md:pb-0">
          {renderView()}
        </div>

        {/* Quick Add Event Bar - Only visible in Month view when day is selected, and not read-only */}
        {!readOnly && navigation.view === 'month' && selectedDate && (
          <CalendarQuickAddBar
            date={selectedDate}
            onSubmit={handleQuickAdd}
          />
        )}
      </main>

      {/* Calendar Search Overlay */}
      <CalendarSearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        events={events}
        onEventSelect={handleSearchEventSelect}
      />
    </div>
  );
}

// CalendarHeader component (simplified for now - can be extracted later)
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid, List, LayoutGrid, Layers, Search, Plus } from 'lucide-react';
import { formatMonthYear, formatWeekRange, startOfWeek } from '../../lib/calendarUtils';
import { CalendarQuickViewDrawer } from './CalendarQuickViewDrawer';

function CalendarHeader({
  currentDate,
  view,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  showViewSelector,
  events,
  onDateSelect,
  onSearchOpen,
  onQuickAddEvent,
}: {
  currentDate: Date;
  view: 'day' | 'week' | 'month' | 'year' | 'agenda';
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: 'day' | 'week' | 'month' | 'year' | 'agenda') => void;
  showViewSelector?: boolean;
  events?: any[];
  onDateSelect?: (date: Date) => void;
  onSearchOpen?: () => void;
  onQuickAddEvent?: () => void;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const getDateRangeText = () => {
    switch (view) {
      case 'year':
        return currentDate.getFullYear().toString();
      case 'month':
        return formatMonthYear(currentDate);
      case 'week':
        return formatWeekRange(startOfWeek(currentDate));
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      case 'agenda':
        return 'Upcoming Events';
    }
  };

  const handleDateSelect = (date: Date) => {
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 safe-top">
        <div className="px-4 py-3">
          {/* Top row: Date and Quick View button (mobile) */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 text-left min-h-[44px] flex items-center">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  {view === 'year' ? '' : view === 'month' ? formatMonthYear(currentDate) : getDateRangeText()}
                </div>
                {view !== 'month' && view !== 'year' && (
                  <div className="text-lg font-bold text-gray-900">{getDateRangeText()}</div>
                )}
                {view === 'year' && (
                  <div className="text-lg font-bold text-gray-900">{getDateRangeText()}</div>
                )}
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
              {/* Quick View button (mobile only) */}
              {isMobile && (
                <button
                  onClick={() => setIsQuickViewOpen(true)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  aria-label="Quick View"
                  title="Quick View"
                >
                  <Layers size={20} className="text-gray-700" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation and View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevious}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft size={20} className="text-gray-700" />
              </button>
              <button
                onClick={onToday}
                className="px-4 py-2 min-h-[44px] text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg active:bg-blue-100 transition-colors"
              >
                Today
              </button>
              <button
                onClick={onNext}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Next"
              >
                <ChevronRight size={20} className="text-gray-700" />
              </button>
            </div>

            {/* View Toggle - Desktop only, hidden for year view */}
            {showViewSelector && !isMobile && view !== 'year' && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onViewChange('day')}
                  className={`px-3 py-1.5 min-h-[44px] rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${view === 'day'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Grid size={16} />
                  Day
                </button>
                <button
                  onClick={() => onViewChange('week')}
                  className={`px-3 py-1.5 min-h-[44px] rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${view === 'week'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <CalendarIcon size={16} />
                  Week
                </button>
                <button
                  onClick={() => onViewChange('month')}
                  className={`px-3 py-1.5 min-h-[44px] rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${view === 'month'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <LayoutGrid size={16} />
                  Month
                </button>
                <button
                  onClick={() => onViewChange('agenda')}
                  className={`px-3 py-1.5 min-h-[44px] rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${view === 'agenda'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <List size={16} />
                  Index
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Quick View Drawer (Mobile only) */}
      {isMobile && (
        <CalendarQuickViewDrawer
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currentDate={currentDate}
          currentView={view}
          onViewChange={onViewChange}
          onDateSelect={handleDateSelect}
          events={events}
        />
      )}
    </>
  );
}
