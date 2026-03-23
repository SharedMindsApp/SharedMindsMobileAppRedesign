/**
 * Mind Mesh V2 Guardrails Event Adapter
 *
 * Translates Guardrails events into Mind Mesh plans.
 *
 * CRITICAL RULES:
 * - Guardrails remains authoritative
 * - No mutation of Guardrails state
 * - No execution here, only planning
 * - Uses ghost materialisation planners only
 * - Respects workspace layout state
 * - Never infers intent
 *
 * Why this adapter exists:
 * - Guardrails owns projects, tracks, roadmaps (authoritative)
 * - Mind Mesh visualizes them (derivative)
 * - When Guardrails changes, Mind Mesh must sync
 * - Adapter converts Guardrails events → Mind Mesh plans
 * - Execution service applies plans atomically
 *
 * Separation of concerns:
 * - Guardrails: What exists (projects, tracks, tasks)
 * - Mind Mesh: How it's visualized (containers, nodes, layout)
 * - Adapter: Translation layer (events → plans)
 */

import type {
  MindMeshWorkspace,
  MindMeshContainer,
  MindMeshNode,
  MindMeshCanvasLock,
  MindMeshPort,
  MindMeshContainerReference,
} from './types';

import type {
  PlanMutation,
  MindMeshPlan,
} from './execution';

import type { InteractionEvent } from './interactions';

import {
  buildReconciliationMap,
  checkForDuplicates,
  logAllDuplicates,
  type ReconciliationMap,
} from './reconciliation';

// ============================================================================
// GUARDRAILS EVENT TYPES
// ============================================================================

/**
 * Guardrails events that trigger Mind Mesh updates.
 *
 * These events come from Guardrails system (authoritative).
 * Adapter translates them into Mind Mesh plans.
 *
 * CRITICAL: Guardrails is authoritative, Mind Mesh is derivative.
 */
export type GuardrailsEvent =
  | {
      type: 'TrackCreated';
      trackId: string;
      projectId: string;
      title: string;
      parentTrackId?: string | null;
    }
  | {
      type: 'TrackDeleted';
      trackId: string;
      projectId: string;
    }
  | {
      type: 'TrackUpdated';
      trackId: string;
      projectId: string;
      updates: {
        title?: string;
        parentTrackId?: string | null;
      };
    }
  | {
      type: 'SubtrackCreated';
      subtrackId: string;
      parentTrackId: string;
      projectId: string;
      title: string;
    }
  | {
      type: 'TaskCreated';
      taskId: string;
      trackId: string;
      projectId: string;
      title: string;
    }
  | {
      type: 'TaskDeleted';
      taskId: string;
      trackId: string;
      projectId: string;
    }
  | {
      type: 'TaskUpdated';
      taskId: string;
      trackId: string;
      projectId: string;
      updates: {
        title?: string;
        trackId?: string;
      };
    };

/**
 * Context required for adapting Guardrails events.
 * Similar to PlanContext but focused on Guardrails sync.
 */
export interface GuardrailsAdapterContext {
  userId: string;
  workspaceId: string;
  timestamp: string;
  workspace: MindMeshWorkspace;
  currentLock: MindMeshCanvasLock | null;

  // Current Mind Mesh state (read-only)
  containers: MindMeshContainer[];
  nodes: MindMeshNode[];
  ports: MindMeshPort[];
  references: MindMeshContainerReference[];
}

/**
 * Adapter result.
 * Either a valid plan or explicit errors.
 */
