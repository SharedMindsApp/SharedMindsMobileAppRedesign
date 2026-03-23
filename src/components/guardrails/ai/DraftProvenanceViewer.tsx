import { X, Info, Database, Calendar } from 'lucide-react';
import type { AIDraft, AIProvenanceMetadata } from '../../../lib/guardrails/ai/aiTypes';

interface DraftProvenanceViewerProps {
  draft: AIDraft;
  onClose: () => void;
}

export function DraftProvenanceViewer({ draft, onClose }: DraftProvenanceViewerProps) {
  const provenance = draft.provenance_metadata as AIProvenanceMetadata | null;

  if (!provenance) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Draft Provenance</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600">No provenance information available for this draft.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Draft Provenance</h2>
            <p className="text-sm text-gray-600 mt-1">
              Data sources and context used to generate this draft
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Source Entities</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              {provenance.sourceEntityIds && provenance.sourceEntityIds.length > 0 ? (
                <div className="space-y-2">
                  {provenance.sourceEntityIds.map((id, idx) => (
                    <div key={id} className="flex items-center gap-3">
                      <span className="text-sm font-mono text-gray-600 bg-white px-2 py-1 rounded border">
                        {provenance.sourceEntityTypes?.[idx] || 'unknown'}
                      </span>
                      <span className="text-sm text-gray-700">{id}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No source entities recorded</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Context Snapshot</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              {provenance.contextSnapshot && Object.keys(provenance.contextSnapshot).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(provenance.contextSnapshot).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3">
                      <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                        {key}:
                      </span>
                      <span className="text-sm text-gray-600 flex-1">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No context snapshot available</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Generation Details</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Generated At</span>
                <span className="text-sm text-gray-600">
                  {new Date(provenance.generatedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Confidence Level</span>
                <span
                  className={`text-sm px-2 py-0.5 rounded ${
                    provenance.confidenceLevel === 'high'
                      ? 'bg-green-100 text-green-800'
                      : provenance.confidenceLevel === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {provenance.confidenceLevel}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">What is Provenance?</h4>
            <p className="text-sm text-blue-800">
              Provenance shows exactly what data the AI used to generate this draft.
              This ensures transparency and helps you understand the AI's reasoning.
              All source entities respect your permission boundaries.
            </p>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
