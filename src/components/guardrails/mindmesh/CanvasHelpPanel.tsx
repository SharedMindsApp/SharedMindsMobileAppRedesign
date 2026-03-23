/**
 * Canvas Help Panel - Interaction Discovery Aid
 *
 * Shows users what actions are available on the canvas.
 * Makes implicit interactions (drag, click) discoverable.
 *
 * Rules:
 * - No tutorials or wizards
 * - Simple list of available actions
 * - Can be dismissed
 */

import { X, Mouse, Hand, Eye } from 'lucide-react';

interface CanvasHelpPanelProps {
  onClose: () => void;
  canEdit: boolean;
}

export function CanvasHelpPanel({ onClose, canEdit }: CanvasHelpPanelProps) {
  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Canvas Actions</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          title="Close help"
        >
          <X size={16} />
        </button>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded flex items-center justify-center">
            <Hand size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Move Container</div>
            <div className="text-xs text-gray-600">
              {canEdit ? 'Drag active containers to reposition' : 'Acquire lock to enable dragging'}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-50 rounded flex items-center justify-center">
            <Mouse size={16} className="text-green-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Activate Ghost</div>
            <div className="text-xs text-gray-600">
              Click on ghost containers (dashed border) to activate them
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-gray-50 rounded flex items-center justify-center">
            <Eye size={16} className="text-gray-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">View State</div>
            <div className="text-xs text-gray-600">
              Active containers have solid borders, ghosts have dashed borders
            </div>
          </div>
        </div>
      </div>

      {/* Lock Warning */}
      {!canEdit && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-amber-600">
            Canvas is currently locked. Use "Acquire Lock" to enable editing.
          </div>
        </div>
      )}
    </div>
  );
}
