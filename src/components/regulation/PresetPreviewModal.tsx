import { X, AlertCircle, Info } from 'lucide-react';
import { PresetPreview } from '../../lib/regulation/presetTypes';

interface PresetPreviewModalProps {
  preview: PresetPreview;
  onApply: () => void;
  onApplyAndEdit: () => void;
  onCancel: () => void;
}

export function PresetPreviewModal({ preview, onApply, onApplyAndEdit, onCancel }: PresetPreviewModalProps) {
  const { preset, diff, warnings } = preview;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{preset.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{preset.shortDescription}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">Note</p>
                  {warnings.map((warning, idx) => (
                    <p key={idx} className="text-sm text-amber-800 mt-1">{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-medium text-gray-900 mb-2">What This Preset Is For</h3>
            <p className="text-sm text-gray-700">{preset.longExplanation}</p>
            <p className="text-sm text-gray-600 mt-2 italic">{preset.intendedState}</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">This Preset Will Change:</h3>
            {diff.willChange.length === 0 ? (
              <p className="text-sm text-gray-600">No changes needed - your settings already match this preset.</p>
            ) : (
              <div className="space-y-2">
                {diff.willChange.map((change, idx) => (
                  <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm font-medium text-blue-900">{change.category}</p>
                    {change.signalKey && (
                      <p className="text-xs text-blue-700 mt-0.5">
                        Signal: {change.signalKey.replace(/_/g, ' ')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-sm text-blue-800">
                      <span className="line-through">{change.before}</span>
                      <span>→</span>
                      <span className="font-medium">{change.after}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">This Preset Will NOT:</h3>
            <ul className="space-y-1">
              {diff.willNotChange.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  <strong>You can adjust this anytime.</strong> After applying, you can edit any setting individually or revert the entire preset.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={onApplyAndEdit}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Apply & Edit
            </button>
            <button
              onClick={onApply}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Preset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
