import { useState, useEffect } from 'react';
import { X, Settings, Check } from 'lucide-react';
import { listTrackers } from '../../../lib/trackerStudio/trackerService';
import type { Tracker } from '../../../lib/trackerStudio/types';
import { useUIPreferences } from '../../../contexts/UIPreferencesContext';
import { WIDGET_COLOR_TOKENS, type WidgetColorToken } from '../../../lib/uiPreferencesTypes';
import { showToast } from '../../Toast';

type SelectTrackerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (trackerId: string) => void;
};

export function SelectTrackerModal({ isOpen, onClose, onSelect }: SelectTrackerModalProps) {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorPickerTracker, setColorPickerTracker] = useState<Tracker | null>(null);
  const { getTrackerColor, setTrackerColor } = useUIPreferences();

  useEffect(() => {
    if (isOpen) {
      loadTrackers();
    }
  }, [isOpen]);

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

  const handleSelect = (trackerId: string) => {
    onSelect(trackerId);
    onClose();
  };

  const handleTrackerClick = (tracker: Tracker, e: React.MouseEvent) => {
    // If settings icon was clicked, show color picker
    if ((e.target as HTMLElement).closest('[data-settings-button]')) {
      e.stopPropagation();
      setColorPickerTracker(tracker);
      return;
    }

    // Otherwise, select the tracker
    handleSelect(tracker.id);
  };

  const handleColorSelect = async (color: WidgetColorToken) => {
    if (!colorPickerTracker) return;

    // Save the color preference for this tracker
    await setTrackerColor(colorPickerTracker.id, color);
    showToast('success', `${colorPickerTracker.name} color updated`);

    // Close color picker (user can click tracker again to add it)
    setColorPickerTracker(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Select Tracker</h2>
            <p className="text-sm text-gray-600 mt-1">Choose a tracker to embed in this space</p>
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
            <p className="text-gray-600">Loading trackers...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && trackers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No trackers found</p>
            <p className="text-sm text-gray-500">
              Create a tracker in Tracker Studio first
            </p>
          </div>
        )}

        {!loading && !error && trackers.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {trackers.map(tracker => {
              const customColor = getTrackerColor(tracker.id);
              const colorInfo = customColor ? WIDGET_COLOR_TOKENS[customColor] : null;
              const trackerColor = tracker.color || 'indigo';
              
              return (
                <div key={tracker.id} className="relative">
                  <button
                    onClick={(e) => handleTrackerClick(tracker, e)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors relative"
                  >
                    <div className="flex items-center gap-3">
                      {/* Color preview icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: colorInfo
                            ? `rgb(${colorInfo.rgb})`
                            : trackerColor === 'indigo'
                            ? 'rgb(99, 102, 241)'
                            : trackerColor === 'blue'
                            ? 'rgb(59, 130, 246)'
                            : trackerColor === 'purple'
                            ? 'rgb(168, 85, 247)'
                            : trackerColor === 'pink'
                            ? 'rgb(236, 72, 153)'
                            : trackerColor === 'red'
                            ? 'rgb(239, 68, 68)'
                            : trackerColor === 'orange'
                            ? 'rgb(251, 146, 60)'
                            : trackerColor === 'yellow'
                            ? 'rgb(234, 179, 8)'
                            : trackerColor === 'green'
                            ? 'rgb(34, 197, 94)'
                            : trackerColor === 'teal'
                            ? 'rgb(20, 184, 166)'
                            : trackerColor === 'cyan'
                            ? 'rgb(6, 182, 212)'
                            : trackerColor === 'emerald'
                            ? 'rgb(16, 185, 129)'
                            : trackerColor === 'amber'
                            ? 'rgb(245, 158, 11)'
                            : trackerColor === 'violet'
                            ? 'rgb(139, 92, 246)'
                            : trackerColor === 'slate'
                            ? 'rgb(100, 116, 139)'
                            : trackerColor === 'gray'
                            ? 'rgb(107, 114, 128)'
                            : 'rgb(99, 102, 241)',
                        }}
                      >
                        <span className="text-white text-xs font-semibold">
                          {tracker.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 mb-1">{tracker.name}</div>
                        {tracker.description && (
                          <div className="text-sm text-gray-600 truncate">{tracker.description}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {tracker.field_schema_snapshot.length} {tracker.field_schema_snapshot.length === 1 ? 'field' : 'fields'}
                        </div>
                      </div>
                    </div>
                  </button>
                  {/* Settings icon for color customization */}
                  <button
                    data-settings-button
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorPickerTracker(tracker);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors z-10"
                    aria-label="Customize color"
                  >
                    <Settings size={16} className="text-gray-600" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Color Picker Modal */}
      {colorPickerTracker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={() => setColorPickerTracker(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Customize Color</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Choose a color for {colorPickerTracker.name}
                  </p>
                </div>
                <button
                  onClick={() => setColorPickerTracker(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-5 gap-3 max-h-96 overflow-y-auto">
                {(Object.keys(WIDGET_COLOR_TOKENS) as WidgetColorToken[]).map((colorKey) => {
                  const color = WIDGET_COLOR_TOKENS[colorKey];
                  const isSelected = getTrackerColor(colorPickerTracker.id) === colorKey;

                  return (
                    <button
                      key={colorKey}
                      onClick={() => handleColorSelect(colorKey)}
                      className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-gray-50 ${
                        isSelected ? 'bg-gray-50 ring-2 ring-blue-600' : ''
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-xl shadow-sm transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `rgb(${color.rgb})` }}
                      />
                      <span className="text-xs font-medium text-gray-700">{color.label}</span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setColorPickerTracker(null)}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
