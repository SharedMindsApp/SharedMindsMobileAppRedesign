/**
 * Stage 4.5: Mental Model Card
 *
 * Collapsible card explaining how Regulation works.
 * Dismissible but can be re-opened anytime.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, X, HelpCircle, ArrowRight } from 'lucide-react';

interface MentalModelCardProps {
  onDismiss: () => void;
  onOpenFullExplanation: () => void;
}

export function MentalModelCard({ onDismiss, onOpenFullExplanation }: MentalModelCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-base font-medium text-gray-900">
              How Regulation Works
            </h3>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={onDismiss}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isExpanded && (
            <p className="text-sm text-gray-700">
              Signals show patterns.
              Responses are optional tools.
              You are always in control.
            </p>
          )}

          {isExpanded && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Signals show patterns.
                Responses are optional tools.
                You are always in control.
              </p>

              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="font-medium">Activity</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Signals</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-500">(Optional)</span>
                  <span className="font-medium">Responses</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Limits & Context</span>
                </div>
              </div>

              <ul className="text-sm text-gray-700 space-y-1.5">
                <li>• Signals are observations, not judgments</li>
                <li>• Nothing happens automatically</li>
                <li>• You can pause or dismiss anything</li>
                <li>• Nothing is required</li>
              </ul>

              <button
                onClick={onOpenFullExplanation}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
              >
                Read full explanation
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
