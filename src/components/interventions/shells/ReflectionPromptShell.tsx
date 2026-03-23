/**
 * Stage 3.2: Reflection Prompt Shell
 *
 * Displays optional reflection prompt when manually invoked.
 * INT-003: Scheduled Reflection Prompt
 *
 * CRITICAL:
 * - Reflection is always optional (skipping is fine)
 * - No tracking of completion or responses
 * - User text shown verbatim
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InterventionRegistryEntry } from '../../../lib/interventions/stage3_1-types';
import { INTERVENTION_METADATA } from '../../../lib/interventions/stage3_1-types';
import { X, Pause, Edit, XCircle } from 'lucide-react';

interface ReflectionPromptShellProps {
  intervention: InterventionRegistryEntry;
  onClose: () => void;
  onPause: () => void;
  onDisable: () => void;
}

export function ReflectionPromptShell({
  intervention,
  onClose,
  onPause,
  onDisable,
}: ReflectionPromptShellProps) {
  const navigate = useNavigate();
  const [reflectionText, setReflectionText] = useState('');
  const metadata = INTERVENTION_METADATA[intervention.intervention_key];
  const params = intervention.user_parameters as any;

  const promptQuestion = params.prompt_question || 'Take a moment to reflect.';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{metadata.name}</h3>
          <p className="text-sm text-gray-500 mt-1">Optional reflection - skipping is fine</p>
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
          <p className="text-gray-900 font-medium">{promptQuestion}</p>
        </div>

        <textarea
          value={reflectionText}
          onChange={(e) => setReflectionText(e.target.value)}
          placeholder="If you want to write something, you can. This is just for you - nothing is saved automatically."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={6}
        />
        <p className="text-xs text-gray-500 mt-2">
          This space is for your own reflection. Nothing typed here is tracked or saved.
        </p>
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
          Reflection is optional. You can close this anytime without reflecting. Nothing is tracked.
        </p>
      </div>
    </div>
  );
}
