/**
 * Mind Mesh V2 Sync Guards
 *
 * Explicit enforcement of sync boundaries between Mind Mesh and Guardrails.
 *
 * CONTRACT:
 * - Integrated containers (with entity_id) MAY sync bidirectionally
 * - Local-only containers (without entity_id) NEVER sync to Guardrails
 * - Any violation fails loudly with diagnostics
 *
 * NO SILENT FALLBACKS. NO INFERENCE. EXPLICIT ONLY.
 */

import { supabase } from '../supabase';
import type { MindMeshContainer } from '../../hooks/useMindMesh';

export interface SyncGuardResult {
  allowed: boolean;
  reason?: string;
  diagnostics?: Record<string, unknown>;
}

export interface ContainerAuthority {
  containerId: string;
  isIntegrated: boolean;
  entityType: string | null;
  entityId: string | null;
  source: string | null;
}

/**
 * Fetches container authority information.
 *
 * Determines if container is integrated (has Guardrails backing) or local-only.
 */
export async function getContainerAuthority(
  containerId: string
): Promise<ContainerAuthority> {
  const { data: container, error: containerError } = await supabase
    .from('mindmesh_containers')
    .select('id, entity_type, entity_id')
    .eq('id', containerId)
    .maybeSingle();

  if (containerError || !container) {
    throw new Error(`Failed to fetch container: ${containerError?.message || 'Container not found'}`);
  }

  const isIntegrated = !!(container.entity_id && container.entity_id.trim() !== '');

  let source: string | null = null;
  if (isIntegrated) {
    const { data: reference } = await supabase
      .from('mindmesh_container_references')
      .select('metadata')
      .eq('container_id', containerId)
      .eq('is_primary', true)
      .maybeSingle();

    if (reference?.metadata) {
      const metadata = reference.metadata as Record<string, unknown>;
      source = (metadata.source as string) || null;
    }
  }

  return {
    containerId,
    isIntegrated,
    entityType: container.entity_type || null,
    entityId: container.entity_id || null,
    source,
  };
}

/**
 * Checks if a container is integrated (has Guardrails backing).
 *
 * A container is integrated if:
 * - entity_id is set and non-empty
 * - entity_type is set
 */
export function isIntegratedContainer(container: MindMeshContainer): boolean {
  return !!(
    container.entity_id &&
    container.entity_id.trim() !== '' &&
    container.entity_type
  );
}

/**
 * Checks if a container is local-only (no Guardrails backing).
 *
 * A container is local-only if:
 * - entity_id is null, undefined, or empty string
 */
export function isLocalOnlyContainer(container: MindMeshContainer): boolean {
  return !container.entity_id || container.entity_id.trim() === '';
}

/**
 * Guards outbound sync (Mind Mesh → Guardrails).
 *
 * ENFORCES:
 * - Only integrated containers may sync to Guardrails
 * - Local-only containers are explicitly blocked
 * - Fails loudly with diagnostics
 *
 * NO SILENT FALLBACKS.
 */
export async function guardOutboundSync(
  containerId: string,
  operation: 'update' | 'delete' | 'reparent'
): Promise<SyncGuardResult> {
  const authority = await getContainerAuthority(containerId);

  if (!authority.isIntegrated) {
    return {
      allowed: false,
      reason: `OUTBOUND SYNC BLOCKED: Container ${containerId} is local-only and cannot sync to Guardrails`,
      diagnostics: {
        containerId,
        operation,
        entityType: authority.entityType,
        entityId: authority.entityId,
        isIntegrated: false,
        authority: 'local_only',
        blockReason: 'Local-only containers never sync to Guardrails',
      },
    };
  }

  if (!authority.entityType || !authority.entityId) {
    return {
      allowed: false,
      reason: `OUTBOUND SYNC BLOCKED: Container ${containerId} has missing entity reference`,
      diagnostics: {
        containerId,
        operation,
        entityType: authority.entityType,
        entityId: authority.entityId,
        isIntegrated: authority.isIntegrated,
        blockReason: 'Integrated container missing entity_type or entity_id',
      },
    };
  }

  return {
    allowed: true,
    diagnostics: {
      containerId,
      operation,
      entityType: authority.entityType,
      entityId: authority.entityId,
      isIntegrated: true,
      authority: 'integrated',
      source: authority.source,
    },
  };
}

/**
 * Guards inbound sync (Guardrails → Mind Mesh).
 *
 * ENFORCES:
 * - Only entities with existing Mind Mesh containers may be synced
 * - New entities spawn as ghosts (separate from sync)
 * - Updates only affect integrated containers
 */
export async function guardInboundSync(
  entityType: string,
  entityId: string,
  operation: 'update' | 'delete'
): Promise<SyncGuardResult> {
  const { data: container, error } = await supabase
    .from('mindmesh_containers')
    .select('id, entity_type, entity_id, state')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle();

  if (error) {
    return {
      allowed: false,
      reason: `INBOUND SYNC BLOCKED: Database error fetching container for ${entityType}:${entityId}`,
      diagnostics: {
        entityType,
        entityId,
        operation,
        error: error.message,
      },
    };
  }

  if (!container) {
    return {
      allowed: false,
      reason: `INBOUND SYNC BLOCKED: No Mind Mesh container exists for ${entityType}:${entityId}`,
      diagnostics: {
        entityType,
        entityId,
        operation,
        blockReason: 'Entity not yet spawned in Mind Mesh (create ghost first)',
      },
    };
  }

  return {
    allowed: true,
    diagnostics: {
      containerId: container.id,
      entityType,
      entityId,
      operation,
      containerState: container.state,
    },
  };
}

/**
 * Asserts that a container is integrated and throws if not.
 *
 * Use this when outbound sync is required and must not proceed if blocked.
 */
export async function assertIntegratedContainer(
  containerId: string,
  operation: string
): Promise<void> {
  const guard = await guardOutboundSync(containerId, operation as 'update' | 'delete' | 'reparent');

  if (!guard.allowed) {
    console.error('SYNC GUARD VIOLATION:', guard.diagnostics);
    throw new Error(guard.reason || 'Outbound sync not allowed for this container');
  }
}

/**
 * Checks if a container can sync outbound without throwing.
 *
 * Use this for conditional sync logic.
 */
export async function canSyncOutbound(containerId: string): Promise<boolean> {
  try {
    const authority = await getContainerAuthority(containerId);
    return authority.isIntegrated && !!authority.entityType && !!authority.entityId;
  } catch (error) {
    console.error('Failed to check sync capability:', error);
    return false;
  }
}

/**
 * Logs sync guard diagnostics.
 *
 * Called when sync is blocked to provide visibility.
 */
export function logSyncBlock(result: SyncGuardResult): void {
  console.warn('SYNC BLOCKED:', {
    reason: result.reason,
    diagnostics: result.diagnostics,
    timestamp: new Date().toISOString(),
  });
}
