/**
 * Calendar Sync Bulk Propagation Service
 * 
 * Phase 8: Propagates sync settings changes to all affected roadmap events.
 * 
 * When sync settings change at project/track/subtrack levels, this service:
 * - Fetches all roadmap events in scope
 * - Resolves effective sync for each event
 * - Executes sync (or unsync) for each event
 * 
 * Rules:
 * - Resolver is the only source of truth
 * - Execution function is the only writer
 * - Idempotent (safe to call repeatedly)
 * - Non-blocking (batched processing)
 * - Failures don't stop the batch
 */

import { resolveEffectiveCalendarSync } from './syncSettingsResolver';
import { executeCalendarSyncForEvent } from './calendarSyncExecution';
import { getRoadmapItemsByProject, getRoadmapItemsByTrack, getRoadmapItemsBySubtrack } from '../roadmapService';
import { supabase } from '../../supabase';
import type { SyncableEntityType } from './types';

export interface BulkSyncResult {
  scannedCount: number;
  syncedCount: number;
  unsyncedCount: number;
  skippedCount: number;
  errorsCount: number;
  errors: Array<{
    eventId: string;
    reason: string;
  }>;
}

/**
 * Get project name by ID
 */
async function getProjectName(projectId: string): Promise<string> {
  const { data, error } = await supabase
    .from('master_projects')
    .select('name')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !data) {
    console.warn(`[BulkCalendarSync] Could not fetch project name for ${projectId}, using fallback`);
    return 'Unknown Project';
  }

  return data.name;
}

/**
 * Process a batch of roadmap events
 */
