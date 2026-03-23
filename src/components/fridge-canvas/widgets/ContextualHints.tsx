/**
 * Contextual Hints Component
 * 
 * Non-intrusive suggestions that appear subtly to assist users
 * without interrupting their writing flow.
 */

import { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';

export interface ContextualHint {
  id: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface ContextualHintsProps {
  hints: ContextualHint[];
  onDismiss: (hintId: string) => void;
}

export function ContextualHints({ hints, onDismiss }: ContextualHintsProps) {
  if (hints.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-2 max-w-sm">
      {hints.map((hint) => (
        <div
          key={hint.id}
          className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-3 animate-fade-in"
        >
          <div className="flex items-start gap-2">
            <Lightbulb size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-900">{hint.message}</p>
              {hint.action && (
                <button
                  onClick={hint.action.onClick}
                  className="mt-2 text-xs text-blue-700 hover:text-blue-900 underline"
                >
                  {hint.action.label}
                </button>
              )}
            </div>
            {hint.dismissible !== false && (
              <button
                onClick={() => onDismiss(hint.id)}
                className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                aria-label="Dismiss hint"
              >
                <X size={14} className="text-blue-600" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Analyze text content and generate contextual hints
 */
export function analyzeContentForHints(
  text: string,
  unitType: string,
  unitCount: number
): ContextualHint[] {
  const hints: ContextualHint[] = [];

  // Long paragraph suggestion
  if (unitType === 'text' && text.length > 500 && text.split('\n').length === 1) {
    hints.push({
      id: 'long-paragraph',
      message: 'This paragraph is getting long. Consider converting to a list?',
      action: {
        label: 'Convert to bullets',
        onClick: () => {
          // This will be handled by the parent component
        },
      },
    });
  }

  // Many checklist items
  if (unitType === 'checklist' && unitCount > 5) {
    hints.push({
      id: 'many-checklist-items',
      message: 'You have many checklist items. Consider grouping them into sections?',
    });
  }

  return hints;
}
