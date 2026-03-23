/**
 * Stage 3.2: Intervention Invocation Modal
 *
 * Wrapper that routes to appropriate intervention shell based on type.
 * Handles pre-checks and Safe Mode enforcement.
 *
 * CRITICAL: This is manual invocation only - NO automation.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  canInvokeIntervention,
  type InvocationCheckResult,
} from '../../lib/interventions/stage3_2-invocation';
import {
  pauseIntervention,
  disableIntervention,
  InterventionServiceError,
} from '../../lib/interventions/stage3_1-service';
import type { InterventionRegistryEntry } from '../../lib/interventions/stage3_1-types';
import { ReminderDisplayShell } from './shells/ReminderDisplayShell';
import { ReflectionPromptShell } from './shells/ReflectionPromptShell';
import { SimplifiedViewShell } from './shells/SimplifiedViewShell';
import { FocusModeShell } from './shells/FocusModeShell';
import { TimeboxShell } from './shells/TimeboxShell';
import { AccountabilityViewShell } from './shells/AccountabilityViewShell';
import { AlertCircle } from 'lucide-react';

interface InterventionInvocationModalProps {
  intervention: InterventionRegistryEntry;
  onClose: () => void;
  onInterventionChanged?: () => void;
}

export function InterventionInvocationModal({
  intervention,
  onClose,
  onInterventionChanged,
}: InterventionInvocationModalProps) {
  const { user } = useAuth();
  const [checkResult, setCheckResult] = useState<InvocationCheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    performPreChecks();
  }, [intervention.id, user]);

  async function performPreChecks() {
    if (!user) return;

    setChecking(true);
    try {
      const result = await canInvokeIntervention(user.id, intervention.id);
      setCheckResult(result);
    } catch (err) {
      console.error('Pre-check failed:', err);
      setCheckResult({
        canInvoke: false,
        reason: 'check_failed',
        neutralMessage: 'Could not verify intervention status.',
      });
    } finally {
      setChecking(false);
    }
  }

  async function handlePause() {
    if (!user || actionLoading) return;

    setActionLoading(true);
    try {
      await pauseIntervention(user.id, intervention.id);
      onInterventionChanged?.();
      onClose();
    } catch (err) {
      console.error('Failed to pause:', err);
      alert(err instanceof Error ? err.message : 'Failed to pause intervention');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisable() {
    if (!user || actionLoading) return;
    if (!confirm('Disable this intervention? You can re-enable it later.')) return;

    setActionLoading(true);
    try {
      await disableIntervention(user.id, intervention.id);
      onInterventionChanged?.();
      onClose();
    } catch (err) {
      console.error('Failed to disable:', err);
      alert(err instanceof Error ? err.message : 'Failed to disable intervention');
    } finally {
      setActionLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Checking intervention...</p>
        </div>
      </div>
    );
  }

  if (!checkResult?.canInvoke) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cannot invoke intervention</h3>
              <p className="text-sm text-gray-700">{checkResult?.neutralMessage}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shellProps = {
    intervention,
    onClose,
    onPause: handlePause,
    onDisable: handleDisable,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="my-8">
        {intervention.intervention_key === 'implementation_intention_reminder' && (
          <ReminderDisplayShell {...shellProps} />
        )}
        {intervention.intervention_key === 'context_aware_prompt' && (
          <ReminderDisplayShell {...shellProps} />
        )}
        {intervention.intervention_key === 'scheduled_reflection_prompt' && (
          <ReflectionPromptShell {...shellProps} />
        )}
        {intervention.intervention_key === 'simplified_view_mode' && (
          <SimplifiedViewShell {...shellProps} />
        )}
        {intervention.intervention_key === 'task_decomposition_assistant' && (
          <SimplifiedViewShell {...shellProps} />
        )}
        {intervention.intervention_key === 'focus_mode_suppression' && (
          <FocusModeShell {...shellProps} />
        )}
        {intervention.intervention_key === 'project_scope_limiter' && (
          <FocusModeShell {...shellProps} />
        )}
        {intervention.intervention_key === 'timeboxed_session' && (
          <TimeboxShell {...shellProps} />
        )}
        {intervention.intervention_key === 'accountability_partnership' && (
          <AccountabilityViewShell {...shellProps} />
        )}
        {intervention.intervention_key === 'commitment_witness' && (
          <AccountabilityViewShell {...shellProps} />
        )}
      </div>
    </div>
  );
}
