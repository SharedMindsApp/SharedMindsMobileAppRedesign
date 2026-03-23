import { useState } from 'react';
import { Sparkles, Eye, Edit, RotateCcw, X } from 'lucide-react';
import { getPreset } from '../../lib/regulation/presetRegistry';

interface ActivePresetBannerProps {
  presetId: string;
  appliedAt: string;
  onViewChanges: () => void;
  onEdit: () => void;
  onRevert: () => void;
}

export function ActivePresetBanner({ presetId, appliedAt, onViewChanges, onEdit, onRevert }: ActivePresetBannerProps) {
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const preset = getPreset(presetId);

  if (!preset) return null;

  const appliedDate = new Date(appliedAt);
  const daysAgo = Math.floor((Date.now() - appliedDate.getTime()) / (24 * 60 * 60 * 1000));
  const timeDisplay = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;

  if (showRevertConfirm) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium text-amber-900">Revert Preset?</p>
            <p className="text-sm text-amber-800 mt-1">
              This will restore settings to their state before you applied "{preset.name}".
              Any changes you made after applying will remain.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => {
              onRevert();
              setShowRevertConfirm(false);
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
          >
            Revert Preset
          </button>
          <button
            onClick={() => setShowRevertConfirm(false)}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-900">
              Preset applied: {preset.name}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Applied {timeDisplay}. {preset.shortDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={onViewChanges}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        >
          <Eye className="w-4 h-4" />
          View Changes
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => setShowRevertConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Revert
        </button>
      </div>
    </div>
  );
}
