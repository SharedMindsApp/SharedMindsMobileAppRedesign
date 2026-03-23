import { useMemo } from 'react';
import { CalendarEventWithMembers } from '../../../lib/calendarTypes';
import { getMonthDays, isToday } from '../../../lib/calendarUtils';

interface YearViewProps {
  currentDate: Date;
  events: CalendarEventWithMembers[];
  onMonthSelect: (date: Date) => void;
  onDaySelect: (date: Date) => void;
}

export function YearView({
  currentDate,
  events,
  onMonthSelect,
  onDaySelect,
}: YearViewProps) {
  const year = currentDate.getFullYear();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Precompute event counts for all days in the year for performance
  const eventCountsByDate = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach(event => {
      const eventDate = new Date(event.start_at);
      const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
      counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
    });
    return counts;
  }, [events]);

  // Get event count for a specific day
  const getDayEventCount = (date: Date): number => {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventCountsByDate.get(dateKey) || 0;
  };

  // Get event density styling based on count
  const getDayCellStyle = (eventCount: number, isTodayDate: boolean, isCurrentMonthDay: boolean) => {
    if (!isCurrentMonthDay) {
      return 'text-gray-300 cursor-default';
    }

    if (isTodayDate) {
      return 'bg-blue-500 text-white font-semibold';
    }

    // Event density color mapping
    if (eventCount === 0) {
      return 'text-gray-600 hover:bg-gray-50';
    } else if (eventCount <= 2) {
      return 'bg-green-200 text-gray-900 hover:bg-green-300';
    } else if (eventCount <= 4) {
      return 'bg-green-400 text-gray-900 hover:bg-green-500';
    } else {
      return 'bg-green-600 text-white hover:bg-green-700';
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain p-3 md:p-4 lg:p-6 pb-[100px] md:pb-6 min-h-0">
      <div className="max-w-7xl mx-auto">
        {/* Year Grid - 3 columns on desktop, 2 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {months.map((monthName, monthIndex) => {
            const monthDays = getMonthDays(year, monthIndex);
            const monthDate = new Date(year, monthIndex, 1);

            return (
              <div key={monthIndex} className="min-w-0">
                {/* Month Header - Simple, no card styling */}
                <button
                  onClick={() => onMonthSelect(monthDate)}
                  className="w-full text-left mb-1 hover:opacity-70 transition-opacity"
                >
                  <h3 className="text-sm font-semibold text-gray-800">
                    {monthName}
                  </h3>
                </button>

                {/* Weekday Row - Single letter, uppercase, very light */}
                <div className="grid grid-cols-7 text-[10px] text-gray-400 mb-1">
                  {weekDays.map((day, idx) => (
                    <div
                      key={idx}
                      className="text-center font-medium uppercase"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid - Tight spacing, square cells */}
                <div className="grid grid-cols-7 gap-[2px]">
                  {monthDays.map((date, dayIdx) => {
                    const isCurrentMonthDay = date.getMonth() === monthIndex;
                    const isTodayDate = isToday(date);
                    const dayEventCount = isCurrentMonthDay ? getDayEventCount(date) : 0;

                    return (
                      <button
                        key={dayIdx}
                        onClick={() => isCurrentMonthDay && onDaySelect(date)}
                        disabled={!isCurrentMonthDay}
                        className={`
                          w-7 h-7 flex items-center justify-center text-xs rounded
                          transition-colors
                          ${getDayCellStyle(dayEventCount, isTodayDate, isCurrentMonthDay)}
                          ${!isCurrentMonthDay ? '' : 'cursor-pointer'}
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
