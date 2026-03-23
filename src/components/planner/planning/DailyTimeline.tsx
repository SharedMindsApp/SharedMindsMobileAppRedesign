import { PlannerShell } from '../PlannerShell';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getDailyEntry } from '../../../lib/planningService';
import type { DailyEntry } from '../../../lib/planningService';

export function DailyTimeline() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entry, setEntry] = useState<DailyEntry | null>(null);

  useEffect(() => {
    loadDailyEntry();
  }, [selectedDate]);

  const loadDailyEntry = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await getDailyEntry(dateStr);
      setEntry(data);
    } catch (error) {
      console.error('Error loading daily entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-5xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-cyan-700" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Daily Timeline</h1>
              </div>
              <p className="text-slate-600">Gentle structure for the day</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousDay}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors font-medium"
              >
                Today
              </button>
              <button
                onClick={goToNextDay}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
          <h2 className="text-lg text-slate-700 mt-4">{formatDate(selectedDate)}</h2>
        </div>

        {entry?.focus_text && (
          <div className="bg-cyan-50 rounded-xl p-6 border border-cyan-200 mb-6">
            <h3 className="font-semibold text-cyan-900 mb-2">Today's Focus</h3>
            <p className="text-slate-700">{entry.focus_text}</p>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          {!entry ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No entry for this day</h3>
              <p className="text-slate-600">Visit the Daily Planner to create an entry</p>
            </div>
          ) : (
            <div className="space-y-6">
              {entry.notes && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">Notes</h4>
                  <p className="text-slate-600">{entry.notes}</p>
                </div>
              )}

              {(entry.mood_rating || entry.sleep_rating) && (
                <div className="pt-6 border-t border-slate-200">
                  <h4 className="font-semibold text-slate-800 mb-3">Wellness</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {entry.mood_rating && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Mood</p>
                        <p className="text-lg font-semibold text-slate-800">{entry.mood_rating}/6</p>
                      </div>
                    )}
                    {entry.sleep_rating && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Sleep</p>
                        <p className="text-lg font-semibold text-slate-800">{entry.sleep_rating}/6</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
          <p className="text-sm text-slate-700">
            This is an overview view. To edit daily entries, visit the Daily Planner section.
          </p>
        </div>
      </div>
    </PlannerShell>
  );
}
