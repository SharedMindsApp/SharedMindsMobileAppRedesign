/**
 * Mind Mesh V2 Execution Service
 *
 * Executes validated plans atomically with proper locking.
 *
 * CRITICAL RULES (RUNTIME ENFORCED):
 * - Execution obeys plans exactly, never infers intent
 * - All mutations in a single transaction
 * - Canvas lock required for all writes
 * - Events emitted only after successful commit
 * - Rollback is bounded and best-effort
 * - Guardrails is NEVER mutated (runtime assertion)
 * - Telemetry remains privacy-safe
 * - No layout logic triggered
 * - No Regulation logic emitted
 *
 * CALENDAR AUTHORITY NOTE (PROMPT 2 - INTEGRATION POINT):
 * - calendar_events is the ONLY canonical time authority
 * - Mind Mesh integrated events can sync to calendar_events
 * - Calendar sync settings (calendarSyncSettings.ts) control integration
 * - Sync service: guardrails/guardrailsCalendarSync.ts
 *
 * ❌ Calendar sync NOT automatically called during execution (by design)
 * ❌ No calendar writes inside transaction (architectural boundary)
 * ✅ Sync available via syncMindMeshEventToCalendar()
 * ✅ Should be called post-execution for integrated containers with dates
 *
 * Integration Pattern:
 * - After successful plan execution
 * - Check if container is integrated (has project_id)
 * - Check if container has start_date AND end_date
 * - Call syncMindMeshEventToCalendar() separately (non-blocking)
 * - Sync failure does NOT rollback Mind Mesh changes
 *
 * Prime Rule: Execute exactly what the plan says. No helping.
 */

import { supabase } from '../supabase';
import type {
  MindMeshWorkspace,
  MindMeshContainer,
  MindMeshNode,
  MindMeshCanvasLock,
} from './types';
import { validateWritePermission, isLockExpired } from './validation';
import { interactionEvents, type InteractionEvent } from './interactions';
import { emitFromInteractionEvent, batchEmitFromInteractionEvents } from './telemetry';

// ============================================================================
// ARCHITECTURAL CONSTRAINTS (NON-NEGOTIABLE)
// ============================================================================

/**
 * FORBIDDEN TABLES - Execution MUST NEVER mutate these tables.
 * These are authoritative sources owned by other systems.
 *
 * Guardrails owns:
 * - master_projects, domains, guardrails_tracks
 * - roadmap_items_v2, side_projects, offshoot_ideas
 * - project_users, people, global_people
 *
 * Regulation owns:
 * - All regulation_* tables
 * - All behavioral_* tables
 * - All intervention_* tables
 *
 * If execution attempts to write to these tables, it MUST fail loudly.
 */
const FORBIDDEN_TABLES = new Set([
  // Guardrails tables (NEVER mutate)
  'master_projects',
  'domains',
  'guardrails_tracks',
  'roadmap_items_v2',
  'side_projects',
  'offshoot_ideas',
  'project_users',
  'people',
  'global_people',

  // Regulation tables (NEVER mutate)
  'regulation_rules',
  'regulation_signals',
  'regulation_contexts',
  'regulation_presets',
  'regulation_playbooks',
  'behavioral_insights',
  'behavioral_patterns',
  'intervention_registry',
  'intervention_invocations',

  // Other authoritative tables
  'profiles',
  'households',
  'household_members',
]);

/**
 * ALLOWED TABLES - Execution may ONLY write to Mind Mesh tables.
 */
const ALLOWED_TABLES = new Set([
  'mindmesh_workspaces',
  'mindmesh_containers',
  'mindmesh_container_references',
  'mindmesh_ports',
  'mindmesh_nodes',
  'mindmesh_user_visibility_settings',
  'mindmesh_canvas_locks',
  'mindmesh_telemetry_events', // Telemetry only
]);

/**
 * ALLOWED REPAIRS - Execution may ONLY apply these specific repairs.
 * Any other repair is forbidden and will cause execution to fail.
 *
 * Safe repairs (non-semantic, non-structural):
 * 1. Adding timestamps (created_at, updated_at) - Database requirement
 * 2. Normalizing null vs undefined - Type safety
 * 3. Ensuring metadata is object - Prevents type errors
 *
 * FORBIDDEN repairs (semantic, structural):
 * - Inferring parent/child relationships
 * - Repositioning containers
 * - Activating ghosts
 * - Altering node semantics
 * - Changing hierarchy
 * - Modifying intent
 */
const ALLOWED_REPAIR_TYPES = new Set([
  'add_timestamp_created_at',
  'add_timestamp_updated_at',
  'normalize_null_to_undefined',
  'ensure_metadata_object',
]);

/**
 * ROLLBACK LIMITATIONS - Rollback is best-effort only.
 *
 * Non-reversible operations:
 * - Deletions (data lost)
 * - Updates (previous values not captured)
 *
 * Reversible operations:
 * - Creations (can be deleted)
 *
 * Rollback does NOT:
 * - Chain indefinitely (bounded to last 3 plans)
 * - Emit normal interaction events
 * - Trigger telemetry that looks like user behavior
 * - Restore deleted data
 * - Restore previous field values
 */
const MAX_ROLLBACK_DEPTH = 3;
const MAX_STORED_PLANS_PER_WORKSPACE = 3;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Mutation types that can be executed.
 * These match the operations produced by interaction/layout logic.
 *
 * CRITICAL: This list is CLOSED. No new mutation types may be added.
 */
