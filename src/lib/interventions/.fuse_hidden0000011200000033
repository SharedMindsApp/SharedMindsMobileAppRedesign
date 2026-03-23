/**
 * Stage 3.2: Manual Intervention Invocation Service
 *
 * Service layer for manual (user-invoked only) intervention delivery.
 *
 * CRITICAL: This is manual invocation only - NO automation, triggers, or scheduling.
 * Interventions only execute when user explicitly clicks.
 *
 * FORBIDDEN:
 * - Automatic trigger evaluation
 * - Background jobs or schedulers
 * - Time-based invocation
 * - Pattern-based invocation
 * - Telemetry beyond lifecycle events
 * - Adherence or effectiveness tracking
 */

import { supabase } from '../supabase';
import type { InterventionRegistryEntry } from './stage3_1-types';
import { getIntervention } from './stage3_1-service';

export interface InvocationCheckResult {
  canInvoke: boolean;
  reason?: string;
  neutralMessage?: string;
}

export async function canInvokeIntervention(
  userId: string,
  interventionId: string
): Promise<InvocationCheckResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('safe_mode_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.safe_mode_enabled) {
    return {
      canInvoke: false,
      reason: 'safe_mode_active',
      neutralMessage: 'Interventions are paused while Safe Mode is active. You can turn Safe Mode off to use them again.',
    };
  }

  const intervention = await getIntervention(userId, interventionId);

  if (!intervention) {
    return {
      canInvoke: false,
      reason: 'not_found',
      neutralMessage: 'This intervention was not found.',
    };
  }

  if (intervention.status !== 'active') {
    return {
      canInvoke: false,
      reason: 'not_active',
      neutralMessage: `This intervention is ${intervention.status}. You can enable it from the Interventions page.`,
    };
  }

  return { canInvoke: true };
}

export async function getActiveInterventionsForManualInvocation(
  userId: string
): Promise<InterventionRegistryEntry[]> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('safe_mode_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.safe_mode_enabled) {
    return [];
  }

  const { data, error } = await supabase
    .from('interventions_registry')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get active interventions:', error);
    return [];
  }

  return (data as InterventionRegistryEntry[]) || [];
}
