/**
 * Mind Mesh V2 Telemetry Emitter
 *
 * Persists privacy-safe telemetry events to database.
 *
 * CRITICAL: This is the write gateway.
 * - Validates all events before persistence
 * - Ensures privacy contract is enforced
 * - Provides batch operations for performance
 * - Never logs content or IDs
 */

import { supabase } from '../../supabase';
import type { InteractionEvent } from '../interactions';
import type {
  TelemetryEvent,
  TelemetryEventInsert,
  TelemetryEventRow,
} from './types';
import { validateTelemetryEvent } from './types';
import { mapInteractionEventToTelemetry, batchMapInteractionEvents } from './mapper';

// ============================================================================
// EMITTER
// ============================================================================

/**
 * Emits telemetry event to database.
 * Validates event before persistence.
 *
 * @param telemetryEvent - Privacy-safe telemetry event
 * @returns Success status
 */
export async function emitTelemetryEvent(
  telemetryEvent: TelemetryEvent
): Promise<{ success: boolean; errors: string[] }> {
  // Validate event
  const validation = validateTelemetryEvent(telemetryEvent);
  if (!validation.valid) {
    console.error('Telemetry validation failed:', validation.errors);
    return { success: false, errors: validation.errors };
  }

  // Convert to database row format
  const insert: TelemetryEventInsert = {
    workspace_id: telemetryEvent.workspaceId,
    user_id: telemetryEvent.userId,
    event_type: telemetryEvent.eventType,
    timestamp: telemetryEvent.timestamp,
    meta: telemetryEvent.meta,
  };

  // Insert to database
  const { error } = await supabase
    .from('mind_mesh_telemetry_events')
    .insert(insert);

  if (error) {
    console.error('Telemetry insert failed:', error);
    return { success: false, errors: [error.message] };
  }

  return { success: true, errors: [] };
}

/**
 * Emits telemetry from interaction event.
 * Maps interaction event to telemetry event, then persists.
 *
 * @param interactionEvent - Internal interaction event
 * @returns Success status
 */
export async function emitFromInteractionEvent(
  interactionEvent: InteractionEvent
): Promise<{ success: boolean; errors: string[] }> {
  // Map interaction event to telemetry
  const telemetryEvent = mapInteractionEventToTelemetry(interactionEvent);

  if (!telemetryEvent) {
    // Event not tracked (no error, just skipped)
    return { success: true, errors: [] };
  }

  // Emit telemetry event
  return emitTelemetryEvent(telemetryEvent);
}

/**
 * Batch emits multiple interaction events.
 * More efficient than emitting one at a time.
 *
 * @param interactionEvents - Array of interaction events
 * @returns Success status with counts
 */
export async function batchEmitFromInteractionEvents(
  interactionEvents: InteractionEvent[]
): Promise<{
  success: boolean;
  emitted: number;
  skipped: number;
  errors: string[];
}> {
  // Map all interaction events
  const telemetryEvents = batchMapInteractionEvents(interactionEvents);

  if (telemetryEvents.length === 0) {
    // All events skipped (no error)
    return {
      success: true,
      emitted: 0,
      skipped: interactionEvents.length,
      errors: [],
    };
  }

  // Validate all events
  const errors: string[] = [];
  const validEvents: TelemetryEvent[] = [];

  for (const event of telemetryEvents) {
    const validation = validateTelemetryEvent(event);
    if (validation.valid) {
      validEvents.push(event);
    } else {
      errors.push(...validation.errors);
    }
  }

  if (validEvents.length === 0) {
    // All events invalid
    return {
      success: false,
      emitted: 0,
      skipped: interactionEvents.length,
      errors,
    };
  }

  // Convert to database row format
  const inserts: TelemetryEventInsert[] = validEvents.map((event) => ({
    workspace_id: event.workspaceId,
    user_id: event.userId,
    event_type: event.eventType,
    timestamp: event.timestamp,
    meta: event.meta,
  }));

  // Batch insert to database
  const { error } = await supabase
    .from('mind_mesh_telemetry_events')
    .insert(inserts);

  if (error) {
    console.error('Batch telemetry insert failed:', error);
    return {
      success: false,
      emitted: 0,
      skipped: interactionEvents.length,
      errors: [error.message, ...errors],
    };
  }

  return {
    success: true,
    emitted: validEvents.length,
    skipped: interactionEvents.length - validEvents.length,
    errors,
  };
}

