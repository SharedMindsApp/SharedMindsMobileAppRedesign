import { X } from 'lucide-react';
import type { ActiveSignal } from '../../lib/regulation/signalTypes';

interface SignalExplanationModalProps {
  signal: ActiveSignal;
  onClose: () => void;
}

export function SignalExplanationModal({ signal, onClose }: SignalExplanationModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Why This Signal Appeared</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{signal.title}</h3>
            <p className="text-gray-700">{signal.description}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="whitespace-pre-wrap text-sm text-gray-800">
              {signal.explanation_why}
            </div>
          </div>

          {signal.context_data && Object.keys(signal.context_data).length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Context Details</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {Object.entries(signal.context_data).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-gray-900 font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-800">
              <span className="font-medium">Remember:</span> Signals are just reflections of patterns.
              They don't require action and they don't imply anything is wrong. You can dismiss any signal at any time.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