export interface GuardrailsAdapterResult {
  success: boolean;
  plan: MindMeshPlan | null;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// GUARDRAILS EVENT ADAPTER
// ============================================================================

/**
 * Converts a Guardrails event into a Mind Mesh plan.
 *
 * PRIME RULE: Guardrails is authoritative. Mind Mesh visualizes.
 *
 * Process:
 * 1. Receive Guardrails event (track created, task moved, etc.)
 * 2. Determine Mind Mesh impact (new container, node update, etc.)
 * 3. Respect layout state (broken vs intact)
 * 4. Call ghost materialisation planners
 * 5. Return plan (never execute)
 *
 * Why layout state is critical:
 * - If layout intact: materialize with hierarchy
 * - If layout broken: materialize free-floating
 * - User's layout choices are preserved
 *
 * Why no Guardrails mutation:
 * - Guardrails is the source of truth
 * - Mind Mesh only reflects Guardrails state
 * - Adapter is one-way: Guardrails → Mind Mesh
 *
 * @param event - Guardrails event
 * @param context - Current workspace state (read-only)
 * @returns Plan ready for execution or errors
 */
export function planFromGuardrailsEvent(
  event: GuardrailsEvent,
  context: GuardrailsAdapterContext
): GuardrailsAdapterResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    switch (event.type) {
      case 'TrackCreated':
        return planTrackCreatedEvent(event, context);

      case 'TrackDeleted':
        return planTrackDeletedEvent(event, context);

      case 'TrackUpdated':
        return planTrackUpdatedEvent(event, context);

      case 'SubtrackCreated':
        return planSubtrackCreatedEvent(event, context);

      case 'TaskCreated':
        return planTaskCreatedEvent(event, context);

      case 'TaskDeleted':
        return planTaskDeletedEvent(event, context);

      case 'TaskUpdated':
        return planTaskUpdatedEvent(event, context);

      default:
        errors.push(`Unknown Guardrails event type: ${(event as any).type}`);
        return { success: false, plan: null, errors, warnings };
    }
  } catch (error) {
    errors.push(`Guardrails adapter failed: ${error}`);
    return { success: false, plan: null, errors, warnings };
  }
}

// ============================================================================
// EVENT HANDLERS (DELEGATION TO GHOST MATERIALISATION)
// ============================================================================

/**
 * Plans Mind Mesh updates for a track creation.
 *
 * Uses reconciliation-based logic to prevent duplicates.
 * IDEMPOTENT: Safe to call multiple times for same track.
 */
function planTrackCreatedEvent(
  event: Extract<GuardrailsEvent, { type: 'TrackCreated' }>,
  context: GuardrailsAdapterContext
): GuardrailsAdapterResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build reconciliation map from references (authoritative)
  const reconciliationMap = buildReconciliationMap(
    context.workspaceId,
    context.references
  );

  // Check for duplicates FIRST (fail loudly if found)
  const duplicateCheck = checkForDuplicates(reconciliationMap);
  if (duplicateCheck.hasDuplicates) {
    logAllDuplicates(reconciliationMap);
    errors.push(duplicateCheck.errorMessage!);
    return { success: false, plan: null, errors, warnings };
  }

  // Check if container already exists for this track
  const checkResult = reconciliationMap.checkEntity('track', event.trackId);
  if (checkResult.exists) {
    warnings.push(
      `Container already exists for track ${event.trackId} (container: ${checkResult.containerId})`
    );
    return { success: true, plan: null, errors, warnings };
  }

  // Create ghost container for the new track
  const mutations: PlanMutation[] = [
    {
      type: 'create_integrated_container',
      entityType: 'track',
      entityId: event.trackId,
      title: event.title,
      body: '',
      workspaceId: context.workspaceId,
    },
  ];
  const events: InteractionEvent[] = [];

  // Wrap in plan
  const plan: MindMeshPlan = {
    id: generatePlanId(),
    workspaceId: context.workspaceId,
    mutations,
    description: `Materialize ghost container for track ${event.trackId} (${event.title})`,
    eventsToEmit: events,
    metadata: {
      guardrailsEvent: event.type,
      guardrailsReferenceType: 'track',
      guardrailsReferenceId: event.trackId,
    },
  };

  return { success: true, plan, errors, warnings };
}

/**
 * Plans Mind Mesh updates for a track deletion.
 *
 * Uses reconciliation to find the correct container to delete.
 */
