import { X, Calendar } from 'lucide-react';
import { useState } from 'react';
import type { Track } from '../../../lib/guardrails/tracksTypes';
import type { SubTrack } from '../../../lib/guardrails/subtracksTypes';

interface TimelineFiltersProps {
  tracks: Track[];
  subtracks: SubTrack[];
  selectedTrackId: string | null;
  selectedSubtrackId: string | null;
  selectedStatus: string | null;
  dateRangeFilter: { start: string; end: string } | null;
  onTrackChange: (trackId: string | null) => void;
  onSubtrackChange: (subtrackId: string | null) => void;
  onStatusChange: (status: string | null) => void;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  onClearAll: () => void;
}

export function TimelineFilters({
  tracks,
  subtracks,
  selectedTrackId,
  selectedSubtrackId,
  selectedStatus,
  dateRangeFilter,
  onTrackChange,
  onSubtrackChange,
  onStatusChange,
  onDateRangeChange,
  onClearAll,
}: TimelineFiltersProps) {
  const [startDate, setStartDate] = useState(dateRangeFilter?.start || '');
  const [endDate, setEndDate] = useState(dateRangeFilter?.end || '');

  const handleApplyDateRange = () => {
    if (startDate && endDate) {
      onDateRangeChange({ start: startDate, end: endDate });
    } else {
      onDateRangeChange(null);
    }
  };

  const filteredSubtracks = selectedTrackId
    ? (subtracks || []).filter((st) => st.track_id === selectedTrackId)
    : (subtracks || []);

  const hasAnyFilter =
    selectedTrackId ||
    selectedSubtrackId ||
    selectedStatus ||
    dateRangeFilter;

  return (
    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-start gap-4">
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Track
            </label>
            <select
              value={selectedTrackId || ''}
              onChange={(e) => {
                onTrackChange(e.target.value || null);
                onSubtrackChange(null);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Tracks</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Sub-track
            </label>
            <select
              value={selectedSubtrackId || ''}
              onChange={(e) => onSubtrackChange(e.target.value || null)}
              disabled={!selectedTrackId}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">All Sub-tracks</option>
              {filteredSubtracks.map((subtrack) => (
                <option key={subtrack.id} value={subtrack.id}>
                  {subtrack.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus || ''}
              onChange={(e) => onStatusChange(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleApplyDateRange}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Apply date range"
              >
                <Calendar size={16} />
              </button>
            </div>
          </div>
        </div>

        {hasAnyFilter && (
          <button
            onClick={onClearAll}
            className="mt-5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
