/**
 * Ghost Explainer - Inline Ghost Container Hint
 *
 * Explains what ghost containers are and how to activate them.
 *
 * Rules:
 * - Appears near the first ghost when ghosts exist
 * - Shows only once per session (local state)
 * - Auto-hides after first activation
 * - Optional "Got it" dismiss
 * - Non-blocking, does not obstruct interaction
 */

import { X, Eye } from 'lucide-react';

interface GhostExplainerProps {
  position: { x: number; y: number };
  onDismiss: () => void;
}

export function GhostExplainer({ position, onDismiss }: GhostExplainerProps) {
  return (
    <div
      className="absolute z-40 pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 100}px`,
      }}
    >
      <div className="bg-blue-50 border border-blue-300 rounded-lg shadow-md p-3 max-w-xs">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
              <Eye size={14} className="text-blue-700" />
            </div>
            <span className="text-sm font-semibold text-blue-900">
              Ghost Container
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="text-blue-400 hover:text-blue-600"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-blue-800 mb-2">
          Ghosts represent existing items. Click to activate and work with them.
        </p>

        <button
          onClick={onDismiss}
          className="w-full text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 py-1.5 rounded"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