function planTrackDeletedEvent(
  event: Extract<GuardrailsEvent, { type: 'TrackDeleted' }>,
  context: GuardrailsAdapterContext
): GuardrailsAdapterResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build reconciliation map
  const reconciliationMap = buildReconciliationMap(
    context.workspaceId,
    context.references
  );

  // Check for duplicates
  const duplicateCheck = checkForDuplicates(reconciliationMap);
  if (duplicateCheck.hasDuplicates) {
    logAllDuplicates(reconciliationMap);
    errors.push(duplicateCheck.errorMessage!);
    return { success: false, plan: null, errors, warnings };
  }

  // Find container for this track
  const checkResult = reconciliationMap.checkEntity('track', event.trackId);
  if (!checkResult.exists) {
    warnings.push(`No container found for track ${event.trackId}`);
    return { success: true, plan: null, errors, warnings };
  }

  const container = context.containers.find(c => c.id === checkResult.containerId);
  if (!container) {
    errors.push(`Container ${checkResult.containerId} not found in context`);
    return { success: false, plan: null, errors, warnings };
  }

  // Plan deletion
  const mutations: PlanMutation[] = [
    {
      type: 'delete_container',
      containerId: container.id,
    },
  ];

  // Also delete any nodes connected to this container
  const connectedNodes = context.nodes.filter(
    (n) => n.sourcePortId === container.id || n.targetPortId === container.id
  );

  for (const node of connectedNodes) {
    mutations.push({
      type: 'delete_node',
      nodeId: node.id,
    });
  }

  // Wrap in plan
  const plan: MindMeshPlan = {
    id: generatePlanId(),
    workspaceId: context.workspaceId,
    mutations,
    description: `Delete container for deleted track ${event.trackId}`,
    eventsToEmit: [],
    metadata: {
      guardrailsEvent: event.type,
      guardrailsReferenceType: 'track',
      guardrailsReferenceId: event.trackId,
    },
  };

  return { success: true, plan, errors, warnings };
}

/**
 * Plans Mind Mesh updates for a track update.
 *
 * Uses reconciliation to find the correct container to update.
 */
function planTrackUpdatedEvent(
  event: Extract<GuardrailsEvent, { type: 'TrackUpdated' }>,
  context: GuardrailsAdapterContext
): GuardrailsAdapterResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build reconciliation map
  const reconciliationMap = buildReconciliationMap(
    context.workspaceId,
    context.references
  );

  // Check for duplicates
  const duplicateCheck = checkForDuplicates(reconciliationMap);
  if (duplicateCheck.hasDuplicates) {
    logAllDuplicates(reconciliationMap);
    errors.push(duplicateCheck.errorMessage!);
    return { success: false, plan: null, errors, warnings };
  }

  // Find container for this track
  const checkResult = reconciliationMap.checkEntity('track', event.trackId);
  if (!checkResult.exists) {
    warnings.push(`No container found for track ${event.trackId}`);
    return { success: true, plan: null, errors, warnings };
  }

  const container = context.containers.find(c => c.id === checkResult.containerId);
  if (!container) {
    errors.push(`Container ${checkResult.containerId} not found in context`);
    return { success: false, plan: null, errors, warnings };
  }

  // Plan update
  const updates: Partial<MindMeshContainer> = {};

  if (event.updates.title !== undefined) {
    updates.title = event.updates.title;
  }

  // Note: Parent relationship changes would need more complex logic
  // This is a simplified version
  if (event.updates.parentTrackId !== undefined) {
    warnings.push('Parent track changes not yet fully implemented');
  }

  if (Object.keys(updates).length === 0) {
    warnings.push('No updates to apply');
    return { success: true, plan: null, errors, warnings };
  }

  const mutations: PlanMutation[] = [
    {
      type: 'update_container',
      containerId: container.id,
      updates,
    },
  ];

  // Wrap in plan
  const plan: MindMeshPlan = {
    id: generatePlanId(),
    workspaceId: context.workspaceId,
    mutations,
    description: `Update container for track ${event.trackId}`,
    eventsToEmit: [],
    metadata: {
      guardrailsEvent: event.type,
      guardrailsReferenceType: 'track',
      guardrailsReferenceId: event.trackId,
    },
  };

  return { success: true, plan, errors, warnings };
}

/**
 * Plans Mind Mesh updates for a subtrack creation.
 *
 * Delegates to ghost materialisation with parent relationship.
 */
