/**
 * Locked Canvas Guide - Read-Only State Explanation
 *
 * Explains when the canvas is locked and read-only.
 *
 * Rules:
 * - Appears when canvas locked by another user
 * - Purely informational
 * - Does not replace lock status bar
 * - Auto-dismissible
 * - Does not block view
 */

import { X, Lock } from 'lucide-react';

interface LockedCanvasGuideProps {
  lockedBy?: string;
  onDismiss: () => void;
}

export function LockedCanvasGuide({ lockedBy, onDismiss }: LockedCanvasGuideProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="bg-amber-50 border border-amber-300 rounded-lg shadow-lg p-4 max-w-sm pointer-events-auto">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-100 rounded flex items-center justify-center">
              <Lock size={16} className="text-amber-700" />
            </div>
            <h3 className="text-sm font-semibold text-amber-900">
              Canvas is Read-Only
            </h3>
          </div>
          <button
            onClick={onDismiss}
            className="text-amber-400 hover:text-amber-600"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 text-sm text-amber-800">
          <p>
            This canvas is currently locked{lockedBy ? ` by ${lockedBy}` : ' by another user'}.
          </p>
          <p className="text-xs">
            You can view the canvas, but editing is disabled. Use "Acquire Lock" to enable editing.
          </p>
        </div>
      </div>
    </div>
  );
}
