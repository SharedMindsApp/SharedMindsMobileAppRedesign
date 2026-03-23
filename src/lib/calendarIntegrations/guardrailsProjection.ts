/**
 * GuardRails Projection Service
 * 
 * Handles user-initiated, selective GuardRails → Calendar sync.
 * 
 * This service:
 * - Fetches GuardRails project hierarchy
 * - Creates calendar events from GuardRails items
 * - Removes calendar events when sync is removed
 * - Prevents duplication
 * 
 * ❌ NOT automatic sync
 * ❌ NOT event-level toggling
 * ✅ User-initiated, project-driven, selective
 */

import { supabase } from '../supabase';
import { getTracksForProject } from '../guardrails/tracks';
import { getSubTracksForTrack } from '../guardrails/subtracks';
import { getRoadmapItemsByProject, getRoadmapItemsByTrack, getRoadmapItemsBySubtrack } from '../guardrails/roadmapService';
import { createPersonalCalendarEvent } from '../personalSpaces/calendarService';
import type { PersonalCalendarEvent } from '../personalSpaces/calendarService';

export type SyncLevel = 'project' | 'track' | 'subtrack' | 'item';

export interface GuardRailsSyncEntry {
  id: string;
  userId: string;
  projectId: string;
  trackId?: string | null;
  subtrackId?: string | null;
  itemId?: string | null;
  syncLevel: SyncLevel;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectHierarchy {
  id: string;
  name: string;
  tracks: TrackHierarchy[];
}

export interface TrackHierarchy {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  subtracks: SubTrackHierarchy[];
  items: RoadmapItemSummary[];
}

export interface SubTrackHierarchy {
  id: string;
  name: string;
  description: string | null;
  items: RoadmapItemSummary[];
}

export interface RoadmapItemSummary {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  type: string;
  status: string;
}

export interface SyncSelection {
  projectId: string;
  trackId?: string;
  subtrackId?: string;
  itemId?: string;
  syncLevel: SyncLevel;
}

/**
 * Get all GuardRails projects accessible to the user
 */
export async function getGuardRailsProjects(userId: string): Promise<ProjectHierarchy[]> {
  // Fetch user's master projects
  const { data: projects, error } = await supabase
    .from('master_projects')
    .select('id, name')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  if (!projects || projects.length === 0) {
    return [];
  }

  // Build hierarchy for each project
  const hierarchies: ProjectHierarchy[] = [];

  for (const project of projects) {
    const tracks = await getTracksForProject(project.id);
    
    const trackHierarchies: TrackHierarchy[] = [];

    for (const track of tracks) {
      // Get subtracks for this track
      const subtracks = await getSubTracksForTrack(track.id);
      
      // Get roadmap items for this track
      const trackItems = await getRoadmapItemsByTrack(track.id);
      
      const subtrackHierarchies: SubTrackHierarchy[] = [];
      
      for (const subtrack of subtracks) {
        // Get roadmap items for this subtrack
        const subtrackItems = await getRoadmapItemsBySubtrack(subtrack.id);
        
        subtrackHierarchies.push({
          id: subtrack.id,
          name: subtrack.name,
          description: subtrack.description || null,
          items: subtrackItems
            .filter(item => item.startDate || item.endDate) // Only items with dates
            .map(item => ({
              id: item.id,
              title: item.title,
              description: item.description || null,
              startDate: item.startDate || null,
              endDate: item.endDate || null,
              type: item.type,
              status: item.status,
            })),
        });
      }

      trackHierarchies.push({
        id: track.id,
        name: track.name,
        description: track.description || null,
        color: track.color || null,
        subtracks: subtrackHierarchies,
      items: trackItems
        .filter(item => (item.startDate || item.endDate) && !item.subtrackId) // Only items with dates and no subtrack
        .map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || null,
          startDate: item.startDate || null,
          endDate: item.endDate || null,
          type: item.type,
          status: item.status,
        })),
      });
    }

    hierarchies.push({
      id: project.id,
      name: project.name,
      tracks: trackHierarchies,
    });
  }

  return hierarchies;
}

/**
 * Get existing sync entries for a user
 */
