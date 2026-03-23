/**
 * Add Tracker to Space Modal
 * 
 * Allows users to add a tracker as a standalone app to their Personal
 * or Shared spaces. Creates a tracker_app widget in the selected space.
 */

import { useState, useEffect } from 'react';
import { X, Home, Users, Loader2, AlertCircle } from 'lucide-react';
import { createWidget } from '../../lib/fridgeCanvas';
import { getTracker } from '../../lib/trackerStudio/trackerService';
import { getPersonalSpace, getSharedSpaces } from '../../lib/household';
import { getUserSpaces } from '../../lib/sharedSpacesManagement';
import type { SharedSpace } from '../../components/shared/SharedSpaceSwitcher';
import { showToast } from '../Toast';
import type { Tracker } from '../../lib/trackerStudio/types';
import type { Household } from '../../lib/household';

type AddTrackerToSpaceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tracker: Tracker;
  onAdded?: () => void;
};

export function AddTrackerToSpaceModal({
  isOpen,
  onClose,
  tracker,
  onAdded,
}: AddTrackerToSpaceModalProps) {
  const [spaces, setSpaces] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [personalSpace, setPersonalSpace] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSpaces();
    }
  }, [isOpen]);

  const loadSpaces = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load personal space
      const personal = await getPersonalSpace();
      if (personal) {
        setPersonalSpace(personal);
      }
      
      // Load shared spaces (households)
      const sharedSpaces = await getSharedSpaces();
      setSpaces(sharedSpaces.map(s => ({ id: s.id, name: s.name, type: 'household' })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToSpace = async (spaceId: string) => {
    try {
      setCreating(true);
      setError(null);

      // Get tracker icon and color
      const trackerData = await getTracker(tracker.id);
      const widgetIcon = trackerData?.icon || 'Activity';
      const widgetColor = trackerData?.color || 'indigo';
      const widgetTitle = tracker.name;

      const trackerAppContent = { tracker_id: tracker.id };
      
      await createWidget(spaceId, 'tracker_app', trackerAppContent, {
        icon: widgetIcon,
        color: widgetColor,
        title: widgetTitle,
      });

      const space = personalSpace?.id === spaceId ? personalSpace : spaces.find(s => s.id === spaceId);
      const spaceName = space?.name || 'Space';
      
      showToast('success', `Added ${tracker.name} to ${spaceName}`);
      
      if (onAdded) {
        onAdded();
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tracker to space');
      showToast('error', 'Failed to add tracker to space');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add to Spaces</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add "{tracker.name}" as a standalone app to one of your spaces
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading spaces...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {/* Personal Space */}
            {personalSpace && (
              <button
                onClick={() => handleAddToSpace(personalSpace.id)}
                disabled={creating}
                className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Home size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 mb-1">{personalSpace.name}</div>
                  <div className="text-sm text-gray-600">Personal Space</div>
                </div>
              </button>
            )}

            {/* Shared Spaces */}
            {spaces.map(space => (
              <button
                key={space.id}
                onClick={() => handleAddToSpace(space.id)}
                disabled={creating}
                className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 mb-1">{space.name}</div>
                  <div className="text-sm text-gray-600">Shared Space</div>
                </div>
              </button>
            ))}

            {!personalSpace && spaces.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No spaces found</p>
                <p className="text-sm text-gray-500">
                  Create a space first to add trackers as apps
                </p>
              </div>
            )}
          </div>
        )}

        {creating && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Adding to space...</span>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={creating}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
