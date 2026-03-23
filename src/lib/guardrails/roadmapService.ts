/**
 * Roadmap Service - Manages roadmap items (tasks, events, milestones, etc.)
 *
 * CALENDAR AUTHORITY NOTE (PROMPT 2 - IMPLEMENTED):
 * - calendar_events is the ONLY canonical time authority
 * - Roadmap events sync to calendar_events via guardrailsCalendarSync.ts
 * - Calendar sync settings (calendarSyncSettings.ts) control integration
 *
 * ✅ Calendar sync implemented (one-way: Guardrails → Calendar)
 * ✅ Respects user's sync settings
 * ✅ Idempotent (no duplicates)
 * ❌ Calendar → Guardrails NOT implemented (future prompt)
 *
 * Sync behavior:
 * - Event creation → optionally create calendar_event (based on settings)
 * - Event update → update existing calendar_event (if synced)
 * - Event deletion → delete calendar_event (if synced)
 * - Sync failures DO NOT block Guardrails mutations
 */

import { supabase } from '../supabase';
import type {
  RoadmapItem,
  RoadmapItemType,
  RoadmapItemStatus,
  CreateRoadmapItemInput,
  UpdateRoadmapItemInput,
  RoadmapItemDeadlineMeta,
  DeadlineExtension,
  DeadlineState,
  TrackDeadlineStats,
} from './coreTypes';
import { getTrack } from './trackService';
import {
  validateFullRoadmapItem,
  getDefaultStatusForType,
  canTypeAppearInTimeline,
  typeRequiresDates,
} from './roadmapItemValidation';
import {
  syncRoadmapItemToTaskFlow,
  archiveTaskFlowTaskForRoadmapItem,
} from './taskFlowSyncService';
import {
  syncRoadmapEventToCalendar,
  deleteCalendarEventForSource,
  type RoadmapItemForSync,
} from './guardrailsCalendarSync';
import {
  createGuardrailsTask,
  getGuardrailsTask,
  updateGuardrailsTask,
  type CreateGuardrailsTaskInput,
  type UpdateGuardrailsTaskInput,
} from './guardrailsTaskService';
import {
  createGuardrailsEvent,
  getGuardrailsEvent,
  updateGuardrailsEvent,
  type CreateGuardrailsEventInput,
  type UpdateGuardrailsEventInput,
} from './guardrailsEventService';

// Phase 6/7: New resolver-based execution (imported dynamically to avoid circular deps)
import { executeCalendarSyncForRoadmapItem } from './calendarSync/calendarSyncExecution';

const TABLE_NAME = 'roadmap_items';

export function isTimelineEligible(type: RoadmapItemType): boolean {
  return canTypeAppearInTimeline(type);
}

/**
 * Safely attempt calendar sync without blocking Guardrails mutation
 * Logs results but does not throw on failure
 */
async function tryCalendarSync(roadmapItem: RoadmapItem): Promise<void> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[RoadmapService] Calendar sync skipped: No authenticated user');
      return;
    }

    // Only sync events (strict type check)
    if (roadmapItem.type !== 'event') {
      return;
    }

    // Prepare item for sync
    const itemForSync: RoadmapItemForSync = {
      id: roadmapItem.id,
      title: roadmapItem.title,
      description: roadmapItem.description,
      start_date: roadmapItem.startDate,
      end_date: roadmapItem.endDate,
      type: roadmapItem.type,
      status: roadmapItem.status,
      color: (roadmapItem.metadata as any)?.color,
      master_project_id: roadmapItem.masterProjectId,
      track_id: roadmapItem.trackId,
    };

    // Attempt sync
    const result = await syncRoadmapEventToCalendar(user.id, itemForSync);

    if (result.status === 'synced') {
      console.log(`[RoadmapService] Calendar sync succeeded: ${result.reason}`);
    } else if (result.status === 'skipped') {
      console.log(`[RoadmapService] Calendar sync skipped: ${result.reason}`);
    } else {
      console.error(`[RoadmapService] Calendar sync failed: ${result.error}`);
    }
  } catch (error) {
    console.error('[RoadmapService] Calendar sync error:', error);
    // DO NOT throw - sync failure should not block Guardrails mutation
  }
}