function planSubtrackCreatedEvent(
  event: Extract<GuardrailsEvent, { type: 'SubtrackCreated' }>,
  context: GuardrailsAdapterContext
): GuardrailsAdapterResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build reconciliation map from references table (authoritative source)
  const reconciliationMap = buildReconciliationMap(context.workspaceId, context.references);

  // Check for duplicates FIRST - fail loudly if found
  const duplicateCheck = checkForDuplicates(reconciliationMap);
  if (duplicateCheck.hasDuplicates) {
    logAllDuplicates(reconciliationMap);
    errors.push(duplicateCheck.errorMessage!);
    return { success: false, plan: null, errors, warnings };
  }

  // Check if container already exists using reconciliation map
  const checkResult = reconciliationMap.checkEntity('track', event.subtrackId);
  if (checkResult.exists) {
    warnings.push(`Container already exists for subtrack ${event.subtrackId}`);
    return { success: true, plan: null, errors, warnings };
  }

  // Create ghost container for the new subtrack
  const mutations: PlanMutation[] = [
    {
      type: 'create_integrated_container',
      entityType: 'track',
      entityId: event.subtrackId,
      title: event.title,
      body: '',
      workspaceId: context.workspaceId,
    },
  ];

  // Wrap in plan
  const plan: MindMeshPlan = {
    id: generatePlanId(),
    workspaceId: context.workspaceId,
    mutations,
    description: `Materialize ghost container for subtrack ${event.subtrackId} (${event.title})`,
    eventsToEmit: [],
    metadata: {
      guardrailsEvent: event.type,
      guardrailsReferenceType: 'subtrack',
      guardrailsReferenceId: event.subtrackId,
    },
  };

  return { success: true, plan, errors, warnings };
}

/**
 * Plans Mind Mesh updates for a task creation.
 *
 * Creates ghost container for new task.
 */
function planTaskCreatedEvent(
  event: Extract<GuardrailsEvent, { type: 'TaskCreated' }>,
  context: GuardrailsAdapterContext
): GuardrailsAdapterResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build reconciliation map from references table (authoritative source)
  const reconciliationMap = buildReconciliationMap(context.workspaceId, context.references);

  // Check for duplicates FIRST - fail loudly if found
  const duplicateCheck = checkForDuplicates(reconciliationMap);
  if (duplicateCheck.hasDuplicates) {
    logAllDuplicates(reconciliationMap);
    errors.push(duplicateCheck.errorMessage!);
    return { success: false, plan: null, errors, warnings };
  }

  // Check if container already exists using reconciliation map
  const checkResult = reconciliationMap.checkEntity('roadmap_item', event.taskId);
  if (checkResult.exists) {
    warnings.push(`Container already exists for task ${event.taskId}`);
    return { success: true, plan: null, errors, warnings };
  }

  // Create ghost container for the new task
  const mutations: PlanMutation[] = [
    {
      type: 'create_integrated_container',
      entityType: 'roadmap_item',
      entityId: event.taskId,
      title: event.title,
      body: '',
      workspaceId: context.workspaceId,
    },
  ];

  // Wrap in plan
  const plan: MindMeshPlan = {
    id: generatePlanId(),
    workspaceId: context.workspaceId,
    mutations,
    description: `Materialize ghost container for task ${event.taskId} (${event.title})`,
    eventsToEmit: [],
    metadata: {
      guardrailsEvent: event.type,
      guardrailsReferenceType: 'task',
      guardrailsReferenceId: event.taskId,
    },
  };

  return { success: true, plan, errors, warnings };
}

/**
 * Plans Mind Mesh updates for a task deletion.
 *
 * Deletes container referencing the deleted task.
 */
