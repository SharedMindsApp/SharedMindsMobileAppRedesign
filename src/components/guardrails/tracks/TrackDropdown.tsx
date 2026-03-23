import { useMemo } from 'react';
import type { Track } from '../../../lib/guardrails/tracksTypes';

interface TrackDropdownProps {
  tracks: Track[];
  selectedTrackId: string | null;
  onChange: (trackId: string | null) => void;
  label?: string;
  allowUnassigned?: boolean;
  className?: string;
}

export function TrackDropdown({
  tracks,
  selectedTrackId,
  onChange,
  label = 'Track',
  allowUnassigned = true,
  className = '',
}: TrackDropdownProps) {
  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => a.orderingIndex - b.orderingIndex);
  }, [tracks]);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <select
          value={selectedTrackId || ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        >
          {allowUnassigned && <option value="">Unassigned</option>}
          {sortedTracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
        {selectedTrackId && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
            style={{
              backgroundColor:
                sortedTracks.find((t) => t.id === selectedTrackId)?.color || '#6B7280',
            }}
          />
        )}
      </div>
    </div>
  );
}
