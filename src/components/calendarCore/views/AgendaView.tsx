import { MapPin, Users, Clock } from 'lucide-react';
import { CalendarEventWithMembers } from '../../../lib/calendarTypes';
import { formatEventTime, getEventColorDot, isSameDay } from '../../../lib/calendarUtils';

interface AgendaViewProps {
  events: CalendarEventWithMembers[];
  onEventClick: (event: CalendarEventWithMembers) => void;
}

export function AgendaView({ events, onEventClick }: AgendaViewProps) {
  const groupEventsByDate = (events: CalendarEventWithMembers[]) => {
    const grouped = new Map<string, CalendarEventWithMembers[]>();

    events.forEach(event => {
      const date = new Date(event.start_at);
      const dateKey = date.toDateString();

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }

      grouped.get(dateKey)!.push(event);
    });

    const sorted = Array.from(grouped.entries()).sort((a, b) => {
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    });

    return sorted;
  };

  const groupedEvents = groupEventsByDate(events);

  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No upcoming events</p>
          <p className="text-gray-400 text-sm mt-2">Create your first event to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-y-auto h-full">
        {groupedEvents.map(([dateKey, dayEvents]) => {
          const date = new Date(dateKey);
          const isToday = isSameDay(date, new Date());

          return (
            <div key={dateKey} className="border-b border-gray-200 last:border-b-0">
              <div className={`sticky top-0 px-6 py-3 border-b border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-gray-50'} z-10`}>
                <div className="flex items-center gap-3">
                  <div className={`text-center ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    <div className="text-xs font-medium uppercase">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-2xl font-bold ${isToday ? 'bg-blue-600 text-white w-10 h-10 rounded-full inline-flex items-center justify-center' : ''}`}>
                      {date.getDate()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {dayEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-1 h-full min-h-16 rounded-full ${getEventColorDot(event.color)}`}></div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
                            <Clock size={14} />
                            {formatEventTime(event)}
                          </div>
                        </div>

                        {event.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin size={14} />
                              <span className="truncate max-w-xs">{event.location}</span>
                            </div>
                          )}

                          {event.member_profiles && event.member_profiles.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users size={14} />
                              <span>
                                {event.member_profiles.length}{' '}
                                {event.member_profiles.length === 1 ? 'member' : 'members'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
