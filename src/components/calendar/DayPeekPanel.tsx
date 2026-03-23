/**
 * DayPeekPanel - Panel showing all events for a specific day
 * 
 * Opens when clicking "+more" or a day cell
 * Lists events grouped: Containers, All-day, Timed
 * Clicking opens EventDetailModal
 */

import { X } from 'lucide-react';
import { PersonalCalendarEvent } from '../../lib/personalSpaces/calendarService';
import { CalendarEventPill } from './CalendarEventPill';
import { EventDetailModal } from './EventDetailModal';
import { useState } from 'react';

export interface DayPeekPanelProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: PersonalCalendarEvent[];
  userId: string;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

export function DayPeekPanel({
  isOpen,
  onClose,
  date,
  events,
  userId,
  onEventUpdated,
  onEventDeleted,
}: DayPeekPanelProps) {
  const [selectedEvent, setSelectedEvent] = useState<PersonalCalendarEvent | null>(null);

  if (!isOpen) return null;

  // Group events by type
  const containers: PersonalCalendarEvent[] = [];
  const allDay: PersonalCalendarEvent[] = [];
  const timed: PersonalCalendarEvent[] = [];
  const nested: PersonalCalendarEvent[] = [];

  events.forEach(event => {
    if (event.event_scope === 'container') {
      containers.push(event);
    } else if (event.event_scope === 'item') {
      nested.push(event);
    } else if (event.allDay) {
      allDay.push(event);
    } else {
      timed.push(event);
    }
  });

  // Sort timed events by start time
  timed.sort((a, b) => {
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{dateStr}</h2>
            <p className="text-sm text-gray-600 mt-1">{events.length} event{events.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Container Events */}
          {containers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Containers
              </h3>
              <div className="space-y-2">
                {containers.map(event => (
                  <CalendarEventPill
                    key={event.id}
                    event={event}
                    variant="container"
                    permissions={event.permissions}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All-Day Events */}
          {allDay.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                All-Day
              </h3>
              <div className="space-y-2">
                {allDay.map(event => (
                  <CalendarEventPill
                    key={event.id}
                    event={event}
                    variant="allDay"
                    permissions={event.permissions}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Timed Events */}
          {timed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Timed Events
              </h3>
              <div className="space-y-2">
                {timed.map(event => (
                  <CalendarEventPill
                    key={event.id}
                    event={event}
                    variant="timed"
                    permissions={event.permissions}
                    onClick={() => setSelectedEvent(event)}
                    showTime={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Nested Events */}
          {nested.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Nested Items
              </h3>
              <div className="space-y-2">
                {nested.map(event => (
                  <CalendarEventPill
                    key={event.id}
                    event={event}
                    variant="nested"
                    permissions={event.permissions}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
              </div>
            </div>
          )}

          {events.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No events for this day</p>
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
          mode="month"
          userId={userId}
          onUpdated={() => {
            onEventUpdated?.();
            setSelectedEvent(null);
          }}
          onDeleted={() => {
            onEventDeleted?.();
            setSelectedEvent(null);
          }}
        />
      )}
    </>
  );
}

