/**
 * Stage 3.2: Accountability View Shell
 *
 * Displays accountability interventions when manually invoked.
 * INT-009: Accountability Partnership (1:1 Sharing)
 * INT-010: Commitment Witness (View-Only Sharing)
 *
 * CRITICAL:
 * - Display only what was explicitly shared
 * - No live updates or activity indicators
 * - No "last seen" or "progress" language
 * - Revocation controls always visible
 * - No tracking of access or engagement
 */

import { useNavigate } from 'react-router-dom';
import type { InterventionRegistryEntry } from '../../../lib/interventions/stage3_1-types';
import { INTERVENTION_METADATA } from '../../../lib/interventions/stage3_1-types';
import { X, Pause, Edit, XCircle, Users, AlertCircle } from 'lucide-react';

interface AccountabilityViewShellProps {
  intervention: InterventionRegistryEntry;
  onClose: () => void;
  onPause: () => void;
  onDisable: () => void;
}

export function AccountabilityViewShell({
  intervention,
  onClose,
  onPause,
  onDisable,
}: AccountabilityViewShellProps) {
  const navigate = useNavigate();
  const metadata = INTERVENTION_METADATA[intervention.intervention_key];
  const params = intervention.user_parameters as any;

  const isPartnership = intervention.intervention_key === 'accountability_partnership';
  const commitmentText = params.commitment_text;
  const visibilityLevel = params.visibility_level;
  const witnesses = params.witness_user_ids || [];
  const partner = params.partner_user_id;
  const sharingPurpose = params.sharing_purpose;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{metadata.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isPartnership ? 'View shared project details' : 'View your commitment'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {isPartnership ? (
        <div className="mb-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Shared with:</h4>
                <p className="text-sm text-gray-700">Partner ID: {partner}</p>
                {visibilityLevel && (
                  <p className="text-sm text-gray-600 mt-2">
                    Visibility: {visibilityLevel}
                  </p>
                )}
                {sharingPurpose && (
                  <p className="text-sm text-gray-600 mt-2">
                    Purpose: {sharingPurpose}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">Important:</p>
                <ul className="space-y-1">
                  <li>• Your partner can see what you specified in visibility level</li>
                  <li>• They receive no notifications or updates</li>
                  <li>• You can stop sharing anytime</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              This is for mutual support, not monitoring. No activity is tracked.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          {commitmentText && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Your commitment:</h4>
              <p className="text-gray-900 whitespace-pre-wrap">{commitmentText}</p>
            </div>
          )}

          {witnesses.length > 0 && (
            <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 mb-4">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Witnesses:</h4>
                  <p className="text-sm text-gray-700">{witnesses.length} person(s)</p>
                  <p className="text-sm text-gray-600 mt-2">
                    They can see your written commitment only - no status, no notifications.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">This is gentle accountability:</p>
                <ul className="space-y-1">
                  <li>• No completion tracking</li>
                  <li>• No notifications to witnesses</li>
                  <li>• You can revoke sharing anytime</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              This is gentle accountability, not monitoring. Nothing about your progress is shared.
            </p>
          </div>
        </div>
      )}

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
          You can revoke sharing by pausing or disabling this intervention. Nothing is tracked.
        </p>
      </div>
    </div>
  );
}
