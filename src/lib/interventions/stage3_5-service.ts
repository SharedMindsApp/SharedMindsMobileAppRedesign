/**
 * Stage 3.5: Governance Service
 *
 * User-defined meta-control for interventions.
 *
 * CRITICAL CONSTRAINTS:
 * - Limits are warnings only (never block)
 * - Rules constrain delivery eligibility (checked before delivery)
 * - NO telemetry (no counting of blocked deliveries)
 * - NO automatic enforcement
 * - User-authored only
 */

import { supabase } from '../supabase';
import type {
  GovernanceSettings,
  GovernanceRule,
  GovernanceRuleType,
  GovernanceCheckResult,
  LimitWarning,
  GovernanceOverview,
  TimeWindowParams,
  SessionCapParams,
  ContextExclusionParams,
} from './stage3_5-types';
import type { InterventionRegistryEntry } from './stage3_1-types';

export async function getGovernanceSettings(userId: string): Promise<GovernanceSettings | null> {
  const { data, error } = await supabase
    .from('intervention_governance_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertGovernanceSettings(
  userId: string,
  settings: Partial<Omit<GovernanceSettings, 'user_id' | 'created_at' | 'last_modified_at'>>
): Promise<GovernanceSettings> {
  const { data, error } = await supabase
    .from('intervention_governance_settings')
    .upsert({
      user_id: userId,
      ...settings,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listGovernanceRules(
  userId: string,
  filters?: { status?: string }
): Promise<GovernanceRule[]> {
  let query = supabase
    .from('intervention_governance_rules')
    .select('*')
    .eq('user_id', userId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createGovernanceRule(
  userId: string,
  ruleType: GovernanceRuleType,
  parameters: TimeWindowParams | SessionCapParams | ContextExclusionParams
): Promise<GovernanceRule> {
  const { data, error } = await supabase
    .from('intervention_governance_rules')
    .insert({
      user_id: userId,
      rule_type: ruleType,
      rule_parameters: parameters,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGovernanceRule(
  userId: string,
  ruleId: string,
  updates: Partial<Pick<GovernanceRule, 'rule_parameters' | 'status'>>
): Promise<GovernanceRule> {
  const { data, error } = await supabase
    .from('intervention_governance_rules')
    .update(updates)
    .eq('id', ruleId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGovernanceRule(userId: string, ruleId: string): Promise<void> {
  const { error } = await supabase
    .from('intervention_governance_rules')
    .update({ status: 'deleted' })
    .eq('id', ruleId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function checkGovernanceRules(
  userId: string,
  context: {
    current_time?: Date;
    focus_mode_active?: boolean;
    session_intervention_count?: number;
  }
): Promise<GovernanceCheckResult> {
  const rules = await listGovernanceRules(userId, { status: 'active' });

  for (const rule of rules) {
    const result = evaluateRule(rule, context);
    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

function evaluateRule(
  rule: GovernanceRule,
  context: {
    current_time?: Date;
    focus_mode_active?: boolean;
    session_intervention_count?: number;
  }
): GovernanceCheckResult {
  switch (rule.rule_type) {
    case 'time_window':
      return evaluateTimeWindow(rule, context.current_time || new Date());
    case 'session_cap':
      return evaluateSessionCap(rule, context.session_intervention_count || 0);
    case 'context_exclusion':
      return evaluateContextExclusion(rule, context);
    default:
      return { allowed: true };
  }
}

function evaluateTimeWindow(rule: GovernanceRule, currentTime: Date): GovernanceCheckResult {
  const params = rule.rule_parameters as TimeWindowParams;

  if (params.allowed_days && params.allowed_days.length > 0) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[currentTime.getDay()];

    if (!params.allowed_days.includes(currentDay)) {
      return {
        allowed: false,
        blocking_rule: rule,
        reason: 'Current day is not in allowed days',
      };
    }
  }

  if (params.start_time && params.end_time) {
    const currentTimeStr = currentTime.toTimeString().substring(0, 5);

    if (currentTimeStr < params.start_time || currentTimeStr > params.end_time) {
      return {
        allowed: false,
        blocking_rule: rule,
        reason: 'Current time is outside allowed time range',
      };
    }
  }

  return { allowed: true };
}

function evaluateSessionCap(rule: GovernanceRule, sessionCount: number): GovernanceCheckResult {
  const params = rule.rule_parameters as SessionCapParams;

  if (sessionCount >= params.max_per_session) {
    return {
      allowed: false,
      blocking_rule: rule,
      reason: 'Session intervention cap reached',
    };
  }

  return { allowed: true };
}

function evaluateContextExclusion(
  rule: GovernanceRule,
  context: { focus_mode_active?: boolean }
): GovernanceCheckResult {
  const params = rule.rule_parameters as ContextExclusionParams;

  if (params.excluded_contexts.includes('focus_mode') && context.focus_mode_active) {
    return {
      allowed: false,
      blocking_rule: rule,
      reason: 'Interventions are excluded during Focus Mode',
    };
  }

  return { allowed: true };
}

export async function computeLimitWarnings(
  userId: string,
  interventions: InterventionRegistryEntry[]
): Promise<LimitWarning[]> {
  const settings = await getGovernanceSettings(userId);
  if (!settings) return [];

  const warnings: LimitWarning[] = [];

  const activeCount = interventions.filter((i) => i.status === 'active').length;
  if (settings.max_active_interventions && activeCount > settings.max_active_interventions) {
    warnings.push({
      limit_type: 'max_active',
      limit_value: settings.max_active_interventions,
      current_value: activeCount,
      message: `You set a personal limit of ${settings.max_active_interventions} active interventions. You currently have ${activeCount} active.`,
    });
  }

  const reminderCount = interventions.filter(
    (i) => i.status === 'active' && i.intervention_key === 'implementation_intention_reminder'
  ).length;
  if (settings.max_reminders && reminderCount > settings.max_reminders) {
    warnings.push({
      limit_type: 'max_reminders',
      limit_value: settings.max_reminders,
      current_value: reminderCount,
      message: `You set a personal limit of ${settings.max_reminders} reminders. You currently have ${reminderCount} active.`,
    });
  }

  return warnings;
}

export async function computeGovernanceOverview(
  userId: string,
  interventions: InterventionRegistryEntry[]
): Promise<GovernanceOverview> {
  const total_active = interventions.filter((i) => i.status === 'active').length;
  const total_paused = interventions.filter((i) => i.status === 'paused').length;
  const total_disabled = interventions.filter((i) => i.status === 'disabled').length;

  const breakdown_by_category: Record<string, number> = {
    'User-Initiated Nudges': 0,
    'Friction Reduction': 0,
    'Self-Imposed Constraints': 0,
    Accountability: 0,
  };

  for (const intervention of interventions.filter((i) => i.status === 'active')) {
    const category = getCategoryForIntervention(intervention.intervention_key);
    breakdown_by_category[category]++;
  }

  const active_warnings = await computeLimitWarnings(userId, interventions);

  return {
    total_active,
    total_paused,
    total_disabled,
    breakdown_by_category,
    active_warnings,
  };
}

function getCategoryForIntervention(key: string): string {
  switch (key) {
    case 'implementation_intention_reminder':
    case 'context_aware_prompt':
      return 'User-Initiated Nudges';
    case 'scheduled_reflection_prompt':
      return 'Accountability';
    default:
      return 'Self-Imposed Constraints';
  }
}

export async function pauseAllInterventions(userId: string): Promise<void> {
  const { error } = await supabase
    .from('interventions_registry')
    .update({ status: 'paused' })
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null);

  if (error) throw error;
}

export async function pauseInterventionsByType(
  userId: string,
  interventionKey: string
): Promise<void> {
  const { error } = await supabase
    .from('interventions_registry')
    .update({ status: 'paused' })
    .eq('user_id', userId)
    .eq('intervention_key', interventionKey)
    .eq('status', 'active')
    .is('deleted_at', null);

  if (error) throw error;
}

export async function pauseAllExceptManual(userId: string): Promise<void> {
  const { data: interventions } = await supabase
    .from('interventions_registry')
    .select('id, user_parameters')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null);

  if (!interventions) return;

  const toUpdate = interventions.filter((i) => {
    const params = i.user_parameters as any;
    return params.trigger_condition || params.context_trigger;
  });

  if (toUpdate.length === 0) return;

  const { error } = await supabase
    .from('interventions_registry')
    .update({ status: 'paused' })
    .in('id', toUpdate.map((i) => i.id));

  if (error) throw error;
}
