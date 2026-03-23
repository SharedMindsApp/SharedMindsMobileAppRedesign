/**
 * Stage 4.6: Negative Case View (Interactive Collapsible)
 *
 * Visual card showing why a signal did NOT appear.
 * Helps understand the absence of patterns with expandable details.
 */

import { AlertCircle, CheckCircle, Target } from 'lucide-react';
import { useState } from 'react';
import type { NegativeCaseExplanation } from '../../lib/regulation/testingModeService';

interface NegativeCaseViewProps {
  explanation: NegativeCaseExplanation;
}

export function NegativeCaseView({ explanation }: NegativeCaseViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden hover:shadow-md transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
          <AlertCircle className="w-6 h-6 text-gray-500" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-gray-900 text-lg mb-1">{explanation.signal_name}</div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full border border-gray-300">
              Signal not active
            </span>
            {!isExpanded && (
              <span className="text-xs text-gray-500">Click to see why</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform ${
            isExpanded ? 'bg-blue-100 rotate-180' : 'bg-gray-100'
          }`}>
            <svg className={`w-4 h-4 ${isExpanded ? 'text-blue-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t-2 border-gray-200 bg-gray-50 p-5 space-y-4">
          {/* Reason */}
          <div className="bg-white rounded-lg border-2 border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-300">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
                  Why Not Active
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{explanation.reason_not_shown}</p>
              </div>
            </div>
          </div>

          {/* Threshold Info */}
          <div className="bg-white rounded-lg border border-gray-300 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
                <CheckCircle className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Threshold Information
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{explanation.threshold_info}</p>
              </div>
            </div>
          </div>

          {/* Explanation Note */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-800 leading-relaxed">
              <strong>This is good information:</strong> Knowing why a signal isn't active helps you understand the system. This signal will appear when the conditions are met.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
