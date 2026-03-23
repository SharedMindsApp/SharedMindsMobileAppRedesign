/**
 * Stage 3.4: Trigger Audit Service
 *
 * Provides pure, computed transparency for foreground context triggers.
 *
 * CRITICAL CONSTRAINTS:
 * - NO logging or recording
 * - NO counting or history
 * - NO behavioral inference
 * - NO delivery influence
 * - Read-only computed view ONLY
 *
 * This exists solely for user transparency and trust.
 */

import { supabase } from '../supabase';
import type { InterventionRegistryEntry } from './stage3_1-types';
import type { ForegroundContextEvent } from './stage3_3-types';

export interface ContextEligibility {
  context: ForegroundContextEvent;
  contextLabel: string;
  eligibleInterventions: EligibleInterventionInfo[];
  notEligibleInterventions: NotEligibleInterventionInfo[];
}

export interface EligibleInterventionInfo {
  intervention: InterventionRegistryEntry;
  reasons: string[];
  wouldShowFirst: boolean;
}

export interface NotEligibleInterventionInfo {
  intervention: InterventionRegistryEntry;
  blockingReason: string;
}

export interface TriggerAuditState {
  safeModeEnabled: boolean;
  contexts: ContextEligibility[];
}

const CONTEXT_LABELS: Record<ForegroundContextEvent, string> = {
  project_opened: 'Project Opened',
  focus_mode_started: 'Focus Mode Started',
  task_created: 'Task Created',
  task_completed: 'Task Completed',
};

const ALLOWED_TRIGGERED_INTERVENTIONS = [
  'implementation_intention_reminder',
  'context_aware_prompt',
];

export async function computeTriggerAudit(userId: string): Promise<TriggerAuditState> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('safe_mode_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  const safeModeEnabled = profile?.safe_mode_enabled || false;

  const { data: interventions } = await supabase
    .from('interventions_registry')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  const allInterventions = interventions || [];

  const contexts: ContextEligibility[] = [
    'project_opened',
    'focus_mode_started',
    'task_created',
    'task_completed',
  ].map((contextEvent) => {
    return computeContextEligibility(
      contextEvent as ForegroundContextEvent,
      allInterventions,
      safeModeEnabled
    );
  });

  return {
    safeModeEnabled,
    contexts,
  };
}

function computeContextEligibility(
  context: ForegroundContextEvent,
  allInterventions: InterventionRegistryEntry[],
  safeModeEnabled: boolean
): ContextEligibility {
  const eligible: EligibleInterventionInfo[] = [];
  const notEligible: NotEligibleInterventionInfo[] = [];

  for (const intervention of allInterventions) {
    const blockingReason = getBlockingReason(intervention, context, safeModeEnabled);

    if (blockingReason) {
      notEligible.push({
        intervention,
        blockingReason,
      });
    } else {
      const reasons = getEligibilityReasons(intervention);
      eligible.push({
        intervention,
        reasons,
        wouldShowFirst: false,
      });
    }
  }

  if (eligible.length > 0) {
    eligible[0].wouldShowFirst = true;
  }

  return {
    context,
    contextLabel: CONTEXT_LABELS[context],
    eligibleInterventions: eligible,
    notEligibleInterventions: notEligible,
  };
}

function getBlockingReason(
  intervention: InterventionRegistryEntry,
  context: ForegroundContextEvent,
  safeModeEnabled: boolean
): string | null {
  if (safeModeEnabled) {
    return 'Safe Mode is active';
  }

  if (intervention.status === 'paused') {
    return 'Intervention is paused';
  }

  if (intervention.status === 'disabled') {
    return 'Intervention is disabled';
  }

  if (!ALLOWED_TRIGGERED_INTERVENTIONS.includes(intervention.intervention_key)) {
    return 'Intervention type does not support automatic triggers';
  }

  const params = intervention.user_parameters as any;

  if (intervention.intervention_key === 'implementation_intention_reminder') {
    const triggerCondition = params.trigger_condition;
    if (triggerCondition !== context) {
      return 'Trigger condition does not match';
    }
  } else if (intervention.intervention_key === 'context_aware_prompt') {
    const contextTrigger = params.context_trigger;
    if (contextTrigger !== context) {
      return 'Trigger condition does not match';
    }
  }

  return null;
}

function getEligibilityReasons(intervention: InterventionRegistryEntry): string[] {
  const reasons: string[] = [];

  if (intervention.intervention_key === 'implementation_intention_reminder') {
    const params = intervention.user_parameters as any;
    reasons.push('You enabled this reminder');
    reasons.push(`It listens for "${getContextLabel(params.trigger_condition)}"`);
    reasons.push('Safe Mode is off');
  } else if (intervention.intervention_key === 'context_aware_prompt') {
    const params = intervention.user_parameters as any;
    reasons.push('You enabled this prompt');
    reasons.push(`It listens for "${getContextLabel(params.context_trigger)}"`);
    reasons.push('Safe Mode is off');
  }

  return reasons;
}

function getContextLabel(context: string): string {
  return CONTEXT_LABELS[context as ForegroundContextEvent] || context;
}
