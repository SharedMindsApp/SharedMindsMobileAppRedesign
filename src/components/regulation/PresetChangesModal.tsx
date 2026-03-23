import { X } from 'lucide-react';
import { PresetChanges, PresetId } from '../../lib/regulation/presetTypes';
import { getPreset } from '../../lib/regulation/presetRegistry';

interface PresetChangesModalProps {
  presetId: PresetId;
  changes: PresetChanges;
  onClose: () => void;
}

export function PresetChangesModal({ presetId, changes, onClose }: PresetChangesModalProps) {
  const preset = getPreset(presetId);
  if (!preset) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Preset Changes</h2>
            <p className="text-sm text-gray-600 mt-1">{preset.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">What This Preset Changed</h3>
            <p className="text-sm text-gray-600">{preset.longExplanation}</p>
          </div>

          <div className="space-y-4">
            {changes.globalVisibility && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm font-medium text-blue-900">Global Visibility</p>
                <p className="text-sm text-blue-800 mt-1">
                  Set to: {changes.globalVisibility === 'prominently' ? 'Prominent display' :
                           changes.globalVisibility === 'quietly' ? 'Quiet display' :
                           'Hide unless strong'}
                </p>
              </div>
            )}

            {changes.responseMode && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm font-medium text-blue-900">Response Mode</p>
                <p className="text-sm text-blue-800 mt-1">
                  Set to: {changes.responseMode === 'all' ? 'All responses' :
                           changes.responseMode === 'calming_only' ? 'Calming responses only' :
                           'Manual responses only'}
                </p>
              </div>
            )}

            {changes.limitSuggestions?.sessionCap && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm font-medium text-blue-900">Session Duration</p>
                <p className="text-sm text-blue-800 mt-1">
                  Suggested cap: {changes.limitSuggestions.sessionCap} minutes
                </p>
              </div>
            )}

            {changes.limitSuggestions?.newProjectVisibility && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm font-medium text-blue-900">New Project Visibility</p>
                <p className="text-sm text-blue-800 mt-1">
                  Set to: {changes.limitSuggestions.newProjectVisibility === 'normal' ? 'Normal' : 'Reduced prominence'}
                </p>
              </div>
            )}

            {changes.signals && Object.keys(changes.signals).length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Signal Calibrations</h3>
                <div className="space-y-2">
                  {Object.entries(changes.signals).map(([signalKey, signalChanges]) => (
                    <div key={signalKey} className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm font-medium text-blue-900">
                        {signalKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <div className="text-sm text-blue-800 mt-1 space-y-0.5">
                        {signalChanges.visibility && (
                          <p>Visibility: {signalChanges.visibility}</p>
                        )}
                        {signalChanges.sensitivity && (
                          <p>Sensitivity: {signalChanges.sensitivity.replace(/_/g, ' ')}</p>
                        )}
                        {signalChanges.relevance && (
                          <p>Relevance: {signalChanges.relevance.replace(/_/g, ' ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {changes.temporaryUntil && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-sm font-medium text-amber-900">Temporary Duration</p>
                <p className="text-sm text-amber-800 mt-1">
                  Active until: {new Date(changes.temporaryUntil).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Remember:</strong> You can edit any of these settings individually or revert the entire preset at any time.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
