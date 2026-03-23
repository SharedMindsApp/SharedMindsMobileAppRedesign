import { supabase } from '../supabase';
import {
  assertAuthorityBoundary,
  assertDraftSafety,
  assertPermissionBoundary,
  assertTimelineEligibility,
  assertCompositionDepth,
  assertSharedTrackInvariant,
  assertCollaborationLogImmutability,
  assertOwnership,
  assertNoAntiPattern,
  assertTableAuthority,
  assertSideEffectBoundary,
  InvariantViolationError,
  TIMELINE_INVARIANTS,
} from './SYSTEM_INVARIANTS';

export interface ValidationContext {
  userId: string;
  projectId?: string;
  source: 'ui' | 'api' | 'ai' | 'external';
  operation: 'read' | 'write' | 'delete';
}

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  warnings: string[];
}

export async function validateRoadmapItemCreation(
  itemData: {
    title: string;
    master_project_id: string;
    parent_item_id?: string;
    track_id?: string;
  },
  context: ValidationContext
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  try {
    assertAuthorityBoundary('create_roadmap_item', context.source === 'ai' ? 'ai' : 'guardrails');
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      violations.push(error.message);
    }
  }

  try {
    assertPermissionBoundary(
      'create_roadmap_item',
      context.userId,
      context.projectId || null,
      itemData.master_project_id
    );
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      violations.push(error.message);
    }
  }

  if (itemData.parent_item_id) {
    const depth = await calculateCompositionDepth(itemData.parent_item_id);
    try {
      assertCompositionDepth(depth + 1);
    } catch (error) {
      if (error instanceof InvariantViolationError) {
        violations.push(error.message);
      }
    }
  }

  const hasCircular = itemData.parent_item_id
    ? await checkCircularComposition(itemData.parent_item_id, itemData.parent_item_id)
    : false;

  if (hasCircular) {
    violations.push('Circular composition detected');
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export async function validateRoadmapItemUpdate(
  itemId: string,
  updates: Partial<{
    title: string;
    parent_item_id: string;
    status: string;
    deadline: string;
  }>,
  context: ValidationContext
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  try {
    assertAuthorityBoundary('update_roadmap_item', context.source === 'ai' ? 'ai' : 'guardrails');
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      violations.push(error.message);
    }
  }

  const { data: item } = await supabase
    .from('roadmap_items')
    .select('master_project_id, parent_item_id')
    .eq('id', itemId)
    .maybeSingle();

  if (item) {
    try {
      assertPermissionBoundary(
        'update_roadmap_item',
        context.userId,
        context.projectId || null,
        item.master_project_id
      );
    } catch (error) {
      if (error instanceof InvariantViolationError) {
        violations.push(error.message);
      }
    }
  }

  if (updates.parent_item_id) {
    const newDepth = await calculateCompositionDepth(updates.parent_item_id);
    try {
      assertCompositionDepth(newDepth + 1);
    } catch (error) {
      if (error instanceof InvariantViolationError) {
        violations.push(error.message);
      }
    }

    const hasCircular = await checkCircularComposition(itemId, updates.parent_item_id);
    if (hasCircular) {
      violations.push('Circular composition detected');
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export async function validateTimelineEligibility(
  itemId: string
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  const { data: item } = await supabase
    .from('roadmap_items')
    .select('parent_item_id')
    .eq('id', itemId)
    .maybeSingle();

  const { count: childCount } = await supabase
    .from('roadmap_items')
    .select('id', { count: 'exact', head: true })
    .eq('parent_item_id', itemId);

  const hasParent = !!item?.parent_item_id;
  const hasChildren = (childCount || 0) > 0;

  try {
    assertTimelineEligibility(itemId, hasParent, hasChildren);
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      violations.push(error.message);
    }
  }

  if (hasParent && hasChildren) {
    warnings.push('Middle-tier items should not appear on timeline');
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export async function validateSharedTrack(
  trackId: string
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  const { data: track } = await supabase
    .from('guardrails_tracks')
    .select('master_project_id, is_shared')
    .eq('id', trackId)
    .maybeSingle();

  if (!track?.is_shared) {
    return { valid: true, violations: [], warnings: [] };
  }

  const { count: linkedProjectsCount } = await supabase
    .from('shared_track_links')
    .select('id', { count: 'exact', head: true })
    .eq('shared_track_id', trackId);

  const hasMultiplePrimary = false;
  const hasNoAuthority = !track.master_project_id;

  try {
    assertSharedTrackInvariant(trackId, hasMultiplePrimary, hasNoAuthority);
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      violations.push(error.message);
    }
  }

  if (linkedProjectsCount === 0) {
    warnings.push('Shared track has no consuming projects');
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export async function validateAIOperation(
  operation: string,
  targetTable: string,
  isDraft: boolean,
  context: ValidationContext
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  try {
    assertTableAuthority(targetTable, 'write', 'ai');
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      violations.push(error.message);
    }
  }

  try {
    assertDraftSafety(operation, isDraft, true);
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      violations.push(error.message);
    }
  }

  try {
    assertNoAntiPattern('NO_AI_DIRECT_WRITE', { operation, targetTable });
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      violations.push(error.message);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export async function validatePersonalSpaceOperation(
  operation: string,
  targetEntity: string,
  context: ValidationContext
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  const isConsumptionOperation = operation.includes('consume') || operation.includes('read');
  const isMutationOperation = operation.includes('create') || operation.includes('update') || operation.includes('delete');

  if (isMutationOperation && targetEntity.startsWith('guardrails_')) {
    try {
      assertAuthorityBoundary(operation, 'personal_spaces');
    } catch (error) {
      if (error instanceof InvariantViolationError) {
        violations.push(error.message);
      }
    }
  }

  try {
    assertNoAntiPattern('NO_PERSONAL_SPACES_MUTATION', { operation, targetEntity });
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      violations.push(error.message);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export async function validateCollaborationLog(
  operation: 'create' | 'read' | 'update' | 'delete',
  logId?: string
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (operation === 'update' || operation === 'delete') {
    try {
      assertCollaborationLogImmutability(operation, logId || 'unknown');
    } catch (error) {
      if (error instanceof InvariantViolationError) {
        violations.push(error.message);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export async function validateOwnership(
  entityType: 'draft' | 'personal_link' | 'global_person' | 'track' | 'item',
  entityId: string,
  requestingUserId: string,
  operation: 'read' | 'write'
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  let ownerId: string | null = null;

  if (entityType === 'draft') {
    const { data } = await supabase
      .from('ai_drafts')
      .select('user_id')
      .eq('id', entityId)
      .maybeSingle();
    ownerId = data?.user_id || null;
  } else if (entityType === 'global_person') {
    const { data } = await supabase
      .from('global_people')
      .select('created_by')
      .eq('id', entityId)
      .maybeSingle();
    ownerId = data?.created_by || null;
  }

  if (ownerId) {
    try {
      assertOwnership(entityType, ownerId, requestingUserId, operation);
    } catch (error) {
      if (error instanceof InvariantViolationError) {
        violations.push(error.message);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export async function validateSideEffect(
  action: string,
  intendedEffect: string
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  try {
    assertSideEffectBoundary(action, intendedEffect);
  } catch (error) {
    if (error instanceof InvariantViolationError) {
      violations.push(error.message);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export async function validateCrossProjectAccess(
  userId: string,
  sourceProjectId: string,
  targetProjectId: string,
  entityType: string
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (sourceProjectId !== targetProjectId) {
    try {
      assertPermissionBoundary('cross_project_read', userId, sourceProjectId, targetProjectId);
    } catch (error) {
      if (error instanceof InvariantViolationError) {
        violations.push(error.message);
      }
    }

    const { data: membership } = await supabase
      .from('project_users')
      .select('user_id')
      .eq('master_project_id', targetProjectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership) {
      violations.push(`User does not have access to target project`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

async function calculateCompositionDepth(itemId: string, depth: number = 0): Promise<number> {
  if (depth >= TIMELINE_INVARIANTS.MAX_COMPOSITION_DEPTH) {
    return depth;
  }

  const { data: item } = await supabase
    .from('roadmap_items')
    .select('parent_item_id')
    .eq('id', itemId)
    .maybeSingle();

  if (!item?.parent_item_id) {
    return depth;
  }

  return calculateCompositionDepth(item.parent_item_id, depth + 1);
}

async function checkCircularComposition(
  itemId: string,
  targetParentId: string,
  visited: Set<string> = new Set()
): Promise<boolean> {
  if (itemId === targetParentId) {
    return true;
  }

  if (visited.has(targetParentId)) {
    return false;
  }

  visited.add(targetParentId);

  const { data: parent } = await supabase
    .from('roadmap_items')
    .select('parent_item_id')
    .eq('id', targetParentId)
    .maybeSingle();

  if (!parent?.parent_item_id) {
    return false;
  }

  return checkCircularComposition(itemId, parent.parent_item_id, visited);
}

export async function validateBatchOperation(
  operation: string,
  items: Array<{ id: string; type: string }>,
  context: ValidationContext
): Promise<ValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    if (item.type === 'roadmap_item') {
      const result = await validateTimelineEligibility(item.id);
      violations.push(...result.violations);
      warnings.push(...result.warnings);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

export function enforceArchitecturalBoundaries(
  operation: string,
  source: string,
  target: string
): void {
  const FORBIDDEN_FLOWS = [
    { source: 'ai', target: 'roadmap_items', operation: 'write' },
    { source: 'ai', target: 'guardrails_tracks', operation: 'write' },
    { source: 'personal_spaces', target: 'roadmap_items', operation: 'write' },
    { source: 'task_flow', target: 'roadmap_items', operation: 'create' },
    { source: 'mind_mesh', target: 'roadmap_items', operation: 'create' },
    { source: 'household', target: 'guardrails_tracks', operation: 'write' },
  ];

  const forbidden = FORBIDDEN_FLOWS.find(
    f => f.source === source && f.target === target && f.operation === operation
  );

  if (forbidden) {
    throw new InvariantViolationError(
      'ARCHITECTURAL_BOUNDARY',
      { source, target, operation },
      `${source} cannot ${operation} to ${target}. Architectural boundary violation.`
    );
  }
}

export const VALIDATION_REGISTRY = {
  validateRoadmapItemCreation,
  validateRoadmapItemUpdate,
  validateTimelineEligibility,
  validateSharedTrack,
  validateAIOperation,
  validatePersonalSpaceOperation,
  validateCollaborationLog,
  validateOwnership,
  validateSideEffect,
  validateCrossProjectAccess,
  validateBatchOperation,
  enforceArchitecturalBoundaries,
};

export default VALIDATION_REGISTRY;
