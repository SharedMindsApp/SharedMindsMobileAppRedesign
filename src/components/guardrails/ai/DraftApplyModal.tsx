import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { AIDraft } from '../../../lib/guardrails/ai/aiTypes';
import { useDraftApplication, generateApplicationPreview } from '../../../hooks/useDraftApplication';
import { PartialApplySelector } from './PartialApplySelector';

interface DraftApplyModalProps {
  draft: AIDraft;
  userId: string;
  onClose: () => void;
  onSuccess: (appliedItemIds?: string[]) => void;
  targetProjectId?: string;
  targetTrackId?: string;
  targetRoadmapItemId?: string;
}

export function DraftApplyModal({
  draft,
  userId,
  onClose,
  onSuccess,
  targetProjectId,
  targetTrackId,
  targetRoadmapItemId,
}: DraftApplyModalProps) {
  const { applying, error, apply } = useDraftApplication();
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [showPartialSelector, setShowPartialSelector] = useState(false);
  const [preview, setPreview] = useState(generateApplicationPreview(draft));

  useEffect(() => {
    setPreview(generateApplicationPreview(draft, showPartialSelector ? selectedElements : undefined));
  }, [draft, selectedElements, showPartialSelector]);

  const handleApply = async () => {
    const result = await apply(draft.id, userId, {
      targetProjectId,
      targetTrackId,
      targetRoadmapItemId,
      selectedElements: showPartialSelector ? selectedElements : undefined,
    });

    if (result.success) {
      onSuccess(result.appliedItemIds);
    }
  };

  const canApplyPartially = ['task_list', 'checklist', 'timeline'].includes(draft.draft_type);
  const hasSelection = !showPartialSelector || selectedElements.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 safe-top safe-bottom">
      <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-2xl w-full max-h-screen-safe overflow-hidden flex flex-col overscroll-contain">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Apply Draft</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 overscroll-contain">
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{draft.title}</h3>
            <p className="text-sm text-gray-600">
              This will create or update items in your project based on the AI draft.
            </p>
          </div>

          {canApplyPartially && !showPartialSelector && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 mb-2">
                    This draft contains multiple elements. You can apply all of them or select specific ones.
                  </p>
                  <button
                    onClick={() => setShowPartialSelector(true)}
                    className="text-sm font-medium text-blue-700 hover:text-blue-800"
                  >
                    Choose which elements to apply →
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPartialSelector ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Select Elements to Apply</h4>
                <button
                  onClick={() => {
                    setShowPartialSelector(false);
                    setSelectedElements([]);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Apply all instead
                </button>
              </div>
              <PartialApplySelector
                draft={draft}
                onSelectionChange={setSelectedElements}
              />
            </div>
          ) : (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">What will be applied:</h4>

              {preview.willCreate.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Will create:</span>
                  </div>
                  <ul className="ml-6 space-y-1">
                    {preview.willCreate.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-600">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.willUpdate.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Will update:</span>
                  </div>
                  <ul className="ml-6 space-y-1">
                    {preview.willUpdate.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-600">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.willNotApply.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Will not apply:</span>
                  </div>
                  <ul className="ml-6 space-y-1">
                    {preview.willNotApply.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-500">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  {preview.warnings.map((warning, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-800">{warning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {targetProjectId && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Target Location:</h4>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                {targetProjectId && <div>Project: {targetProjectId}</div>}
                {targetTrackId && <div>Track: {targetTrackId}</div>}
                {targetRoadmapItemId && <div>Item: {targetRoadmapItemId}</div>}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">Application Failed</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Important:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• This action cannot be undone automatically</li>
              <li>• Created items will follow your project's normal workflow</li>
              <li>• You can edit or delete created items after application</li>
              <li>• The draft will be marked as applied</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={applying}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={applying || !hasSelection}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {applying ? 'Applying...' : showPartialSelector ? `Apply Selected (${selectedElements.length})` : 'Apply Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
