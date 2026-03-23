/**
 * Stage 3.5: Intervention Governance Types
 *
 * User-defined limits and rules for meta-control.
 *
 * CRITICAL CONSTRAINTS:
 * - All limits are user-authored only (no system recommendations)
 * - Limits are warnings, NOT enforcement
 * - NO telemetry fields
 * - NO behavioral inference
 * - Governance rules constrain availability, not users
 */

export interface GovernanceSettings {
  user_id: string;
  max_active_interventions: number | null;
  max_reminders: number | null;
  allowed_days: string[] | null;
  allowed_time_range: TimeRange | null;
  session_intervention_cap: number | null;
  created_at: string;
  last_modified_at: string;
}

export interface TimeRange {
  start_time: string;
  end_time: string;
}

export type GovernanceRuleType = 'time_window' | 'session_cap' | 'context_exclusion';

export type GovernanceRuleStatus = 'active' | 'paused' | 'deleted';

export interface GovernanceRule {
  id: string;
  user_id: string;
  rule_type: GovernanceRuleType;
  rule_parameters: TimeWindowParams | SessionCapParams | ContextExclusionParams;
  status: GovernanceRuleStatus;
  created_at: string;
  updated_at: string;
}

export interface TimeWindowParams {
  type: 'time_window';
  allowed_days?: string[];
  start_time?: string;
  end_time?: string;
}

export interface SessionCapParams {
  type: 'session_cap';
  max_per_session: number;
}

export interface ContextExclusionParams {
  type: 'context_exclusion';
  excluded_contexts: string[];
}

export interface GovernanceCheckResult {
  allowed: boolean;
  blocking_rule?: GovernanceRule;
  reason?: string;
}

export interface LimitWarning {
  limit_type: 'max_active' | 'max_reminders';
  limit_value: number;
  current_value: number;
  message: string;
}

export interface GovernanceOverview {
  total_active: number;
  total_paused: number;
  total_disabled: number;
  breakdown_by_category: Record<string, number>;
  active_warnings: LimitWarning[];
}