export async function getSyncEntries(userId: string): Promise<GuardRailsSyncEntry[]> {
  const { data, error } = await supabase
    .from('calendar_guardrails_sync')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch sync entries: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    trackId: row.track_id || null,
    subtrackId: row.subtrack_id || null,
    itemId: row.item_id || null,
    syncLevel: row.sync_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Apply calendar sync for selected items
 * Creates sync entries and calendar events
 */
export async function applyCalendarSync(
  userId: string,
  selections: SyncSelection[]
): Promise<void> {
  // Create sync entries
  const syncEntries = selections.map(sel => ({
    user_id: userId,
    project_id: sel.projectId,
    track_id: sel.trackId || null,
    subtrack_id: sel.subtrackId || null,
    item_id: sel.itemId || null,
    sync_level: sel.syncLevel,
  }));

  const { error: insertError } = await supabase
    .from('calendar_guardrails_sync')
    .upsert(syncEntries, {
      onConflict: 'user_id,project_id,track_id,subtrack_id,item_id',
    });

  if (insertError) {
    throw new Error(`Failed to create sync entries: ${insertError.message}`);
  }

  // Create calendar events for items with dates
  for (const selection of selections) {
    await createCalendarEventsForSelection(userId, selection);
  }
}

/**
 * Remove calendar sync for selected items
 * Removes sync entries and associated calendar events
 */
export async function removeCalendarSync(
  userId: string,
  selections: SyncSelection[]
): Promise<void> {
  // Build delete conditions
  const deletePromises = selections.map(sel => {
    let query = supabase
      .from('calendar_guardrails_sync')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', sel.projectId);

    if (sel.trackId) {
      query = query.eq('track_id', sel.trackId);
    } else {
      query = query.is('track_id', null);
    }

    if (sel.subtrackId) {
      query = query.eq('subtrack_id', sel.subtrackId);
    } else {
      query = query.is('subtrack_id', null);
    }

    if (sel.itemId) {
      query = query.eq('item_id', sel.itemId);
    } else {
      query = query.is('item_id', null);
    }

    return query;
  });

  await Promise.all(deletePromises);

  // Delete associated calendar events
  for (const selection of selections) {
    await deleteCalendarEventsForSelection(userId, selection);
  }
}

/**
 * Create calendar events for a sync selection
 */
async function createCalendarEventsForSelection(
  userId: string,
  selection: SyncSelection
): Promise<void> {
  let items: RoadmapItemSummary[] = [];

  if (selection.syncLevel === 'item' && selection.itemId) {
    // Single item
    const { data } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('id', selection.itemId)
      .single();

    if (data && (data.start_date || data.end_date)) {
      items = [{
        id: data.id,
        title: data.title,
        description: data.description || null,
        startDate: data.start_date || null,
        endDate: data.end_date || null,
        type: data.type,
        status: data.status,
      }];
    }
  } else if (selection.syncLevel === 'subtrack' && selection.subtrackId) {
    // All items in subtrack
    const subtrackItems = await getRoadmapItemsBySubtrack(selection.subtrackId);
    items = subtrackItems
      .filter(item => item.startDate || item.endDate)
      .map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || null,
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        type: item.type,
        status: item.status,
      }));
  } else if (selection.syncLevel === 'track' && selection.trackId) {
    // All items in track (excluding subtrack items)
    const trackItems = await getRoadmapItemsByTrack(selection.trackId);
    items = trackItems
      .filter(item => (item.startDate || item.endDate) && !item.subtrackId)
      .map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || null,
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        type: item.type,
        status: item.status,
      }));
  } else if (selection.syncLevel === 'project') {
    // All items in project
    const projectItems = await getRoadmapItemsByProject(selection.projectId);
    items = projectItems
      .filter(item => item.startDate || item.endDate)
      .map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || null,
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        type: item.type,
        status: item.status,
      }));
  }

  // Create calendar events (check for duplicates first)
  for (const item of items) {
    if (!item.startDate) continue;

    // Check if event already exists
    const { data: existing } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('user_id', userId)
      .eq('source_type', 'guardrails')
      .eq('source_entity_id', item.id)
      .maybeSingle();

    if (existing) continue; // Skip if already exists

    // Create calendar event
    const startAt = new Date(item.startDate);
    const endAt = item.endDate ? new Date(item.endDate) : new Date(startAt.getTime() + 60 * 60 * 1000); // Default 1 hour

    await createPersonalCalendarEvent(userId, {
      title: item.title,
      description: item.description || null,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      allDay: !item.startDate.includes('T'), // All-day if no time component
      event_type: item.type === 'event' ? 'event' : 'milestone',
      sourceType: 'guardrails',
      sourceEntityId: item.id,
      sourceProjectId: selection.projectId,
    });
  }
}

/**
 * Delete calendar events for a sync selection
 */
async function deleteCalendarEventsForSelection(
  userId: string,
  selection: SyncSelection
): Promise<void> {
  let sourceEntityIds: string[] = [];

  if (selection.syncLevel === 'item' && selection.itemId) {
    sourceEntityIds = [selection.itemId];
  } else if (selection.syncLevel === 'subtrack' && selection.subtrackId) {
    const items = await getRoadmapItemsBySubtrack(selection.subtrackId);
    sourceEntityIds = items.map(item => item.id);
  } else if (selection.syncLevel === 'track' && selection.trackId) {
    const items = await getRoadmapItemsByTrack(selection.trackId);
    sourceEntityIds = items
      .filter(item => !item.subtrackId)
      .map(item => item.id);
  } else if (selection.syncLevel === 'project') {
    const items = await getRoadmapItemsByProject(selection.projectId);
    sourceEntityIds = items.map(item => item.id);
  }

  // Delete calendar events
  if (sourceEntityIds.length > 0) {
    await supabase
      .from('calendar_events')
      .delete()
      .eq('user_id', userId)
      .eq('source_type', 'guardrails')
      .in('source_entity_id', sourceEntityIds);
  }
}
