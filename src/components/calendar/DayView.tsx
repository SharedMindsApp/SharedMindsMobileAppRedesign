import { CalendarEventWithMembers } from '../../lib/calendarTypes';
import {
  getDayEvents,
  formatTime,
  getEventColor,
  isToday
} from '../../lib/calendarUtils';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEventWithMembers[];
  onEventClick: (event: CalendarEventWithMembers) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
}

export function DayView({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick
}: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = getDayEvents(events, currentDate);
  const isTodayDate = isToday(currentDate);

  const handleTimeSlotClick = (hour: number) => {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    onTimeSlotClick(currentDate, timeString);
  };

  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="w-16 flex-shrink-0"></div>

        <div className={`flex-1 py-4 text-center ${isTodayDate ? 'bg-blue-50' : ''}`}>
          <div className="text-sm font-medium text-gray-600">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div
            className={`text-2xl font-bold ${
              isTodayDate
                ? 'bg-blue-600 text-white w-10 h-10 rounded-full inline-flex items-center justify-center'
                : 'text-gray-900'
            }`}
          >
            {currentDate.getDate()}
          </div>
          <div className="text-sm text-gray-600">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          <div className="w-16 flex-shrink-0 border-r border-gray-200">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-20 border-b border-gray-200 text-xs text-gray-500 text-right pr-2 pt-1"
              >
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          <div className="flex-1 relative border-l border-gray-200">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-20 border-b border-gray-200 hover:bg-blue-50/30 cursor-pointer transition-colors"
                onClick={() => handleTimeSlotClick(hour)}
              ></div>
            ))}

            {dayEvents.map(({ event, startMinutes, endMinutes }) => {
              const top = (startMinutes / 60) * 80;
              const height = Math.max(((endMinutes - startMinutes) / 60) * 80, 40);
              const start = new Date(event.start_at);
              const end = new Date(event.end_at);

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`absolute left-2 right-2 border-l-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow overflow-hidden ${getEventColor(
                    event.color
                  )}`}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    zIndex: 10
                  }}
                >
                  <div className="p-3">
                    <div className="font-bold text-sm mb-1">{event.title}</div>
                    {!event.all_day && (
                      <div className="text-xs opacity-80 mb-1">
                        {formatTime(start)} - {formatTime(end)}
                      </div>
                    )}
                    {event.location && (
                      <div className="text-xs opacity-80 truncate">
                        {event.location}
                      </div>
                    )}
                    {event.description && height > 100 && (
                      <div className="text-xs opacity-70 mt-2 line-clamp-2">
                        {event.description}
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
