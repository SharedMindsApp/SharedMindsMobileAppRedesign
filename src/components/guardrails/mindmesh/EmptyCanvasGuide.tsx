/**
 * Empty Canvas Guide - First-Time User Orientation
 *
 * Explains what the canvas is and what to expect when it's empty.
 *
 * Rules:
 * - Appears only when no containers exist
 * - No buttons or CTAs
 * - Auto-disappears when first container appears
 * - Optional dismiss (local state only)
 */

import { X, Sparkles } from 'lucide-react';

interface EmptyCanvasGuideProps {
  onDismiss?: () => void;
}

export function EmptyCanvasGuide({ onDismiss }: EmptyCanvasGuideProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-6 max-w-md pointer-events-auto">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Sparkles size={18} className="text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              Welcome to Mind Mesh
            </h3>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600"
              title="Dismiss"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <p>
            This canvas shows your project structure visually.
          </p>
          <p>
            Items from Guardrails appear here as <span className="font-medium text-gray-900">ghosts</span> —
            click one to activate it and bring it into your working view.
          </p>
          <p className="text-xs text-gray-500">
            The canvas starts empty. As you work in Guardrails, items will appear here automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
