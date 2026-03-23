/**
 * Promote Container Modal
 *
 * Modal for promoting a local container to an integrated track or subtrack.
 * Shows prefilled form with container title/body and validates inputs.
 */

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { MindMeshContainer } from '../../../hooks/useMindMesh';

interface PromoteContainerModalProps {
  container: MindMeshContainer;
  type: 'track' | 'subtrack' | 'task' | 'event';
  onClose: () => void;
  onPromote: (data: PromoteData) => Promise<void>;
}

export interface PromoteData {
  trackName: string;
  trackDescription: string;
  trackColor?: string;
  parentTrackId?: string;
  dueAt?: string;
  startsAt?: string;
  endsAt?: string;
}

interface TrackOption {
  id: string;
  name: string;
}

export function PromoteContainerModal({
  container,
  type,
  onClose,
  onPromote,
}: PromoteContainerModalProps) {
  const [name, setName] = useState(container.title || container.body || '');
  const [description, setDescription] = useState(container.body || '');
  const [color, setColor] = useState<string>('');
  const [parentTrackId, setParentTrackId] = useState<string>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [startsAt, setStartsAt] = useState<string>('');
  const [endsAt, setEndsAt] = useState<string>('');
  const [trackOptions, setTrackOptions] = useState<TrackOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (type === 'subtrack' || type === 'task' || type === 'event') {
      loadTracks();
    }
  }, [type]);

  async function loadTracks() {
    setLoadingTracks(true);
    try {
      const { data: containers, error } = await supabase
        .from('mindmesh_containers')
        .select('id, title, entity_type, entity_id')
        .eq('workspace_id', container.workspace_id)
        .eq('entity_type', 'track')
        .not('entity_id', 'is', null);

      if (error) throw error;

      const options: TrackOption[] = containers.map((c) => ({
        id: c.entity_id!,
        name: c.title || 'Untitled Track',
      }));

      setTrackOptions(options);
    } catch (err: any) {
      setError(`Failed to load tracks: ${err.message}`);
    } finally {
      setLoadingTracks(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if ((type === 'subtrack' || type === 'task' || type === 'event') && !parentTrackId) {
      setError('Please select a parent track');
      return;
    }

    if (type === 'event' && !startsAt) {
      setError('Event start time is required');
      return;
    }

    setLoading(true);

    try {
      await onPromote({
        trackName: name,
        trackDescription: description,
        trackColor: color || undefined,
        parentTrackId: (type === 'subtrack' || type === 'task' || type === 'event') ? parentTrackId : undefined,
        dueAt: type === 'task' ? (dueAt || undefined) : undefined,
        startsAt: type === 'event' ? startsAt : undefined,
        endsAt: type === 'event' ? (endsAt || undefined) : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to promote container');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Promote to {type === 'track' ? 'Track' : type === 'subtrack' ? 'Subtrack' : type === 'task' ? 'Task' : 'Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter track name"
              required
            />
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Enter description (optional)"
            />
          </div>

          {/* Color Field (only for tracks) */}
          {type === 'track' && (
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                id="color"
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., blue, #3B82F6 (optional)"
              />
            </div>
          )}

          {/* Parent Track Selector (for subtracks, tasks, and events) */}
          {(type === 'subtrack' || type === 'task' || type === 'event') && (
            <div>
              <label htmlFor="parentTrack" className="block text-sm font-medium text-gray-700 mb-1">
                Parent Track *
              </label>
              {loadingTracks ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading tracks...
                </div>
              ) : trackOptions.length === 0 ? (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No tracks found. Please create a track first.
                </div>
              ) : (
                <select
                  id="parentTrack"
                  value={parentTrackId}
                  onChange={(e) => setParentTrackId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a parent track...</option>
                  {trackOptions.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Due Date Field (only for tasks) */}
          {type === 'task' && (
            <div>
              <label htmlFor="dueAt" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date (optional)
              </label>
              <input
                id="dueAt"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Event Dates (only for events) */}
          {type === 'event' && (
            <>
              <div>
                <label htmlFor="startsAt" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  id="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="endsAt" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time (optional)
                </label>
                <input
                  id="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || ((type === 'subtrack' || type === 'task' || type === 'event') && trackOptions.length === 0)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Promote to {type === 'track' ? 'Track' : type === 'subtrack' ? 'Subtrack' : type === 'task' ? 'Task' : 'Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
