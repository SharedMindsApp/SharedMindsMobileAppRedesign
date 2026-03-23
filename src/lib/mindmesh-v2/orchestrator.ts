/**
 * Mind Mesh V2 Orchestration Layer
 *
 * Coordinates between plan generation and execution services.
 *
 * CRITICAL RULES:
 * - Orchestrator never mutates state directly
 * - Orchestrator never generates plans itself
 * - Orchestrator never executes partial flows
 * - Orchestrator does not depend on UI or transport
 * - All logic lives in existing layers
 * - This layer can be deleted and re-written without breaking core logic
 *
 * Why orchestration is separate from planning and execution:
 * - Planning: Determines WHAT to do (intent → plan)
 * - Execution: Performs the work (plan → database)
 * - Orchestration: Sequences the calls (intent → plan → execute → result)
 *
 * Why no logic lives here:
 * - Logic belongs in domain layers (validation, layout, interaction, execution)
 * - Orchestrator is pure coordination (call A, then call B, return result)
 * - No retries, no inference, no fallbacks, no transformations
 * - One intent → one plan → one execution
 *
 * This layer is a function composition wrapper. That's all.
 */

import type {
  MindMeshWorkspace,
  MindMeshContainer,
  MindMeshNode,
  MindMeshPort,
  MindMeshCanvasLock,
  MindMeshContainerReference,
} from './types';

import type {
  MindMeshIntent,
  PlanContext,
  PlanResult,
} from './planService';

import { planFromIntent } from './planService';

import type {
  GuardrailsEvent,
  GuardrailsAdapterContext,
  GuardrailsAdapterResult,
} from './guardrailsAdapter';

import { planFromGuardrailsEvent } from './guardrailsAdapter';

import type {
  ExecutionContext,
  ExecutionResult,
  FailureCategory,
} from './execution';

import { executePlan } from './execution';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context required for orchestration.
 * Minimal context that orchestrator needs to coordinate services.
 *
 * NOTE: This is NOT the same as PlanContext or ExecutionContext.
 * Orchestrator builds those contexts from this minimal input.
 */
export interface OrchestrationContext {
  userId: string;
  workspaceId: string;
  timestamp: string;

  // Current state snapshots (read-only)
  // Orchestrator passes these to plan generation
  workspace: MindMeshWorkspace;
  currentLock: MindMeshCanvasLock | null;
  containers: MindMeshContainer[];
  nodes: MindMeshNode[];
  ports: MindMeshPort[];
  references: MindMeshContainerReference[];
}

/**
 * Result of orchestration.
 * Contains plan generation result + execution result.
 *
 * This is what API/UI layers should consume.
 */
export interface OrchestrationResult {
  success: boolean;
  planId: string | null;
  executionResult: ExecutionResult | null;
  planningErrors: string[];
  planningWarnings: string[];
  executionErrors: string[];
  executionWarnings: string[];
  failureCategory?: FailureCategory;
  failureStage: 'planning' | 'execution' | null;
}

// ============================================================================
// USER INTENT ORCHESTRATION
// ============================================================================

/**
 * Orchestrates user intent handling.
 *
 * Process:
 * 1. Call planFromIntent(intent, context)
 * 2. If planning fails → return error (do NOT execute)
 * 3. If planning succeeds → call executePlan(plan, executionContext)
 * 4. Return execution result verbatim
 *
 * Rules:
 * - No retries
 * - No inference
 * - No fallbacks
 * - One intent → one plan → one execution
 * - Lock failure = explicit error
 *
 * @param intent - User intent to handle
 * @param context - Orchestration context (minimal)
 * @returns Orchestration result (planning + execution)
 */
export async function handleUserIntent(
  intent: MindMeshIntent,
  context: OrchestrationContext
): Promise<OrchestrationResult> {
  // Build plan context from orchestration context
  const planContext: PlanContext = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    timestamp: context.timestamp,
    workspace: context.workspace,
    currentLock: context.currentLock,
    containers: context.containers,
    nodes: context.nodes,
    ports: context.ports,
  };

  // Step 1: Generate plan (delegation to plan service)
  const planResult: PlanResult = await planFromIntent(intent, planContext);

  // Step 2: If planning fails, return error (do NOT execute)
  if (!planResult.success || !planResult.plan) {
    return {
      success: false,
      planId: null,
      executionResult: null,
      planningErrors: planResult.errors,
      planningWarnings: planResult.warnings,
      executionErrors: [],
      executionWarnings: [],
      failureStage: 'planning',
    };
  }

  // Step 3: Build execution context
  const executionContext: ExecutionContext = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    timestamp: context.timestamp,
    currentLock: context.currentLock,
  };

  // Step 4: Execute plan (delegation to execution service)
  const executionResult: ExecutionResult = await executePlan(
    planResult.plan,
    executionContext
  );

  // Step 5: Return orchestration result
  // Combine planning warnings with execution result
  return {
    success: executionResult.success,
    planId: executionResult.planId,
    executionResult,
    planningErrors: [],
    planningWarnings: planResult.warnings,
    executionErrors: executionResult.errors,
    executionWarnings: executionResult.warnings,
    failureCategory: executionResult.failureCategory,
    failureStage: executionResult.success ? null : 'execution',
  };
}

