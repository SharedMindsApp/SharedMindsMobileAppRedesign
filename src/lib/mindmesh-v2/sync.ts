/**
 * Mind Mesh V2 Two-Way Sync Service
 *
 * Enforces bidirectional sync between Mind Mesh and Guardrails for integrated containers.
 *
 * SYNC RULES:
 * - Integrated containers: Full two-way sync
 * - Local-only containers: Never sync to Guardrails
 * - All operations gated by sync guards
 *
 * OPERATIONS:
 * - Inbound: Guardrails → Mind Mesh (track updates, deletions)
 * - Outbound: Mind Mesh → Guardrails (container updates from canvas)
 */

import { supabase } from '../supabase';
import {
  guardInboundSync,
  guardOutboundSync,
  logSyncBlock,
  type SyncGuardResult,
} from './syncGuards';

export interface SyncResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  synced: boolean;
}

/**
 * Syncs track rename from Guardrails to Mind Mesh.
 *
 * INBOUND OPERATION: Guardrails → Mind Mesh
 *
 * Called when a track is renamed in Guardrails.
 * Updates the corresponding Mind Mesh container title if it exists.
 */
export async function syncTrackRename(
  trackId: string,
  newName: string
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardInboundSync('track', trackId, 'update');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Inbound sync skipped (no Mind Mesh container)'],
      synced: false,
    };
  }

  const containerId = guard.diagnostics?.containerId as string;

  const { error } = await supabase
    .from('mindmesh_containers')
    .update({
      title: newName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', containerId);

  if (error) {
    errors.push(`Failed to sync track rename to Mind Mesh: ${error.message}`);
    return { success: false, errors, warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Syncs track description update from Guardrails to Mind Mesh.
 *
 * INBOUND OPERATION: Guardrails → Mind Mesh
 */
export async function syncTrackDescriptionUpdate(
  trackId: string,
  newDescription: string | null
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardInboundSync('track', trackId, 'update');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Inbound sync skipped'],
      synced: false,
    };
  }

  const containerId = guard.diagnostics?.containerId as string;

  const { error } = await supabase
    .from('mindmesh_containers')
    .update({
      body: newDescription || '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', containerId);

  if (error) {
    errors.push(`Failed to sync track description to Mind Mesh: ${error.message}`);
    return { success: false, errors, warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Syncs track deletion from Guardrails to Mind Mesh.
 *
 * INBOUND OPERATION: Guardrails → Mind Mesh
 *
 * When a track is deleted in Guardrails, delete the corresponding Mind Mesh container.
 */
export async function syncTrackDeletion(trackId: string): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardInboundSync('track', trackId, 'delete');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Inbound sync skipped (no Mind Mesh container)'],
      synced: false,
    };
  }

  const containerId = guard.diagnostics?.containerId as string;

  const { error } = await supabase
    .from('mindmesh_containers')
    .delete()
    .eq('id', containerId);

  if (error) {
    errors.push(`Failed to sync track deletion to Mind Mesh: ${error.message}`);
    return { success: false, errors, warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Syncs track reparenting from Guardrails to Mind Mesh.
 *
 * INBOUND OPERATION: Guardrails → Mind Mesh
 *
 * When a track's parent changes in Guardrails, update Mind Mesh relationships.
 */
export async function syncTrackReparenting(
  trackId: string,
  newParentTrackId: string | null
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardInboundSync('track', trackId, 'update');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Inbound sync skipped'],
      synced: false,
    };
  }

  const containerId = guard.diagnostics?.containerId as string;

  let newParentContainerId: string | null = null;

  if (newParentTrackId) {
    const { data: parentContainer } = await supabase
      .from('mindmesh_containers')
      .select('id')
      .eq('entity_type', 'track')
      .eq('entity_id', newParentTrackId)
      .maybeSingle();

    if (parentContainer) {
      newParentContainerId = parentContainer.id;
    } else {
      warnings.push('Parent track not found in Mind Mesh (may need to spawn ghost)');
    }
  }

  const { error } = await supabase
    .from('mindmesh_containers')
    .update({
      parent_container_id: newParentContainerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', containerId);

  if (error) {
    errors.push(`Failed to sync track reparenting to Mind Mesh: ${error.message}`);
    return { success: false, errors, warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Syncs container title update from Mind Mesh to Guardrails.
 *
 * OUTBOUND OPERATION: Mind Mesh → Guardrails
 *
 * Called when a container's title is updated in Mind Mesh.
 * Only syncs if container is integrated.
 */
export async function syncContainerTitleUpdate(
  containerId: string,
  newTitle: string
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardOutboundSync(containerId, 'update');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Outbound sync blocked (local-only container)'],
      synced: false,
    };
  }

  const entityType = guard.diagnostics?.entityType as string;
  const entityId = guard.diagnostics?.entityId as string;

  if (entityType === 'track') {
    const { error } = await supabase
      .from('guardrails_tracks')
      .update({
        name: newTitle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId);

    if (error) {
      errors.push(`Failed to sync title to Guardrails track: ${error.message}`);
      return { success: false, errors, warnings, synced: false };
    }
  } else if (entityType === 'roadmap_item') {
    const { error } = await supabase
      .from('roadmap_items')
      .update({
        title: newTitle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId);

    if (error) {
      errors.push(`Failed to sync title to Guardrails roadmap item: ${error.message}`);
      return { success: false, errors, warnings, synced: false };
    }
  } else {
    warnings.push(`Outbound title sync not implemented for entity type: ${entityType}`);
    return { success: true, errors: [], warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Syncs container body update from Mind Mesh to Guardrails.
 *
 * OUTBOUND OPERATION: Mind Mesh → Guardrails
 */
export async function syncContainerBodyUpdate(
  containerId: string,
  newBody: string
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardOutboundSync(containerId, 'update');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Outbound sync blocked (local-only container)'],
      synced: false,
    };
  }

  const entityType = guard.diagnostics?.entityType as string;
  const entityId = guard.diagnostics?.entityId as string;

  if (entityType === 'track') {
    const { error } = await supabase
      .from('guardrails_tracks')
      .update({
        description: newBody || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId);

    if (error) {
      errors.push(`Failed to sync description to Guardrails track: ${error.message}`);
      return { success: false, errors, warnings, synced: false };
    }
  } else if (entityType === 'roadmap_item') {
    const { error } = await supabase
      .from('roadmap_items')
      .update({
        description: newBody || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId);

    if (error) {
      errors.push(`Failed to sync description to Guardrails roadmap item: ${error.message}`);
      return { success: false, errors, warnings, synced: false };
    }
  } else {
    warnings.push(`Outbound body sync not implemented for entity type: ${entityType}`);
    return { success: true, errors: [], warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Syncs container deletion from Mind Mesh to Guardrails.
 *
 * OUTBOUND OPERATION: Mind Mesh → Guardrails
 *
 * When an integrated container is deleted in Mind Mesh, delete the Guardrails entity.
 */
export async function syncContainerDeletion(
  containerId: string
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardOutboundSync(containerId, 'delete');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Outbound sync blocked (local-only container)'],
      synced: false,
    };
  }

  const entityType = guard.diagnostics?.entityType as string;
  const entityId = guard.diagnostics?.entityId as string;

  if (entityType === 'track') {
    const { error } = await supabase
      .from('guardrails_tracks')
      .delete()
      .eq('id', entityId);

    if (error) {
      errors.push(`Failed to sync deletion to Guardrails track: ${error.message}`);
      return { success: false, errors, warnings, synced: false };
    }
  } else if (entityType === 'roadmap_item') {
    const { error } = await supabase
      .from('roadmap_items')
      .delete()
      .eq('id', entityId);

    if (error) {
      errors.push(`Failed to sync deletion to Guardrails roadmap item: ${error.message}`);
      return { success: false, errors, warnings, synced: false };
    }
  } else {
    warnings.push(`Outbound deletion sync not implemented for entity type: ${entityType}`);
    return { success: true, errors: [], warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Syncs task update from Guardrails to Mind Mesh.
 *
 * INBOUND OPERATION: Guardrails → Mind Mesh
 *
 * Field mapping:
 * - roadmap_items.title → container.title
 * - roadmap_items.description → container.body
 * - roadmap_items.status → container.metadata.status
 * - roadmap_items.metadata.dueAt → container.metadata.dueAt
 */
export async function syncTaskUpdate(
  taskId: string,
  updates: {
    title?: string;
    description?: string | null;
    status?: string;
    dueAt?: string | null;
  }
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardInboundSync('roadmap_item', taskId, 'update');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Inbound sync skipped'],
      synced: false,
    };
  }

  const containerId = guard.diagnostics?.containerId as string;

  // Fetch current container to preserve existing metadata
  const { data: currentContainer } = await supabase
    .from('mindmesh_containers')
    .select('metadata')
    .eq('id', containerId)
    .maybeSingle();

  const currentMetadata = (currentContainer?.metadata as Record<string, unknown>) || {};

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  if (updates.description !== undefined) {
    updateData.body = updates.description || '';
  }

  // Update metadata fields
  const newMetadata = { ...currentMetadata };
  if (updates.status !== undefined) {
    newMetadata.status = updates.status;
  }
  if (updates.dueAt !== undefined) {
    newMetadata.dueAt = updates.dueAt;
  }
  updateData.metadata = newMetadata;

  const { error } = await supabase
    .from('mindmesh_containers')
    .update(updateData)
    .eq('id', containerId);

  if (error) {
    errors.push(`Failed to sync task update to Mind Mesh: ${error.message}`);
    return { success: false, errors, warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Syncs event update from Guardrails to Mind Mesh.
 *
 * INBOUND OPERATION: Guardrails → Mind Mesh
 *
 * Field mapping:
 * - roadmap_items.title → container.title
 * - roadmap_items.description → container.body
 * - roadmap_items.status → container.metadata.status
 * - roadmap_items.metadata.startsAt → container.metadata.startsAt
 * - roadmap_items.metadata.endsAt → container.metadata.endsAt
 */
export async function syncEventUpdate(
  eventId: string,
  updates: {
    title?: string;
    description?: string | null;
    status?: string;
    startsAt?: string;
    endsAt?: string | null;
  }
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardInboundSync('roadmap_item', eventId, 'update');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Inbound sync skipped'],
      synced: false,
    };
  }

  const containerId = guard.diagnostics?.containerId as string;

  // Fetch current container to preserve existing metadata
  const { data: currentContainer } = await supabase
    .from('mindmesh_containers')
    .select('metadata')
    .eq('id', containerId)
    .maybeSingle();

  const currentMetadata = (currentContainer?.metadata as Record<string, unknown>) || {};

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  if (updates.description !== undefined) {
    updateData.body = updates.description || '';
  }

  // Update metadata fields
  const newMetadata = { ...currentMetadata };
  if (updates.status !== undefined) {
    newMetadata.status = updates.status;
  }
  if (updates.startsAt !== undefined) {
    newMetadata.startsAt = updates.startsAt;
  }
  if (updates.endsAt !== undefined) {
    newMetadata.endsAt = updates.endsAt;
  }
  updateData.metadata = newMetadata;

  const { error } = await supabase
    .from('mindmesh_containers')
    .update(updateData)
    .eq('id', containerId);

  if (error) {
    errors.push(`Failed to sync event update to Mind Mesh: ${error.message}`);
    return { success: false, errors, warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Syncs task/event deletion from Guardrails to Mind Mesh.
 *
 * INBOUND OPERATION: Guardrails → Mind Mesh
 */
export async function syncRoadmapItemDeletion(itemId: string): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardInboundSync('roadmap_item', itemId, 'delete');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Inbound sync skipped (no Mind Mesh container)'],
      synced: false,
    };
  }

  const containerId = guard.diagnostics?.containerId as string;

  const { error } = await supabase
    .from('mindmesh_containers')
    .delete()
    .eq('id', containerId);

  if (error) {
    errors.push(`Failed to sync roadmap item deletion to Mind Mesh: ${error.message}`);
    return { success: false, errors, warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Syncs container metadata update from Mind Mesh to Guardrails.
 *
 * OUTBOUND OPERATION: Mind Mesh → Guardrails
 *
 * Used for status and date field updates on task/event containers.
 */
export async function syncContainerMetadataUpdate(
  containerId: string,
  metadataUpdates: {
    status?: string;
    dueAt?: string | null;
    startsAt?: string;
    endsAt?: string | null;
  }
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const guard = await guardOutboundSync(containerId, 'update');

  if (!guard.allowed) {
    logSyncBlock(guard);
    return {
      success: true,
      errors: [],
      warnings: [guard.reason || 'Outbound sync blocked (local-only container)'],
      synced: false,
    };
  }

  const entityType = guard.diagnostics?.entityType as string;
  const entityId = guard.diagnostics?.entityId as string;

  if (entityType === 'roadmap_item') {
    // Fetch current roadmap item to get type and preserve other metadata
    const { data: currentItem } = await supabase
      .from('roadmap_items')
      .select('type, metadata')
      .eq('id', entityId)
      .maybeSingle();

    if (!currentItem) {
      errors.push('Roadmap item not found');
      return { success: false, errors, warnings, synced: false };
    }

    const currentMetadata = (currentItem.metadata as Record<string, unknown>) || {};
    const newMetadata = { ...currentMetadata };

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (metadataUpdates.status !== undefined) {
      updateData.status = metadataUpdates.status;
      newMetadata.status = metadataUpdates.status;
    }

    if (currentItem.type === 'task' && metadataUpdates.dueAt !== undefined) {
      newMetadata.dueAt = metadataUpdates.dueAt;
    }

    if (currentItem.type === 'event') {
      if (metadataUpdates.startsAt !== undefined) {
        newMetadata.startsAt = metadataUpdates.startsAt;
        updateData.start_date = metadataUpdates.startsAt
          ? new Date(metadataUpdates.startsAt).toISOString().split('T')[0]
          : null;
      }
      if (metadataUpdates.endsAt !== undefined) {
        newMetadata.endsAt = metadataUpdates.endsAt;
        updateData.end_date = metadataUpdates.endsAt
          ? new Date(metadataUpdates.endsAt).toISOString().split('T')[0]
          : metadataUpdates.startsAt
          ? new Date(metadataUpdates.startsAt).toISOString().split('T')[0]
          : null;
      }
    }

    updateData.metadata = newMetadata;

    const { error } = await supabase
      .from('roadmap_items')
      .update(updateData)
      .eq('id', entityId);

    if (error) {
      errors.push(`Failed to sync metadata to Guardrails roadmap item: ${error.message}`);
      return { success: false, errors, warnings, synced: false };
    }
  } else {
    warnings.push(`Outbound metadata sync not implemented for entity type: ${entityType}`);
    return { success: true, errors: [], warnings, synced: false };
  }

  return { success: true, errors: [], warnings, synced: true };
}

/**
 * Batch sync operation for multiple entities.
 *
 * Used when Guardrails operations affect multiple entities at once.
 */
export async function batchSyncInbound(
  operations: Array<{
    entityType: string;
    entityId: string;
    operation: 'update' | 'delete';
    data?: Record<string, unknown>;
  }>
): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let successCount = 0;

  for (const op of operations) {
    let result: SyncResult;

    if (op.operation === 'delete') {
      if (op.entityType === 'track') {
        result = await syncTrackDeletion(op.entityId);
      } else if (op.entityType === 'roadmap_item') {
        result = await syncRoadmapItemDeletion(op.entityId);
      } else {
        warnings.push(`Batch sync: Unsupported entity type ${op.entityType}`);
        continue;
      }
    } else if (op.operation === 'update' && op.data) {
      if (op.entityType === 'track' && 'title' in op.data) {
        result = await syncTrackRename(op.entityId, op.data.title as string);
      } else if (op.entityType === 'roadmap_item') {
        // Determine if task or event based on data fields
        if ('dueAt' in op.data) {
          result = await syncTaskUpdate(op.entityId, op.data as any);
        } else if ('startsAt' in op.data) {
          result = await syncEventUpdate(op.entityId, op.data as any);
        } else {
          // Generic update (title/description only)
          result = await syncTaskUpdate(op.entityId, op.data as any);
        }
      } else {
        warnings.push(`Batch sync: Unsupported update for ${op.entityType}`);
        continue;
      }
    } else {
      warnings.push('Batch sync: Invalid operation or missing data');
      continue;
    }

    if (result.success && result.synced) {
      successCount++;
    }
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    synced: successCount > 0,
  };
}
