/**
 * PlannerCalendar - Unified Calendar View for Planner
 * 
 * Uses CalendarShell from calendarCore - the single source of truth for calendar UI.
 * Planner composes CalendarShell, it does not re-implement calendar logic.
 * 
 * ❌ DO NOT add calendar rendering logic here
 * ✅ All calendar UI comes from calendarCore/CalendarShell
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlannerShell } from './PlannerShell';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveCalendarContext } from '../../contexts/ActiveCalendarContext';
import { contextToScope, getContextKey, getPermissionLabel } from '../../lib/personalSpaces/activeCalendarContext';
import { CalendarShell } from '../calendarCore';
import { PersonalEventModal } from '../personal-spaces/PersonalEventModal';
import type { PersonalCalendarEvent } from '../../lib/personalSpaces/calendarService';
import type { CalendarView, CalendarScope } from '../calendarCore/types';

export function PlannerCalendar() {
  const { user } = useAuth();
  const { activeContext, isReadOnly } = useActiveCalendarContext();
  const [searchParams] = useSearchParams();
  
  // Get view from URL query param, default to 'month'
  const viewParam = searchParams.get('view');
  const initialView: CalendarView = (viewParam === 'day' || viewParam === 'week' || viewParam === 'month' || viewParam === 'agenda') 
    ? viewParam 
    : 'month';
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PersonalCalendarEvent | null>(null);
  const [newEventDate, setNewEventDate] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousContextRef = useRef<string>('');

  // Close modals and cancel interactions when calendar context changes
  useEffect(() => {
    // Use centralized context key generation for change detection
    const contextKey = getContextKey(activeContext);

    // If context changed, close modals and reset state
    if (previousContextRef.current && previousContextRef.current !== contextKey) {
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      setNewEventDate(undefined);
      setIsTransitioning(true);
      
      // Brief transition to prevent flicker
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setRefreshKey(prev => prev + 1); // Force calendar refresh
      }, 150);

      return () => clearTimeout(timer);
    }

    previousContextRef.current = contextKey;
  }, [activeContext]);

  // Convert active calendar context to CalendarScope using centralized utility
  // @TEST Critical path: Wrong scope = wrong events loaded
  // For planner context, we always need userId (personal calendar events)
  // Household context should fallback to personal calendar
  const scope = useMemo((): CalendarScope => {
    if (!user) return { userId: '' };
    
    // For planner context, always use personal calendar (userId)
    // If activeContext is household, use the user's personal calendar instead
    if (activeContext.kind === 'household') {
      return { userId: user.id };
    }
    
    return contextToScope(activeContext, user.id);
  }, [activeContext, user]);

  const handleCreateEvent = (date?: Date) => {
    // Don't allow creating events in read-only mode
    if (isReadOnly) return;
    
    setSelectedEvent(null);
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      setNewEventDate(dateStr);
    } else {
      setNewEventDate(undefined);
    }
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: any) => {
    // Convert CalendarEvent to PersonalCalendarEvent for edit modal
    const personalEvent: PersonalCalendarEvent = {
      id: event.id,
      userId: event.user_id || event.created_by,
      title: event.title,
      description: event.description || null,
      startAt: event.start_at,
      endAt: event.end_at,
      allDay: event.all_day,
      event_type: event.event_type || 'event',
      sourceType: event.source_type || 'personal',
      sourceEntityId: event.source_entity_id || null,
      sourceProjectId: event.source_project_id || null,
      createdAt: event.created_at || new Date().toISOString(),
      updatedAt: event.updated_at || new Date().toISOString(),
      permissions: event.permissions,
    };
    setSelectedEvent(personalEvent);
    setNewEventDate(undefined);
    setIsEventModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
    setNewEventDate(undefined);
    // Trigger calendar refresh by updating a key or forcing re-render
    // The calendar will automatically refresh when events change
  };

  const handleEventSaved = () => {
    handleModalClose();
    // Force calendar refresh by updating key
    // Add a small delay to ensure the database transaction is committed
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
    }, 100);
  };

  if (!user) {
    return (
      <PlannerShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-600">Please sign in to view your calendar.</p>
        </div>
      </PlannerShell>
    );
  }

  // Get owner name for display in banner
  const getOwnerDisplayName = (): string | null => {
    if (activeContext.kind === 'shared') {
      return activeContext.ownerName;
    }
    return null;
  };

  return (
    <PlannerShell>
      <div className="flex flex-col h-full">
        {/* Visual Indicator Banner for Shared Calendar */}
        {/* Safe area padding for mobile (prevents overlap with notch/status bar) */}
        {activeContext.kind === 'shared' && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2 text-sm safe-top">
                <span className="text-blue-700 font-medium">
                  Viewing {getOwnerDisplayName()}
                </span>
                <span className="text-blue-600">•</span>
                <span className="text-blue-600">
                  {getPermissionLabel(activeContext) || 'Write access'}
                </span>
              </div>
        )}

        {/* Transition overlay during context switch */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="text-gray-600 text-sm">Switching calendar...</div>
          </div>
        )}

        <CalendarShell
          key={`${refreshKey}-${activeContext.kind}-${activeContext.kind === 'shared' ? activeContext.shareId : activeContext.kind === 'personal' ? activeContext.ownerUserId : activeContext.householdId}`}
          context="planner"
          scope={scope}
          ui={{
            showQuickActions: false,
            showHeader: true,
            showViewSelector: true,
            defaultView: initialView,
            enableGestures: true,
            readOnly: isReadOnly,
          }}
          handlers={{
            onEventClick: handleEventClick,
            // Only allow create handlers if not read-only
            // Guard: Double-check read-only state to prevent stale handlers
            onTimeSlotClick: isReadOnly ? undefined : (date) => {
              // Defensive check: verify we're still not read-only
              if (!isReadOnly) handleCreateEvent(date);
            },
            onDayDoubleClick: isReadOnly ? undefined : () => {
              if (!isReadOnly) handleCreateEvent();
            },
            onEventCreate: isReadOnly ? undefined : (date) => {
              if (!isReadOnly) handleCreateEvent(date);
            },
          }}
        />
      </div>

      {/* Event Create/Edit Modal */}
      {isEventModalOpen && (
        <PersonalEventModal
          userId={activeContext.kind === 'shared' ? activeContext.ownerUserId : user.id}
          event={selectedEvent}
          initialDate={newEventDate}
          onClose={handleModalClose}
          onSaved={handleEventSaved}
          readOnly={isReadOnly}
          viewerUserId={user.id}
        />
      )}
    </PlannerShell>
  );
}