// ============================================================================
// GUARDRAILS EVENT ORCHESTRATION
// ============================================================================

/**
 * Orchestrates Guardrails event handling.
 *
 * Process:
 * 1. Call planFromGuardrailsEvent(event, context)
 * 2. If no plan produced → return early (no-op with reason)
 * 3. If planning fails → return error (do NOT execute)
 * 4. If planning succeeds → call executePlan(plan, executionContext)
 * 5. Return execution result
 *
 * Rules:
 * - Guardrails remains authoritative
 * - No mutation of Guardrails
 * - No batching or coalescing
 * - Events handled sequentially
 * - No retries on failure
 *
 * @param event - Guardrails event to handle
 * @param context - Orchestration context (minimal)
 * @returns Orchestration result (planning + execution)
 */
export async function handleGuardrailsEvent(
  event: GuardrailsEvent,
  context: OrchestrationContext
): Promise<OrchestrationResult> {
  // Build adapter context from orchestration context
  const adapterContext: GuardrailsAdapterContext = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    timestamp: context.timestamp,
    workspace: context.workspace,
    currentLock: context.currentLock,
    containers: context.containers,
    nodes: context.nodes,
    ports: context.ports,
    references: context.references,
  };

  // Step 1: Generate plan (delegation to Guardrails adapter)
  const adapterResult: GuardrailsAdapterResult = planFromGuardrailsEvent(
    event,
    adapterContext
  );

  // Step 2: If no plan produced, return early (no-op)
  // This is NOT a failure - adapter may decide no action needed
  if (adapterResult.success && !adapterResult.plan) {
    return {
      success: true,
      planId: null,
      executionResult: null,
      planningErrors: [],
      planningWarnings: adapterResult.warnings,
      executionErrors: [],
      executionWarnings: [],
      failureStage: null,
    };
  }

  // Step 3: If planning fails, return error (do NOT execute)
  if (!adapterResult.success || !adapterResult.plan) {
    return {
      success: false,
      planId: null,
      executionResult: null,
      planningErrors: adapterResult.errors,
      planningWarnings: adapterResult.warnings,
      executionErrors: [],
      executionWarnings: [],
      failureStage: 'planning',
    };
  }

  // Step 4: Build execution context
  const executionContext: ExecutionContext = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    timestamp: context.timestamp,
    currentLock: context.currentLock,
  };

  // Step 5: Execute plan (delegation to execution service)
  const executionResult: ExecutionResult = await executePlan(
    adapterResult.plan,
    executionContext
  );

  // Step 6: Return orchestration result
  // Combine adapter warnings with execution result
  return {
    success: executionResult.success,
    planId: executionResult.planId,
    executionResult,
    planningErrors: [],
    planningWarnings: adapterResult.warnings,
    executionErrors: executionResult.errors,
    executionWarnings: executionResult.warnings,
    failureCategory: executionResult.failureCategory,
    failureStage: executionResult.success ? null : 'execution',
  };
}

// ============================================================================
// UTILITIES (OPTIONAL)
// ============================================================================

/**
 * Helper to check if orchestration result represents a no-op.
 * Useful for logging/telemetry layers.
 *
 * A no-op occurs when:
 * - Success = true
 * - No plan was executed (planId = null)
 * - No errors
 *
 * Example: Guardrails event for container that already exists.
 */
export function isNoOp(result: OrchestrationResult): boolean {
  return result.success && result.planId === null && result.planningErrors.length === 0;
}

/**
 * Helper to extract all errors from orchestration result.
 * Combines planning and execution errors.
 *
 * Useful for error reporting layers.
 */
export function getAllErrors(result: OrchestrationResult): string[] {
  return [...result.planningErrors, ...result.executionErrors];
}

/**
 * Helper to extract all warnings from orchestration result.
 * Combines planning and execution warnings.
 *
 * Useful for warning reporting layers.
 */
export function getAllWarnings(result: OrchestrationResult): string[] {
  return [...result.planningWarnings, ...result.executionWarnings];
}
