/**
 * Planner Weekly V2 - Execution Mode Week View
 * 
 * High-end week view with:
 * - Time-based vertical grid
 * - Container + nested event support
 * - Drag & resize (permission-aware)
 * - Drag re-parenting
 * - Inline event interaction
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Lock, Share2, Edit2, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlannerShell } from './PlannerShell';
import { useAuth } from '../../contexts/AuthContext';
import {
  getWeekStartDate,
  getWeeklyPlannerEntry,
  upsertWeeklyPlannerEntry,
  type WeeklyPlannerEntry,
} from '../../lib/weeklyPlanner';
import {
  getPersonalEventsForDateRange,
  deletePersonalCalendarEvent,
  type PersonalCalendarEvent,
} from '../../lib/personalSpaces/calendarService';
// Phase 7A: Use offline-aware wrappers
import {
  createPersonalCalendarEvent,
  updatePersonalCalendarEvent,
} from '../../lib/personalSpaces/calendarServiceOffline';
import { showToast } from '../Toast';
import { updateContextEvent } from '../../lib/contextSovereign/contextEventsService';
import { enforceVisibility, assertCanEdit, PermissionError } from '../../lib/permissions/enforcement';
import type { PermissionFlags } from '../../lib/permissions/types';
import { EventDetailModal } from '../calendar/EventDetailModal';
import { FEATURE_CALENDAR_EXTRAS } from '../../lib/featureFlags';
import { subscribeActivityChanged } from '../../lib/activities/activityEvents';
import { QuickAddBottomSheet } from './mobile/QuickAddBottomSheet';
import { WeeklyPlannerMobile } from './mobile/WeeklyPlannerMobile';
import { IntentionsPanel } from './temporal/IntentionsPanel';
import { ReflectionsPanel } from './temporal/ReflectionsPanel';

interface DraggingState {
  eventId: string;
  startY: number;
  originalStart: Date;
  originalEnd: Date;
}

interface ResizingState {
  eventId: string;
  startY: number;
  originalStart: Date;
  originalEnd: Date;
  resizeEdge: 'top' | 'bottom';
}

export function PlannerWeekly() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Check for navigation state
    const state = window.history.state?.usr;
    if (state?.date) {
      return new Date(state.date);
    }
    return new Date();
  });
  // IMPORTANT: weekDays must be defined before any hooks/effects that reference it.
  // Otherwise React render can throw "Cannot access 'weekDays' before initialization".
  const weekDays = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    const monday = new Date(selectedDate);
    // Normalize time to avoid DST/timezone edge cases in comparisons
    monday.setHours(0, 0, 0, 0);
    monday.setDate(selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  }, [selectedDate]);
  const [entry, setEntry] = useState<WeeklyPlannerEntry | null>(null);
  const [events, setEvents] = useState<PersonalCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState('');
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [resizing, setResizing] = useState<ResizingState | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PersonalCalendarEvent | null>(null);
  const [quickAddSlot, setQuickAddSlot] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const gridRef = useRef<HTMLDivElement>(null);
  // Phase 7A: Mobile detection and disclaimer
  const [isMobile, setIsMobile] = useState(false);
  // Phase 10A: Swipe navigation state
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showMobileDisclaimer, setShowMobileDisclaimer] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissed = sessionStorage.getItem('planner_weekly_mobile_disclaimer_dismissed');
    return !dismissed && window.innerWidth < 768;
  });
  // Mobile: Expanded days state (today expanded by default)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    const today = new Date().toDateString();
    return new Set([today]);
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user) {
      loadWeeklyData();
    }
  }, [user, selectedDate]);

  // Reset expanded days when week changes (keep today expanded if in current week)
  useEffect(() => {
    const today = new Date().toDateString();
    const weekHasToday = weekDays.some(day => day.toDateString() === today);
    if (weekHasToday) {
      setExpandedDays(new Set([today]));
    } else {
      setExpandedDays(new Set());
    }
  }, [weekDays]);

  // Subscribe to activity changes for live sync
  useEffect(() => {
    if (!user || !FEATURE_CALENDAR_EXTRAS) return;

    const unsubscribe = subscribeActivityChanged(() => {
      // Refresh calendar when activities change
      loadWeeklyData();
    });

    return unsubscribe;
  }, [user, selectedDate]);

  // Update current time every minute for the time indicator
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime(); // Initial update
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadWeeklyData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const weekStart = getWeekStartDate(selectedDate);
      const weekEntry = await getWeeklyPlannerEntry(user.id, weekStart);
      setEntry(weekEntry);

      // Load personal calendar events for the week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = weekEnd.toISOString().split('T')[0];

      const personalEvents = await getPersonalEventsForDateRange(user.id, startDate, endDate);

      // Apply permission filtering
      const visibleEvents = personalEvents
        .map(event => enforceVisibility(event, event.permissions))
        .filter((e): e is PersonalCalendarEvent => e !== null);

      setEvents(visibleEvents);
    } catch (err) {
      console.error('Error loading weekly data:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = useCallback(
    async (notes: string) => {
      if (!user) return;

      try {
        const weekStart = getWeekStartDate(selectedDate);
        const updated = await upsertWeeklyPlannerEntry(user.id, weekStart, { notes });
        setEntry(updated);
      } catch (err) {
        console.error('Error saving notes:', err);
      }
    },
    [user, selectedDate]
  );

  const addGoal = async () => {
    if (!user || !newGoal.trim()) return;

    try {
      const weekStart = getWeekStartDate(selectedDate);
      const currentGoals = entry?.goals || [];
      const updated = await upsertWeeklyPlannerEntry(user.id, weekStart, {
        goals: [...currentGoals, newGoal],
      });
      setEntry(updated);
      setNewGoal('');
    } catch (err) {
      console.error('Error adding goal:', err);
    }
  };

  const toggleGoal = async (index: number) => {
    if (!user || !entry) return;

    try {
      const goals = [...(entry.goals || [])];
      const goal = goals[index];
      const isCompleted = goal.startsWith('✓ ');

      if (isCompleted) {
        goals[index] = goal.substring(2);
      } else {
        goals[index] = `✓ ${goal}`;
      }

      const weekStart = getWeekStartDate(selectedDate);
      const updated = await upsertWeeklyPlannerEntry(user.id, weekStart, { goals });
      setEntry(updated);
    } catch (err) {
      console.error('Error toggling goal:', err);
    }
  };

  const removeGoal = async (index: number) => {
    if (!user || !entry) return;

    try {
      const goals = [...(entry.goals || [])];
      goals.splice(index, 1);

      const weekStart = getWeekStartDate(selectedDate);
      const updated = await upsertWeeklyPlannerEntry(user.id, weekStart, { goals });
      setEntry(updated);
    } catch (err) {
      console.error('Error removing goal:', err);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
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
        // Swipe right = previous week
        navigateWeek('prev');
      } else {
        // Swipe left = next week
        navigateWeek('next');
      }
    }
  };
  const weekStart = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEnd = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  // Check if current week is being displayed
  const today = new Date();
  const isCurrentWeek = weekDays.some(day => day.toDateString() === today.toDateString());

  // Calculate current time indicator position
  const getCurrentTimePosition = useCallback(() => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    // Each time slot is 64px (h-16), starting from 6 AM
    const startHour = 6;
    if (hour < startHour) return null;
    const hoursFromStart = hour - startHour;
    const minutesFraction = minute / 60;
    const position = (hoursFromStart + minutesFraction) * 64; // 64px per hour
    return position;
  }, [currentTime]);

  // Time slots: 6 AM to 11 PM (30-minute intervals for display, but drag snaps to 15-min)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour < 24; hour++) {
      slots.push({ hour, minute: 0 });
      if (hour < 23) {
        slots.push({ hour, minute: 30 });
      }
    }
    return slots;
  }, []);

  // Group events by type
  const { containerEvents, nestedEvents, regularEvents } = useMemo(() => {
    const containers: PersonalCalendarEvent[] = [];
    const nested: PersonalCalendarEvent[] = [];
    const regular: PersonalCalendarEvent[] = [];

    for (const event of events) {
      if (event.event_scope === 'container') {
        containers.push(event);
      } else if (event.event_scope === 'item') {
        nested.push(event);
      } else {
        regular.push(event);
      }
    }

    return { containerEvents: containers, nestedEvents: nested, regularEvents: regular };
  }, [events]);

  // Get events for a specific day
  const getDayEvents = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dateTime = new Date(dateStr).getTime();
    const nextDayTime = dateTime + 24 * 60 * 60 * 1000;

    const containers: PersonalCalendarEvent[] = [];
    const nested: PersonalCalendarEvent[] = [];
    const regular: PersonalCalendarEvent[] = [];

    // Container events (multi-day spans)
    for (const container of containerEvents) {
      const startTime = new Date(container.startAt).getTime();
      const endTime = container.endAt ? new Date(container.endAt).getTime() : startTime;
      
      if (dateTime >= startTime && dateTime <= endTime) {
        containers.push(container);
      }
    }

    // Nested events
    for (const nestedEvent of nestedEvents) {
      const eventDate = new Date(nestedEvent.startAt).toISOString().split('T')[0];
      if (eventDate === dateStr) {
        nested.push(nestedEvent);
      }
    }

    // Regular events
    for (const event of regularEvents) {
      const eventDate = new Date(event.startAt).toISOString().split('T')[0];
      if (eventDate === dateStr) {
        regular.push(event);
      }
    }

    return { containers, nested, regular };
  }, [containerEvents, nestedEvents, regularEvents]);

  // Calculate event position and height
  const getEventPosition = (event: PersonalCalendarEvent) => {
    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
    
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    
    // Position from 6 AM (360 minutes)
    const topMinutes = Math.max(0, startMinutes - 360);
    const durationMinutes = endMinutes - startMinutes;
    
    // Each 30-minute slot is 60px
    const top = (topMinutes / 30) * 60;
    const height = Math.max(30, (durationMinutes / 30) * 60);
    
    return { top, height, start, end };
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, event: PersonalCalendarEvent) => {
    const permissions = event.permissions;
    if (!permissions?.can_edit) {
      e.preventDefault();
      return;
    }

    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
    
    setDragging({
      eventId: event.id,
      startY: e.clientY,
      originalStart: start,
      originalEnd: end,
    });
  };

  // Handle drag with 15-minute snapping and ghost preview
  const handleDrag = useCallback((e: MouseEvent) => {
    if (!dragging || !gridRef.current) return;

    const gridRect = gridRef.current.getBoundingClientRect();
    const relativeY = e.clientY - gridRect.top;
    
    // Calculate new time (snap to 15-minute intervals for precision)
    const quarterHourHeight = 30; // 15 minutes = 30px (half of 30-min slot)
    const quarterHourIndex = Math.round(relativeY / quarterHourHeight);
    const newMinutes = 360 + (quarterHourIndex * 15); // Start from 6 AM, snap to 15-min
    const newHours = Math.floor(newMinutes / 60);
    const newMins = newMinutes % 60;

    const duration = dragging.originalEnd.getTime() - dragging.originalStart.getTime();
    const newStart = new Date(dragging.originalStart);
    newStart.setHours(newHours, newMins, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    // Update event position visually (optimistic update with ghost effect)
    setEvents(prev => prev.map(ev => {
      if (ev.id === dragging.eventId) {
        return { ...ev, startAt: newStart.toISOString(), endAt: newEnd.toISOString() };
      }
      return ev;
    }));
  }, [dragging]);

  // Handle drag end
  const handleDragEnd = useCallback(async () => {
    if (!dragging || !user) {
      setDragging(null);
      return;
    }

    const event = events.find(e => e.id === dragging.eventId);
    if (!event) {
      setDragging(null);
      return;
    }

    try {
      // Check permissions
      assertCanEdit(event.permissions, 'event');

      // Update event
      if (event.sourceType === 'context' && event.sourceEntityId) {
        // Update context event
        const result = await updateContextEvent(event.sourceEntityId, {
          start_at: event.startAt,
          end_at: event.endAt || undefined,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        // Update personal event
        await updatePersonalCalendarEvent(user.id, event.id, {
          startAt: event.startAt,
          endAt: event.endAt || undefined,
        });
      }

      await loadWeeklyData();
    } catch (err) {
      console.error('Error updating event:', err);
      // Phase 7A: Replace alert with toast
      if (err instanceof PermissionError) {
        showToast('warning', 'You don\'t have permission to edit this event');
      } else {
        showToast('error', 'Couldn\'t update event. It will retry when you\'re online.');
      }
      await loadWeeklyData(); // Reload to revert optimistic update
    } finally {
      setDragging(null);
    }
  }, [dragging, events, user]);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, event: PersonalCalendarEvent, edge: 'top' | 'bottom') => {
    e.stopPropagation();
    
    // Phase 7A: Disable resize on mobile
    if (isMobile) {
      showToast('info', 'Drag and resize work best on desktop');
      e.preventDefault();
      return;
    }
    
    const permissions = event.permissions;
    if (!permissions?.can_edit) {
      e.preventDefault();
      return;
    }

    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
    
    setResizing({
      eventId: event.id,
      startY: e.clientY,
      originalStart: start,
      originalEnd: end,
      resizeEdge: edge,
    });
  };

  // Handle resize
  const handleResize = useCallback((e: MouseEvent) => {
    if (!resizing || !gridRef.current) return;

    const gridRect = gridRef.current.getBoundingClientRect();
    const relativeY = e.clientY - gridRect.top;
    
    // Snap to 15-minute intervals for precision
    const quarterHourHeight = 30; // 15 minutes = 30px
    const quarterHourIndex = Math.round(relativeY / quarterHourHeight);
    const newMinutes = 360 + (quarterHourIndex * 15); // Start from 6 AM, snap to 15-min
    const newHours = Math.floor(newMinutes / 60);
    const newMins = newMinutes % 60;

    setEvents(prev => prev.map(ev => {
      if (ev.id === resizing.eventId) {
        const newTime = new Date(resizing.originalStart);
        newTime.setHours(newHours, newMins, 0, 0);

        if (resizing.resizeEdge === 'top') {
          const duration = resizing.originalEnd.getTime() - resizing.originalStart.getTime();
          return {
            ...ev,
            startAt: newTime.toISOString(),
            endAt: new Date(newTime.getTime() + duration).toISOString(),
          };
        } else {
          return {
            ...ev,
            endAt: newTime.toISOString(),
          };
        }
      }
      return ev;
    }));
  }, [resizing]);

  // Handle resize end
  const handleResizeEnd = useCallback(async () => {
    if (!resizing || !user) {
      setResizing(null);
      return;
    }

    const event = events.find(e => e.id === resizing.eventId);
    if (!event) {
      setResizing(null);
      return;
    }

    try {
      assertCanEdit(event.permissions, 'event');

      if (event.sourceType === 'context' && event.sourceEntityId) {
        const result = await updateContextEvent(event.sourceEntityId, {
          start_at: event.startAt,
          end_at: event.endAt || undefined,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        await updatePersonalCalendarEvent(user.id, event.id, {
          startAt: event.startAt,
          endAt: event.endAt || undefined,
        });
      }

      await loadWeeklyData();
    } catch (err) {
      console.error('Error resizing event:', err);
      if (err instanceof PermissionError) {
        alert('You do not have permission to edit this event');
      }
      await loadWeeklyData();
    } finally {
      setResizing(null);
    }
  }, [resizing, events, user]);

  // Mouse event handlers
  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragging, handleDrag, handleDragEnd]);

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing, handleResize, handleResizeEnd]);

  // Handle time slot click
  const handleTimeSlotClick = (date: Date, hour: number, minute: number) => {
    if (isMobile) {
      // Mobile: Open BottomSheet
      setQuickAddSlot({ date, hour, minute });
    } else {
      // Desktop: Inline input
      setQuickAddSlot({ date, hour, minute });
      setQuickAddTitle('');
    }
  };

  // Handle quick add submit
  const handleQuickAddSubmit = async () => {
    if (!user || !quickAddSlot || !quickAddTitle.trim()) return;

    try {
      const startAt = new Date(quickAddSlot.date);
      startAt.setHours(quickAddSlot.hour, quickAddSlot.minute, 0, 0);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // 1 hour default

      await createPersonalCalendarEvent(user.id, {
        title: quickAddTitle,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay: false,
        event_type: 'event', // Default to 'event', can be changed when editing
      });

      // Phase 7A: Show success feedback
      const isOnline = navigator.onLine;
      if (isOnline) {
        showToast('success', 'Event added');
      } else {
        showToast('info', 'Saved — will sync when online');
      }

      setQuickAddSlot(null);
      setQuickAddTitle('');
      await loadWeeklyData();
    } catch (err) {
      console.error('Error adding event:', err);
      // Phase 7A: Show error feedback
      showToast('error', 'Couldn\'t add event. It will retry when you\'re online.');
    }
  };

  // Handle event click
  const handleEventClick = (event: PersonalCalendarEvent) => {
    setSelectedEvent(event);
  };

  // Handle delete event
  const handleDeleteEvent = async (event: PersonalCalendarEvent) => {
    if (!user) return;

    try {
      assertCanEdit(event.permissions, 'event');

      if (event.sourceType === 'context' && event.sourceEntityId) {
        // TODO: Delete context event
        console.log('Deleting context event not yet implemented');
      } else {
        await deletePersonalCalendarEvent(user.id, event.id);
      }

      setSelectedEvent(null);
      await loadWeeklyData();
    } catch (err) {
      console.error('Error deleting event:', err);
      // Phase 7A: Replace alert with toast
      if (err instanceof PermissionError) {
        showToast('warning', 'You don\'t have permission to delete this event');
      } else {
        showToast('error', 'Couldn\'t delete event. Please try again.');
      }
    }
  };

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

  // Mobile-first layout
  if (isMobile) {
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
                    sessionStorage.setItem('planner_weekly_mobile_disclaimer_dismissed', 'true');
                  }}
                  className="text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0 ml-2"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <WeeklyPlannerMobile
            weekStart={weekStart}
            weekEnd={weekEnd}
            weekDays={weekDays}
            selectedDate={selectedDate}
            entry={entry}
            newGoal={newGoal}
            getDayEvents={getDayEvents}
            onNavigateWeek={navigateWeek}
            onGoToToday={() => {
              const today = new Date();
              setSelectedDate(today);
            }}
            onDayClick={(date) => {
              // Navigate to daily view for the selected day
              navigate('/planner/daily', { state: { date: date.toISOString() } });
            }}
            onEventClick={setSelectedEvent}
            onTimeSlotClick={(date, hour, minute) => {
              setQuickAddSlot({ date, hour, minute });
            }}
            onNotesChange={saveNotes}
            onGoalChange={setNewGoal}
            onAddGoal={addGoal}
            onToggleGoal={toggleGoal}
            onRemoveGoal={removeGoal}
          />

          {/* Mobile: Quick Add BottomSheet */}
          {quickAddSlot && user && (
            <QuickAddBottomSheet
              isOpen={!!quickAddSlot}
              onClose={() => {
                setQuickAddSlot(null);
                setQuickAddTitle('');
              }}
              onEventCreated={loadWeeklyData}
              userId={user.id}
              date={quickAddSlot.date}
              hour={quickAddSlot.hour}
              minute={quickAddSlot.minute}
            />
          )}

          {/* Event Detail Modal */}
          {selectedEvent && user && (
            <EventDetailModal
              isOpen={!!selectedEvent}
              onClose={() => setSelectedEvent(null)}
              event={selectedEvent}
              mode="week"
              userId={user.id}
              onUpdated={() => {
                loadWeeklyData();
                setSelectedEvent(null);
              }}
              onDeleted={() => {
                loadWeeklyData();
                setSelectedEvent(null);
              }}
            />
          )}

          {/* Reflections Panel - Bottom (Mobile) */}
          {user && (
            <div className="px-4 pb-4 pt-2">
              <ReflectionsPanel 
                userId={user.id} 
                scope="week" 
                scopeDate={weekDays[0]} 
              />
            </div>
          )}
        </div>
      </PlannerShell>
    );
  }

  // Desktop layout (unchanged)
  return (
    <PlannerShell>
      <div 
        className="max-w-full"
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
          <IntentionsPanel 
            userId={user.id} 
            scope="week" 
            scopeDate={weekDays[0]} 
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <button onClick={() => navigateWeek('prev')} className="p-1 md:p-2 hover:bg-gray-100 rounded">
            <ChevronLeft size={20} className="md:w-6 md:h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Weekly Planner</h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1">{weekStart} - {weekEnd}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Today button - always visible, disabled when already on current week */}
            <button
              onClick={() => {
                if (!isCurrentWeek) {
                  const today = new Date();
                  setSelectedDate(today);
                }
              }}
              disabled={isCurrentWeek}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                isCurrentWeek
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Today
            </button>
            <button onClick={() => navigateWeek('next')} className="p-1 md:p-2 hover:bg-gray-100 rounded">
              <ChevronRight size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* Desktop: Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 lg:gap-6">
          {/* Left Column - Notes & Goals */}
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 md:p-4 min-h-[200px] md:min-h-[300px]">
              <h2 className="text-xs md:text-sm font-bold text-gray-700 mb-2 md:mb-3">Weekly Notes</h2>
              <textarea
                value={entry?.notes || ''}
                onChange={(e) => saveNotes(e.target.value)}
                placeholder="Add your weekly notes here..."
                className="w-full h-[calc(100%-2rem)] px-2 py-2 text-xs border border-purple-300 rounded bg-white resize-none"
              />
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 md:p-4 min-h-[150px]">
              <h2 className="text-xs md:text-sm font-bold text-gray-700 mb-2 md:mb-3">Weekly Goals</h2>
              <div className="space-y-2 mb-3">
                {(entry?.goals || []).map((goal, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <button
                      onClick={() => toggleGoal(index)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {goal.startsWith('✓ ') ? (
                        <CheckCircle2 size={14} className="text-blue-600" />
                      ) : (
                        <Circle size={14} className="text-gray-400" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-xs ${
                        goal.startsWith('✓ ') ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {goal.startsWith('✓ ') ? goal.substring(2) : goal}
                    </span>
                    <button
                      onClick={() => removeGoal(index)}
                      className="flex-shrink-0 text-gray-400 hover:text-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                  placeholder="Add a goal..."
                  className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded"
                  // Phase 4A: Auto-focus for faster entry on mobile
                  autoFocus={typeof window !== 'undefined' && window.innerWidth < 1024}
                />
                <button
                  onClick={addGoal}
                  className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Week Grid */}
          {/* Phase 2C: Ensure horizontal scroll works smoothly on mobile */}
          <div className="lg:col-span-10 overflow-x-auto overscroll-contain">
            <div className="bg-white rounded-lg border-2 border-gray-300" ref={gridRef}>
              {/* Premium Day Headers */}
              <div className="flex border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white sticky top-0 z-20 shadow-sm">
                <div className="w-16 flex-shrink-0 border-r border-gray-200"></div>
                {weekDays.map((day, idx) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayEvents = getDayEvents(day);
                  const eventCount = (dayEvents.containers.length + dayEvents.nested.length + dayEvents.regular.length);
                  
                  return (
                    <div
                      key={idx}
                      className={`flex-1 py-4 text-center border-r border-gray-200 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                        isToday ? 'bg-blue-50/30' : ''
                      }`}
                      onClick={() => navigate('/planner/daily', { state: { date: day.toISOString() } })}
                    >
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div
                        className={`text-xl font-semibold mt-1 ${
                          isToday
                            ? 'bg-blue-600 text-white w-9 h-9 rounded-full inline-flex items-center justify-center shadow-md'
                            : 'text-gray-900'
                        }`}
                      >
                        {day.getDate()}
                      </div>
                      {eventCount > 0 && (
                        <div className="text-[10px] text-gray-500 mt-1">
                          {eventCount} {eventCount === 1 ? 'event' : 'events'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* All-Day Row */}
              <div className="flex border-b border-gray-200 bg-white">
                <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center">
                  <span className="text-[10px] text-gray-500 font-medium vertical-text transform -rotate-0">All Day</span>
                </div>
                {weekDays.map((day, idx) => {
                  const dayEvents = getDayEvents(day);
                  // Get all-day events (events without specific time or spanning full days)
                  const allDayEvents = [...dayEvents.containers, ...dayEvents.regular].filter(e => {
                    const start = new Date(e.startAt);
                    const end = e.endAt ? new Date(e.endAt) : start;
                    const duration = end.getTime() - start.getTime();
                    // Consider as all-day if duration is >= 24 hours or if time is 00:00
                    return duration >= 24 * 60 * 60 * 1000 || (start.getHours() === 0 && start.getMinutes() === 0);
                  });
                  
                  return (
                    <div key={idx} className="flex-1 border-r border-gray-200 p-2 min-h-[60px] hover:bg-gray-50/30 transition-colors">
                      <div className="space-y-1">
                        {allDayEvents.slice(0, 2).map((event) => (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="w-full px-2 py-1 text-xs font-medium rounded-md text-left truncate transition-all hover:shadow-sm"
                            style={{
                              backgroundColor: event.event_scope === 'container' ? '#dbeafe' : '#e0e7ff',
                              border: `1px solid ${event.event_scope === 'container' ? '#93c5fd' : '#a5b4fc'}`,
                            }}
                          >
                            {event.title}
                          </button>
                        ))}
                        {allDayEvents.length > 2 && (
                          <button className="w-full px-2 py-1 text-[10px] text-blue-600 hover:text-blue-800 text-left font-medium">
                            +{allDayEvents.length - 2} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time Grid */}
              <div className="flex overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                {/* Time Column */}
                <div className="w-16 flex-shrink-0 border-r-2 border-gray-300 bg-gray-50 sticky left-0 z-10">
                  {timeSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="h-16 border-b border-gray-200 text-xs text-gray-500 text-right pr-2 pt-1"
                    >
                      {slot.minute === 0 &&
                        (slot.hour === 0
                          ? '12 AM'
                          : slot.hour < 12
                          ? `${slot.hour} AM`
                          : slot.hour === 12
                          ? '12 PM'
                          : `${slot.hour - 12} PM`)}
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDays.map((date, dayIdx) => {
                  const { containers, nested, regular } = getDayEvents(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const currentTimeTop = getCurrentTimePosition();
                  const showTimeIndicator = isToday && currentTimeTop !== null;

                  return (
                    <div
                      key={dayIdx}
                      className="flex-1 relative border-r border-gray-300"
                    >
                      {/* Current Time Indicator */}
                      {showTimeIndicator && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{ top: `${currentTimeTop}px` }}
                        >
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full -ml-1 shadow-sm"></div>
                            <div className="flex-1 h-0.5 bg-red-500 shadow-sm"></div>
                          </div>
                        </div>
                      )}
                      {/* Time Slots */}
                      {timeSlots.map((slot, slotIdx) => {
                        const isQuickAdd =
                          quickAddSlot &&
                          quickAddSlot.date.toDateString() === date.toDateString() &&
                          quickAddSlot.hour === slot.hour &&
                          quickAddSlot.minute === slot.minute;

                        return (
                          <div
                            key={slotIdx}
                            className={`h-16 border-b border-gray-200 hover:bg-blue-50/30 cursor-pointer transition-colors relative ${
                              isToday ? 'bg-blue-50/10' : ''
                            }`}
                            onClick={() => handleTimeSlotClick(date, slot.hour, slot.minute)}
                          >
                            {/* Desktop: Inline input */}
                            {isQuickAdd && !isMobile && (
                              <div
                                className="absolute inset-x-1 top-0 z-30"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={quickAddTitle}
                                  onChange={(e) => setQuickAddTitle(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleQuickAddSubmit()}
                                  onBlur={() => setQuickAddSlot(null)}
                                  placeholder="Event title..."
                                  className="w-full px-2 py-1 text-xs border border-blue-400 rounded bg-white shadow-lg"
                                  autoFocus
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Container Events (Background Bands) */}
                      {containers.map((container) => {
                        const permissions = container.permissions;
                        const canView = permissions?.can_view ?? true;
                        if (!canView) return null;

                        return (
                          <ContainerBand
                            key={container.id}
                            container={container}
                            date={date}
                          />
                        );
                      })}

                      {/* Nested and Regular Events (Time-Positioned) */}
                      {[...nested, ...regular].map((event) => {
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

                        const { top, height } = getEventPosition(event);
                        const isDragging = dragging?.eventId === event.id;
                        const isResizing = resizing?.eventId === event.id;

                        return (
                          <EventBlock
                            key={event.id}
                            event={event}
                            top={top}
                            height={height}
                            isDragging={isDragging}
                            isResizing={isResizing}
                            onDragStart={(e) => handleDragStart(e, event)}
                            onResizeStart={(e, edge) => handleResizeStart(e, event, edge)}
                            onClick={() => handleEventClick(event)}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Shared Event Detail Modal */}
        {selectedEvent && user && (
          <EventDetailModal
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            event={selectedEvent}
            mode="week"
            userId={user.id}
            onUpdated={() => {
              loadWeeklyData();
              setSelectedEvent(null);
            }}
            onDeleted={() => {
              loadWeeklyData();
              setSelectedEvent(null);
            }}
          />
        )}

        {/* Reflections Panel - Bottom */}
        {user && (
          <ReflectionsPanel 
            userId={user.id} 
            scope="week" 
            scopeDate={weekDays[0]} 
          />
        )}
      </div>
    </PlannerShell>
  );
}

// Container Band Component (Background)
function ContainerBand({
  container,
  date,
}: {
  container: PersonalCalendarEvent;
  date: Date;
}) {
  const start = new Date(container.startAt);
  const end = container.endAt ? new Date(container.endAt) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setHours(23, 59, 59, 999);

  // Check if container spans this day
  if (start > dateEnd || end < dateStart) {
    return null;
  }

  const permissions = container.permissions;
  const isReadOnly = !(permissions?.can_edit ?? true);

  return (
    <div
      className={`absolute left-0 right-0 top-0 bottom-0 pointer-events-none ${
        isReadOnly
          ? 'bg-gradient-to-b from-blue-50/40 to-blue-100/40 border-l-4 border-dashed border-blue-300'
          : 'bg-gradient-to-b from-blue-100/40 to-blue-200/40 border-l-4 border-blue-400'
      }`}
      style={{ zIndex: 1 }}
    >
      <div className="absolute top-1 left-2 right-2 flex items-center gap-1">
        <span className="text-[10px] font-medium text-blue-900 truncate">{container.title}</span>
        {container.contextType && (
          <span className="px-1 py-0.5 bg-white/60 rounded text-[8px] font-medium">
            {container.contextType}
          </span>
        )}
        {isReadOnly && <Lock size={8} className="text-blue-600" />}
        {container.sourceType === 'context' && <Share2 size={8} className="text-blue-600" />}
      </div>
    </div>
  );
}

// Event Block Component (Time-Positioned)
function EventBlock({
  event,
  top,
  height,
  isDragging,
  isResizing,
  onDragStart,
  onResizeStart,
  onClick,
}: {
  event: PersonalCalendarEvent;
  top: number;
  height: number;
  isDragging: boolean;
  isResizing: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent, edge: 'top' | 'bottom') => void;
  onClick: () => void;
}) {
  const permissions = event.permissions;
  const canEdit = permissions?.can_edit ?? true;
  const isReadOnly = !canEdit;
  const isNested = event.event_scope === 'item';

  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div
      className={`absolute left-1 right-1 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
        isNested
          ? isReadOnly
            ? 'bg-gray-50 border border-dashed border-gray-300'
            : 'bg-gray-100 border border-gray-400'
          : isReadOnly
          ? 'bg-purple-50 border border-dashed border-purple-300'
          : 'bg-purple-100 border border-purple-400'
      } ${isDragging || isResizing ? 'opacity-50' : ''}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        zIndex: isNested ? 5 : 10,
      }}
      onMouseDown={canEdit ? onDragStart : undefined}
      onClick={onClick}
      title={isReadOnly ? 'Read-only access' : undefined}
    >
      <div className="p-1.5 text-xs h-full flex flex-col">
        <div className="flex items-center justify-between gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {isNested && <span className="text-gray-500">└</span>}
            <span className="font-semibold truncate">{event.title}</span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {isReadOnly && <Lock size={10} className="text-gray-500" />}
            {event.sourceType === 'context' && <Share2 size={10} className="text-gray-500" />}
          </div>
        </div>
        <div className="text-[10px] opacity-75 mt-0.5">{timeStr}</div>
      </div>

      {/* Resize Handles */}
      {canEdit && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-200/50"
            onMouseDown={(e) => onResizeStart(e, 'top')}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-200/50"
            onMouseDown={(e) => onResizeStart(e, 'bottom')}
          />
        </>
      )}
    </div>
  );
}
