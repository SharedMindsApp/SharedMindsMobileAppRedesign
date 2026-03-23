/**
 * Stage 4.6: Testing Mode Service
 *
 * Provides read-only visibility into signal computation.
 * NO telemetry, NO persistence, NO behavior changes.
 *
 * Testing Mode shows WHY signals appear without changing HOW they work.
 */

import { supabase } from '../supabase';
import type { SignalDefinition, ActiveSignal } from './signalTypes';

export interface SignalTraceExplanation {
  signal_key: string;
  signal_name: string;
  evaluation_window: string;
  events_observed: string[];
  threshold_logic: string;
  intensity_reason: string | null;
  why_shown: string;
}

export interface NegativeCaseExplanation {
  signal_key: string;
  signal_name: string;
  reason_not_shown: string;
  threshold_info: string;
}

export interface SimulatedEvent {
  event_type: string;
  context: Record<string, any>;
  simulated: true;
}

/**
 * Get testing mode state for user
 */
export async function getTestingModeEnabled(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('testing_mode_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.testing_mode_enabled ?? false;
  } catch (error) {
    console.error('[TestingMode] Error getting state:', error);
    return false;
  }
}

/**
 * Toggle testing mode for user
 */
export async function setTestingModeEnabled(userId: string, enabled: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ testing_mode_enabled: enabled })
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('[TestingMode] Error setting state:', error);
    return false;
  }
}

/**
 * Compute trace explanation for an active signal
 *
 * This is READ-ONLY and derives from existing data.
 * Nothing is persisted. Everything is in-memory.
 */
export function computeSignalTrace(
  signal: ActiveSignal,
  definition: SignalDefinition,
  recentActivity: any[]
): SignalTraceExplanation {
  const trace: SignalTraceExplanation = {
    signal_key: signal.signal_key,
    signal_name: definition.name,
    evaluation_window: getEvaluationWindowDescription(definition),
    events_observed: describeRecentActivity(recentActivity, signal.signal_key),
    threshold_logic: describeThresholdLogic(definition),
    intensity_reason: describeIntensityReason(signal, definition),
    why_shown: describeWhyShown(signal, definition, recentActivity),
  };

  return trace;
}

/**
 * Compute negative case explanation (why signal did NOT appear)
 */
export function computeNegativeCase(
  signalKey: string,
  definition: SignalDefinition,
  recentActivity: any[]
): NegativeCaseExplanation {
  return {
    signal_key: signalKey,
    signal_name: definition.name,
    reason_not_shown: describeWhyNotShown(signalKey, definition, recentActivity),
    threshold_info: describeThresholdLogic(definition),
  };
}

/**
 * Describe evaluation window in plain language
 */
function getEvaluationWindowDescription(definition: SignalDefinition): string {
  return definition.description || 'Recent activity';
}

/**
 * Describe recent activity relevant to this signal
 */
function describeRecentActivity(activity: any[], signalKey: string): string[] {
  if (!activity || activity.length === 0) {
    return ['No recent activity detected'];
  }

  const events: string[] = [];

  for (const item of activity.slice(0, 10)) {
    if (signalKey === 'rapid_context_switching') {
      if (item.event_type === 'project_opened') {
        events.push(`Project opened: ${item.context?.project_name || 'Unknown'}`);
      } else if (item.event_type === 'task_created') {
        events.push(`Task created in project: ${item.context?.project_name || 'Unknown'}`);
      }
    } else if (signalKey === 'scope_expansion') {
      if (item.event_type === 'roadmap_item_added') {
        events.push(`Roadmap item added: ${item.context?.item_type || 'Unknown type'}`);
      }
    } else if (signalKey === 'prolonged_absence') {
      events.push(`Activity detected: ${item.event_type}`);
    }
  }

  if (events.length === 0) {
    return ['Activity observed but not directly relevant to this signal'];
  }

  return events.slice(0, 8);
}

/**
 * Describe threshold logic in plain language
 */
function describeThresholdLogic(definition: SignalDefinition): string {
  const key = definition.key;

  if (key === 'rapid_context_switching') {
    return '3+ distinct project contexts within 20 minutes';
  } else if (key === 'scope_expansion') {
    return '5+ roadmap items added within 30 minutes';
  } else if (key === 'prolonged_absence') {
    return 'No activity for 7+ days';
  }

  return 'Threshold logic defined in signal configuration';
}

/**
 * Describe intensity reason
 */
function describeIntensityReason(signal: ActiveSignal, definition: SignalDefinition): string | null {
  if (!signal.intensity) return null;

  const intensity = signal.intensity;

  if (intensity === 'low') {
    return 'Activity crossed the minimum threshold but remained below medium';
  } else if (intensity === 'medium') {
    return 'Activity crossed the lower threshold but not the highest one';
  } else if (intensity === 'high') {
    return 'Activity exceeded the upper threshold';
  }

  return null;
}

/**
 * Describe why signal appeared
 */
function describeWhyShown(signal: ActiveSignal, definition: SignalDefinition, activity: any[]): string {
  const key = signal.signal_key;

  if (key === 'rapid_context_switching') {
    const projectCount = new Set(
      activity.filter(a => a.event_type === 'project_opened').map(a => a.context?.project_id)
    ).size;
    return `${projectCount} distinct contexts detected within the evaluation window`;
  } else if (key === 'scope_expansion') {
    const addCount = activity.filter(a => a.event_type === 'roadmap_item_added').length;
    return `${addCount} items added within the evaluation window`;
  } else if (key === 'prolonged_absence') {
    return 'Gap detected between recent activity and current time';
  }

  return 'Threshold was crossed based on recent activity';
}

/**
 * Describe why signal did NOT appear
 */
function describeWhyNotShown(signalKey: string, definition: SignalDefinition, activity: any[]): string {
  if (!activity || activity.length === 0) {
    return 'No recent activity to evaluate';
  }

  if (signalKey === 'rapid_context_switching') {
    const projectCount = new Set(
      activity.filter(a => a.event_type === 'project_opened').map(a => a.context?.project_id)
    ).size;
    return `${projectCount} contexts detected (threshold is 3+ within 20 minutes)`;
  } else if (signalKey === 'scope_expansion') {
    const addCount = activity.filter(a => a.event_type === 'roadmap_item_added').length;
    return `${addCount} items added (threshold is 5+ within 30 minutes)`;
  } else if (signalKey === 'prolonged_absence') {
    return 'Recent activity detected, no significant gap';
  }

  return 'Activity did not cross the threshold';
}

/**
 * Create a simulated event (for testing only)
 *
 * IMPORTANT: This does NOT persist anywhere.
 * This is in-memory only for testing signal computation.
 */
export function createSimulatedEvent(
  eventType: string,
  context: Record<string, any>
): SimulatedEvent {
  return {
    event_type: eventType,
    context,
    simulated: true,
  };
}

/**
 * Get all signal definitions for negative case analysis
 */
export async function getAllSignalDefinitions(): Promise<SignalDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('regulation_signal_definitions')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[TestingMode] Error getting signal definitions:', error);
    return [];
  }
}
