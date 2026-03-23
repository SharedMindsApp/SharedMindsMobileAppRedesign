import { CalendarEventWithMembers } from '../../lib/calendarTypes';
import { getMonthDays, isSameDay, isToday, getEventsForDay, getEventColorDot } from '../../lib/calendarUtils';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEventWithMembers[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEventWithMembers) => void;
  onDayDoubleClick: (date: Date) => void;
}

export function MonthView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
  onDayDoubleClick
}: MonthViewProps) {
  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDayClick = (date: Date) => {
    onDayClick(date);
  };

  const handleDayDoubleClick = (date: Date) => {
    onDayDoubleClick(date);
  };

  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekDays.map(day => (
          <div
            key={day}
            className="py-3 text-center text-sm font-semibold text-gray-700"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((date, idx) => {
          const dayEvents = getEventsForDay(events, date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isTodayDate = isToday(date);

          return (
            <div
              key={idx}
              className={`border-b border-r border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                !isCurrentMonth ? 'bg-gray-50/50' : ''
              } ${isTodayDate ? 'bg-blue-50/30' : ''}`}
              onClick={() => handleDayClick(date)}
              onDoubleClick={() => handleDayDoubleClick(date)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${
                    !isCurrentMonth
                      ? 'text-gray-400'
                      : isTodayDate
                      ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                      : 'text-gray-900'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map(event => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-medium border-l-2 truncate hover:opacity-80 transition-opacity ${
                      event.color === 'blue' ? 'bg-blue-100 border-blue-500 text-blue-900' :
                      event.color === 'red' ? 'bg-red-100 border-red-500 text-red-900' :
                      event.color === 'yellow' ? 'bg-yellow-100 border-yellow-500 text-yellow-900' :
                      event.color === 'green' ? 'bg-green-100 border-green-500 text-green-900' :
                      event.color === 'purple' ? 'bg-purple-100 border-purple-500 text-purple-900' :
                      event.color === 'gray' ? 'bg-gray-100 border-gray-500 text-gray-900' :
                      event.color === 'orange' ? 'bg-orange-100 border-orange-500 text-orange-900' :
                      'bg-pink-100 border-pink-500 text-pink-900'
                    }`}
                  >
                    {event.title}
                  </button>
                ))}

                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium px-2">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
