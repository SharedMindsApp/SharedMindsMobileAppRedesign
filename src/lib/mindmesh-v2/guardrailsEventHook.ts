/**
 * Mind Mesh V2 - Guardrails Event Hook
 *
 * Callable hook for handling Guardrails events.
 *
 * CRITICAL: This is a STUB ONLY. Not a subscription system.
 *
 * This function:
 * - Builds orchestration context (system user)
 * - Calls handleGuardrailsEvent()
 * - Returns result
 *
 * This function does NOT:
 * - Implement listeners
 * - Subscribe to channels
 * - Add background workers
 * - Retry on failure
 *
 * Usage:
 * - Call this from external event listener
 * - Pass Guardrails event and workspace ID
 * - Handle result (log, monitor, etc.)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GuardrailsEvent } from './guardrailsAdapter';
import type { OrchestrationResult, OrchestrationContext } from './orchestrator';
import { handleGuardrailsEvent } from './orchestrator';
import { fetchWorkspaceState } from './queries';

// ============================================================================
// GUARDRAILS EVENT HOOK
// ============================================================================

/**
 * Handles incoming Guardrails event.
 *
 * This is a callable hook, not a subscription.
 * Caller is responsible for listening to Guardrails changes.
 *
 * Process:
 * 1. Fetch workspace state
 * 2. Build orchestration context (system user)
 * 3. Call handleGuardrailsEvent()
 * 4. Return result
 *
 * @param supabase - Supabase client
 * @param event - Guardrails event
 * @param workspaceId - Workspace ID
 * @returns Orchestration result
 */
export async function handleIncomingGuardrailsEvent(
  supabase: SupabaseClient,
  event: GuardrailsEvent,
  workspaceId: string
): Promise<OrchestrationResult> {
  // Fetch current workspace state
  const state = await fetchWorkspaceState(supabase, workspaceId);

  if (!state) {
    return {
      success: false,
      planId: null,
      executionResult: null,
      planningErrors: [`Workspace not found: ${workspaceId}`],
      planningWarnings: [],
      executionErrors: [],
      executionWarnings: [],
      failureStage: 'planning',
    };
  }

  // Build orchestration context (system user)
  const context: OrchestrationContext = {
    userId: 'system', // Guardrails events are system-level
    workspaceId,
    timestamp: new Date().toISOString(),
    workspace: state.workspace,
    currentLock: state.currentLock,
    containers: state.containers,
    nodes: state.nodes,
    ports: state.ports,
    references: state.references,
  };

  // Call orchestrator
  const result = await handleGuardrailsEvent(event, context);

  return result;
}

// ============================================================================
// EXAMPLE USAGE (NOT IMPLEMENTED)
// ============================================================================

/**
 * Example: How to use this hook with Supabase Realtime.
 *
 * This is NOT implemented. Just a reference.
 *
 * ```typescript
 * // In your application initialization:
 * supabase
 *   .channel('guardrails_changes')
 *   .on('postgres_changes', {
 *     event: '*',
 *     schema: 'public',
 *     table: 'guardrails_tracks'
 *   }, async (payload) => {
 *     // Convert database change to GuardrailsEvent
 *     const event: GuardrailsEvent = {
 *       type: 'TrackCreated',
 *       trackId: payload.new.id,
 *       projectId: payload.new.project_id,
 *       title: payload.new.title,
 *       parentTrackId: payload.new.parent_track_id,
 *     };
 *
 *     // Derive workspace ID from project
 *     const workspaceId = deriveWorkspaceIdFromProject(payload.new.project_id);
 *
 *     // Call hook
 *     const result = await handleIncomingGuardrailsEvent(
 *       supabase,
 *       event,
 *       workspaceId
 *     );
 *
 *     // Log result
 *     if (result.success) {
 *       console.log('Guardrails sync success:', result.planId);
 *     } else {
 *       console.error('Guardrails sync failed:', result);
 *     }
 *   })
 *   .subscribe();
 * ```
 */
