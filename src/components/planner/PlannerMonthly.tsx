import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { ChevronLeft, ChevronRight, Circle, CheckCircle2, Plus, X, Lock, Share2, ChevronDown, ChevronUp, Eye, Search, Calendar as CalendarIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlannerShell } from './PlannerShell';
import { useAuth } from '../../contexts/AuthContext';
import {
  getMonthlyPlannerEntry,
  upsertMonthlyPlannerEntry,
  getMonthlyTodos,
  addMonthlyTodo,
  updateMonthlyTodo,
  deleteMonthlyTodo,
  type MonthlyPlannerEntry,
  type MonthlyPlannerTodo,
} from '../../lib/monthlyPlanner';
import {
  getPersonalEventsForDateRange,
  type PersonalCalendarEvent,
} from '../../lib/personalSpaces/calendarService';
// Phase 7A: Use offline-aware wrappers
import {
  createPersonalCalendarEvent,
  updatePersonalCalendarEvent,
} from '../../lib/personalSpaces/calendarServiceOffline';
import { showToast } from '../Toast';
import { getNestedEvents, updateContextEvent } from '../../lib/contextSovereign/contextEventsService';
import { enforceVisibility, assertCanEdit, PermissionError } from '../../lib/permissions/enforcement';
import { supabase } from '../../lib/supabase';
import { CalendarEventPill } from '../calendar/CalendarEventPill';
import { DayPeekPanel } from '../calendar/DayPeekPanel';
import { QuickAddPopover } from '../calendar/QuickAddPopover';
import { QuickAddBottomSheet } from './mobile/QuickAddBottomSheet';
import { MonthlyPlannerMobile } from './mobile/MonthlyPlannerMobile';
import { EventDetailModal } from '../calendar/EventDetailModal';
import { IntentionsPanel } from './temporal/IntentionsPanel';
import { ReflectionsPanel } from './temporal/ReflectionsPanel';
import { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import { splitEventsForMonthView, getEventsForDate, getContainerSegmentsForWeek } from '../../lib/calendar/eventSegmentation';
import { getPersonalEventsForDateRangeWithExtras } from '../../lib/personalSpaces/calendarService';
import { getHabitInstancesForDate } from '../../lib/calendar/calendarExtras';
import { subscribeActivityChanged } from '../../lib/activities/activityEvents';

const FEATURE_HABITS_GOALS = false; // Feature flag
const FEATURE_CALENDAR_EXTRAS = false; // Feature flag

export function PlannerMonthly() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { goToToday, goToWeek, goToDay } = useCalendarNavigation();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const state = location.state as { monthIndex?: number } | null;
    if (state?.monthIndex !== undefined) {
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, state.monthIndex, 1);
    }
    return new Date();
  });
  const [entry, setEntry] = useState<MonthlyPlannerEntry | null>(null);
  const [todos, setTodos] = useState<MonthlyPlannerTodo[]>([]);
  const [events, setEvents] = useState<PersonalCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [containerNestedMap, setContainerNestedMap] = useState<Map<string, PersonalCalendarEvent[]>>(new Map());
  const [selectedEvent, setSelectedEvent] = useState<PersonalCalendarEvent | null>(null);
  const [dayPeekDate, setDayPeekDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [habitInstancesByDate, setHabitInstancesByDate] = useState<Map<string, any[]>>(new Map());
  
  // Drag & Resize state
  const [draggingEvent, setDraggingEvent] = useState<{
    event: PersonalCalendarEvent;
    startDay: number;
    originalStart: Date;
    originalEnd: Date | null;
  } | null>(null);
  const [dragTargetDay, setDragTargetDay] = useState<number | null>(null);
  const [resizingContainer, setResizingContainer] = useState<{
    event: PersonalCalendarEvent;
    edge: 'left' | 'right';
    startDay: number;
    originalStart: Date;
    originalEnd: Date | null;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Phase 7A: Mobile detection and disclaimer
  const [isMobile, setIsMobile] = useState(false);
  // Phase 10A: Swipe navigation state
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showMobileDisclaimer, setShowMobileDisclaimer] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissed = sessionStorage.getItem('planner_monthly_mobile_disclaimer_dismissed');
    return !dismissed && window.innerWidth < 768;
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user) {
      loadMonthlyData();
    }
  }, [user, selectedDate]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Subscribe to activity changes for live sync
  useEffect(() => {
    if (!user || !FEATURE_CALENDAR_EXTRAS) return;

    const unsubscribe = subscribeActivityChanged(() => {
      // Refresh calendar when activities change
      loadMonthlyData();
    });

    return unsubscribe;
  }, [user, selectedDate]);

  const loadMonthlyData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;

      const monthEntry = await getMonthlyPlannerEntry(user.id, year, month);
      setEntry(monthEntry);

      if (monthEntry) {
        const monthTodos = await getMonthlyTodos(monthEntry.id);
        setTodos(monthTodos);
      } else {
        setTodos([]);
      }

      // Load personal calendar events for the month (single source of truth)
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      // Get events with optional extras (habits/goals)
      const result = await getPersonalEventsForDateRangeWithExtras(user.id, startDate, endDate);
      const personalEvents = result.events;
      
      // Store habit instances by date if extras available
      if (FEATURE_CALENDAR_EXTRAS && result.extras) {
        const habitMap = new Map<string, any[]>();
        result.extras.habits.forEach(habit => {
          if (!habitMap.has(habit.date)) {
            habitMap.set(habit.date, []);
          }
          habitMap.get(habit.date)!.push(habit);
        });
        setHabitInstancesByDate(habitMap);
      }
      
      // Apply permission filtering (service layer enforcement)
      const visibleEvents = personalEvents
        .map(event => enforceVisibility(event, event.permissions))
        .filter((e): e is PersonalCalendarEvent => e !== null);
      
      setEvents(visibleEvents);

      // Load nested events for expanded containers
      await loadNestedEventsForExpandedContainers(visibleEvents);
    } catch (err) {
      console.error('Error loading monthly data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNestedEventsForExpandedContainers = async (events: PersonalCalendarEvent[]) => {
    if (!user) return;
    
    const nestedMap = new Map<string, PersonalCalendarEvent[]>();
    
    for (const event of events) {
      if (event.event_scope === 'container' && expandedContainers.has(event.id) && event.sourceEntityId) {
        try {
          const nestedResult = await getNestedEvents(event.sourceEntityId);
          if (nestedResult.success && nestedResult.data) {
            // Map nested events to PersonalCalendarEvent format
            // TODO: Fetch actual permissions for nested events from projections
            const nestedEvents: PersonalCalendarEvent[] = nestedResult.data.map(nested => ({
              id: nested.id,
              userId: user.id,
              title: nested.title,
              description: nested.description || null,
              startAt: nested.start_at,
              endAt: nested.end_at,
              allDay: nested.time_scope === 'all_day',
              sourceType: 'context' as const,
              sourceEntityId: nested.id,
              sourceProjectId: null,
              createdAt: nested.created_at,
              updatedAt: nested.updated_at,
              contextId: nested.context_id,
              event_scope: 'item',
              parent_context_event_id: nested.parent_context_event_id,
              // Default permissions - TODO: Fetch actual permissions from projections
              permissions: {
                can_view: true,
                can_comment: false,
                can_edit: nested.created_by === user.id,
                can_manage: nested.created_by === user.id,
                detail_level: 'detailed',
                scope: 'this_only',
              },
            }));
            nestedMap.set(event.id, nestedEvents);
          }
        } catch (err) {
          console.error('Error loading nested events:', err);
        }
      }
    }
    
    setContainerNestedMap(nestedMap);
  };

  useEffect(() => {
    if (expandedContainers.size > 0 && events.length > 0 && user) {
      loadNestedEventsForExpandedContainers(events);
    }
  }, [expandedContainers, events.length, user]);

  const saveNotes = useCallback(
    async (notes: string) => {
      if (!user) return;

      try {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        const updated = await upsertMonthlyPlannerEntry(user.id, year, month, { notes });
        setEntry(updated);
      } catch (err) {
        console.error('Error saving notes:', err);
      }
    },
    [user, selectedDate]
  );

  const handleAddTodo = async () => {
    if (!user || !newTodoTitle.trim()) return;

    try {
      let entryToUse = entry;
      if (!entryToUse) {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        entryToUse = await upsertMonthlyPlannerEntry(user.id, year, month, {});
        setEntry(entryToUse);
      }

      const newTodo = await addMonthlyTodo(entryToUse.id, newTodoTitle, todos.length);
      setTodos([...todos, newTodo]);
      setNewTodoTitle('');
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  };

  const handleToggleTodo = async (todoId: string, completed: boolean) => {
    try {
      await updateMonthlyTodo(todoId, { completed: !completed });
      setTodos(todos.map((t) => (t.id === todoId ? { ...t, completed: !completed } : t)));
    } catch (err) {
      console.error('Error toggling todo:', err);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      await deleteMonthlyTodo(todoId);
      setTodos(todos.filter((t) => t.id !== todoId));
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  };

  const handleToggleContainerExpand = (containerId: string) => {
    const newExpanded = new Set(expandedContainers);
    if (newExpanded.has(containerId)) {
      newExpanded.delete(containerId);
    } else {
      newExpanded.add(containerId);
    }
    setExpandedContainers(newExpanded);
  };

  const handleQuickAdd = (day: number) => {
    if (day === 0) return;
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    setQuickAddDate(date);
    setQuickAddTitle('');
  };

  const handleQuickAddSubmit = async () => {
    if (!user || !quickAddDate || !quickAddTitle.trim()) return;

    try {
      const startAt = quickAddDate.toISOString();
      const endAt = new Date(quickAddDate.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour default

      await createPersonalCalendarEvent(user.id, {
        title: quickAddTitle,
        startAt,
        endAt,
        allDay: false,
      });

      // Phase 7A: Show success feedback
      const isOnline = navigator.onLine;
      if (isOnline) {
        showToast('success', 'Event added');
      } else {
        showToast('info', 'Saved — will sync when online');
      }

      setQuickAddDate(null);
      setQuickAddTitle('');
      await loadMonthlyData();
    } catch (err) {
      console.error('Error adding event:', err);
      // Phase 7A: Show error feedback
      showToast('error', 'Couldn\'t add event. It will retry when you\'re online.');
    }
  };

  // Filter events by search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.title.toLowerCase().includes(query) ||
      (event.description && event.description.toLowerCase().includes(query))
    );
  }, [events, searchQuery]);

  // Group events by type using helper
  const { containers, allDay, timed, nested } = useMemo(() => {
    return splitEventsForMonthView(filteredEvents);
  }, [filteredEvents]);

  // Get events for a specific day using helper
  const getEventsForDay = useCallback((day: number) => {
    if (day === 0) return { containers: [], allDay: [], timed: [], nested: [] };
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    return getEventsForDate(filteredEvents, date);
  }, [filteredEvents, selectedDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
    setSelectedDate(newDate);
  };

  // Phase 10A: Swipe navigation handlers (mobile only)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setSwipeStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    });
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !swipeStart) return;
    
    const deltaX = e.touches[0].clientX - swipeStart.x;
    const deltaY = e.touches[0].clientY - swipeStart.y;
    
    // Only apply visual feedback for horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Limit offset to prevent over-swiping
      const maxOffset = 100;
      setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.3)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !swipeStart) {
      setSwipeOffset(0);
      return;
    }
    
    const deltaX = e.changedTouches[0].clientX - swipeStart.x;
    const deltaY = e.changedTouches[0].clientY - swipeStart.y;
    const deltaTime = Date.now() - swipeStart.time;
    
    // Reset visual feedback
    setSwipeOffset(0);
    setSwipeStart(null);
    
    // Only trigger if horizontal swipe (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50 && deltaTime < 300) {
      if (deltaX > 0) {
        // Swipe right = previous month
        navigateMonth('prev');
      } else {
        // Swipe left = next month
        navigateMonth('next');
      }
    }
  };

  const currentMonth = selectedDate.toLocaleDateString('en-US', { month: 'long' });
  const currentYear = selectedDate.getFullYear();

  const getMonthCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weeks: number[][] = [];
    let currentWeek: number[] = new Array(7).fill(0);

    const startDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    for (let i = 0; i < startDay; i++) {
      currentWeek[i] = 0;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (startDay + day - 1) % 7;
      currentWeek[dayOfWeek] = day;

      if (dayOfWeek === 6 || day === daysInMonth) {
        weeks.push([...currentWeek]);
        currentWeek = new Array(7).fill(0);
      }
    }

    return weeks;
  };

  const getNextMonthMiniCalendar = () => {
    const nextMonth = new Date(selectedDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weeks: number[][] = [];
    let currentWeek: number[] = new Array(7).fill(0);

    const startDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    for (let i = 0; i < startDay; i++) {
      currentWeek[i] = 0;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (startDay + day - 1) % 7;
      currentWeek[dayOfWeek] = day;

      if (dayOfWeek === 6 || day === daysInMonth) {
        weeks.push([...currentWeek]);
        currentWeek = new Array(7).fill(0);
      }
    }

    return { weeks, monthName: nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  };

  const weeks = getMonthCalendar();
  const nextMonthData = getNextMonthMiniCalendar();

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-full">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4 mx-auto"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </PlannerShell>
    );
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const jumpToMonth = (monthIndex: number) => {
    const year = selectedDate.getFullYear();
    const newDate = new Date(year, monthIndex, 1);
    setSelectedDate(newDate);
  };

  // Mobile-first layout
  if (isMobile) {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    return (
      <PlannerShell>
        <div 
          className="max-w-full h-screen-safe flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
            transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
          }}
        >
          {/* Subtle guidance banner (dismissible) */}
          {showMobileDisclaimer && (
            <div className="px-4 pt-2 pb-1">
              <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-blue-700 flex-1">
                  Tap a day to add events. Advanced editing works best on desktop.
                </p>
                <button
                  onClick={() => {
                    setShowMobileDisclaimer(false);
                    sessionStorage.setItem('planner_monthly_mobile_disclaimer_dismissed', 'true');
                  }}
                  className="text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0 ml-2"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Intentions Panel - Top (Mobile) */}
          {user && (
            <div className="px-4 pt-4 pb-2">
              <IntentionsPanel 
                userId={user.id} 
                scope="month" 
                scopeDate={monthStart} 
              />
            </div>
          )}

          <MonthlyPlannerMobile
            selectedDate={selectedDate}
            currentMonth={currentMonth}
            currentYear={currentYear}
            weeks={weeks}
            events={filteredEvents}
            entry={entry}
            todos={todos}
            newTodoTitle={newTodoTitle}
            searchQuery={searchQuery}
            isToday={(day) => {
              return day > 0 && day === new Date().getDate() && 
                selectedDate.getMonth() === new Date().getMonth() && 
                selectedDate.getFullYear() === new Date().getFullYear();
            }}
            getEventsForDay={getEventsForDay}
            onNavigateMonth={navigateMonth}
            onJumpToMonth={jumpToMonth}
            onGoToToday={goToToday}
            onDayClick={(day) => {
              const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
              setQuickAddDate(date);
            }}
            onEventClick={setSelectedEvent}
            onSearchChange={setSearchQuery}
            onAddTodo={handleAddTodo}
            onTodoTitleChange={setNewTodoTitle}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
            onNotesChange={saveNotes}
          />

          {/* Mobile: Quick Add BottomSheet */}
          {quickAddDate && user && (
            <QuickAddBottomSheet
              isOpen={!!quickAddDate}
              onClose={() => setQuickAddDate(null)}
              onEventCreated={loadMonthlyData}
              userId={user.id}
              date={quickAddDate}
            />
          )}

          {/* Event Detail Modal */}
          {selectedEvent && user && (
            <EventDetailModal
              isOpen={!!selectedEvent}
              onClose={() => setSelectedEvent(null)}
              event={selectedEvent}
              mode="month"
              userId={user.id}
              onUpdated={() => {
                loadMonthlyData();
                setSelectedEvent(null);
              }}
              onDeleted={() => {
                loadMonthlyData();
                setSelectedEvent(null);
              }}
            />
          )}

          {/* Reflections Panel - Bottom (Mobile) */}
          {user && (
            <div className="px-4 pb-4 pt-2">
              <ReflectionsPanel 
                userId={user.id} 
                scope="month" 
                scopeDate={monthStart} 
              />
            </div>
          )}
        </div>
      </PlannerShell>
    );
  }

  // Desktop layout (unchanged)
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  return (
    <PlannerShell>
      <div 
        className="max-w-full bg-gradient-to-br from-gray-50 to-gray-100/50 min-h-screen pb-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
          transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {/* Intentions Panel - Top */}
        {user && (
          <div className="px-6 pt-6 pb-4">
            <IntentionsPanel 
              userId={user.id} 
              scope="month" 
              scopeDate={monthStart} 
            />
          </div>
        )}

        {/* Premium Sticky Header */}
        <div className="sticky top-0 z-30 bg-gradient-to-b from-white to-gray-50/50 backdrop-blur-sm border-b border-gray-200 shadow-sm mb-6">
          <div className="px-6 py-4">
            {/* Top Row - Navigation and Actions */}
            <div className="flex items-center justify-between mb-4">
              {/* Left - Month Navigation */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                  <button 
                    onClick={() => navigateMonth('prev')} 
                    className="p-2.5 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150"
                  >
                    <ChevronLeft size={20} className="text-gray-600" />
                  </button>
                  <div className="px-6 py-1.5 border-x border-gray-100">
                    <h1 className="text-2xl font-semibold text-gray-900 whitespace-nowrap">
                      {currentMonth} {currentYear}
                    </h1>
                  </div>
                  <button 
                    onClick={() => navigateMonth('next')}
                    className="p-2.5 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150"
                  >
                    <ChevronRight size={20} className="text-gray-600" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    const today = new Date();
                    const isCurrentMonth = selectedDate.getMonth() === today.getMonth() && 
                                         selectedDate.getFullYear() === today.getFullYear();
                    if (!isCurrentMonth) {
                      goToToday();
                    }
                  }}
                  disabled={selectedDate.getMonth() === new Date().getMonth() && 
                           selectedDate.getFullYear() === new Date().getFullYear()}
                  className={`px-6 py-2.5 rounded-2xl font-medium text-sm shadow-sm transition-all duration-200 ${
                    selectedDate.getMonth() === new Date().getMonth() && 
                    selectedDate.getFullYear() === new Date().getFullYear()
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 active:scale-95 hover:shadow-md'
                  }`}
                >
                  Today
                </button>
              </div>

              {/* Right - View Switcher */}
              <div className="flex items-center gap-2 bg-white rounded-2xl shadow-sm border border-gray-200/60 p-1.5">
                <button
                  onClick={() => navigate('/planner/monthly')}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all duration-200"
                >
                  Month
                </button>
                <button
                  onClick={() => goToWeek(selectedDate)}
                  className="px-5 py-2 text-gray-700 rounded-xl hover:bg-gray-50 active:bg-gray-100 text-sm font-medium transition-all duration-150"
                >
                  Week
                </button>
                <button
                  onClick={() => goToDay(selectedDate)}
                  className="px-5 py-2 text-gray-700 rounded-xl hover:bg-gray-50 active:bg-gray-100 text-sm font-medium transition-all duration-150"
                >
                  Day
                </button>
              </div>
            </div>

            {/* Bottom Row - Search */}
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events by title..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200/60 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm text-sm placeholder:text-gray-400 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Month Pills Navigation - Premium Style */}
        <div className="mb-6 px-6">
          {/* Phase 2C: Add padding at scroll edges for better mobile touch scrolling */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-3 overflow-x-auto scrollbar-hide overscroll-contain">
            <div className="flex gap-2 min-w-max px-1">
              {months.map((month, index) => (
                <button
                  key={month}
                  onClick={() => jumpToMonth(index)}
                  className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    selectedDate.getMonth() === index
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md scale-105'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200 border border-gray-200/60 hover:shadow-sm hover:scale-105'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-6">
          {/* Premium Left Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            {/* To Do - Premium Card */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Circle className="w-5 h-5" />
                  To Do
                </h2>
              </div>
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  {todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50/50 transition-colors group">
                      <button 
                        onClick={() => handleToggleTodo(todo.id, todo.completed)}
                        className="flex-shrink-0"
                      >
                        {todo.completed ? (
                          <CheckCircle2 size={18} className="text-purple-600" />
                        ) : (
                          <Circle size={18} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
                        )}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          todo.completed ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {todo.title}
                      </span>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
                    placeholder="Add a todo..."
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                  />
                  <button
                    onClick={handleAddTodo}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 active:scale-95 transition-all duration-200 shadow-sm"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Notes - Premium Card */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  📝 Notes
                </h2>
              </div>
              <div className="p-4">
                <textarea
                  value={entry?.notes || ''}
                  onChange={(e) => saveNotes(e.target.value)}
                  placeholder="Add your monthly notes here..."
                  className="w-full h-48 px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Next Month Mini Calendar - Premium Card */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-4">
                <h2 className="text-sm font-semibold text-white text-center">{nextMonthData.monthName}</h2>
              </div>
              <div className="p-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-center py-2 text-xs font-medium text-gray-500">M</th>
                      <th className="text-center py-2 text-xs font-medium text-gray-500">T</th>
                      <th className="text-center py-2 text-xs font-medium text-gray-500">W</th>
                      <th className="text-center py-2 text-xs font-medium text-gray-500">T</th>
                      <th className="text-center py-2 text-xs font-medium text-gray-500">F</th>
                      <th className="text-center py-2 text-xs font-medium text-gray-500">S</th>
                      <th className="text-center py-2 text-xs font-medium text-gray-500">S</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextMonthData.weeks.map((week, wi) => (
                      <tr key={wi}>
                        {week.map((day, di) => (
                          <td key={di} className="text-center py-1.5 text-xs text-gray-700 hover:bg-indigo-50 rounded-lg transition-colors">
                            {day || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Premium Calendar Grid */}
          {/* Phase 2C: Ensure horizontal scroll works smoothly on mobile */}
          <div className="lg:col-span-9 overflow-x-auto overscroll-contain">
            <div className="bg-white rounded-2xl border border-gray-200/60 min-w-[700px] shadow-xl overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white">
                    <th className="w-12 border-r border-gray-100 p-3 text-xs font-semibold text-gray-500"></th>
                    <th className="border-r border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">Monday</th>
                    <th className="border-r border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">Tuesday</th>
                    <th className="border-r border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">Wednesday</th>
                    <th className="border-r border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">Thursday</th>
                    <th className="border-r border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">Friday</th>
                    <th className="border-r border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">Saturday</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Sunday</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, wi) => {
                    // Calculate week start/end dates for container band rendering
                    const firstDay = week.find(d => d > 0) || 1;
                    const weekStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), firstDay);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    
                    // Get container segments for this week
                    const weekContainerSegments = containers
                      .map(container => {
                        const segment = getContainerSegmentsForWeek(container, weekStart, weekEnd);
                        return segment ? { container, segment } : null;
                      })
                      .filter((s): s is { container: PersonalCalendarEvent; segment: { startDay: number; endDay: number; isStart: boolean; isEnd: boolean } } => s !== null);

                    return (
                      <Fragment key={wi}>
                        {/* Multi-day Container Bands Row */}
                        {weekContainerSegments.length > 0 && (
                          <tr key={`container-${wi}`} className="border-b border-gray-200 h-6">
                            <td className="border-r-2 border-gray-300 p-1 bg-gray-50"></td>
                            {week.map((day, di) => {
                              // Find container that starts at this day
                              const segmentStartingHere = weekContainerSegments.find(({ segment }) => 
                                segment.startDay === di
                              );
                              
                              if (segmentStartingHere) {
                                const span = segmentStartingHere.segment.endDay - segmentStartingHere.segment.startDay + 1;
                                return (
                                  <td
                                    key={di}
                                    colSpan={span}
                                    className="border-r border-gray-300 p-0.5 h-6"
                                  >
                                    <CalendarEventPill
                                      event={segmentStartingHere.container}
                                      variant="container"
                                      permissions={segmentStartingHere.container.permissions}
                                      onClick={() => setSelectedEvent(segmentStartingHere.container)}
                                      className="text-[9px] h-full"
                                    />
                                  </td>
                                );
                              }
                              
                              // Check if this day is part of a container that started earlier
                              const isPartOfContainer = weekContainerSegments.some(({ segment }) =>
                                segment.startDay < di && segment.endDay >= di
                              );
                              
                              if (!isPartOfContainer) {
                                return <td key={di} className="border-r border-gray-300 p-1 h-6"></td>;
                              }
                              
                              return null;
                            })}
                          </tr>
                        )}
                        
                        {/* Week Row with Day Cells */}
                        <tr key={wi} className="border-b border-gray-100 last:border-b-0">
                          <td className="w-12 border-r border-gray-100 p-3 bg-gradient-to-br from-gray-50 to-white text-center font-semibold text-xs text-gray-500">
                            W{wi + 1}
                          </td>
                        {week.map((day, di) => {
                        const dayEvents = getEventsForDay(day);
                        const { containers: dayContainers, allDay: dayAllDay, timed: dayTimed, nested: dayNested } = dayEvents;
                        const isQuickAdd = quickAddDate && 
                          quickAddDate.getDate() === day &&
                          quickAddDate.getMonth() === selectedDate.getMonth();
                        
                        const isDragTarget = dragTargetDay === day && draggingEvent !== null;
                        
                        let isInvalidDrop = false;
                        if (draggingEvent && draggingEvent.event.event_scope === 'item' && 
                            draggingEvent.event.parent_context_event_id && day !== 0) {
                          const parentContainer = events.find(
                            e => e.id === draggingEvent.event.parent_context_event_id && e.event_scope === 'container'
                          );
                          if (parentContainer) {
                            const parentStart = new Date(parentContainer.startAt);
                            const parentEnd = parentContainer.endAt ? new Date(parentContainer.endAt) : parentStart;
                            const targetDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                            isInvalidDrop = targetDate < parentStart || targetDate > parentEnd;
                          }
                        }
                        
                        const isToday = day > 0 && day === new Date().getDate() && 
                          selectedDate.getMonth() === new Date().getMonth() && 
                          selectedDate.getFullYear() === new Date().getFullYear();
                        
                        const isWeekend = di >= 5; // Saturday and Sunday

                        return (
                          <td
                            key={di}
                            className={`border-r border-gray-100 last:border-r-0 p-3 h-28 align-top relative group transition-all duration-200 ${
                              day === 0 ? 'bg-gray-50/50' : 
                              isToday ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-200' :
                              isWeekend ? 'bg-gray-50/30' :
                              isDragTarget ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' :
                              isInvalidDrop ? 'bg-red-50 ring-2 ring-inset ring-red-400' :
                              'hover:bg-gray-50/60 cursor-pointer'
                            }`}
                            onClick={() => {
                              if (day > 0) {
                                const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                                setQuickAddDate(date);
                              }
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (day > 0) {
                                const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                                goToDay(date);
                              }
                            }}
                          >
                            {day > 0 && (
                              <>
                                <div className="flex items-center justify-between mb-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                                      navigate('/planner/weekly', {
                                        state: { date: date.toISOString() },
                                      });
                                    }}
                                    className={`text-sm font-semibold transition-all duration-200 ${
                                      isToday 
                                        ? 'w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm' 
                                        : 'text-gray-900 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg'
                                    }`}
                                    title="Click to go to week view"
                                  >
                                    {day}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                                      setQuickAddDate(date);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                    title="Quick add event"
                                  >
                                    <Plus size={16} className="text-blue-600" />
                                  </button>
                                </div>

                                <div className="space-y-1.5 relative z-0">
                                  {/* All-Day Events (top stack) */}
                                  {dayAllDay.length > 0 && (
                                    <div className="space-y-1">
                                      {dayAllDay.slice(0, 2).map((event) => {
                                        const canView = event.permissions?.can_view ?? true;
                                        if (!canView) return null;
                                        return (
                                          <CalendarEventPill
                                            key={event.id}
                                            event={event}
                                            variant="allDay"
                                            permissions={event.permissions}
                                            onClick={() => setSelectedEvent(event)}
                                            className="text-xs shadow-sm hover:shadow-md transition-shadow"
                                          />
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Timed Events (compact pills) */}
                                  {dayTimed.length > 0 && (
                                    <div className="space-y-1">
                                      {dayTimed.slice(0, 2).map((event) => {
                                        const canView = event.permissions?.can_view ?? true;
                                        if (!canView) return null;
                                        return (
                                          <CalendarEventPill
                                            key={event.id}
                                            event={event}
                                            variant="timed"
                                            permissions={event.permissions}
                                            onClick={() => setSelectedEvent(event)}
                                            showTime={true}
                                            isCompact={true}
                                            className="text-[10px] shadow-sm hover:shadow-md transition-shadow"
                                          />
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Habit completion indicator (if feature enabled) */}
                                  {FEATURE_CALENDAR_EXTRAS && (() => {
                                    const habitInstances = getHabitInstancesForDay(day);
                                    const completedCount = habitInstances.filter(h => h.status === 'done').length;
                                    const totalCount = habitInstances.length;
                                    
                                    if (totalCount > 0) {
                                      return (
                                        <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                                          <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                            <div className="flex items-center gap-1">
                                              <div className={`w-1.5 h-1.5 rounded-full ${
                                                completedCount === totalCount ? 'bg-green-500' :
                                                completedCount > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                                              }`} />
                                              <span className="font-medium">
                                                {completedCount}/{totalCount} habits
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {/* Premium Overflow indicator */}
                                  {(dayAllDay.length > 2 || dayTimed.length > 2 || dayNested.length > 0) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                                        setDayPeekDate(date);
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg font-medium w-full text-left transition-all duration-200"
                                    >
                                      +{Math.max(0, dayAllDay.length - 2) + Math.max(0, dayTimed.length - 2) + dayNested.length} more
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Error Toast */}
        {errorMessage && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            {errorMessage}
          </div>
        )}

        {/* Desktop: Quick Add Popover */}
        {quickAddDate && user && !isMobile && (
          <QuickAddPopover
            isOpen={!!quickAddDate}
            onClose={() => setQuickAddDate(null)}
            userId={user.id}
            defaultDate={quickAddDate}
            onEventCreated={() => {
              loadMonthlyData();
            }}
          />
        )}

        {/* Event Detail Modal */}
        {selectedEvent && user && (
          <EventDetailModal
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            event={selectedEvent}
            mode="month"
            userId={user.id}
            onUpdated={() => {
              loadMonthlyData();
              setSelectedEvent(null);
            }}
            onDeleted={() => {
              loadMonthlyData();
              setSelectedEvent(null);
            }}
          />
        )}

        {/* Reflections Panel - Bottom */}
        {user && (
          <div className="px-6 pb-6 pt-4">
            <ReflectionsPanel 
              userId={user.id} 
              scope="month" 
              scopeDate={monthStart} 
            />
          </div>
        )}

        {/* Day Peek Panel */}
        {dayPeekDate && user && (() => {
          const dayEvents = getEventsForDate(filteredEvents, dayPeekDate);
          const allDayEvents = [
            ...dayEvents.containers,
            ...dayEvents.allDay,
            ...dayEvents.timed,
            ...dayEvents.nested,
          ];
          return (
            <DayPeekPanel
              key={dayPeekDate.toISOString()}
              isOpen={!!dayPeekDate}
              onClose={() => setDayPeekDate(null)}
              date={dayPeekDate}
              events={allDayEvents}
              userId={user.id}
              onEventUpdated={() => {
                loadMonthlyData();
              }}
              onEventDeleted={() => {
                loadMonthlyData();
              }}
            />
          );
        })()}

        {/* Drag Ghost Preview - shown in target cell */}
        {draggingEvent && dragTargetDay && (
          <div className="fixed pointer-events-none z-50">
            {/* Ghost preview is rendered inline in the target cell */}
          </div>
        )}
      </div>
    </PlannerShell>
  );
}

// Container Event Block Component
function ContainerEventBlock({
  event,
  isExpanded,
  onToggleExpand,
  permissions,
  nestedEvents,
  day,
  selectedDate,
  onDragStart,
  onResizeStart,
  isDragging,
  isResizing,
}: {
  event: PersonalCalendarEvent;
  isExpanded: boolean;
  onToggleExpand: () => void;
  permissions?: import('../../lib/permissions/types').PermissionFlags;
  nestedEvents: PersonalCalendarEvent[];
  day: number;
  selectedDate: Date;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent, edge: 'left' | 'right') => void;
  isDragging: boolean;
  isResizing: boolean;
  onClick: () => void;
}) {
  const canEdit = permissions?.can_edit ?? true;
  const detailLevel = permissions?.detail_level ?? 'detailed';
  const scope = permissions?.scope ?? 'this_only';
  const isReadOnly = !canEdit;
  const showNested = detailLevel === 'detailed' && scope === 'include_children' && nestedEvents.length > 0;

  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
  const isFirstDay = currentDate.toDateString() === start.toDateString();
  const isLastDay = currentDate.toDateString() === end.toDateString();

  return (
    <div
      className={`mb-1 px-1.5 py-1 rounded-md text-[9px] md:text-[10px] relative ${
        isReadOnly
          ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-dashed border-blue-300 shadow-sm'
          : 'bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-400 shadow-md hover:shadow-lg hover:border-blue-500'
      } ${isDragging || isResizing ? 'opacity-50 scale-95' : 'cursor-pointer hover:opacity-90 hover:scale-[1.02]'} transition-all duration-200`}
      onClick={(e) => {
        if (!isDragging && !isResizing) {
          e.stopPropagation();
          // Double-click or long-press could toggle expand, single click opens detail
          const target = e.target as HTMLElement;
          if (!target.closest('.resize-handle')) {
            onClick();
          }
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onToggleExpand();
      }}
      onMouseDown={!isReadOnly ? (e) => {
        // Only start drag if not clicking on resize handles
        const target = e.target as HTMLElement;
        if (!target.closest('.resize-handle')) {
          onDragStart(e);
        }
      } : undefined}
      title={isReadOnly ? 'Read-only' : 'Click to expand, drag to move, drag edges to resize'}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="font-medium truncate">{event.title}</span>
          {event.contextType && (
            <span className="px-1 py-0.5 bg-white/60 rounded text-[8px] font-medium">
              {event.contextType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {isReadOnly && (
            <div className="flex items-center gap-0.5" title="Read-only access">
              <Lock size={10} className="text-orange-600" />
            </div>
          )}
          {!isReadOnly && event.sourceType === 'personal' && (
            <div className="flex items-center gap-0.5" title="Personal event">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            </div>
          )}
          {event.sourceType === 'context' && (
            <div className="flex items-center gap-0.5" title="Shared from context">
              <Share2 size={10} className="text-blue-600" />
            </div>
          )}
          {event.sourceType === 'guardrails' && (
            <div className="flex items-center gap-0.5" title="From Guardrails">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
            </div>
          )}
          {showNested && (
            isExpanded ? <ChevronUp size={8} className="text-blue-600" /> : <ChevronDown size={8} className="text-blue-600" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-1 pt-1 border-t border-blue-300 space-y-0.5">
          {event.description && detailLevel === 'detailed' && (
            <p className="text-[8px] text-gray-600 line-clamp-2">{event.description}</p>
          )}
          {showNested && nestedEvents.length > 0 && (
            <div className="space-y-0.5">
              {nestedEvents.map((nested) => {
                const nestedPerms = nested.permissions;
                const canViewNested = nestedPerms?.can_view ?? true;
                if (!canViewNested) return null;
                
                return (
                  <div
                    key={nested.id}
                    className="pl-2 text-[8px] bg-white/50 rounded px-1 py-0.5 border-l-2 border-blue-400"
                  >
                    {nested.title}
                  </div>
                );
              })}
            </div>
          )}
          {showNested && nestedEvents.length === 0 && (
            <p className="text-[8px] text-gray-500 italic">No nested items</p>
          )}
        </div>
      )}

      {/* Permission Badge Overlay - Always visible */}
      <div className="absolute top-0 right-0 m-0.5 flex items-center gap-0.5 z-20">
        {isReadOnly ? (
          <div className="bg-orange-100 border-2 border-orange-400 rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-md">
            <Lock size={10} className="text-orange-700" />
            <span className="text-[8px] font-bold text-orange-700 uppercase">Read-Only</span>
          </div>
        ) : event.sourceType === 'context' ? (
          <div className="bg-blue-100 border-2 border-blue-400 rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-md">
            <Share2 size={10} className="text-blue-700" />
            <span className="text-[8px] font-bold text-blue-700 uppercase">Shared</span>
          </div>
        ) : event.sourceType === 'guardrails' ? (
          <div className="bg-purple-100 border-2 border-purple-400 rounded-md px-1.5 py-0.5 shadow-md">
            <span className="text-[8px] font-bold text-purple-700 uppercase">Guardrails</span>
          </div>
        ) : (
          <div className="bg-green-100 border-2 border-green-400 rounded-md px-1.5 py-0.5 shadow-md">
            <span className="text-[8px] font-bold text-green-700 uppercase">Personal</span>
          </div>
        )}
      </div>

      {/* Resize Handles */}
      {!isReadOnly && (
        <>
          {isFirstDay && (
            <div
              className="resize-handle absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500 hover:w-3 z-10 transition-all rounded-l-md"
              onMouseDown={(e) => {
                e.stopPropagation();
                onResizeStart(e, 'left');
              }}
              title="Drag to resize start date"
            />
          )}
          {isLastDay && (
            <div
              className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500 hover:w-3 z-10 transition-all rounded-r-md"
              onMouseDown={(e) => {
                e.stopPropagation();
                onResizeStart(e, 'right');
              }}
              title="Drag to resize end date"
            />
          )}
        </>
      )}
    </div>
  );
}

// Nested Event Item Component
function NestedEventItem({
  event,
  permissions,
  day,
  onDragStart,
  isDragging,
  onClick,
}: {
  event: PersonalCalendarEvent;
  permissions?: import('../../lib/permissions/types').PermissionFlags;
  day: number;
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
  onClick: () => void;
}) {
  const canEdit = permissions?.can_edit ?? true;
  const isReadOnly = !canEdit;

  return (
    <div
      className={`mb-1 px-1 py-0.5 text-[9px] rounded-md shadow-sm ${
        isReadOnly
          ? 'bg-gray-50 border-2 border-dashed border-gray-300 cursor-not-allowed'
          : 'bg-gray-100 border-2 border-gray-400 cursor-move hover:shadow-md hover:bg-gray-150'
      } ${isDragging ? 'opacity-50 scale-95' : 'transition-all duration-150'}`}
      onMouseDown={!isReadOnly ? onDragStart : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) {
          onClick();
        }
      }}
      title={isReadOnly ? 'Read-only access' : 'Drag to move, click to view'}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-gray-500">└</span>
          <span className="truncate flex-1">{event.title}</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {isReadOnly ? (
            <div className="bg-orange-100 border border-orange-300 rounded px-1 py-0.5">
              <Lock size={8} className="text-orange-700" />
            </div>
          ) : event.sourceType === 'context' ? (
            <Share2 size={8} className="text-blue-600" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Regular Event Item Component
function RegularEventItem({
  event,
  permissions,
  day,
  onDragStart,
  isDragging,
  onClick,
}: {
  event: PersonalCalendarEvent;
  permissions?: import('../../lib/permissions/types').PermissionFlags;
  day: number;
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
  onClick: () => void;
}) {
  const canEdit = permissions?.can_edit ?? true;
  const isReadOnly = !canEdit;

  return (
    <div
      className={`mb-1 px-1 py-0.5 text-[9px] md:text-[10px] rounded-md shadow-sm ${
        isReadOnly
          ? 'bg-purple-50 border-2 border-dashed border-purple-300 cursor-not-allowed'
          : 'bg-purple-100 border-2 border-purple-400 cursor-move hover:shadow-md hover:bg-purple-150'
      } ${isDragging ? 'opacity-50 scale-95' : 'transition-all duration-150'}`}
      onMouseDown={!isReadOnly ? onDragStart : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) {
          onClick();
        }
      }}
      title={isReadOnly ? 'Read-only access' : 'Drag to move, click to view'}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate flex-1">{event.title}</span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {isReadOnly ? (
            <div className="bg-orange-100 border border-orange-300 rounded px-1 py-0.5 flex items-center gap-0.5">
              <Lock size={8} className="text-orange-700" />
              <span className="text-[7px] font-semibold text-orange-700">RO</span>
            </div>
          ) : event.sourceType === 'context' ? (
            <div className="bg-blue-100 border border-blue-300 rounded px-1 py-0.5 flex items-center gap-0.5">
              <Share2 size={8} className="text-blue-700" />
              <span className="text-[7px] font-semibold text-blue-700">S</span>
            </div>
          ) : event.sourceType === 'guardrails' ? (
            <div className="bg-purple-100 border border-purple-300 rounded px-1 py-0.5">
              <span className="text-[7px] font-semibold text-purple-700">G</span>
            </div>
          ) : (
            <div className="bg-green-100 border border-green-300 rounded px-1 py-0.5">
              <span className="text-[7px] font-semibold text-green-700">P</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