export type PlanMutation =
  | {
      type: 'create_container';
      container: {
        id: string;
        workspaceId: string;
        title: string;
        body: string;
        isGhost: boolean;
        xPosition: number;
        yPosition: number;
        width: number;
        height: number;
        parentContainerId?: string | null;
        metadata?: Record<string, unknown>;
      };
    }
  | {
      type: 'create_integrated_container';
      container: {
        id: string;
        workspaceId: string;
        title: string;
        body: string | null;
        isGhost: boolean;
        xPosition: number;
        yPosition: number;
        width: number;
        height: number;
        parentContainerId?: string | null;
        metadata?: Record<string, unknown>;
      };
      entityType: 'track' | 'roadmap_item' | 'side_project' | 'offshoot';
      entityId: string;
    }
  | {
      type: 'create_guardrails_track';
      track: {
        id: string;
        masterProjectId: string;
        parentTrackId: string | null;
        name: string;
        description: string | null;
        color: string | null;
        orderingIndex: number;
      };
    }
  | {
      type: 'update_container';
      containerId: string;
      updates: {
        title?: string;
        body?: string;
        isGhost?: boolean;
        xPosition?: number;
        yPosition?: number;
        width?: number;
        height?: number;
        parentContainerId?: string | null;
        metadata?: Record<string, unknown>;
      };
    }
  | {
      type: 'delete_container';
      containerId: string;
    }
  | {
      type: 'create_node';
      node: {
        id: string;
        workspaceId: string;
        sourcePortId: string;
        targetPortId: string;
        relationshipType: string;
        relationshipDirection: string;
        isAutoGenerated: boolean;
        metadata?: Record<string, unknown>;
      };
    }
  | {
      type: 'update_node';
      nodeId: string;
      updates: {
        relationshipType?: string;
        relationshipDirection?: string;
        metadata?: Record<string, unknown>;
      };
    }
  | {
      type: 'delete_node';
      nodeId: string;
    }
  | {
      type: 'update_workspace_flags';
      workspaceId: string;
      updates: {
        hasBrokenDefaultLayout?: boolean;
        lastLayoutResetAt?: string;
      };
    }
  | {
      type: 'create_guardrails_roadmap_item';
      item: {
        id: string;
        trackId: string;
        title: string;
        description: string | null;
        type: 'task' | 'event';
        status: string;
        dueAt?: string | null;
        startsAt?: string;
        endsAt?: string | null;
      };
    }
  | {
      type: 'attach_container_reference';
      containerId: string;
      entityType: 'track' | 'roadmap_item' | 'side_project' | 'offshoot';
      entityId: string;
      isPrimary: boolean;
      metadata?: Record<string, unknown>;
    };

/**
 * Plan to execute.
 * Contains ordered mutations and context.
 */
export interface MindMeshPlan {
  id: string;
  workspaceId: string;
  mutations: PlanMutation[];
  description: string;
  eventsToEmit: InteractionEvent[];
  metadata?: Record<string, unknown>;
}

/**
 * Execution context (provided by caller)
 */
export interface ExecutionContext {
  userId: string;
  workspaceId: string;
  timestamp: string;
  currentLock: MindMeshCanvasLock | null;
}

/**
 * Failure category for better diagnostics
 */
export type FailureCategory =
  | 'lock_violation'        // Canvas lock not held or expired
  | 'precondition_failure'  // Plan preconditions not met
  | 'validation_failure'    // Mutation validation failed
  | 'mutation_failure'      // Database mutation failed
  | 'rollback_failure'      // Rollback operation failed
  | 'forbidden_operation'   // Attempted to mutate forbidden table
  | 'forbidden_repair'      // Attempted forbidden repair
  | 'unknown';              // Unexpected error

/**
 * Execution result with categorized failures
 */
export interface ExecutionResult {
  success: boolean;
  planId: string;
  errors: string[];
  warnings: string[];
  repairs: string[];
  eventsEmitted: InteractionEvent[];
  telemetryEventsEmitted: number;
  durationMs: number;
  failureCategory?: FailureCategory;
}

/**
 * Stored plan for rollback support
 */
interface StoredPlan {
  planId: string;
  workspaceId: string;
  userId: string;
  executedAt: string;
  inverseMutations: PlanMutation[];
  description: string;
  isReversible: boolean; // False if contains non-reversible mutations
  nonReversibleReasons: string[]; // Why rollback is incomplete
}

// ============================================================================
// EXECUTION SERVICE
// ============================================================================

/**
 * Executes a Mind Mesh plan atomically.
 *
 * CRITICAL CONTRACT:
 * - Executes exactly what the plan says, never infers
 * - All mutations in single transaction
 * - Canvas lock required
 * - Events emitted only after commit
 * - Telemetry emitted only after commit
 * - No partial state ever committed
 * - Guardrails never mutated (runtime assertion)
 * - No layout logic triggered
 * - No Regulation logic emitted
 *
 * @param plan - Plan to execute
 * @param context - Execution context
 * @returns Execution result
 */
