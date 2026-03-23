/**
 * Tracker Quick Link App
 * 
 * Shows all available trackers as quick link apps that users can tap
 * to open as standalone tracker apps in Spaces.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { listTrackers } from '../../../lib/trackerStudio/trackerService';
import type { Tracker } from '../../../lib/trackerStudio/types';
import { getTrackerTheme } from '../../../lib/trackerStudio/trackerThemeUtils';

interface TrackerQuickLinkAppProps {
  spaceId: string;
  onCreateTrackerApp?: (trackerId: string) => void;
}

export function TrackerQuickLinkApp({ spaceId, onCreateTrackerApp }: TrackerQuickLinkAppProps) {
  const navigate = useNavigate();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrackers();
  }, []);

  const loadTrackers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listTrackers(false); // Exclude archived
      setTrackers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trackers');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackerClick = (tracker: Tracker) => {
    if (onCreateTrackerApp) {
      // Create a tracker app widget in this space
      onCreateTrackerApp(tracker.id);
    } else {
      // Navigate to tracker app view
      navigate(`/spaces/${spaceId}/app/tracker_app/${tracker.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading trackers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">Failed to load trackers</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm safe-top">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900 mb-1">Tracker Apps</h1>
          <p className="text-sm text-gray-600">Tap a tracker to open it as a standalone app</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {trackers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <Activity size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trackers Yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create a tracker in Tracker Studio to get started
            </p>
            <button
              onClick={() => navigate('/tracker-studio')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={18} />
              Go to Tracker Studio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trackers.map((tracker) => {
              const theme = getTrackerTheme(tracker.name || '');
              return (
                <button
                  key={tracker.id}
                  onClick={() => handleTrackerClick(tracker)}
                  className={`bg-white rounded-2xl shadow-sm border-2 ${theme?.borderColor || 'border-gray-200'} p-4 hover:shadow-md transition-all text-left group`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl ${theme?.iconBg || 'bg-blue-100'} flex items-center justify-center flex-shrink-0`}>
                      <Calendar size={24} className={theme?.iconColor || 'text-blue-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {tracker.name}
                      </h3>
                      {tracker.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {tracker.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{tracker.field_schema_snapshot.length} fields</span>
                        <span>•</span>
                        <span className="capitalize">{tracker.entry_granularity}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
