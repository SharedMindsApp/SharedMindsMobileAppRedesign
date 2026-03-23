/**
 * Stage 3.3: Foreground Context Trigger Router
 *
 * Routes foreground context events to appropriate interventions.
 *
 * CRITICAL CONSTRAINTS:
 * - Foreground only (app open, user action)
 * - No background logic
 * - No timers or schedulers
 * - No notifications
 * - Safe Mode blocks ALL triggers
 * - At most ONE intervention per context action
 * - NO telemetry for triggers
 * - Deterministic selection (earliest created_at)
 * - Stage 3.5: Governance rules checked before delivery (NO logging of blocks)
 *
 * ALLOWED INTERVENTIONS IN 3.3:
 * - INT-001 (foreground subset only)
 * - INT-002 (foreground subset only)
 * - INT-003 remains MANUAL ONLY
 */

import { supabase } from '../supabase';
import type { InterventionRegistryEntry } from './stage3_1-types';
import type { ForegroundContextEvent } from './stage3_3-types';
import { checkGovernanceRules } from './stage3_5-service';

const ALLOWED_TRIGGERED_INTERVENTIONS = [
  'implementation_intention_reminder',
  'context_aware_prompt',
];

export async function matchInterventionForContext(
  userId: string,
  contextEvent: ForegroundContextEvent,
  context?: {
    focus_mode_active?: boolean;
    session_intervention_count?: number;
  }
): Promise<InterventionRegistryEntry | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('safe_mode_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.safe_mode_enabled) {
    return null;
  }

  const { data: interventions, error } = await supabase
    .from('interventions_registry')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .in('intervention_key', ALLOWED_TRIGGERED_INTERVENTIONS)
    .order('created_at', { ascending: true });

  if (error || !interventions || interventions.length === 0) {
    return null;
  }

  const matchedIntervention = interventions.find((intervention) => {
    const params = intervention.user_parameters as any;

    if (intervention.intervention_key === 'implementation_intention_reminder') {
      const triggerCondition = params.trigger_condition;
      return triggerCondition === contextEvent;
    }

    if (intervention.intervention_key === 'context_aware_prompt') {
      const contextTrigger = params.context_trigger;
      return contextTrigger === contextEvent;
    }

    return false;
  });

  if (!matchedIntervention) {
    return null;
  }

  const governanceCheck = await checkGovernanceRules(userId, {
    current_time: new Date(),
    focus_mode_active: context?.focus_mode_active,
    session_intervention_count: context?.session_intervention_count,
  });

  if (!governanceCheck.allowed) {
    return null;
  }

  return matchedIntervention;
}

export function isAllowedTriggeredIntervention(interventionKey: string): boolean {
  return ALLOWED_TRIGGERED_INTERVENTIONS.includes(interventionKey);
}
