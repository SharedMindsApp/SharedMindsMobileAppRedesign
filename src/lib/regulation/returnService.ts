/**
 * Stage 4.4: Return Detection Service
 *
 * Detects inactivity gaps and provides calm re-entry support.
 *
 * Principles:
 * - Foreground only (no background jobs)
 * - No guilt language
 * - No automatic enforcement
 * - All context capture is optional
 */

import { supabase } from '../supabase';
import type {
  ReturnContext,
  ReturnDetectionResult,
  ReturnContextInput,
  ReorientationInfo,
  ReturnBehaviorPreference,
} from './returnTypes';

const INACTIVITY_THRESHOLD_DAYS = 7;

/**
 * Detect if user is returning after an inactivity gap
 * Call this on app open or first navigation to Regulation Hub
 */
export async function detectReturn(userId: string): Promise<ReturnDetectionResult> {
  try {
    // Get last meaningful activity from context events
    const { data: lastEvent } = await supabase
      .from('regulation_events')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastActivityAt = lastEvent?.created_at || null;

    if (!lastActivityAt) {
      return {
        isReturning: false,
        gapDays: null,
        lastActivityAt: null,
        existingContext: null,
        shouldShowBanner: false,
        shouldShowReorientation: false,
      };
    }

    // Calculate gap
    const lastActivity = new Date(lastActivityAt);
    const now = new Date();
    const gapMs = now.getTime() - lastActivity.getTime();
    const gapDays = Math.floor(gapMs / (1000 * 60 * 60 * 24));

    // Check if gap exceeds threshold
    if (gapDays < INACTIVITY_THRESHOLD_DAYS) {
      return {
        isReturning: false,
        gapDays,
        lastActivityAt,
        existingContext: null,
        shouldShowBanner: false,
        shouldShowReorientation: false,
      };
    }

    // Check if we already have a return context for this gap
    const { data: existingContext } = await supabase
      .from('regulation_return_contexts')
      .select('*')
      .eq('user_id', userId)
      .gte('absence_detected_at', lastActivityAt)
      .order('absence_detected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingContext) {
      return {
        isReturning: true,
        gapDays,
        lastActivityAt,
        existingContext: existingContext as ReturnContext,
        shouldShowBanner: false, // Already handled
        shouldShowReorientation: !existingContext.reorientation_shown,
      };
    }

    // New return detected
    return {
      isReturning: true,
      gapDays,
      lastActivityAt,
      existingContext: null,
      shouldShowBanner: true,
      shouldShowReorientation: true,
    };
  } catch (error) {
    console.error('Error detecting return:', error);
    return {
      isReturning: false,
      gapDays: null,
      lastActivityAt: null,
      existingContext: null,
      shouldShowBanner: false,
      shouldShowReorientation: false,
    };
  }
}

/**
 * Create initial return context (when banner is shown)
 */
export async function createReturnContext(
  userId: string,
  lastActivityAt: string,
  gapDays: number
): Promise<ReturnContext | null> {
  try {
    const { data, error } = await supabase
      .from('regulation_return_contexts')
      .insert({
        user_id: userId,
        absence_detected_at: new Date().toISOString(),
        last_activity_before_absence: lastActivityAt,
        gap_duration_days: gapDays,
        banner_shown: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ReturnContext;
  } catch (error) {
    console.error('Error creating return context:', error);
    return null;
  }
}

/**
 * Update return context with user-provided information
 */
export async function updateReturnContext(
  contextId: string,
  input: ReturnContextInput
): Promise<ReturnContext | null> {
  try {
    const updates: any = {
      context_provided: true,
    };

    if (input.reason_category) {
      updates.reason_category = input.reason_category;
    }

    if (input.user_note) {
      updates.user_note = input.user_note;
    }

    if (input.behavior_preference) {
      updates.behavior_preference = input.behavior_preference;

      // Set preference expiry for quiet/strong_only (7 days)
      if (input.behavior_preference === 'quiet' || input.behavior_preference === 'strong_only') {
        const until = new Date();
        until.setDate(until.getDate() + 7);
        updates.behavior_preference_until = until.toISOString();
      }

      // For safe_mode, we'll update profile separately
    }

    const { data, error } = await supabase
      .from('regulation_return_contexts')
      .update(updates)
      .eq('id', contextId)
      .select()
      .single();

    if (error) throw error;
    return data as ReturnContext;
  } catch (error) {
    console.error('Error updating return context:', error);
    return null;
  }
}

/**
 * Mark banner as dismissed
 */
export async function dismissReturnBanner(contextId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('regulation_return_contexts')
      .update({ banner_dismissed: true })
      .eq('id', contextId);

    return !error;
  } catch (error) {
    console.error('Error dismissing banner:', error);
    return false;
  }
}

/**
 * Mark reorientation as shown
 */
export async function markReorientationShown(contextId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('regulation_return_contexts')
      .update({ reorientation_shown: true })
      .eq('id', contextId);

    return !error;
  } catch (error) {
    console.error('Error marking reorientation shown:', error);
    return false;
  }
}

