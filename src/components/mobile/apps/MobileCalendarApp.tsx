import { CalendarShell } from '../../calendarCore';
import { EventModalCompact } from '../../calendar/EventModalCompact';
import { useState } from 'react';
import type { MobileAppProps } from '../../../lib/mobileAppsRegistry';
import type { CalendarEventWithMembers } from '../../../lib/calendarTypes';

export function MobileCalendarApp({ householdId, widgetId, onClose }: MobileAppProps) {
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithMembers | undefined>(undefined);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(undefined);

  if (!householdId) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-gray-600 text-center">Please join a household to use the calendar.</p>
      </div>
    );
  }

  return (
    <>
      <CalendarShell
        context="spaces"
        scope={{ householdId }}
        ui={{
          showHeader: true,
          showViewSelector: true,
          defaultView: 'month',
          enableGestures: true,
        }}
        handlers={{
          onEventClick: (event) => {
            setSelectedEvent(event);
            setNewEventDate(undefined);
            setEventModalOpen(true);
          },
          onTimeSlotClick: (date, time) => {
            setNewEventDate(date);
            setSelectedEvent(undefined);
            setEventModalOpen(true);
          },
          onDayDoubleClick: (date) => {
            setNewEventDate(date);
            setSelectedEvent(undefined);
            setEventModalOpen(true);
          },
          onEventCreate: (date) => {
            setNewEventDate(date);
            setSelectedEvent(undefined);
            setEventModalOpen(true);
          },
        }}
        className="h-full"
      />

      {/* Event Modal */}
      {householdId && (
        <EventModalCompact
          householdId={householdId}
          isOpen={eventModalOpen}
          onClose={() => {
            setEventModalOpen(false);
            setSelectedEvent(undefined);
            setNewEventDate(undefined);
          }}
          onEventChange={() => {
            // CalendarShell will reload events automatically
          }}
          initialDate={newEventDate || new Date()}
          event={selectedEvent}
        />
      )}
    </>
  );
}