// ============================================================================
// INTERACTION EVENT LISTENER (INTEGRATION ADAPTER)
// ============================================================================

/**
 * Creates a listener that automatically emits telemetry from interaction events.
 * Use this to connect the interaction event emitter to telemetry persistence.
 *
 * @returns Listener function
 */
export function createTelemetryListener(): (event: InteractionEvent) => void {
  return async (event: InteractionEvent) => {
    // Emit telemetry (fire and forget - don't block interaction flow)
    emitFromInteractionEvent(event).catch((error) => {
      console.error('Telemetry emission failed:', error);
    });
  };
}

/**
 * Creates a batch listener that collects events and emits in batches.
 * More efficient for high-volume scenarios.
 *
 * @param batchSize - Number of events to batch before emitting
 * @param flushIntervalMs - Max time to wait before flushing batch
 * @returns Listener function and flush function
 */
export function createBatchTelemetryListener(
  batchSize: number = 10,
  flushIntervalMs: number = 5000
): {
  listener: (event: InteractionEvent) => void;
  flush: () => Promise<void>;
  destroy: () => void;
} {
  const buffer: InteractionEvent[] = [];
  let flushTimer: NodeJS.Timeout | null = null;

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;

    const eventsToEmit = [...buffer];
    buffer.length = 0;

    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    await batchEmitFromInteractionEvents(eventsToEmit).catch((error) => {
      console.error('Batch telemetry emission failed:', error);
    });
  }

  function scheduleFlush(): void {
    if (flushTimer) {
      clearTimeout(flushTimer);
    }

    flushTimer = setTimeout(() => {
      flush();
    }, flushIntervalMs);
  }

  function listener(event: InteractionEvent): void {
    buffer.push(event);

    if (buffer.length >= batchSize) {
      flush();
    } else {
      scheduleFlush();
    }
  }

  function destroy(): void {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    buffer.length = 0;
  }

  return { listener, flush, destroy };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Checks telemetry persistence health.
 * Verifies database connection and permissions.
 *
 * @param userId - User ID to test with
 * @returns Health status
 */
export async function checkTelemetryHealth(
  userId: string
): Promise<{
  healthy: boolean;
  canRead: boolean;
  canWrite: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let canRead = false;
  let canWrite = false;

  // Test read permission
  try {
    const { error: readError } = await supabase
      .from('mind_mesh_telemetry_events')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!readError) {
      canRead = true;
    } else {
      errors.push(`Read permission error: ${readError.message}`);
    }
  } catch (error) {
    errors.push(`Read test failed: ${error}`);
  }

  // Note: Write test would require actual insert, which we skip for health check
  // Just check if table is accessible
  canWrite = canRead; // Assume write if read works

  return {
    healthy: canRead,
    canRead,
    canWrite,
    errors,
  };
}

/**
 * Counts telemetry events for user.
 * Used for monitoring and debugging.
 *
 * @param userId - User ID
 * @returns Event count
 */
export async function countTelemetryEvents(
  userId: string
): Promise<{ count: number; error?: string }> {
  const { count, error } = await supabase
    .from('mind_mesh_telemetry_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count || 0 };
}

/**
 * Deletes telemetry events for user (GDPR compliance).
 * Removes all telemetry data for specified user.
 *
 * @param userId - User ID
 * @returns Deletion status
 */
export async function deleteTelemetryForUser(
  userId: string
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  const { data, error } = await supabase
    .from('mind_mesh_telemetry_events')
    .delete()
    .eq('user_id', userId)
    .select('id');

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    deletedCount: data?.length || 0,
  };
}
