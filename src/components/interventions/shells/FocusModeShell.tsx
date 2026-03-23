/**
 * Stage 3.2: Focus Mode Shell
 *
 * Activates focus mode when manually invoked.
 * INT-006: Focus Mode (Feature Suppression)
 * INT-008: Project Scope Limiter
 *
 * CRITICAL:
 * - Only activates via explicit "Start" click
 * - Shows what is hidden and what remains accessible
 * - Easy exit always available
 * - Exiting early is neutral and untracked
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InterventionRegistryEntry } from '../../../lib/interventions/stage3_1-types';
import { INTERVENTION_METADATA } from '../../../lib/interventions/stage3_1-types';
import { X, Pause, Edit, XCircle, AlertCircle, Target } from 'lucide-react';

interface FocusModeShellProps {
  intervention: InterventionRegistryEntry;
  onClose: () => void;
  onPause: () => void;
  onDisable: () => void;
}

export function FocusModeShell({
  intervention,
  onClose,
  onPause,
  onDisable,
}: FocusModeShellProps) {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const metadata = INTERVENTION_METADATA[intervention.intervention_key];
  const params = intervention.user_parameters as any;

  const focusTarget = params?.focus_target_id || 'current project';
  const hiddenFeatures = params?.hidden_features || params?.hidden_items_list || [];
  const duration = params.focus_duration_minutes;

  function handleStart() {
    setIsActive(true);
  }

  function handleExit() {
    setIsActive(false);
  }

  if (!isActive) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{metadata.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Click Start to begin</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Focus target:</h4>
                <p className="text-sm text-gray-700">{focusTarget}</p>
              </div>
            </div>
          </div>

          {duration && (
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Duration:</span> {duration} minutes (you can exit anytime)
              </p>
            </div>
          )}

          {hiddenFeatures.length > 0 && (
            <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">What will be hidden:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {hiddenFeatures.map((feature: string, i: number) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">You can exit anytime:</p>
                <ul className="space-y-1">
                  <li>• There is no penalty for stopping early</li>
                  <li>• Hidden features remain accessible via Exit button</li>
                  <li>• Nothing about your session is tracked</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {intervention.why_text && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Why you created this:</span> {intervention.why_text}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Focus Mode
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                navigate(`/regulation/edit/${intervention.id}`, { state: { intervention } });
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            This is optional. You can close without starting. Nothing is tracked.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Focus Mode Active</h3>
              <p className="text-sm text-gray-600">{focusTarget}</p>
            </div>
          </div>
          <button
            onClick={handleExit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Exit Focus Mode
          </button>
        </div>
      </div>

      {hiddenFeatures.length > 0 && (
        <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Currently hidden:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            {hiddenFeatures.map((feature: string, i: number) => (
              <li key={i}>• {feature}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={onDisable}
          className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Disable
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          You can exit anytime. Exiting early is fine. Nothing is tracked.
        </p>
      </div>
    </div>
  );
}