/**
 * Get current behavior preference (if active)
 */
export async function getActiveBehaviorPreference(
  userId: string
): Promise<ReturnBehaviorPreference | null> {
  try {
    const now = new Date().toISOString();

    const { data } = await supabase
      .from('regulation_return_contexts')
      .select('behavior_preference, behavior_preference_until')
      .eq('user_id', userId)
      .or(`behavior_preference_until.is.null,behavior_preference_until.gte.${now}`)
      .order('absence_detected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    // Check if preference is still active
    if (data.behavior_preference_until) {
      const until = new Date(data.behavior_preference_until);
      if (until < new Date()) {
        return null;
      }
    }

    return data.behavior_preference as ReturnBehaviorPreference;
  } catch (error) {
    console.error('Error getting active behavior preference:', error);
    return null;
  }
}

/**
 * Get reorientation information
 */
export async function getReorientationInfo(userId: string): Promise<ReorientationInfo> {
  try {
    // Get last active project
    const { data: lastProject } = await supabase
      .from('master_projects')
      .select('id, name, project_type')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get last completed action (from context events)
    const { data: lastEvent } = await supabase
      .from('regulation_events')
      .select('event_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      lastProject: lastProject ? {
        id: lastProject.id,
        name: lastProject.name,
        type: lastProject.project_type,
      } : null,
      lastAction: lastEvent ? {
        description: formatEventDescription(lastEvent.event_type),
        timestamp: lastEvent.created_at,
      } : null,
      suggestedEntry: lastProject ? {
        label: 'Open last project',
        action: () => {
          // Navigate to project (caller handles this)
        },
      } : {
        label: 'Browse current items',
        action: () => {
          // Navigate to dashboard (caller handles this)
        },
      },
    };
  } catch (error) {
    console.error('Error getting reorientation info:', error);
    return {
      lastProject: null,
      lastAction: null,
      suggestedEntry: null,
    };
  }
}

/**
 * Check if a return context exists for recent activity
 */
export async function hasRecentReturnContext(userId: string): Promise<boolean> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('regulation_return_contexts')
      .select('id')
      .eq('user_id', userId)
      .gte('absence_detected_at', sevenDaysAgo.toISOString())
      .limit(1)
      .maybeSingle();

    return !!data;
  } catch (error) {
    return false;
  }
}

// Helper to format event types into readable descriptions
function formatEventDescription(eventType: string): string {
  const descriptions: Record<string, string> = {
    task_created: 'Created a task',
    task_completed: 'Completed a task',
    roadmap_item_created: 'Added roadmap item',
    roadmap_item_completed: 'Completed roadmap item',
    focus_session_started: 'Started focus session',
    focus_session_completed: 'Completed focus session',
    project_created: 'Created new project',
    offshoot_captured: 'Captured an idea',
  };

  return descriptions[eventType] || 'Activity in app';
}