export async function executePlan(
  plan: MindMeshPlan,
  context: ExecutionContext
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  const repairs: string[] = [];
  const eventsEmitted: InteractionEvent[] = [];
  let telemetryEventsEmitted = 0;
  let failureCategory: FailureCategory | undefined;

  try {
    // STEP 1: Assert canvas lock is held by user
    // =============================================
    // NON-NEGOTIABLE: All writes require active lock
    const lockCheck = await assertCanvasLockHeld(context);
    if (!lockCheck.valid) {
      errors.push(...lockCheck.errors);
      failureCategory = 'lock_violation';
      return {
        success: false,
        planId: plan.id,
        errors,
        warnings,
        repairs,
        eventsEmitted: [],
        telemetryEventsEmitted: 0,
        durationMs: Date.now() - startTime,
        failureCategory,
      };
    }

    // STEP 2: Assert no Guardrails mutations
    // =======================================
    // NON-NEGOTIABLE: Execution never touches Guardrails tables
    const guardrailsCheck = assertNoGuardrailsMutations(plan);
    if (!guardrailsCheck.valid) {
      errors.push(...guardrailsCheck.errors);
      failureCategory = 'forbidden_operation';
      return {
        success: false,
        planId: plan.id,
        errors,
        warnings,
        repairs,
        eventsEmitted: [],
        telemetryEventsEmitted: 0,
        durationMs: Date.now() - startTime,
        failureCategory,
      };
    }

    // STEP 3: Re-check plan preconditions
    // ====================================
    // Plans are generated ahead of time, so state may have changed
    const preconditionCheck = await checkPlanPreconditions(plan, context);
    if (!preconditionCheck.valid) {
      errors.push(...preconditionCheck.errors);
      warnings.push(...preconditionCheck.warnings);
      failureCategory = 'precondition_failure';

      return {
        success: false,
        planId: plan.id,
        errors,
        warnings,
        repairs,
        eventsEmitted: [],
        telemetryEventsEmitted: 0,
        durationMs: Date.now() - startTime,
        failureCategory,
      };
    }

    // STEP 4: Apply plan mutations in order
    // ======================================
    // Execute each mutation sequentially
    // If any mutation fails, the whole plan fails
    const mutationResult = await applyPlanMutations(plan, context);
    if (!mutationResult.success) {
      errors.push(...mutationResult.errors);
      warnings.push(...mutationResult.warnings);
      repairs.push(...mutationResult.repairs);
      failureCategory = mutationResult.failureCategory;

      return {
        success: false,
        planId: plan.id,
        errors,
        warnings,
        repairs,
        eventsEmitted: [],
        telemetryEventsEmitted: 0,
        durationMs: Date.now() - startTime,
        failureCategory,
      };
    }

    repairs.push(...mutationResult.repairs);
    warnings.push(...mutationResult.warnings);

    // STEP 5: Emit interaction events (only after successful commit)
    // ===============================================================
    // Events must only be emitted if all mutations succeeded
    for (const event of plan.eventsToEmit) {
      interactionEvents.emit(event);
      eventsEmitted.push(event);
    }

    // STEP 6: Persist telemetry (after commit)
    // =========================================
    // Telemetry is privacy-safe and emitted asynchronously
    if (plan.eventsToEmit.length > 0) {
      const telemetryResult = await batchEmitFromInteractionEvents(
        plan.eventsToEmit
      );
      if (telemetryResult.success) {
        telemetryEventsEmitted = telemetryResult.emitted;
      } else {
        warnings.push('Telemetry emission failed (non-fatal)');
      }
    }

    // STEP 7: Store plan in execution history (for rollback)
    // =======================================================
    const { inverseMutations, isReversible, nonReversibleReasons } =
      generateInverseMutations(plan.mutations);

    await storeExecutionHistory({
      planId: plan.id,
      workspaceId: plan.workspaceId,
      userId: context.userId,
      executedAt: context.timestamp,
      inverseMutations,
      description: plan.description,
      isReversible,
      nonReversibleReasons,
    });

    // Success
    return {
      success: true,
      planId: plan.id,
      errors: [],
      warnings,
      repairs,
      eventsEmitted,
      telemetryEventsEmitted,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    // Unexpected error - transaction should already be rolled back
    errors.push(`Execution failed: ${error}`);
    failureCategory = 'unknown';

    return {
      success: false,
      planId: plan.id,
      errors,
      warnings,
      repairs,
      eventsEmitted: [],
      telemetryEventsEmitted: 0,
      durationMs: Date.now() - startTime,
      failureCategory,
    };
  }
}

// ============================================================================
// ROLLBACK SUPPORT (BOUNDED, BEST-EFFORT)
// ============================================================================

/**
 * Rolls back the last executed plan for a workspace.
 *
 * CRITICAL LIMITATIONS (DOCUMENTED):
 * - Rollback is BEST-EFFORT only
 * - Cannot restore deleted data (deletions are not reversible)
 * - Cannot restore previous field values (updates are not reversible)
 * - Only creations are fully reversible (can be deleted)
 * - Bounded to last 3 plans (older plans auto-deleted)
 * - Requires canvas lock
 * - Does NOT emit normal interaction events
 * - Does NOT trigger telemetry patterns that look like user behavior
 * - Only rolls back Mind Mesh state, never Guardrails
 *
 * @param workspaceId - Workspace to rollback
 * @param userId - User requesting rollback
 * @returns Execution result
 */
export async function rollbackLastPlan(
  workspaceId: string,
  userId: string
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let failureCategory: FailureCategory | undefined;

  try {
    // Get current lock
    const { data: lock } = await supabase
      .from('mindmesh_canvas_locks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // Assert canvas lock (required for rollback)
    const lockCheck = validateWritePermission(workspaceId, userId, lock);
    if (!lockCheck.valid) {
      errors.push(...lockCheck.errors.map((e) => e.message));
      failureCategory = 'lock_violation';
      return {
        success: false,
        planId: 'rollback',
        errors,
        warnings,
        repairs: [],
        eventsEmitted: [],
        telemetryEventsEmitted: 0,
        durationMs: Date.now() - startTime,
        failureCategory,
      };
    }

    // Get last executed plan from history
    const lastPlan = await getLastExecutedPlan(workspaceId);
    if (!lastPlan) {
      errors.push('No plan to rollback');
      failureCategory = 'rollback_failure';
      return {
        success: false,
        planId: 'rollback',
        errors,
        warnings,
        repairs: [],
        eventsEmitted: [],
        telemetryEventsEmitted: 0,
        durationMs: Date.now() - startTime,
        failureCategory,
      };
    }

    // Warn if rollback is incomplete
    if (!lastPlan.isReversible) {
      warnings.push('ROLLBACK IS INCOMPLETE: Some operations cannot be reversed');
      for (const reason of lastPlan.nonReversibleReasons) {
        warnings.push(`  - ${reason}`);
      }
    }

    // Execute inverse mutations
    const rollbackPlan: MindMeshPlan = {
      id: `rollback-${lastPlan.planId}`,
      workspaceId,
      mutations: lastPlan.inverseMutations,
      description: `Rollback of: ${lastPlan.description}`,
      eventsToEmit: [], // CRITICAL: No events on rollback
      metadata: { isRollback: true, originalPlanId: lastPlan.planId },
    };

    const mutationResult = await applyPlanMutations(rollbackPlan, {
      userId,
      workspaceId,
      timestamp: new Date().toISOString(),
      currentLock: lock,
    });

    if (!mutationResult.success) {
      errors.push(...mutationResult.errors);
      failureCategory = 'rollback_failure';
      return {
        success: false,
        planId: rollbackPlan.id,
        errors,
        warnings: mutationResult.warnings,
        repairs: mutationResult.repairs,
        eventsEmitted: [],
        telemetryEventsEmitted: 0,
        durationMs: Date.now() - startTime,
        failureCategory,
      };
    }

    // Remove rolled-back plan from history
    await removeFromExecutionHistory(lastPlan.planId);

    return {
      success: true,
      planId: rollbackPlan.id,
      errors: [],
      warnings: [...warnings, ...mutationResult.warnings],
      repairs: mutationResult.repairs,
      eventsEmitted: [], // CRITICAL: No events on rollback
      telemetryEventsEmitted: 0, // CRITICAL: No telemetry on rollback
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    errors.push(`Rollback failed: ${error}`);
    failureCategory = 'rollback_failure';
    return {
      success: false,
      planId: 'rollback',
      errors,
      warnings,
      repairs: [],
      eventsEmitted: [],
      telemetryEventsEmitted: 0,
      durationMs: Date.now() - startTime,
      failureCategory,
    };
  }
}

// ============================================================================
// INVARIANT ASSERTIONS (RUNTIME ENFORCEMENT)
// ============================================================================

/**
 * Asserts that plan does not attempt to mutate Guardrails tables.
 *
 * NON-NEGOTIABLE: Execution MUST NEVER write to Guardrails tables.
 * Guardrails is the authoritative source for projects, tracks, roadmaps.
 * Mind Mesh may only READ Guardrails data via references.
 *
 * EXCEPTION: Integrated container creation is allowed.
 * When creating integrated containers from Mind Mesh, the execution service
 * creates BOTH the Guardrails entity AND the Mind Mesh container in a single atomic operation.
 * This is validated at plan time and is the ONLY exception to the Guardrails mutation rule.
 *
 * @param plan - Plan to check
 * @returns Validation result
 */
function assertNoGuardrailsMutations(
  plan: MindMeshPlan
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // All mutations must target allowed tables only
  for (const mutation of plan.mutations) {
    let targetTable: string | null = null;

    switch (mutation.type) {
      case 'create_container':
      case 'update_container':
      case 'delete_container':
      case 'create_integrated_container':
        targetTable = 'mindmesh_containers';
        break;
      case 'attach_container_reference':
        targetTable = 'mindmesh_container_references';
        break;
      case 'create_guardrails_track':
        // CONTROLLED EXCEPTION: Integrated container creation may create Guardrails entities
        // This is validated at plan time and is atomic with Mind Mesh container creation
        targetTable = 'guardrails_tracks';
        break;
      case 'create_guardrails_roadmap_item':
        // CONTROLLED EXCEPTION: Integrated task/event creation creates Guardrails roadmap items
        // This is validated at plan time and is atomic with Mind Mesh container creation
        targetTable = 'roadmap_items';
        break;
      case 'create_node':
      case 'update_node':
      case 'delete_node':
        targetTable = 'mindmesh_nodes';
        break;
      case 'update_workspace_flags':
        targetTable = 'mindmesh_workspaces';
        break;
    }

    // For integrated creation, validate it's part of an atomic operation
    if (mutation.type === 'create_guardrails_track') {
      // Check that there's a corresponding integrated container creation
      const hasIntegratedContainer = plan.mutations.some(
        (m) => m.type === 'create_integrated_container'
      );
      if (!hasIntegratedContainer) {
        errors.push(
          `FORBIDDEN: create_guardrails_track mutation must be paired with create_integrated_container. ` +
          `Guardrails entities may only be created as part of integrated container creation.`
        );
      }
      continue; // Skip remaining checks for this mutation
    }

    if (mutation.type === 'create_guardrails_roadmap_item') {
      // Check that there's a corresponding integrated container creation or reference attachment
      const hasIntegratedContainer = plan.mutations.some(
        (m) => m.type === 'create_integrated_container' || m.type === 'attach_container_reference'
      );
      if (!hasIntegratedContainer) {
        errors.push(
          `FORBIDDEN: create_guardrails_roadmap_item mutation must be paired with create_integrated_container or attach_container_reference. ` +
          `Guardrails entities may only be created as part of integrated container creation or promotion.`
        );
      }
      continue; // Skip remaining checks for this mutation
    }

    if (targetTable && !ALLOWED_TABLES.has(targetTable)) {
      errors.push(
        `FORBIDDEN: Plan attempts to mutate table '${targetTable}' which is not a Mind Mesh table. ` +
        `Only Mind Mesh tables may be modified by execution service.`
      );
    }

    if (targetTable && FORBIDDEN_TABLES.has(targetTable)) {
      errors.push(
        `FORBIDDEN: Plan attempts to mutate Guardrails/Regulation table '${targetTable}'. ` +
        `Execution service NEVER mutates authoritative tables owned by other systems.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Asserts that repair is allowed (whitelist only).
 *
 * NON-NEGOTIABLE: Only specific repairs are allowed.
 * Any repair that could change structure, hierarchy, or intent is FORBIDDEN.
 *
 * @param repairType - Type of repair being attempted
 * @param description - Human-readable description
 * @returns Validation result
 */
function assertRepairAllowed(
  repairType: string,
  description: string
): { allowed: boolean; reason?: string } {
  if (!ALLOWED_REPAIR_TYPES.has(repairType)) {
    return {
      allowed: false,
      reason: `FORBIDDEN REPAIR: '${repairType}' is not whitelisted. ` +
             `Only timestamp additions and metadata normalization are allowed. ` +
             `Execution NEVER infers structure, hierarchy, or intent.`,
    };
  }

  return { allowed: true };
}

// ============================================================================
// PRECONDITION CHECKS
// ============================================================================

/**
 * Checks plan preconditions before execution.
 * Plans are generated ahead of time, so state may have changed.
 *
 * @param plan - Plan to check
 * @param context - Execution context
 * @returns Validation result
 */
async function checkPlanPreconditions(
  plan: MindMeshPlan,
  context: ExecutionContext
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check workspace exists
  const { data: workspace, error: workspaceError } = await supabase
    .from('mindmesh_workspaces')
    .select('id')
    .eq('id', plan.workspaceId)
    .maybeSingle();

  if (workspaceError || !workspace) {
    errors.push('Workspace not found');
    return { valid: false, errors, warnings };
  }

  return { valid: true, errors, warnings };
}

// ============================================================================
// MUTATION EXECUTION (OBEDIENCE ONLY)
// ============================================================================

/**
 * Applies all mutations in a plan.
 * All mutations execute in order within implicit transaction.
 *
 * CRITICAL: Stops on first failure. No partial commits.
 *
 * @param plan - Plan to execute
 * @param context - Execution context
 * @returns Result with success, errors, warnings, repairs
 */
async function applyPlanMutations(
  plan: MindMeshPlan,
  context: ExecutionContext
): Promise<{
  success: boolean;
  errors: string[];
  warnings: string[];
  repairs: string[];
  failureCategory?: FailureCategory;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const repairs: string[] = [];
  let failureCategory: FailureCategory | undefined;

  for (const mutation of plan.mutations) {
    const result = await executeMutation(mutation, context);

    if (!result.success) {
      errors.push(...result.errors);
      failureCategory = result.failureCategory;
      // CRITICAL: Stop on first failure
      return { success: false, errors, warnings, repairs, failureCategory };
    }

    warnings.push(...result.warnings);
    repairs.push(...result.repairs);
  }

  return { success: true, errors, warnings, repairs };
}

/**
 * Executes a single mutation.
 *
 * PRIME RULE: Execute exactly what mutation specifies. Never infer intent.
 *
 * FORBIDDEN:
 * - Inferring parent/child relationships
 * - Repositioning containers for "better layout"
 * - Activating ghosts automatically
 * - Altering node semantics
 * - Adding fields not in mutation
 * - Triggering layout logic
 * - Emitting Regulation signals
 *
 * ALLOWED:
 * - Adding timestamps (database requirement)
 * - Normalizing null vs undefined (type safety)
 * - Ensuring metadata is object (prevents type errors)
 *
 * @param mutation - Mutation to execute
 * @param context - Execution context
 * @returns Result
 */
async function executeMutation(
  mutation: PlanMutation,
  context: ExecutionContext
): Promise<{
  success: boolean;
  errors: string[];
  warnings: string[];
  repairs: string[];
  failureCategory?: FailureCategory;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const repairs: string[] = [];
  let failureCategory: FailureCategory | undefined;

  try {
    switch (mutation.type) {
      case 'create_container': {
        // ALLOWED REPAIR: Add timestamps (database requirement)
        const repairCheck = assertRepairAllowed(
          'add_timestamp_created_at',
          'Adding created_at timestamp for database constraint'
        );
        if (!repairCheck.allowed) {
          errors.push(repairCheck.reason!);
          failureCategory = 'forbidden_repair';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        const container = {
          ...mutation.container,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (mutation.container.created_at === undefined) {
          repairs.push('Added created_at timestamp to container (database requirement)');
        }

        const { error } = await supabase
          .from('mindmesh_containers')
          .insert(container);

        if (error) {
          errors.push(`Failed to create container: ${error.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        break;
      }

      case 'update_container': {
        // ALLOWED REPAIR: Add updated_at timestamp
        const repairCheck = assertRepairAllowed(
          'add_timestamp_updated_at',
          'Adding updated_at timestamp for database constraint'
        );
        if (!repairCheck.allowed) {
          errors.push(repairCheck.reason!);
          failureCategory = 'forbidden_repair';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        const updates = {
          ...mutation.updates,
          updated_at: new Date().toISOString(),
        };

        if (mutation.updates.updated_at === undefined) {
          repairs.push('Added updated_at timestamp to container update (database requirement)');
        }

        const { error } = await supabase
          .from('mindmesh_containers')
          .update(updates)
          .eq('id', mutation.containerId);

        if (error) {
          errors.push(`Failed to update container: ${error.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        // OUTBOUND SYNC: Sync updates to Guardrails for integrated containers
        const {
          syncContainerTitleUpdate,
          syncContainerBodyUpdate,
        } = await import('./sync');

        if (mutation.updates.title !== undefined) {
          const titleSyncResult = await syncContainerTitleUpdate(
            mutation.containerId,
            mutation.updates.title as string
          );
          warnings.push(...titleSyncResult.warnings);
          if (!titleSyncResult.success) {
            errors.push(...titleSyncResult.errors);
            failureCategory = 'sync_failure';
            return { success: false, errors, warnings, repairs, failureCategory };
          }
        }

        if (mutation.updates.body !== undefined) {
          const bodySyncResult = await syncContainerBodyUpdate(
            mutation.containerId,
            mutation.updates.body as string
          );
          warnings.push(...bodySyncResult.warnings);
          if (!bodySyncResult.success) {
            errors.push(...bodySyncResult.errors);
            failureCategory = 'sync_failure';
            return { success: false, errors, warnings, repairs, failureCategory };
          }
        }

        break;
      }

      case 'delete_container': {
        // OUTBOUND SYNC: Fetch container before deletion to sync to Guardrails
        const { data: containerToDelete } = await supabase
          .from('mindmesh_containers')
          .select('id, entity_id, entity_type')
          .eq('id', mutation.containerId)
          .maybeSingle();

        // No repairs needed for delete
        const { error } = await supabase
          .from('mindmesh_containers')
          .delete()
          .eq('id', mutation.containerId);

        if (error) {
          errors.push(`Failed to delete container: ${error.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        // OUTBOUND SYNC: Sync deletion to Guardrails for integrated containers
        if (containerToDelete) {
          const { syncContainerDeletion } = await import('./sync');
          const deletionSyncResult = await syncContainerDeletion(containerToDelete.id);
          warnings.push(...deletionSyncResult.warnings);
          if (!deletionSyncResult.success) {
            errors.push(...deletionSyncResult.errors);
            failureCategory = 'sync_failure';
            return { success: false, errors, warnings, repairs, failureCategory };
          }
        }

        break;
      }

      case 'create_node': {
        // ALLOWED REPAIR: Add timestamps
        const repairCheck = assertRepairAllowed(
          'add_timestamp_created_at',
          'Adding created_at timestamp for database constraint'
        );
        if (!repairCheck.allowed) {
          errors.push(repairCheck.reason!);
          failureCategory = 'forbidden_repair';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        const node = {
          ...mutation.node,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (mutation.node.created_at === undefined) {
          repairs.push('Added created_at timestamp to node (database requirement)');
        }

        const { error } = await supabase.from('mindmesh_nodes').insert(node);

        if (error) {
          errors.push(`Failed to create node: ${error.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        break;
      }

      case 'update_node': {
        // ALLOWED REPAIR: Add updated_at timestamp
        const repairCheck = assertRepairAllowed(
          'add_timestamp_updated_at',
          'Adding updated_at timestamp for database constraint'
        );
        if (!repairCheck.allowed) {
          errors.push(repairCheck.reason!);
          failureCategory = 'forbidden_repair';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        const updates = {
          ...mutation.updates,
          updated_at: new Date().toISOString(),
        };

        if (mutation.updates.updated_at === undefined) {
          repairs.push('Added updated_at timestamp to node update (database requirement)');
        }

        const { error } = await supabase
          .from('mindmesh_nodes')
          .update(updates)
          .eq('id', mutation.nodeId);

        if (error) {
          errors.push(`Failed to update node: ${error.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        break;
      }

      case 'delete_node': {
        // No repairs needed for delete
        const { error } = await supabase
          .from('mindmesh_nodes')
          .delete()
          .eq('id', mutation.nodeId);

        if (error) {
          errors.push(`Failed to delete node: ${error.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        break;
      }

      case 'update_workspace_flags': {
        // ALLOWED REPAIR: Add updated_at timestamp
        const repairCheck = assertRepairAllowed(
          'add_timestamp_updated_at',
          'Adding updated_at timestamp for database constraint'
        );
        if (!repairCheck.allowed) {
          errors.push(repairCheck.reason!);
          failureCategory = 'forbidden_repair';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        const updates = {
          ...mutation.updates,
          updated_at: new Date().toISOString(),
        };

        if (mutation.updates.updated_at === undefined) {
          repairs.push('Added updated_at timestamp to workspace update (database requirement)');
        }

        const { error } = await supabase
          .from('mindmesh_workspaces')
          .update(updates)
          .eq('id', mutation.workspaceId);

        if (error) {
          errors.push(`Failed to update workspace: ${error.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        break;
      }

      case 'create_guardrails_track': {
        // CONTROLLED EXCEPTION: Create Guardrails track as part of integrated container creation
        // This is validated at plan time to ensure it's paired with create_integrated_container

        // Use Guardrails service to create track with proper validation
        const { createTrack } = await import('../guardrails/trackService');

        try {
          await createTrack({
            masterProjectId: mutation.track.masterProjectId,
            parentTrackId: mutation.track.parentTrackId,
            name: mutation.track.name,
            description: mutation.track.description || undefined,
            color: mutation.track.color || undefined,
            orderingIndex: mutation.track.orderingIndex,
            category: 'default', // Default category for Mind Mesh created tracks
          });
        } catch (trackError: any) {
          errors.push(`Failed to create Guardrails track: ${trackError.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        break;
      }

      case 'create_guardrails_roadmap_item': {
        // CONTROLLED EXCEPTION: Create Guardrails roadmap_item (task/event) as part of integrated container creation
        // This is validated at plan time to ensure it's paired with create_integrated_container or attach_container_reference

        try {
          // Directly insert into roadmap_items table
          const itemData: any = {
            id: mutation.item.id,
            track_id: mutation.item.trackId,
            title: mutation.item.title,
            description: mutation.item.description,
            type: mutation.item.type,
            status: mutation.item.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Add type-specific fields
          if (mutation.item.type === 'task' && mutation.item.dueAt) {
            // For tasks, due_at goes in metadata
            itemData.metadata = { dueAt: mutation.item.dueAt };
          } else if (mutation.item.type === 'event') {
            itemData.start_date = mutation.item.startsAt ? new Date(mutation.item.startsAt).toISOString().split('T')[0] : null;
            itemData.end_date = mutation.item.endsAt ? new Date(mutation.item.endsAt).toISOString().split('T')[0] : mutation.item.startsAt ? new Date(mutation.item.startsAt).toISOString().split('T')[0] : null;

            // Store full timestamps in metadata
            itemData.metadata = {
              startsAt: mutation.item.startsAt,
              endsAt: mutation.item.endsAt,
            };
          }

          const { error: itemError } = await supabase
            .from('roadmap_items')
            .insert(itemData);

          if (itemError) {
            errors.push(`Failed to create roadmap item: ${itemError.message}`);
            failureCategory = 'mutation_failure';
            return { success: false, errors, warnings, repairs, failureCategory };
          }
        } catch (itemError: any) {
          errors.push(`Failed to create roadmap item: ${itemError.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        break;
      }

      case 'create_integrated_container': {
        // Create Mind Mesh container with reference to Guardrails entity
        // The Guardrails entity must be created first (in the same plan)

        const repairCheck = assertRepairAllowed(
          'add_timestamp_created_at',
          'Adding created_at timestamp for database constraint'
        );
        if (!repairCheck.allowed) {
          errors.push(repairCheck.reason!);
          failureCategory = 'forbidden_repair';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        const timestamp = new Date().toISOString();

        // 1. Create the container
        const containerData = {
          id: mutation.container.id,
          workspace_id: mutation.container.workspaceId,
          entity_id: mutation.entityId,
          entity_type: mutation.entityType,
          title: mutation.container.title,
          body: mutation.container.body || '',
          x_position: mutation.container.xPosition,
          y_position: mutation.container.yPosition,
          width: mutation.container.width,
          height: mutation.container.height,
          state: 'active',
          spawn_strategy: 'manual',
          layout_broken: false,
          user_positioned: true,
          last_interaction_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
        };

        const { error: containerError } = await supabase
          .from('mindmesh_containers')
          .insert(containerData);

        if (containerError) {
          errors.push(`Failed to create integrated container: ${containerError.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        // 2. Create the container reference
        const referenceData = {
          container_id: mutation.container.id,
          entity_type: mutation.entityType,
          entity_id: mutation.entityId,
          is_primary: true, // Integrated containers have exactly one primary reference
          metadata: { source: 'mind_mesh_creation' },
          created_at: timestamp,
        };

        const { error: referenceError } = await supabase
          .from('mindmesh_container_references')
          .insert(referenceData);

        if (referenceError) {
          errors.push(`Failed to create container reference: ${referenceError.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        repairs.push('Added created_at timestamp to integrated container (database requirement)');
        break;
      }

      case 'attach_container_reference': {
        // Attach a container reference to link Mind Mesh container to Guardrails entity
        // Used for promotion of local containers to integrated entities

        const timestamp = new Date().toISOString();

        const referenceData = {
          container_id: mutation.containerId,
          entity_type: mutation.entityType,
          entity_id: mutation.entityId,
          is_primary: mutation.isPrimary,
          metadata: mutation.metadata || {},
          created_at: timestamp,
        };

        const { error: referenceError } = await supabase
          .from('mindmesh_container_references')
          .insert(referenceData);

        if (referenceError) {
          errors.push(`Failed to attach container reference: ${referenceError.message}`);
          failureCategory = 'mutation_failure';
          return { success: false, errors, warnings, repairs, failureCategory };
        }

        break;
      }

      default:
        // Unknown mutation type
        errors.push(`Unknown mutation type: ${(mutation as any).type}`);
        failureCategory = 'validation_failure';
        return { success: false, errors, warnings, repairs, failureCategory };
    }

    return { success: true, errors, warnings, repairs };
  } catch (error) {
    errors.push(`Mutation execution failed: ${error}`);
    failureCategory = 'unknown';
    return { success: false, errors, warnings, repairs, failureCategory };
  }
}

// ============================================================================
// INVERSE MUTATIONS (FOR ROLLBACK - BEST EFFORT)
// ============================================================================

/**
 * Generates inverse mutations for rollback support.
 *
 * CRITICAL LIMITATIONS (DOCUMENTED):
 * - Rollback is BEST-EFFORT only
 * - Deletions CANNOT be reversed (data is lost)
 * - Updates CANNOT be reversed (previous values not captured)
 * - Only creations CAN be reversed (by deleting)
 *
 * Why these limitations exist:
 * - Capturing full state would require snapshots (expensive, complex)
 * - Capturing previous values would require history tracking (not implemented)
 * - Creations can be reversed because delete is idempotent
 *
 * To make rollback fully reversible, would need:
 * - Full entity snapshots before deletion
 * - Field-level history tracking for updates
 * - Complex merge logic for partial updates
 * - Significant storage and performance cost
 *
 * Decision: Best-effort rollback is sufficient for MVP.
 * User understands rollback may be incomplete.
 *
 * @param mutations - Original mutations
 * @returns Inverse mutations, reversibility flag, and reasons
 */
function generateInverseMutations(
  mutations: PlanMutation[]
): {
  inverseMutations: PlanMutation[];
  isReversible: boolean;
  nonReversibleReasons: string[];
} {
  const inverseMutations: PlanMutation[] = [];
  const nonReversibleReasons: string[] = [];
  let isFullyReversible = true;

  // Process in reverse order
  for (let i = mutations.length - 1; i >= 0; i--) {
    const mutation = mutations[i];

    switch (mutation.type) {
      case 'create_container':
        // REVERSIBLE: Delete the created container
        inverseMutations.push({
          type: 'delete_container',
          containerId: mutation.container.id,
        });
        break;

      case 'update_container':
        // NON-REVERSIBLE: Previous field values not captured
        isFullyReversible = false;
        nonReversibleReasons.push(
          `Container update (${mutation.containerId}): Previous field values not captured, cannot restore`
        );
        break;

      case 'delete_container':
        // NON-REVERSIBLE: Container data lost, cannot restore
        isFullyReversible = false;
        nonReversibleReasons.push(
          `Container deletion (${mutation.containerId}): Data lost, cannot restore deleted container`
        );
        break;

      case 'create_node':
        // REVERSIBLE: Delete the created node
        inverseMutations.push({
          type: 'delete_node',
          nodeId: mutation.node.id,
        });
        break;

      case 'update_node':
        // NON-REVERSIBLE: Previous field values not captured
        isFullyReversible = false;
        nonReversibleReasons.push(
          `Node update (${mutation.nodeId}): Previous field values not captured, cannot restore`
        );
        break;

      case 'delete_node':
        // NON-REVERSIBLE: Node data lost, cannot restore
        isFullyReversible = false;
        nonReversibleReasons.push(
          `Node deletion (${mutation.nodeId}): Data lost, cannot restore deleted node`
        );
        break;

      case 'update_workspace_flags':
        // NON-REVERSIBLE: Previous flag values not captured
        isFullyReversible = false;
        nonReversibleReasons.push(
          `Workspace update (${mutation.workspaceId}): Previous flag values not captured, cannot restore`
        );
        break;

      case 'create_guardrails_track':
        // NON-REVERSIBLE: Guardrails track creation cannot be reversed by Mind Mesh
        // Guardrails owns track lifecycle, Mind Mesh cannot delete tracks
        isFullyReversible = false;
        nonReversibleReasons.push(
          `Guardrails track creation (${mutation.track.name}): Cannot reverse Guardrails mutations, track remains in Roadmap`
        );
        break;

      case 'create_guardrails_roadmap_item':
        // NON-REVERSIBLE: Guardrails roadmap_item creation cannot be reversed by Mind Mesh
        // Guardrails owns roadmap_item lifecycle, Mind Mesh cannot delete roadmap_items
        isFullyReversible = false;
        nonReversibleReasons.push(
          `Guardrails roadmap_item creation (${mutation.item.title}): Cannot reverse Guardrails mutations, task/event remains in Roadmap`
        );
        break;

      case 'create_integrated_container':
        // PARTIALLY REVERSIBLE: Can delete Mind Mesh container, but Guardrails entity remains
        // The container deletion will remove the Mind Mesh representation
        // but the Guardrails track will remain in Roadmap
        inverseMutations.push({
          type: 'delete_container',
          containerId: mutation.container.id,
        });
        isFullyReversible = false;
        nonReversibleReasons.push(
          `Integrated container creation (${mutation.container.title}): Container can be deleted, but Guardrails entity remains`
        );
        break;

      case 'attach_container_reference':
        // PARTIALLY REVERSIBLE: Can delete reference, but Guardrails entity and container remain
        // Rollback would detach the reference but not delete the promoted Guardrails entity
        isFullyReversible = false;
        nonReversibleReasons.push(
          `Container reference attachment: Reference can be deleted, but Guardrails entity ${mutation.entityId} remains`
        );
        break;
    }
  }

  return {
    inverseMutations,
    isReversible: isFullyReversible,
    nonReversibleReasons,
  };
}

// ============================================================================
// CANVAS LOCK CHECKS (RUNTIME ENFORCEMENT)
// ============================================================================

/**
 * Asserts that canvas lock is held by the user.
 *
 * NON-NEGOTIABLE: All writes require active canvas lock.
 * This prevents concurrent modifications and ensures data consistency.
 *
 * @param context - Execution context
 * @returns Validation result
 */
async function assertCanvasLockHeld(
  context: ExecutionContext
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check lock exists and is valid
  const lockCheck = validateWritePermission(
    context.workspaceId,
    context.userId,
    context.currentLock
  );

  if (!lockCheck.valid) {
    errors.push(...lockCheck.errors.map((e) => e.message));
    return { valid: false, errors };
  }

  // Check lock hasn't expired
  if (context.currentLock && isLockExpired(context.currentLock)) {
    errors.push('Canvas lock has expired');
    return { valid: false, errors };
  }

  return { valid: true, errors };
}

// ============================================================================
// EXECUTION HISTORY (FOR ROLLBACK - BOUNDED)
// ============================================================================

/**
 * In-memory execution history (bounded to MAX_STORED_PLANS_PER_WORKSPACE).
 *
 * Why in-memory for MVP:
 * - Fast access for rollback
 * - No database persistence complexity
 * - Bounded storage (3 plans per workspace)
 * - Acceptable for MVP (no cross-session rollback)
 *
 * For production, consider:
 * - Persisting to database for cross-session rollback
 * - Longer retention period
 * - Audit trail for compliance
 *
 * Structure: workspaceId -> array of stored plans
 */
const executionHistory = new Map<string, StoredPlan[]>();

/**
 * Stores a plan in execution history for rollback.
 * Automatically prunes old plans beyond MAX_STORED_PLANS_PER_WORKSPACE.
 *
 * @param plan - Plan to store
 */
async function storeExecutionHistory(plan: StoredPlan): Promise<void> {
  const workspaceId = plan.workspaceId;

  // Get existing history
  let history = executionHistory.get(workspaceId) || [];

  // Add new plan
  history.push(plan);

  // Prune old plans (keep last N)
  if (history.length > MAX_STORED_PLANS_PER_WORKSPACE) {
    history = history.slice(-MAX_STORED_PLANS_PER_WORKSPACE);
  }

  // Store back
  executionHistory.set(workspaceId, history);
}

/**
 * Gets the last executed plan for a workspace.
 *
 * @param workspaceId - Workspace ID
 * @returns Last executed plan or null
 */
async function getLastExecutedPlan(
  workspaceId: string
): Promise<StoredPlan | null> {
  const history = executionHistory.get(workspaceId) || [];

  if (history.length === 0) {
    return null;
  }

  return history[history.length - 1];
}

/**
 * Removes a plan from execution history.
 *
 * @param planId - Plan ID to remove
 */
async function removeFromExecutionHistory(planId: string): Promise<void> {
  for (const [workspaceId, history] of executionHistory.entries()) {
    const filtered = history.filter((p) => p.planId !== planId);
    if (filtered.length < history.length) {
      executionHistory.set(workspaceId, filtered);
    }
  }
}

/**
 * Clears execution history for a workspace.
 * Used for testing or cleanup.
 *
 * @param workspaceId - Workspace ID
 */
export function clearExecutionHistory(workspaceId: string): void {
  executionHistory.delete(workspaceId);
}

/**
 * Gets execution history for a workspace (for debugging).
 *
 * @param workspaceId - Workspace ID
 * @returns Stored plans
 */
export function getExecutionHistory(workspaceId: string): StoredPlan[] {
  return executionHistory.get(workspaceId) || [];
}
