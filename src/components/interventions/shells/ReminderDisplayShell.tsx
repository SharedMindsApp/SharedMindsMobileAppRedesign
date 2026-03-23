/**
 * Stage 3.2: Reminder Display Shell
 *
 * Displays user-created reminders when manually invoked.
 * INT-001: Implementation Intention Reminder
 * INT-002: Context-Aware Prompt
 *
 * CRITICAL: No tracking of views, dismissals, or responses.
 */

import { useNavigate } from 'react-router-dom';
import type { InterventionRegistryEntry } from '../../../lib/interventions/stage3_1-types';
import { INTERVENTION_METADATA } from '../../../lib/interventions/stage3_1-types';
import { X, Pause, Edit, XCircle } from 'lucide-react';

interface ReminderDisplayShellProps {
  intervention: InterventionRegistryEntry;
  onClose: () => void;
  onPause: () => void;
  onDisable: () => void;
}

export function ReminderDisplayShell({
  intervention,
  onClose,
  onPause,
  onDisable,
}: ReminderDisplayShellProps) {
  const navigate = useNavigate();
  const metadata = INTERVENTION_METADATA[intervention.intervention_key];
  const params = intervention.user_parameters as any;

  const messageText =
    params.message_text || params.prompt_text || 'No message configured';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{metadata.name}</h3>
          <p className="text-sm text-gray-500 mt-1">You created this reminder</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-gray-900 whitespace-pre-wrap">{messageText}</p>
      </div>

      {intervention.why_text && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Why you created this:</span> {intervention.why_text}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Created: {new Date(intervention.created_at).toLocaleDateString()}
        </div>
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
          <button
            onClick={onDisable}
            className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Disable
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          This is your reminder. You can close, pause, edit, or disable it anytime. Nothing is tracked here.
        </p>
      </div>
    </div>
  );
}