function transformKeysFromDb(row: any): RoadmapItem {
  return {
    id: row.id,
    masterProjectId: row.master_project_id,
    trackId: row.track_id,
    subtrackId: row.subtrack_id,
    type: (row.type || 'task') as RoadmapItemType,
    title: row.title || '',
    description: row.description || null,
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    status: (row.status || 'pending') as RoadmapItemStatus,
    parentItemId: row.parent_item_id || null,
    itemDepth: row.item_depth || 0,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function transformKeysToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

/**
 * Phase 1: Create Roadmap Item with Domain Entity
 * 
 * This function now follows the Phase 1 pattern:
 * 1. Create domain entity first (if type is 'task' or 'event')
 * 2. Create roadmap projection referencing domain entity
 * 3. Keep existing sync logic
 */
export async function createRoadmapItem(input: CreateRoadmapItemInput): Promise<RoadmapItem> {
  const validation = validateFullRoadmapItem(input);
  if (!validation.valid) {
    throw new Error(
      `Validation failed:\n${validation.errors.map((e) => `- ${e.field}: ${e.message}`).join('\n')}`
    );
  }

  const track = await getTrack(input.trackId);

  if (!track) {
    throw new Error('Track not found');
  }

  if (!track.includeInRoadmap) {
    throw new Error(
      `Cannot create roadmap item for track '${track.name}' - track is not included in roadmap. ` +
      `Category: ${track.category}. Set includeInRoadmap=true first.`
    );
  }

  if (track.category === 'offshoot_idea') {
    throw new Error(
      `Cannot create roadmap items for offshoot idea tracks. Offshoot ideas never appear in the roadmap.`
    );
  }

  if (!isTimelineEligible(input.type) && (input.startDate || input.endDate)) {
    console.warn(
      `Item type '${input.type}' is content-only and will not appear on the timeline, even with dates provided.`
    );
  }

  const defaultStatus = input.status || getDefaultStatusForType(input.type);

  // ============================================================================
  // Phase 1: Create Domain Entity First (if task or event)
  // ============================================================================
  let domainEntityId: string | null = null;
  let domainEntityType: string | null = null;

  if (input.type === 'task') {
    // Create domain task entity
    const taskInput: CreateGuardrailsTaskInput = {
      masterProjectId: input.masterProjectId,
      title: input.title,
      description: input.description,
      status: defaultStatus as any,
      dueAt: input.endDate ? new Date(input.endDate).toISOString() : undefined,
      metadata: input.metadata,
    };
    const domainTask = await createGuardrailsTask(taskInput);
    domainEntityId = domainTask.id;
    domainEntityType = 'task';
  } else if (input.type === 'event') {
    // Create domain event entity
    const eventInput: CreateGuardrailsEventInput = {
      masterProjectId: input.masterProjectId,
      title: input.title,
      description: input.description,
      startAt: input.startDate ? new Date(input.startDate).toISOString() : undefined,
      endAt: input.endDate ? new Date(input.endDate).toISOString() : undefined,
      metadata: input.metadata,
    };
    const domainEvent = await createGuardrailsEvent(eventInput);
    domainEntityId = domainEvent.id;
    domainEntityType = 'event';
  }

  // ============================================================================
  // Phase 1: Create Roadmap Projection Referencing Domain Entity
  // ============================================================================
  const dbInput = transformKeysToSnake({
    ...input,
    type: input.type,
    status: defaultStatus,
    metadata: input.metadata || {},
    // Phase 1: Add domain entity reference
    domain_entity_type: domainEntityType,
    domain_entity_id: domainEntityId,
    // Phase 1: Keep legacy fields for compatibility (mirrored by triggers)
    title: input.title,
    description: input.description,
    start_date: input.startDate,
    end_date: input.endDate,
  });

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(dbInput)
    .select()
    .single();

  if (error) throw error;

  await createRoadmapItemConnection(data.id, input.trackId, input.masterProjectId);

  const createdItem = transformKeysFromDb(data);

  await syncRoadmapItemToTaskFlow(createdItem);

  // Phase 6: Execute calendar sync using resolver (non-blocking)
  await executeCalendarSyncForRoadmapItem(createdItem);

  return createdItem;
}

async function createRoadmapItemConnection(
  roadmapItemId: string,
  trackId: string,
  masterProjectId: string
): Promise<void> {
  const { error } = await supabase
    .from('mindmesh_connections')
    .insert({
      master_project_id: masterProjectId,
      source_type: 'track',
      source_id: trackId,
      target_type: 'roadmap_item',
      target_id: roadmapItemId,
      relationship: 'references',
      auto_generated: true,
    });

  if (error && !error.message.includes('duplicate')) {
    throw error;
  }
}

/**
 * Phase 1: Update Roadmap Item
 * 
 * This function distinguishes between:
 * - Semantic edits (title, description, status, dates) → update domain entity
 * - Structural edits (track, subtrack, ordering, hierarchy) → update roadmap only
 */
export async function updateRoadmapItem(
  id: string,
  input: UpdateRoadmapItemInput
): Promise<RoadmapItem> {
  // Get existing roadmap item to check domain entity reference
  const { data: existingItem, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('domain_entity_type, domain_entity_id, type')
    .eq('id', id)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch roadmap item: ${fetchError.message}`);
  }

  // ============================================================================
  // Phase 1: Update Domain Entity for Semantic Edits
  // ============================================================================
  if (existingItem.domain_entity_type === 'task' && existingItem.domain_entity_id) {
    // Check if this is a semantic edit (title, description, status, dates)
    const hasSemanticEdits = 
      input.title !== undefined ||
      input.description !== undefined ||
      input.status !== undefined ||
      input.endDate !== undefined ||
      input.metadata !== undefined;

    if (hasSemanticEdits) {
      const taskUpdate: UpdateGuardrailsTaskInput = {};
      
      if (input.title !== undefined) taskUpdate.title = input.title;
      if (input.description !== undefined) taskUpdate.description = input.description;
      if (input.status !== undefined) taskUpdate.status = input.status as any;
      if (input.endDate !== undefined) {
        taskUpdate.dueAt = input.endDate ? new Date(input.endDate).toISOString() : null;
      }
      if (input.metadata !== undefined) taskUpdate.metadata = input.metadata;

      // Update domain entity (triggers will mirror to roadmap)
      await updateGuardrailsTask(existingItem.domain_entity_id, taskUpdate);
    }
  } else if (existingItem.domain_entity_type === 'event' && existingItem.domain_entity_id) {
    // Check if this is a semantic edit
    const hasSemanticEdits = 
      input.title !== undefined ||
      input.description !== undefined ||
      input.startDate !== undefined ||
      input.endDate !== undefined ||
      input.metadata !== undefined;

    if (hasSemanticEdits) {
      const eventUpdate: UpdateGuardrailsEventInput = {};
      
      if (input.title !== undefined) eventUpdate.title = input.title;
      if (input.description !== undefined) eventUpdate.description = input.description;
      if (input.startDate !== undefined) {
        eventUpdate.startAt = input.startDate ? new Date(input.startDate).toISOString() : null;
      }
      if (input.endDate !== undefined) {
        eventUpdate.endAt = input.endDate ? new Date(input.endDate).toISOString() : null;
      }
      if (input.metadata !== undefined) eventUpdate.metadata = input.metadata;

      // Update domain entity (triggers will mirror to roadmap)
      await updateGuardrailsEvent(existingItem.domain_entity_id, eventUpdate);
    }
  }

  // ============================================================================
  // Phase 1: Update Roadmap Projection for Structural Edits
  // ============================================================================
  // Update roadmap fields (track, subtrack, ordering, hierarchy, visibility)
  // These are projection-only concerns
  const validation = validateFullRoadmapItem(input);
  if (!validation.valid) {
    throw new Error(
      `Validation failed:\n${validation.errors.map((e) => `- ${e.field}: ${e.message}`).join('\n')}`
    );
  }

  // Structural edits only (track, subtrack, ordering, hierarchy)
  // Semantic fields are handled by domain entity updates above
  const structuralUpdates: any = {};

  if (input.trackId !== undefined) {
    const track = await getTrack(input.trackId);
    if (!track) {
      throw new Error('Track not found');
    }
    if (!track.includeInRoadmap) {
      throw new Error(
        `Cannot assign roadmap item to track '${track.name}' - track is not included in roadmap`
      );
    }
    structuralUpdates.track_id = input.trackId;
  }

  if (input.subtrackId !== undefined) {
    structuralUpdates.subtrack_id = input.subtrackId;
  }

  if (input.parentItemId !== undefined) {
    structuralUpdates.parent_item_id = input.parentItemId;
  }

  // Only update roadmap if there are structural changes
  if (Object.keys(structuralUpdates).length > 0) {
    const dbInput = transformKeysToSnake(structuralUpdates);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(dbInput)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (input.trackId) {
      await updateRoadmapItemConnection(id, input.trackId, data.master_project_id);
    }
  }

  // Fetch updated roadmap item (domain changes are mirrored by triggers)
  const { data: updatedRoadmapItem, error: fetchError2 } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError2) {
    throw new Error(`Failed to fetch updated roadmap item: ${fetchError2.message}`);
  }

  const updatedItem = transformKeysFromDb(updatedRoadmapItem);

  // Update mind mesh metadata if status changed (handled by domain update above)
  if (input.status && existingItem.domain_entity_type) {
    await updateMindMeshMetadata(id, input.status);
  }

  await syncRoadmapItemToTaskFlow(updatedItem);

  // Phase 6: Execute calendar sync using resolver (non-blocking)
  await executeCalendarSyncForRoadmapItem(updatedItem);

  return updatedItem;
}

async function updateRoadmapItemConnection(
  roadmapItemId: string,
  newTrackId: string,
  masterProjectId: string
): Promise<void> {
  await supabase
    .from('mindmesh_connections')
    .delete()
    .eq('target_type', 'roadmap_item')
    .eq('target_id', roadmapItemId)
    .eq('auto_generated', true);

  await createRoadmapItemConnection(roadmapItemId, newTrackId, masterProjectId);
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  await archiveTaskFlowTaskForRoadmapItem(id);

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) throw error;

  await supabase
    .from('mindmesh_connections')
    .delete()
    .eq('target_type', 'roadmap_item')
    .eq('target_id', id);

  // PROMPT 2: Delete calendar event if synced (non-blocking)
  try {
    await deleteCalendarEventForSource('roadmap_event', id);
  } catch (error) {
    console.error('[RoadmapService] Calendar event deletion failed:', error);
    // DO NOT throw - calendar deletion failure should not block Guardrails deletion
  }
}

/**
 * Phase 1: Get Roadmap Item with Domain Entity
 * 
 * Reads roadmap projection and merges domain entity data if available.
 * Falls back to legacy roadmap fields if domain entity doesn't exist.
 */
export async function getRoadmapItem(id: string): Promise<RoadmapItem | null> {
  // Get roadmap item structure
  const { data: roadmapData, error: roadmapError } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (roadmapError) throw roadmapError;
  if (!roadmapData) return null;

  // If domain entity exists, fetch domain entity for semantic fields
  if (roadmapData.domain_entity_type && roadmapData.domain_entity_id) {
    let domainData: any = null;

    if (roadmapData.domain_entity_type === 'task') {
      const task = await getGuardrailsTask(roadmapData.domain_entity_id);
      if (task) {
        domainData = {
          title: task.title,
          description: task.description,
          status: task.status,
          end_date: task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : null,
          metadata: task.metadata,
        };
      }
    } else if (roadmapData.domain_entity_type === 'event') {
      const event = await getGuardrailsEvent(roadmapData.domain_entity_id);
      if (event) {
        domainData = {
          title: event.title,
          description: event.description,
          start_date: event.startAt ? new Date(event.startAt).toISOString().split('T')[0] : null,
          end_date: event.endAt ? new Date(event.endAt).toISOString().split('T')[0] : null,
          metadata: event.metadata,
        };
      }
    }

    // Merge domain data with roadmap structure (domain takes precedence)
    if (domainData) {
      const merged = {
        ...roadmapData,
        ...domainData,
        // Keep roadmap structure fields
        track_id: roadmapData.track_id,
        subtrack_id: roadmapData.subtrack_id,
        parent_item_id: roadmapData.parent_item_id,
        order_index: roadmapData.order_index,
      };
      return transformKeysFromDb(merged);
    }
  }

  // Fallback to legacy roadmap fields (for items without domain entities)
  return transformKeysFromDb(roadmapData);
}

/**
 * Phase 1: Get Roadmap Items by Project using RPC function
 * 
 * Uses the get_roadmap_projection RPC to efficiently read roadmap structure
 * with domain entity data merged.
 */
export async function getRoadmapItemsByProject(masterProjectId: string): Promise<RoadmapItem[]> {
  try {
    // Try using RPC function first (Phase 1 approach)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_roadmap_projection', {
      p_master_project_id: masterProjectId,
      p_track_id: null,
    });

    if (!rpcError && rpcData) {
      // Transform RPC result to RoadmapItem format
      return rpcData.map((row: any) => ({
        id: row.roadmap_item_id,
        masterProjectId: masterProjectId,
        trackId: row.track_id,
        subtrackId: row.subtrack_id,
        type: (row.domain_entity_type || 'task') as RoadmapItemType, // Fallback if no domain entity
        title: row.title || '',
        description: row.description || null,
        startDate: row.start_date || null,
        endDate: row.end_date || null,
        status: (row.status || 'pending') as RoadmapItemStatus,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Additional fields that may be needed (not in transformKeysFromDb but might be expected)
        parentItemId: row.parent_item_id || null,
        itemDepth: row.item_depth || 0,
      }));
    }

    // Fallback to direct query if RPC fails (backward compatibility)
    console.warn('[RoadmapService] RPC function failed, falling back to direct query:', rpcError);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('master_project_id', masterProjectId)
      .is('archived_at', null)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformKeysFromDb);
  } catch (error) {
    console.error('[RoadmapService] Error in getRoadmapItemsByProject:', error);
    throw error;
  }
}

/**
 * Phase 1: Get Roadmap Items by Track using RPC function
 */
export async function getRoadmapItemsByTrack(trackId: string): Promise<RoadmapItem[]> {
  try {
    // Get master_project_id from track first (exclude deleted tracks)
    const { data: trackData, error: trackError } = await supabase
      .from('guardrails_tracks')
      .select('master_project_id')
      .eq('id', trackId)
      .is('deleted_at', null)
      .single();

    if (trackError || !trackData) {
      throw new Error(`Track not found: ${trackId}`);
    }

    // Use RPC function with track filter
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_roadmap_projection', {
      p_master_project_id: trackData.master_project_id,
      p_track_id: trackId,
    });

    if (!rpcError && rpcData) {
      return rpcData.map((row: any) => ({
        id: row.roadmap_item_id,
        masterProjectId: trackData.master_project_id,
        trackId: row.track_id,
        subtrackId: row.subtrack_id,
        type: (row.domain_entity_type || 'task') as RoadmapItemType,
        title: row.title || '',
        description: row.description || null,
        startDate: row.start_date || null,
        endDate: row.end_date || null,
        status: (row.status || 'pending') as RoadmapItemStatus,
        parentItemId: row.parent_item_id || null,
        itemDepth: row.item_depth || 0,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    // Fallback to direct query
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('track_id', trackId)
      .is('archived_at', null)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformKeysFromDb);
  } catch (error) {
    console.error('[RoadmapService] Error in getRoadmapItemsByTrack:', error);
    throw error;
  }
}

/**
 * Phase 1: Get Roadmap Items by Subtrack
 * 
 * Filters by subtrack_id. Note: RPC function doesn't support subtrack filter yet,
 * so we use direct query with domain entity merge for now.
 */
export async function getRoadmapItemsBySubtrack(subtrackId: string): Promise<RoadmapItem[]> {
  // Get roadmap items with subtrack filter
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('subtrack_id', subtrackId)
    .is('archived_at', null)
    .order('order_index', { ascending: true });

  if (error) throw error;

  // Fetch domain entities for items that have them
  const itemsWithDomain = await Promise.all(
    (data || []).map(async (item) => {
      if (item.domain_entity_type && item.domain_entity_id) {
        let domainData: any = null;

        if (item.domain_entity_type === 'task') {
          const task = await getGuardrailsTask(item.domain_entity_id);
          if (task) {
            domainData = {
              title: task.title,
              description: task.description,
              status: task.status,
              end_date: task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : null,
              metadata: task.metadata,
            };
          }
        } else if (item.domain_entity_type === 'event') {
          const event = await getGuardrailsEvent(item.domain_entity_id);
          if (event) {
            domainData = {
              title: event.title,
              description: event.description,
              start_date: event.startAt ? new Date(event.startAt).toISOString().split('T')[0] : null,
              end_date: event.endAt ? new Date(event.endAt).toISOString().split('T')[0] : null,
              metadata: event.metadata,
            };
          }
        }

        if (domainData) {
          return transformKeysFromDb({ ...item, ...domainData });
        }
      }

      // Fallback to legacy fields
      return transformKeysFromDb(item);
    })
  );

  return itemsWithDomain;
}

/**
 * Phase 1: Get Roadmap Items in Date Range
 * 
 * Filters items by date range. For Phase 1, we use direct query with domain entity merge
 * since date filtering requires checking both roadmap and domain entity dates.
 */
export async function getRoadmapItemsInDateRange(
  masterProjectId: string,
  startDate: string,
  endDate: string
): Promise<RoadmapItem[]> {
  // Get all items for project using RPC (efficient)
  const allItems = await getRoadmapItemsByProject(masterProjectId);
  
  // Filter by date range (checking both start_date and end_date)
  return allItems.filter(item => {
    const itemStart = item.startDate ? new Date(item.startDate) : null;
    const itemEnd = item.endDate ? new Date(item.endDate) : null;
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    
    // Item overlaps range if:
    // - Item starts before range ends AND
    // - Item ends after range starts (or has no end date)
    if (itemStart && itemStart <= rangeEnd) {
      if (!itemEnd || itemEnd >= rangeStart) {
        return true;
      }
    }
    
    // Item is contained in range if it has no start date but has an end date
    if (!itemStart && itemEnd && itemEnd >= rangeStart && itemEnd <= rangeEnd) {
      return true;
    }
    
    return false;
  });
}

export async function getTimelineEligibleItems(masterProjectId: string): Promise<RoadmapItem[]> {
  const allItems = await getRoadmapItemsByProject(masterProjectId);

  return allItems.filter(item => {
    if (item.parentItemId) {
      return false;
    }

    if (!isTimelineEligible(item.type)) {
      return false;
    }

    if (item.type === 'goal') {
      return item.startDate !== undefined;
    }

    return true;
  });
}

const DUE_SOON_THRESHOLD_DAYS = 7;

const ACTIVE_STATUSES: RoadmapItemStatus[] = ['pending', 'in_progress', 'blocked'];

const DEADLINE_SOURCE_MAP: Record<RoadmapItemType, 'start_date' | 'end_date' | null> = {
  task: 'end_date',
  event: 'start_date',
  milestone: 'start_date',
  goal: 'end_date',
  habit: 'end_date',
  note: null,
  document: null,
  photo: null,
  grocery_list: null,
  review: null,
};

function isActiveStatus(status: RoadmapItemStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

function getDeadlineSourceDate(item: RoadmapItem): string | undefined {
  const source = DEADLINE_SOURCE_MAP[item.type];
  if (source === 'start_date') return item.startDate;
  if (source === 'end_date') return item.endDate || undefined;
  return undefined;
}

function calculateDaysUntil(deadline: string): number {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diff = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function computeDeadlineState(daysUntil: number): DeadlineState {
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= DUE_SOON_THRESHOLD_DAYS) return 'due_soon';
  return 'on_track';
}

export async function getDeadlineExtensions(roadmapItemId: string): Promise<DeadlineExtension[]> {
  const { data, error } = await supabase
    .from('roadmap_item_deadline_extensions')
    .select('*')
    .eq('roadmap_item_id', roadmapItemId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    roadmapItemId: row.roadmap_item_id,
    previousDeadline: row.previous_deadline,
    newDeadline: row.new_deadline,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

export async function createDeadlineExtension(
  roadmapItemId: string,
  newDeadline: string,
  reason?: string
): Promise<DeadlineExtension> {
  const item = await getRoadmapItem(roadmapItemId);
  if (!item) throw new Error('Roadmap item not found');

  const currentDeadline = getDeadlineSourceDate(item);
  if (!currentDeadline) {
    throw new Error(`Item type '${item.type}' does not have a deadline`);
  }

  const { data, error } = await supabase
    .from('roadmap_item_deadline_extensions')
    .insert({
      roadmap_item_id: roadmapItemId,
      previous_deadline: currentDeadline,
      new_deadline: newDeadline,
      reason,
    })
    .select()
    .single();

  if (error) throw error;

  const deadlineSource = DEADLINE_SOURCE_MAP[item.type];
  const updateInput: UpdateRoadmapItemInput = {};
  if (deadlineSource === 'start_date') {
    updateInput.startDate = newDeadline;
  } else if (deadlineSource === 'end_date') {
    updateInput.endDate = newDeadline;
  }

  await updateRoadmapItem(roadmapItemId, updateInput);

  await updateMindMeshMetadata(roadmapItemId, item.status);

  return {
    id: data.id,
    roadmapItemId: data.roadmap_item_id,
    previousDeadline: data.previous_deadline,
    newDeadline: data.new_deadline,
    reason: data.reason,
    createdAt: data.created_at,
  };
}

export async function computeDeadlineMeta(item: RoadmapItem): Promise<RoadmapItemDeadlineMeta> {
  const extensions = await getDeadlineExtensions(item.id);
  const hasExtensions = extensions.length > 0;
  const extensionCount = extensions.length;

  const currentDeadline = getDeadlineSourceDate(item);

  let originalDeadline: string | undefined;
  if (hasExtensions) {
    originalDeadline = extensions[0].previousDeadline;
  } else {
    originalDeadline = currentDeadline;
  }

  const effectiveDeadline = currentDeadline;

  let deadlineState: DeadlineState | undefined;
  let daysUntilDeadline: number | undefined;

  if (effectiveDeadline && isActiveStatus(item.status)) {
    daysUntilDeadline = calculateDaysUntil(effectiveDeadline);
    deadlineState = computeDeadlineState(daysUntilDeadline);
  }

  return {
    effectiveDeadline,
    originalDeadline,
    hasExtensions,
    extensionCount,
    deadlineState,
    daysUntilDeadline,
  };
}

async function updateMindMeshMetadata(roadmapItemId: string, status: RoadmapItemStatus): Promise<void> {
  const item = await getRoadmapItem(roadmapItemId);
  if (!item) return;

  const deadlineMeta = await computeDeadlineMeta(item);

  const { error } = await supabase
    .from('mindmesh_connections')
    .update({
      metadata: {
        status,
        deadline_state: deadlineMeta.deadlineState,
        has_extensions: deadlineMeta.hasExtensions,
      },
    })
    .eq('target_type', 'roadmap_item')
    .eq('target_id', roadmapItemId)
    .eq('auto_generated', true);

  if (error && !error.message.includes('No rows found')) {
    console.warn('Failed to update Mind Mesh metadata:', error);
  }
}

export async function getRoadmapItemsWithDeadlines(
  masterProjectId: string,
  includeCompleted: boolean = false
): Promise<Array<RoadmapItem & { deadlineMeta: RoadmapItemDeadlineMeta }>> {
  const items = await getRoadmapItemsByProject(masterProjectId);

  const filtered = includeCompleted
    ? items
    : items.filter(item => isActiveStatus(item.status));

  const withDeadlines = filtered.filter(item => getDeadlineSourceDate(item) !== undefined);

  const withMeta = await Promise.all(
    withDeadlines.map(async item => ({
      ...item,
      deadlineMeta: await computeDeadlineMeta(item),
    }))
  );

  return withMeta;
}

export async function computeTrackDeadlineStats(
  trackId: string,
  includeDescendants: boolean = true
): Promise<TrackDeadlineStats> {
  const items = await getRoadmapItemsByTrack(trackId);

  const activeItems = items.filter(
    item => isActiveStatus(item.status) && getDeadlineSourceDate(item) !== undefined
  );

  const itemsWithMeta = await Promise.all(
    activeItems.map(async item => ({
      item,
      meta: await computeDeadlineMeta(item),
    }))
  );

  let overdueItems = 0;
  let dueSoonItems = 0;
  let extendedItems = 0;
  let nextDeadline: string | undefined;

  for (const { item, meta } of itemsWithMeta) {
    if (meta.deadlineState === 'overdue') overdueItems++;
    if (meta.deadlineState === 'due_soon') dueSoonItems++;
    if (meta.hasExtensions) extendedItems++;

    if (
      meta.effectiveDeadline &&
      meta.deadlineState &&
      meta.deadlineState !== 'overdue' &&
      (!nextDeadline || meta.effectiveDeadline < nextDeadline)
    ) {
      nextDeadline = meta.effectiveDeadline;
    }
  }

  return {
    nextDeadline,
    overdueItems,
    dueSoonItems,
    extendedItems,
  };
}

export async function getRoadmapItemsAssignedToPerson(
  trackId: string,
  personId: string
): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from('roadmap_item_assignees')
    .select(`
      roadmap_item_id,
      roadmap_items!inner (
        id,
        track_id,
        type,
        title,
        description,
        start_date,
        end_date,
        status,
        metadata,
        created_at,
        updated_at
      )
    `)
    .eq('person_id', personId)
    .eq('roadmap_items.track_id', trackId);

  if (error) throw error;

  return (data || [])
    .filter(row => row.roadmap_items)
    .map(row => {
      const item = row.roadmap_items;
      return {
        id: item.id,
        masterProjectId: '',
        trackId: item.track_id,
        type: item.type,
        title: item.title,
        description: item.description,
        startDate: item.start_date,
        endDate: item.end_date,
        status: item.status,
        metadata: item.metadata || {},
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });
}

export async function getRoadmapItemsByStatus(
  masterProjectId: string,
  status: RoadmapItemStatus
): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(`
      *,
      guardrails_tracks!inner (
        master_project_id
      )
    `)
    .eq('guardrails_tracks.master_project_id', masterProjectId)
    .eq('status', status)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}
