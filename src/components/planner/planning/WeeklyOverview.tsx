import { PlannerShell } from '../PlannerShell';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getWeeklyEntry, getStartOfWeek, formatWeekDateRange } from '../../../lib/planningService';
import type { WeeklyEntry } from '../../../lib/planningService';

export function WeeklyOverview() {
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(getStartOfWeek());
  const [entry, setEntry] = useState<WeeklyEntry | null>(null);

  useEffect(() => {
    loadWeeklyEntry();
  }, [weekStart]);

  const loadWeeklyEntry = async () => {
    try {
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const data = await getWeeklyEntry(weekStartStr);
      setEntry(data);
    } catch (error) {
      console.error('Error loading weekly entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    const prevWeek = new Date(weekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setWeekStart(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setWeekStart(nextWeek);
  };

  const goToCurrentWeek = () => {
    setWeekStart(getStartOfWeek());
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-7xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-violet-700" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Weekly Overview</h1>
              </div>
              <p className="text-slate-600">See the week as a whole</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={goToCurrentWeek}
                className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors font-medium"
              >
                This Week
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
          <h2 className="text-lg text-slate-700 mt-4">{formatWeekDateRange(weekStart)}</h2>
        </div>

        {entry?.goals && entry.goals.length > 0 && (
          <div className="bg-violet-50 rounded-xl p-6 border border-violet-200 mb-6">
            <h3 className="font-semibold text-violet-900 mb-3">Weekly Focus</h3>
            <ul className="space-y-2">
              {entry.goals.map((goal, index) => (
                <li key={index} className="text-slate-700 flex items-start gap-2">
                  <span className="text-violet-600 font-bold">•</span>
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {daysOfWeek.map((day, index) => {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + index);
            const isToday = dayDate.toDateString() === new Date().toDateString();

            return (
              <div key={day} className={`bg-white rounded-xl p-4 border ${
                isToday ? 'border-violet-300 shadow-md' : 'border-slate-200'
              }`}>
                <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-violet-700' : 'text-slate-600'}`}>
                  {day}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-4">
                  {dayDate.getDate()}
                </div>
                <div className="space-y-2 text-xs text-slate-500">
                  <p>No events</p>
                </div>
              </div>
            );
          })}
        </div>

        {entry?.notes && (
          <div className="mt-6 bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-2">Weekly Notes</h3>
            <p className="text-slate-600">{entry.notes}</p>
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
