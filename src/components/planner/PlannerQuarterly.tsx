import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PlannerShell } from './PlannerShell';

export function PlannerQuarterly() {
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const state = location.state as { quarterIndex?: number } | null;
    if (state?.quarterIndex !== undefined) {
      const currentYear = new Date().getFullYear();
      return new Date(currentYear, state.quarterIndex * 3, 1);
    }
    return new Date();
  });

  const navigateQuarter = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -3 : 3));
    setSelectedDate(newDate);
  };

  const getQuarterMonths = () => {
    const quarterStartMonth = Math.floor(selectedDate.getMonth() / 3) * 3;
    const months: Date[] = [];

    for (let i = 0; i < 3; i++) {
      const month = new Date(selectedDate.getFullYear(), quarterStartMonth + i, 1);
      months.push(month);
    }

    return months;
  };

  const getMonthCalendar = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
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

  const quarterMonths = getQuarterMonths();
  const quarterNumber = Math.floor(selectedDate.getMonth() / 3) + 1;
  const quarterYear = selectedDate.getFullYear();

  return (
    <PlannerShell>
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <button onClick={() => navigateQuarter('prev')} className="p-1 md:p-2 hover:bg-gray-100 rounded">
            <ChevronLeft size={20} className="md:w-6 md:h-6" />
          </button>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            Q{quarterNumber} {quarterYear}
          </h1>
          <button onClick={() => navigateQuarter('next')} className="p-1 md:p-2 hover:bg-gray-100 rounded">
            <ChevronRight size={20} className="md:w-6 md:h-6" />
          </button>
        </div>

        {/* 3-Month Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {quarterMonths.map((monthDate, idx) => {
            const weeks = getMonthCalendar(monthDate);
            const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            return (
              <div key={idx} className="bg-white rounded-lg border-2 border-gray-300 p-3 md:p-4">
                <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 text-center">{monthName}</h2>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-center py-1 text-[10px] font-bold">M</th>
                      <th className="text-center py-1 text-[10px] font-bold">T</th>
                      <th className="text-center py-1 text-[10px] font-bold">W</th>
                      <th className="text-center py-1 text-[10px] font-bold">T</th>
                      <th className="text-center py-1 text-[10px] font-bold">F</th>
                      <th className="text-center py-1 text-[10px] font-bold">S</th>
                      <th className="text-center py-1 text-[10px] font-bold">S</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((week, wi) => (
                      <tr key={wi}>
                        {week.map((day, di) => {
                          const isToday =
                            day > 0 &&
                            monthDate.getMonth() === new Date().getMonth() &&
                            monthDate.getFullYear() === new Date().getFullYear() &&
                            day === new Date().getDate();

                          return (
                            <td
                              key={di}
                              className={`text-center py-1 ${
                                day === 0
                                  ? 'bg-gray-50'
                                  : isToday
                                  ? 'bg-blue-100 font-bold rounded'
                                  : 'hover:bg-gray-50 cursor-pointer'
                              }`}
                            >
                              <span className="text-xs">{day || ''}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Monthly Notes Section */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h3 className="text-xs font-bold text-gray-700 mb-2">Goals & Notes</h3>
                  <div className="space-y-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 bg-gray-50 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quarterly Goals */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Quarterly Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">Professional</h3>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-white border border-blue-300 rounded"></div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">Personal</h3>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-white border border-blue-300 rounded"></div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">Learning</h3>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-white border border-blue-300 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quarterly Review */}
        <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Quarterly Review</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">What Went Well</h3>
              <div className="h-24 bg-white border border-green-300 rounded p-2">
                <textarea
                  placeholder="Reflect on your wins and achievements..."
                  className="w-full h-full text-xs bg-transparent resize-none focus:outline-none"
                />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">What to Improve</h3>
              <div className="h-24 bg-white border border-green-300 rounded p-2">
                <textarea
                  placeholder="Identify areas for growth..."
                  className="w-full h-full text-xs bg-transparent resize-none focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}