function planTaskDeletedEvent(
  event: Extract<GuardrailsEvent, { type: 'TaskDeleted' }>,
  context: GuardrailsAdapterContext
): GuardrailsAdapterResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build reconciliation map from references table (authoritative source)
  const reconciliationMap = buildReconciliationMap(context.workspaceId, context.references);

  // Check for duplicates FIRST - fail loudly if found
  const duplicateCheck = checkForDuplicates(reconciliationMap);
  if (duplicateCheck.hasDuplicates) {
    logAllDuplicates(reconciliationMap);
    errors.push(duplicateCheck.errorMessage!);
    return { success: false, plan: null, errors, warnings };
  }

  // Find container using reconciliation map
  const checkResult = reconciliationMap.checkEntity('roadmap_item', event.taskId);
  if (!checkResult.exists) {
    warnings.push(`No container found for task ${event.taskId}`);
    return { success: true, plan: null, errors, warnings };
  }

  // Get the actual container object
  const container = context.containers.find((c) => c.id === checkResult.containerId);
  if (!container) {
    errors.push(`Container ${checkResult.containerId} exists in references but not in workspace`);
    return { success: false, plan: null, errors, warnings };
  }

  // Plan deletion
  const mutations: PlanMutation[] = [
    {
      type: 'delete_container',
      containerId: container.id,
    },
  ];

  // Also delete any nodes connected to this container
  const connectedNodes = context.nodes.filter(
    (n) => n.sourcePortId === container.id || n.targetPortId === container.id
  );

  for (const node of connectedNodes) {
    mutations.push({
      type: 'delete_node',
      nodeId: node.id,
    });
  }

  // Wrap in plan
  const plan: MindMeshPlan = {
    id: generatePlanId(),
    workspaceId: context.workspaceId,
    mutations,
    description: `Delete container for deleted task ${event.taskId}`,
    eventsToEmit: [],
    metadata: {
      guardrailsEvent: event.type,
      guardrailsReferenceType: 'task',
      guardrailsReferenceId: event.taskId,
    },
  };

  return { success: true, plan, errors, warnings };
}

/**
 * Plans Mind Mesh updates for a task update.
 *
 * Updates container title or track assignment.
 */
function planTaskUpdatedEvent(
  event: Extract<GuardrailsEvent, { type: 'TaskUpdated' }>,
  context: GuardrailsAdapterContext
): GuardrailsAdapterResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build reconciliation map from references table (authoritative source)
  const reconciliationMap = buildReconciliationMap(context.workspaceId, context.references);

  // Check for duplicates FIRST - fail loudly if found
  const duplicateCheck = checkForDuplicates(reconciliationMap);
  if (duplicateCheck.hasDuplicates) {
    logAllDuplicates(reconciliationMap);
    errors.push(duplicateCheck.errorMessage!);
    return { success: false, plan: null, errors, warnings };
  }

  // Find container using reconciliation map
  const checkResult = reconciliationMap.checkEntity('roadmap_item', event.taskId);
  if (!checkResult.exists) {
    warnings.push(`No container found for task ${event.taskId}`);
    return { success: true, plan: null, errors, warnings };
  }

  // Get the actual container object
  const container = context.containers.find((c) => c.id === checkResult.containerId);
  if (!container) {
    errors.push(`Container ${checkResult.containerId} exists in references but not in workspace`);
    return { success: false, plan: null, errors, warnings };
  }

  // Plan update
  const updates: Partial<MindMeshContainer> = {};

  if (event.updates.title !== undefined) {
    updates.title = event.updates.title;
  }

  // Note: Track assignment changes would need more complex logic
  if (event.updates.trackId !== undefined) {
    warnings.push('Task track reassignment not yet fully implemented');
  }

  if (Object.keys(updates).length === 0) {
    warnings.push('No updates to apply');
    return { success: true, plan: null, errors, warnings };
  }

  const mutations: PlanMutation[] = [
    {
      type: 'update_container',
      containerId: container.id,
      updates,
    },
  ];

  // Wrap in plan
  const plan: MindMeshPlan = {
    id: generatePlanId(),
    workspaceId: context.workspaceId,
    mutations,
    description: `Update container for task ${event.taskId}`,
    eventsToEmit: [],
    metadata: {
      guardrailsEvent: event.type,
      guardrailsReferenceType: 'task',
      guardrailsReferenceId: event.taskId,
    },
  };

  return { success: true, plan, errors, warnings };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generates a unique plan ID.
 * Format: plan_guardrails_<timestamp>_<random>
 */
function generatePlanId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `plan_guardrails_${timestamp}_${random}`;
}
