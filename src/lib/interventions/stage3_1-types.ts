/**
 * Stage 3.1: Intervention Registry Types
 *
 * Type definitions for intervention registry and lifecycle tracking.
 * These match the database schema exactly.
 *
 * CRITICAL: This is infrastructure only - NO delivery, triggers, or notifications.
 */

export type InterventionKey =
  | 'implementation_intention_reminder'
  | 'context_aware_prompt'
  | 'scheduled_reflection_prompt'
  | 'simplified_view_mode'
  | 'task_decomposition_assistant'
  | 'focus_mode_suppression'
  | 'timeboxed_session'
  | 'project_scope_limiter'
  | 'accountability_partnership'
  | 'commitment_witness';

export type InterventionStatus = 'active' | 'paused' | 'disabled' | 'deleted';

export type InterventionCategory =
  | 'user_initiated_nudge'
  | 'friction_reduction'
  | 'self_imposed_constraint'
  | 'accountability';

export type LifecycleEventType =
  | 'intervention_created'
  | 'intervention_enabled'
  | 'intervention_paused'
  | 'intervention_disabled'
  | 'intervention_deleted'
  | 'intervention_edited'
  | 'safe_mode_paused_interventions'
  | 'safe_mode_unpaused_interventions';

export type LifecycleActor = 'user' | 'safe_mode';

export interface InterventionRegistryEntry {
  id: string;
  user_id: string;
  intervention_key: InterventionKey;
  created_by: 'user';
  created_at: string;
  status: InterventionStatus;
  enabled_at: string | null;
  paused_at: string | null;
  disabled_at: string | null;
  deleted_at: string | null;
  why_text: string | null;
  user_parameters: Record<string, unknown>;
  consent_granted_at: string;
  consent_scope: ConsentScope;
  paused_by_safe_mode: boolean;
  auto_resume_blocked: boolean;
  last_modified_at: string;
  last_modified_by: 'user';
}

export interface ConsentScope {
  intervention_type: InterventionKey;
  risk_disclosed: boolean;
  explanation_shown: boolean;
  consent_version: string;
}

export interface LifecycleEvent {
  id: string;
  user_id: string;
  intervention_id: string | null;
  event_type: LifecycleEventType;
  actor: LifecycleActor;
  created_at: string;
  meta: Record<string, unknown>;
}

export interface CreateInterventionInput {
  intervention_key: InterventionKey;
  why_text?: string;
  user_parameters: Record<string, unknown>;
  consent_scope: ConsentScope;
}

export interface UpdateInterventionInput {
  why_text?: string;
  user_parameters?: Record<string, unknown>;
}

export interface ListInterventionsFilters {
  status?: InterventionStatus;
  intervention_key?: InterventionKey;
  limit?: number;
  offset?: number;
}

export interface ListLifecycleEventsFilters {
  intervention_id?: string;
  limit?: number;
  offset?: number;
}

export interface InterventionMetadata {
  key: InterventionKey;
  name: string;
  category: InterventionCategory;
  description: string;
  riskNotes: string[];
  requiredFields: string[];
  exampleCopy: string;
}

