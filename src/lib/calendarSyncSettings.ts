/**
 * Calendar Sync Settings Service
 *
 * READ-ONLY service layer for accessing user calendar sync preferences.
 *
 * IMPORTANT CONSTRAINTS:
 * ❌ NO automatic syncing logic
 * ❌ NO side effects
 * ❌ NO auto-creation of missing settings
 * ❌ NO calendar writes
 * ❌ NO triggers invoked
 *
 * ✅ Pure read operations only
 * ✅ Explicit errors if settings missing
 * ✅ Type-safe access to sync preferences
 *
 * Calendar Authority:
 * - calendar_events is the ONLY canonical time authority
 * - All dated items (tasks, roadmap events, mind mesh events) reference it
 * - Other systems PROJECT INTO the calendar, they do not own time
 *
 * Sync Philosophy:
 * - Sync ≠ Visibility ≠ Sharing
 * - User controls what flows where
 * - Guardrails defaults to projecting outward (into Personal Spaces)
 * - Personal Spaces defaults to staying private (not feeding Guardrails)
 */

import { supabase } from './supabase';

export interface CalendarSyncSettings {
  userId: string;

  // Guardrails → Personal Spaces (default: enabled)
  syncGuardrailsToPersonal: boolean;
  syncRoadmapEvents: boolean;
  syncTasksWithDates: boolean;
  syncMindMeshEvents: boolean;

  // Personal Spaces → Guardrails (default: disabled)
  syncPersonalToGuardrails: boolean;
  requireConfirmationForPersonalSync: boolean;

  createdAt: string;
  updatedAt: string;
}

/**
 * Get calendar sync settings for a user.
 *
 * IMPORTANT: This function does NOT auto-create settings if missing.
 * If no settings exist, it throws an explicit error.
 *
 * This is intentional to ensure settings are created through
 * proper onboarding/UI flows in future prompts.
 *
 * @param userId - The user ID to fetch settings for
 * @returns CalendarSyncSettings
 * @throws Error if settings don't exist or query fails
 */
export async function getCalendarSyncSettings(userId: string): Promise<CalendarSyncSettings> {
  const { data, error } = await supabase
    .from('calendar_sync_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch calendar sync settings: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Calendar sync settings not found for user ${userId}. Settings must be created through onboarding.`);
  }

  return {
    userId: data.user_id,
    syncGuardrailsToPersonal: data.sync_guardrails_to_personal,
    syncRoadmapEvents: data.sync_roadmap_events,
    syncTasksWithDates: data.sync_tasks_with_dates,
    syncMindMeshEvents: data.sync_mindmesh_events,
    syncPersonalToGuardrails: data.sync_personal_to_guardrails,
    requireConfirmationForPersonalSync: data.require_confirmation_for_personal_sync,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Check if calendar sync settings exist for a user.
 *
 * This is a non-throwing helper for checking existence.
 *
 * @param userId - The user ID to check
 * @returns true if settings exist, false otherwise
 */
export async function hasCalendarSyncSettings(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('calendar_sync_settings')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if settings allow Guardrails → Personal Spaces sync.
 *
 * This is a convenience helper for checking if ANY Guardrails content
 * should appear in Personal Spaces calendar.
 *
 * NOTE: This does NOT perform the sync - it only checks the setting.
 *
 * @param settings - The calendar sync settings
 * @returns true if any Guardrails sync is enabled
 */
export function allowsGuardrailsToPersonalSync(settings: CalendarSyncSettings): boolean {
  return (
    settings.syncGuardrailsToPersonal &&
    (settings.syncRoadmapEvents || settings.syncTasksWithDates || settings.syncMindMeshEvents)
  );
}

/**
 * Type guard to check if settings allow Personal Spaces → Guardrails sync.
 *
 * This is a convenience helper for checking if Personal Spaces calendar
 * events should appear in Guardrails.
 *
 * NOTE: This does NOT perform the sync - it only checks the setting.
 *
 * @param settings - The calendar sync settings
 * @returns true if personal to Guardrails sync is enabled
 */
export function allowsPersonalToGuardrailsSync(settings: CalendarSyncSettings): boolean {
  return settings.syncPersonalToGuardrails;
}

/**
 * Type guard to check if confirmation is required for personal sync.
 *
 * @param settings - The calendar sync settings
 * @returns true if confirmation is required
 */
export function requiresConfirmationForPersonalSync(settings: CalendarSyncSettings): boolean {
  return settings.requireConfirmationForPersonalSync;
}
