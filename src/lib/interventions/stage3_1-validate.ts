/**
 * Stage 3.1: User Parameters Validation
 *
 * Validates user_parameters structure for each intervention type.
 * This ensures required fields exist - NOT recommendations or defaults.
 *
 * CRITICAL: No "most people choose..." or system defaults.
 * Only validate structure, not content.
 */

import { z } from 'zod';
import type { InterventionKey } from './stage3_1-types';

export const implementationIntentionReminderSchema = z.object({
  message_text: z.string().min(1, 'Message text is required'),
  trigger_condition: z.string().min(1, 'Trigger condition is required'),
  active_projects: z.array(z.string()).optional(),
  active_days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const contextAwarePromptSchema = z.object({
  prompt_text: z.string().min(1, 'Prompt text is required'),
  context_trigger: z.string().min(1, 'Context trigger is required'),
  target_project_id: z.string().optional(),
  show_frequency: z.enum(['every_time', 'daily_first_time', 'weekly_first_time']).optional(),
});

export const scheduledReflectionPromptSchema = z.object({
  prompt_question: z.string().optional(),
  schedule_days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).min(1, 'At least one day is required'),
  schedule_time: z.string().min(1, 'Schedule time is required'),
  applies_to_project: z.string().optional(),
});

export const simplifiedViewModeSchema = z.object({
  hidden_elements: z.array(z.string()).min(1, 'At least one element to hide is required'),
  applies_to_surfaces: z.array(z.string()).min(1, 'At least one surface is required'),
  duration_minutes: z.number().positive().optional(),
});

export const taskDecompositionAssistantSchema = z.object({
  original_task_description: z.string().min(1, 'Task description is required'),
  suggested_steps: z.array(z.string()).optional(),
  keep_or_replace: z.enum(['keep', 'replace']).optional(),
});

export const focusModeSuppressionSchema = z.object({
  focus_target_id: z.string().min(1, 'Focus target is required'),
  focus_duration_minutes: z.number().positive().optional(),
  hidden_features: z.array(z.string()).min(1, 'At least one feature to hide is required'),
  override_allowed: z.boolean().optional(),
});

export const timeboxedSessionSchema = z.object({
  duration_minutes: z.number().positive().min(1, 'Duration is required'),
  work_description: z.string().optional(),
  alert_type: z.enum(['silent_notification', 'gentle_sound', 'visual_only']).optional(),
  auto_extend_option: z.boolean().optional(),
});

export const projectScopeLimiterSchema = z.object({
  hidden_items_list: z.array(z.string()).min(1, 'At least one item to hide is required'),
  hidden_tracks: z.array(z.string()).optional(),
  hidden_date_range: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  limiter_reason: z.string().optional(),
});

export const accountabilityPartnershipSchema = z.object({
  partner_user_id: z.string().min(1, 'Partner user ID is required'),
  shared_project_id: z.string().min(1, 'Shared project ID is required'),
  visibility_level: z.enum(['milestones_only', 'roadmap', 'full_access']),
  shared_elements: z.array(z.string()).optional(),
  sharing_purpose: z.string().optional(),
});

export const commitmentWitnessSchema = z.object({
  commitment_text: z.string().min(1, 'Commitment text is required'),
  witness_user_ids: z.array(z.string()).min(1, 'At least one witness is required'),
  visible_until_date: z.string().optional(),
  commitment_context: z.string().optional(),
});

const userParametersSchemas: Record<InterventionKey, z.ZodType<any>> = {
  implementation_intention_reminder: implementationIntentionReminderSchema,
  context_aware_prompt: contextAwarePromptSchema,
  scheduled_reflection_prompt: scheduledReflectionPromptSchema,
  simplified_view_mode: simplifiedViewModeSchema,
  task_decomposition_assistant: taskDecompositionAssistantSchema,
  focus_mode_suppression: focusModeSuppressionSchema,
  timeboxed_session: timeboxedSessionSchema,
  project_scope_limiter: projectScopeLimiterSchema,
  accountability_partnership: accountabilityPartnershipSchema,
  commitment_witness: commitmentWitnessSchema,
};

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateUserParameters(
  interventionKey: InterventionKey,
  userParameters: Record<string, unknown>
): ValidationResult {
  const schema = userParametersSchemas[interventionKey];

  if (!schema) {
    if (import.meta.env.DEV) {
      console.warn('[Stage3 Validation] Unknown intervention key:', interventionKey);
    }
    return {
      valid: false,
      errors: [`Unknown intervention key: ${interventionKey}`],
    };
  }

  // Use safeParse to prevent throws
  const result = schema.safeParse(userParameters);

  if (result.success) {
    return { valid: true };
  }

  const errorMessages = (result.error?.errors ?? []).map((e) => {
    const path = Array.isArray(e.path) ? e.path.join('.') : 'unknown';
    return `${path}: ${e.message}`;
  });

  if (import.meta.env.DEV) {
    console.warn('[Stage3 Validation] Validation failed:', {
      interventionKey,
      errors: result.error?.errors ?? [],
      errorMessages,
    });
  }

  return {
    valid: false,
    errors: errorMessages.length > 0 ? errorMessages : ['Validation failed'],
  };
}

export function getRequiredFields(interventionKey: InterventionKey): string[] {
  try {
    const schema = userParametersSchemas[interventionKey];
    if (!schema || !(schema instanceof z.ZodObject)) {
      if (import.meta.env.DEV) {
        console.warn('[Stage3 Validation] Cannot get required fields for:', interventionKey);
      }
      return [];
    }

    const shape = schema.shape;
    const requiredFields: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      if (value && typeof value === 'object' && 'isOptional' in value && !value.isOptional()) {
        requiredFields.push(key);
      }
    }

    return requiredFields;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[Stage3 Validation] Error getting required fields:', error);
    }
    return [];
  }
}
