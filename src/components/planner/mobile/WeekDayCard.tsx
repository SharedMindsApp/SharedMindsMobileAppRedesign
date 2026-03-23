/**
 * WeekDayCard - Mobile day card for Weekly Planner
 * 
 * Shows date, event count, and expands to show event list.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { PersonalCalendarEvent } from '../../../lib/personalSpaces/calendarService';

export interface WeekDayCardProps {
  date: Date;
  events: PersonalCalendarEvent[];
  containers: PersonalCalendarEvent[];
  nested: PersonalCalendarEvent[];
  regular: PersonalCalendarEvent[];
  isToday: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onEventClick: (event: PersonalCalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number, minute: number) => void;
}

export function WeekDayCard({
  date,
  events,
  containers,
  nested,
  regular,
  isToday,
  isExpanded,
  onToggle,
  onEventClick,
  onTimeSlotClick,
}: WeekDayCardProps) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const eventCount = events.length;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getEventTimeRange = (event: PersonalCalendarEvent) => {
    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : start;
    
    if (event.allDay) {
      return 'All day';
    }
    
    const startTime = formatTime(start);
    const endTime = formatTime(end);
    
    if (start.toDateString() === end.toDateString()) {
      return `${startTime} - ${endTime}`;
    }
    
    return `${startTime} - ${endTime}`;
  };

  return (
    <div className={`bg-white rounded-xl border-2 shadow-sm transition-all ${
      isToday ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'
    }`}>
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <div className={`p-2 rounded-lg ${
            isToday ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Calendar size={20} className={isToday ? 'text-blue-600' : 'text-gray-600'} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-bold ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
                {dayName}
              </h3>
              {isToday && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Today
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{dayDate}</p>
          </div>
          <div className="flex items-center gap-2">
            {eventCount > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isToday ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'
              }`}>
                {eventCount} {eventCount === 1 ? 'event' : 'events'}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-3">
          {eventCount === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">No events scheduled</p>
              <button
                onClick={() => {
                  // Quick add at 9 AM
                  onTimeSlotClick(date, 9, 0);
                }}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Add Event
              </button>
            </div>
          ) : (
            <>
              {/* Container Events */}
              {containers.map((container) => {
                const permissions = container.permissions;
                const canView = permissions?.can_view ?? true;
                if (!canView) return null;

                return (
                  <button
                    key={container.id}
                    onClick={() => onEventClick(container)}
                    className="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            Container
                          </span>
                          {container.contextType && (
                            <span className="text-xs text-blue-600">{container.contextType}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 truncate">{container.title}</h4>
                        {container.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{container.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Regular & Nested Events */}
              {[...regular, ...nested]
                .sort((a, b) => {
                  const timeA = new Date(a.startAt).getTime();
                  const timeB = new Date(b.startAt).getTime();
                  return timeA - timeB;
                })
                .map((event) => {
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

                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isNested
                          ? 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isNested && (
                              <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                                Nested
                              </span>
                            )}
                            <span className="text-xs text-gray-600">
                              {getEventTimeRange(event)}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 truncate">{event.title}</h4>
                          {event.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

              {/* Quick Add Button */}
              <button
                onClick={() => {
                  // Quick add at 9 AM
                  onTimeSlotClick(date, 9, 0);
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar size={18} />
                Add Event
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}