async function processBatch(
  userId: string,
  events: Array<{
    id: string;
    masterProjectId: string;
    trackId: string;
    subtrackId?: string | null;
    startDate?: string;
    endDate?: string | null;
  }>,
  projectId: string,
  projectName: string,
  trackId?: string,
  subtrackId?: string
): Promise<{
  synced: number;
  unsynced: number;
  skipped: number;
  errors: Array<{ eventId: string; reason: string }>;
}> {
  let synced = 0;
  let unsynced = 0;
  let skipped = 0;
  const errors: Array<{ eventId: string; reason: string }> = [];

  for (const event of events) {
    try {
      // Skip events without dates (Phase 6 rule)
      if (!event.startDate) {
        console.log(`[BulkCalendarSync] Skipped event ${event.id}: no start date`);
        skipped++;
        continue;
      }

      // Resolve effective sync
      const effective = await resolveEffectiveCalendarSync(userId, {
        projectId: event.masterProjectId,
        trackId: event.trackId || undefined,
        subtrackId: event.subtrackId || undefined,
        eventId: event.id,
        entityType: 'roadmap_event',
      });

      console.log(`[BulkCalendarSync] decision`, {
        eventId: event.id,
        shouldSync: effective.shouldSync,
        targetCalendar: effective.targetCalendar,
        source: effective.source,
      });

      // Execute sync (or unsync)
      const result = await executeCalendarSyncForEvent(
        userId,
        event.id,
        'roadmap_event',
        event.masterProjectId,
        projectName,
        event.trackId,
        event.subtrackId || undefined
      );

      console.log(`[BulkCalendarSync] result`, {
        eventId: event.id,
        action: result.action,
        executed: result.executed,
        reason: result.reason,
      });

      if (result.executed) {
        if (result.action === 'deleted') {
          unsynced++;
        } else {
          synced++;
        }
      } else {
        // Noop or skipped
        if (result.reason.includes('no start date') || result.reason.includes('no date') || result.reason.includes('Event has no start date')) {
          skipped++;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[BulkCalendarSync] Error processing event ${event.id}:`, errorMessage);
      errors.push({
        eventId: event.id,
        reason: errorMessage,
      });
    }
  }

  return { synced, unsynced, skipped, errors };
}

/**
 * Bulk sync all roadmap events in a project
 * 
 * Applies effective sync settings to all roadmap events in the project.
 */
export async function bulkSyncProjectRoadmapEvents(
  userId: string,
  projectId: string
): Promise<BulkSyncResult> {
  const logPrefix = `[BulkCalendarSync] Project ${projectId}`;
  console.log(`${logPrefix} - Starting bulk sync`);

  try {
    // Get project name (required for shared projections)
    const projectName = await getProjectName(projectId);

    // Fetch all roadmap events in project
    const events = await getRoadmapItemsByProject(projectId);
    
    // Filter to event-type items only and map to sync format
    const eventItems = events
      .filter(item => item.type === 'event')
      .map(item => ({
        id: item.id,
        masterProjectId: item.masterProjectId,
        trackId: item.trackId,
        subtrackId: item.subtrackId,
        startDate: item.startDate,
        endDate: item.endDate,
      }));

    console.log(`${logPrefix} - Found ${eventItems.length} roadmap events`);

    if (eventItems.length === 0) {
      return {
        scannedCount: 0,
        syncedCount: 0,
        unsyncedCount: 0,
        skippedCount: 0,
        errorsCount: 0,
        errors: [],
      };
    }

    // Process in batches
    const BATCH_SIZE = 25;
    let synced = 0;
    let unsynced = 0;
    let skipped = 0;
    const allErrors: Array<{ eventId: string; reason: string }> = [];

    for (let i = 0; i < eventItems.length; i += BATCH_SIZE) {
      const batch = eventItems.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`${logPrefix} - Processing batch ${batchIndex} (${batch.length} events)`);

      const batchResult = await processBatch(
        userId,
        batch,
        projectId,
        projectName
      );

      synced += batchResult.synced;
      unsynced += batchResult.unsynced;
      skipped += batchResult.skipped;
      allErrors.push(...batchResult.errors);

      // Yield between batches (non-blocking)
      if (i + BATCH_SIZE < eventItems.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const result: BulkSyncResult = {
      scannedCount: eventItems.length,
      syncedCount: synced,
      unsyncedCount: unsynced,
      skippedCount: skipped,
      errorsCount: allErrors.length,
      errors: allErrors,
    };

    console.log(`${logPrefix} - Complete`, result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix} - Failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Bulk sync all roadmap events in a track
 * 
 * Applies effective sync settings to all roadmap events in the track.
 */
export async function bulkSyncTrackRoadmapEvents(
  userId: string,
  projectId: string,
  trackId: string
): Promise<BulkSyncResult> {
  const logPrefix = `[BulkCalendarSync] Track ${trackId}`;
  console.log(`${logPrefix} - Starting bulk sync`);

  try {
    // Get project name (required for shared projections)
    const projectName = await getProjectName(projectId);

    // Fetch all roadmap events in track
    const events = await getRoadmapItemsByTrack(trackId);
    
    // Filter to event-type items only and map to sync format
    const eventItems = events
      .filter(item => item.type === 'event')
      .map(item => ({
        id: item.id,
        masterProjectId: item.masterProjectId,
        trackId: item.trackId,
        subtrackId: item.subtrackId,
        startDate: item.startDate,
        endDate: item.endDate,
      }));

    console.log(`${logPrefix} - Found ${eventItems.length} roadmap events`);

    if (eventItems.length === 0) {
      return {
        scannedCount: 0,
        syncedCount: 0,
        unsyncedCount: 0,
        skippedCount: 0,
        errorsCount: 0,
        errors: [],
      };
    }

    // Process in batches
    const BATCH_SIZE = 25;
    let synced = 0;
    let unsynced = 0;
    let skipped = 0;
    const allErrors: Array<{ eventId: string; reason: string }> = [];

    for (let i = 0; i < eventItems.length; i += BATCH_SIZE) {
      const batch = eventItems.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`${logPrefix} - Processing batch ${batchIndex} (${batch.length} events)`);

      const batchResult = await processBatch(
        userId,
        batch,
        projectId,
        projectName,
        trackId
      );

      synced += batchResult.synced;
      unsynced += batchResult.unsynced;
      skipped += batchResult.skipped;
      allErrors.push(...batchResult.errors);

      // Yield between batches
      if (i + BATCH_SIZE < eventItems.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const result: BulkSyncResult = {
      scannedCount: eventItems.length,
      syncedCount: synced,
      unsyncedCount: unsynced,
      skippedCount: skipped,
      errorsCount: allErrors.length,
      errors: allErrors,
    };

    console.log(`${logPrefix} - Complete`, result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix} - Failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Bulk sync all roadmap events in a subtrack
 * 
 * Applies effective sync settings to all roadmap events in the subtrack.
 */
export async function bulkSyncSubtrackRoadmapEvents(
  userId: string,
  projectId: string,
  trackId: string,
  subtrackId: string
): Promise<BulkSyncResult> {
  const logPrefix = `[BulkCalendarSync] Subtrack ${subtrackId}`;
  console.log(`${logPrefix} - Starting bulk sync`);

  try {
    // Get project name (required for shared projections)
    const projectName = await getProjectName(projectId);

    // Fetch all roadmap events in subtrack
    const events = await getRoadmapItemsBySubtrack(subtrackId);
    
    // Filter to event-type items only and map to sync format
    const eventItems = events
      .filter(item => item.type === 'event')
      .map(item => ({
        id: item.id,
        masterProjectId: item.masterProjectId,
        trackId: item.trackId,
        subtrackId: item.subtrackId,
        startDate: item.startDate,
        endDate: item.endDate,
      }));

    console.log(`${logPrefix} - Found ${eventItems.length} roadmap events`);

    if (eventItems.length === 0) {
      return {
        scannedCount: 0,
        syncedCount: 0,
        unsyncedCount: 0,
        skippedCount: 0,
        errorsCount: 0,
        errors: [],
      };
    }

    // Process in batches
    const BATCH_SIZE = 25;
    let synced = 0;
    let unsynced = 0;
    let skipped = 0;
    const allErrors: Array<{ eventId: string; reason: string }> = [];

    for (let i = 0; i < eventItems.length; i += BATCH_SIZE) {
      const batch = eventItems.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`${logPrefix} - Processing batch ${batchIndex} (${batch.length} events)`);

      const batchResult = await processBatch(
        userId,
        batch,
        projectId,
        projectName,
        trackId,
        subtrackId
      );

      synced += batchResult.synced;
      unsynced += batchResult.unsynced;
      skipped += batchResult.skipped;
      allErrors.push(...batchResult.errors);

      // Yield between batches
      if (i + BATCH_SIZE < eventItems.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const result: BulkSyncResult = {
      scannedCount: eventItems.length,
      syncedCount: synced,
      unsyncedCount: unsynced,
      skippedCount: skipped,
      errorsCount: allErrors.length,
      errors: allErrors,
    };

    console.log(`${logPrefix} - Complete`, result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix} - Failed: ${errorMessage}`);
    throw error;
  }
}