export const INTERVENTION_METADATA: Record<InterventionKey, InterventionMetadata> = {
  implementation_intention_reminder: {
    key: 'implementation_intention_reminder',
    name: 'Implementation Intention Reminder',
    category: 'user_initiated_nudge',
    description: 'User creates an "If X, then Y" reminder that shows their chosen message when their chosen condition occurs.',
    riskNotes: [
      'Shame Risk: If user creates many reminders, may feel overwhelmed by "shoulds"',
      'Fixation Risk: User may create excessive reminders and feel controlled by them',
      'Burnout Risk: Too many reminders can create constant pressure',
      'Mitigation: Suggest starting with 1-2 reminders maximum',
    ],
    requiredFields: ['message_text', 'trigger_condition'],
    exampleCopy: 'If you want, you can create reminders for specific moments. You control the message, timing, and when it appears. You can pause or delete these anytime.',
  },
  context_aware_prompt: {
    key: 'context_aware_prompt',
    name: 'Context-Aware Prompt',
    category: 'user_initiated_nudge',
    description: 'User chooses to see their stated goal or intention when entering a specific context.',
    riskNotes: [
      'Habituation Risk: Seeing same prompt repeatedly may become noise',
      'Pressure Risk: Prompt at moment of action may feel like judgment',
      'Context-Switching Risk: Prompt may interrupt user\'s actual intention',
      'Mitigation: Suggest "weekly first time" frequency to start',
    ],
    requiredFields: ['prompt_text', 'context_trigger'],
    exampleCopy: 'If you want, you can see your written intention when you enter specific contexts. You write the message and choose when it appears. This is optional and you can disable it anytime.',
  },
  scheduled_reflection_prompt: {
    key: 'scheduled_reflection_prompt',
    name: 'Scheduled Reflection Prompt',
    category: 'user_initiated_nudge',
    description: 'User schedules an optional reflection prompt at a specific time/day.',
    riskNotes: [
      'Pressure Risk: Scheduled prompts may feel like obligation',
      'Shame Risk: Not reflecting may trigger "I should have" thoughts',
      'Perfectionism Risk: User may feel reflection must be "good enough"',
      'Mitigation: Emphasize that reflection is always optional',
    ],
    requiredFields: ['schedule_days', 'schedule_time'],
    exampleCopy: 'If you want, you can schedule optional reflection prompts. You choose when they appear and what they ask. Reflection is always optional - skipping is fine.',
  },
  simplified_view_mode: {
    key: 'simplified_view_mode',
    name: 'Simplified View Mode',
    category: 'friction_reduction',
    description: 'User chooses to temporarily hide secondary UI elements to reduce visual complexity.',
    riskNotes: [
      'Dependency Risk: User may forget how to access hidden features',
      'Over-Simplification Risk: User may hide something they actually need',
      'Learned Helplessness Risk: User may feel they "need" simplification always',
      'Mitigation: Always show "Restore Full View" button prominently',
    ],
    requiredFields: ['hidden_elements', 'applies_to_surfaces'],
    exampleCopy: 'If you want, you can temporarily hide secondary UI elements. You choose what to hide and can restore them anytime. This does not remove features - just hides them temporarily.',
  },
  task_decomposition_assistant: {
    key: 'task_decomposition_assistant',
    name: 'Task Decomposition Assistant',
    category: 'friction_reduction',
    description: 'User requests help breaking a task into smaller steps. User reviews and edits all suggested steps.',
    riskNotes: [
      'Over-Structuring Risk: Breaking tasks down may increase overwhelm',
      'Perfectionism Risk: User may feel all tasks must be decomposed perfectly',
      'Dependency Risk: User may feel unable to start tasks without decomposing',
      'Autonomy Risk: User may defer to system suggestions rather than own judgment',
      'Mitigation: Frame as optional tool, user always has final say',
    ],
    requiredFields: ['original_task_description'],
    exampleCopy: 'If you want, you can request help breaking tasks into smaller steps. You review and edit all suggestions. This is optional - many tasks don\'t need decomposition.',
  },
  focus_mode_suppression: {
    key: 'focus_mode_suppression',
    name: 'Focus Mode (Feature Suppression)',
    category: 'self_imposed_constraint',
    description: 'User activates Focus Mode which temporarily hides projects/features not related to chosen focus target.',
    riskNotes: [
      'Rigidity Risk: User may feel trapped in focus mode',
      'Guilt Risk: Exiting early may trigger "I failed" thoughts',
      'Binary Thinking Risk: User may see focus as "all or nothing"',
      'Context Change Risk: User\'s actual needs may change mid-session',
      'Mitigation: Easy exit always available, no tracking of "completion"',
    ],
    requiredFields: ['focus_target_id', 'hidden_features'],
    exampleCopy: 'If you want, you can start Focus Mode to hide unrelated projects. You choose what to focus on and how long. You can exit anytime - there\'s no penalty for stopping early.',
  },
  timeboxed_session: {
    key: 'timeboxed_session',
    name: 'Timeboxed Work Session',
    category: 'self_imposed_constraint',
    description: 'User sets a time limit for working on something and receives a gentle alert when time expires.',
    riskNotes: [
      'Time Pressure Risk: Timer may create anxiety',
      'Perfectionism Risk: User may feel they "must" complete in allotted time',
      'Interruption Risk: Alert may come at bad moment (deep in flow)',
      'Rigidity Risk: User may feel bound to timer even when inappropriate',
      'Mitigation: Frame as gentle boundary, not deadline; easy to extend or cancel',
    ],
    requiredFields: ['duration_minutes'],
    exampleCopy: 'If you want, you can set a timebox for your work session. You choose the duration and get a gentle alert when time expires. You can extend, cancel, or ignore the alert - it\'s just a boundary.',
  },
  project_scope_limiter: {
    key: 'project_scope_limiter',
    name: 'Project Scope Limiter',
    category: 'self_imposed_constraint',
    description: 'User explicitly limits which roadmap items, tracks, or features are visible to reduce scope overwhelm.',
    riskNotes: [
      'Blind Spot Risk: User may forget hidden items exist',
      'Dependency Risk: Hidden items may have dependencies user needs',
      'Over-Constraint Risk: Limiting too much may cause confusion',
      'False Security Risk: User may think hidden items don\'t need attention',
      'Mitigation: Always show count of hidden items, easy to restore',
    ],
    requiredFields: ['hidden_items_list'],
    exampleCopy: 'If you want, you can temporarily hide specific roadmap items or tracks. You choose what to hide and can restore anytime. Hidden items still exist - they\'re just not visible right now.',
  },
  accountability_partnership: {
    key: 'accountability_partnership',
    name: 'Accountability Partnership (1:1 Sharing)',
    category: 'accountability',
    description: 'User chooses to share specific project visibility with one other person for mutual support.',
    riskNotes: [
      'Social Pressure Risk: User may feel judged by partner',
      'Shame Risk: Partner seeing "lack of progress" may trigger shame',
      'Dependency Risk: User may defer decisions to partner',
      'Coercion Risk: Partner may pressure user (even unintentionally)',
      'Relationship Risk: Sharing may strain personal relationship',
      'Mitigation: Strict rules for partners, easy revocation, clear boundaries',
    ],
    requiredFields: ['partner_user_id', 'shared_project_id', 'visibility_level'],
    exampleCopy: 'If you want, you can share specific project visibility with one other person. You control exactly what they see and can stop sharing anytime. This is for mutual support, not monitoring.',
  },
  commitment_witness: {
    key: 'commitment_witness',
    name: 'Commitment Witness (View-Only Sharing)',
    category: 'accountability',
    description: 'User shares a specific commitment or goal with chosen person(s) for gentle accountability. Witness can see commitment but receives NO notifications or updates.',
    riskNotes: [
      'Public Pressure Risk: Even view-only sharing creates pressure',
      'Shame Risk: User may feel judged for not completing',
      'Perfectionism Risk: User may feel commitment must be met perfectly',
      'Relationship Risk: Not meeting commitment may affect relationship',
      'Mitigation: No completion tracking, no notifications to witnesses, easy revocation',
    ],
    requiredFields: ['commitment_text', 'witness_user_ids'],
    exampleCopy: 'If you want, you can share a commitment with chosen people. They see your written commitment only - no status, no notifications. You can revoke sharing anytime. This is gentle accountability, not monitoring.',
  },
};
