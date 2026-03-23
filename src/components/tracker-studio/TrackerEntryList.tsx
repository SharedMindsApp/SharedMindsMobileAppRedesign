import { useState, useEffect } from 'react';
import { Calendar, FileText } from 'lucide-react';
import { listEntriesByDateRange } from '../../lib/trackerStudio/trackerEntryService';
import type { Tracker, TrackerEntry } from '../../lib/trackerStudio/types';
import type { TrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';

type TrackerEntryListProps = {
  tracker: Tracker;
  theme: TrackerTheme;
};

export function TrackerEntryList({ tracker, theme }: TrackerEntryListProps) {
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadEntries();
  }, [tracker.id, startDate, endDate]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listEntriesByDateRange({
        tracker_id: tracker.id,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFieldValue = (fieldId: string, value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      const field = tracker.field_schema_snapshot.find(f => f.id === fieldId);
      if (field?.type === 'rating') {
        return `${value}/5`;
      }
      return value.toString();
    }
    return String(value);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className={`${theme.accentBg} rounded-xl border-2 ${theme.borderColor} p-4 mb-6`}>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-semibold text-gray-700 mb-2">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-semibold text-gray-700 mb-2">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className={`w-full px-4 py-2.5 border-2 ${theme.borderColor} ${theme.accentText} rounded-lg hover:shadow-md active:scale-[0.98] transition-all font-semibold bg-white`}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading entries...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadEntries}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Entries List */}
      {!loading && !error && entries.length > 0 && (
        <div className="space-y-4">
          {entries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              tracker={tracker}
              formatDate={formatDate}
              formatFieldValue={formatFieldValue}
              theme={theme}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && entries.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No entries yet</h3>
          <p className="text-gray-600">
            {startDate || endDate
              ? 'No entries found for the selected date range.'
              : 'Start tracking by adding your first entry above.'}
          </p>
        </div>
      )}
    </div>
  );
}

type EntryCardProps = {
  entry: TrackerEntry;
  tracker: Tracker;
  formatDate: (d: string) => string;
  formatFieldValue: (f: string, v: unknown) => string;
  theme: TrackerTheme;
};

function EntryCard({ entry, tracker, formatDate, formatFieldValue, theme }: EntryCardProps) {
  // Get time_of_day field if it exists
  const timeOfDayField = tracker.field_schema_snapshot.find(f => f.id === 'time_of_day');
  const timeOfDay = timeOfDayField ? entry.field_values[timeOfDayField.id] as string : null;
  
  return (
    <div className={`bg-white rounded-xl border-2 ${theme.borderColor} p-5 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`${theme.iconBg} ${theme.iconColor} rounded-lg p-2`}>
            <Calendar size={18} className={theme.iconColor} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-gray-900">{formatDate(entry.entry_date)}</span>
            {timeOfDay && (
              <span className="text-sm text-gray-600 font-medium">{timeOfDay}</span>
            )}
          </div>
        </div>
      </div>

      {/* Field Values */}
      <div className="space-y-3 mb-4">
        {tracker.field_schema_snapshot.map(field => {
          const value = entry.field_values[field.id];
          return (
            <div key={field.id} className={`${theme.accentBg} rounded-lg p-3 border ${theme.borderColor}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-gray-700">
                  {field.label}
                </span>
                <span className="text-base font-bold text-gray-900 text-right">
                  {formatFieldValue(field.id, value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      {entry.notes && (
        <div className={`mt-4 pt-4 border-t-2 ${theme.borderColor}`}>
          <div className="flex items-start gap-3">
            <FileText size={18} className={`${theme.iconColor} mt-0.5 flex-shrink-0`} />
            <p className="text-sm text-gray-700 leading-relaxed">{entry.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
