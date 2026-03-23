/**
 * Sync Settings Resolver
 * 
 * Phase 1: Pure, side-effect-free resolver that determines effective sync intent.
 * 
 * This resolver:
 * - Does NOT create calendar events
 * - Does NOT mutate anything
 * - Is safe to call from sync services later
 * - Is deterministic and testable
 * 
 * Resolution Order (MANDATORY):
 * 1. Event-level setting (most specific)
 * 2. Subtrack-level setting
 * 3. Track-level setting
 * 4. Project-level setting
 * 5. Global calendar_sync_settings (fallback)
 * 
 * Most specific always wins. No merges.
 */

import { supabase } from '../../supabase';
import { getCalendarSyncSettings } from '../../calendarSyncSettings';
import type {
  SyncResolutionContext,
  SyncResolutionResult,
  SyncableEntityType,
  TargetCalendarType,
  ProjectCalendarSyncSettings,
  TrackCalendarSyncSettings,
  SubtrackCalendarSyncSettings,
  EventCalendarSyncSettings,
} from './types';

/**
 * Check if entity type is enabled in sync config
 */
function isEntityTypeEnabled(
  config: {
    sync_roadmap_events: boolean;
    sync_tasks_with_dates: boolean;
    sync_mindmesh_events: boolean;
  },
  entityType: SyncableEntityType
): boolean {
  switch (entityType) {
    case 'roadmap_event':
      return config.sync_roadmap_events;
    case 'task':
      return config.sync_tasks_with_dates;
    case 'mindmesh_event':
      return config.sync_mindmesh_events;
    default:
      return false;
  }
}

/**
 * Get event-level sync setting
 */
async function getEventSyncSetting(
  userId: string,
  projectId: string,
  eventId: string,
  entityType: SyncableEntityType
): Promise<EventCalendarSyncSettings | null> {
  const { data, error } = await supabase
    .from('event_calendar_sync_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('event_id', eventId)
    .eq('entity_type', entityType)
    .maybeSingle();

  if (error) {
    console.error('[SyncResolver] Error fetching event sync setting:', error);
    return null;
  }

  return data as EventCalendarSyncSettings | null;
}

/**
 * Get subtrack-level sync setting
 */
async function getSubtrackSyncSetting(
  userId: string,
  projectId: string,
  trackId: string,
  subtrackId: string
): Promise<SubtrackCalendarSyncSettings | null> {
  const { data, error } = await supabase
    .from('subtrack_calendar_sync_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('track_id', trackId)
    .eq('subtrack_id', subtrackId)
    .maybeSingle();

  if (error) {
    console.error('[SyncResolver] Error fetching subtrack sync setting:', error);
    return null;
  }

  return data as SubtrackCalendarSyncSettings | null;
}

/**
 * Get track-level sync setting
 */
async function getTrackSyncSetting(
  userId: string,
  projectId: string,
  trackId: string
): Promise<TrackCalendarSyncSettings | null> {
  const { data, error } = await supabase
    .from('track_calendar_sync_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('track_id', trackId)
    .maybeSingle();

  if (error) {
    console.error('[SyncResolver] Error fetching track sync setting:', error);
    return null;
  }

  return data as TrackCalendarSyncSettings | null;
}

/**
 * Get project-level sync setting
 */
async function getProjectSyncSetting(
  userId: string,
  projectId: string
): Promise<ProjectCalendarSyncSettings | null> {
  const { data, error } = await supabase
    .from('project_calendar_sync_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) {
    console.error('[SyncResolver] Error fetching project sync setting:', error);
    return null;
  }

  return data as ProjectCalendarSyncSettings | null;
}

/**
 * Resolve effective calendar sync settings
 * 
 * Resolution order (most specific wins):
 * 1. Event-level (if eventId provided)
 * 2. Subtrack-level (if subtrackId provided)
 * 3. Track-level (if trackId provided)
 * 4. Project-level
 * 5. Global calendar_sync_settings (fallback)
 * 
 * @param userId - User ID
 * @param context - Sync resolution context (project, track, subtrack, event)
 * @returns Sync resolution result with shouldSync, targetCalendar, and source
 */
export async function resolveEffectiveCalendarSync(
  userId: string,
  context: SyncResolutionContext
): Promise<SyncResolutionResult> {
  const { projectId, trackId, subtrackId, eventId, entityType } = context;

  // ========================================================================
  // 1. Event-Level Setting (Most Specific)
  // ========================================================================
  if (eventId) {
    const eventSetting = await getEventSyncSetting(
      userId,
      projectId,
      eventId,
      entityType
    );

    if (eventSetting) {
      // Check inheritance flags in order: subtrack → track → project
      // If any inherit flag is explicitly false, use event setting
      // If inherit flag is null or true, continue to that level
      
      if (subtrackId && eventSetting.inherit_from_subtrack === false) {
        // Explicitly doesn't inherit from subtrack - use event setting
        return {
          shouldSync: eventSetting.sync_enabled,
          targetCalendar: eventSetting.target_calendar_type,
          targetSpaceId: eventSetting.target_space_id || undefined,
          source: 'event',
        };
      }
      
      if (trackId && eventSetting.inherit_from_track === false) {
        // Explicitly doesn't inherit from track - use event setting
        return {
          shouldSync: eventSetting.sync_enabled,
          targetCalendar: eventSetting.target_calendar_type,
          targetSpaceId: eventSetting.target_space_id || undefined,
          source: 'event',
        };
      }
      
      if (eventSetting.inherit_from_project === false) {
        // Explicitly doesn't inherit from project - use event setting
        return {
          shouldSync: eventSetting.sync_enabled,
          targetCalendar: eventSetting.target_calendar_type,
          targetSpaceId: eventSetting.target_space_id || undefined,
          source: 'event',
        };
      }
      
      // Event setting exists but inherits - continue to appropriate level
      // (fall through to subtrack/track/project level checks below)
    }
  }

  // ========================================================================
  // 2. Subtrack-Level Setting
  // ========================================================================
  if (subtrackId && trackId) {
    const subtrackSetting = await getSubtrackSyncSetting(
      userId,
      projectId,
      trackId,
      subtrackId
    );

    if (subtrackSetting && !subtrackSetting.inherit_from_track) {
      // Subtrack has explicit setting (doesn't inherit from track)
      return {
        shouldSync: subtrackSetting.sync_enabled && isEntityTypeEnabled(subtrackSetting, entityType),
        targetCalendar: subtrackSetting.target_calendar_type,
        targetSpaceId: subtrackSetting.target_space_id || undefined,
        source: 'subtrack',
      };
    }

    // Subtrack exists but inherits from track - continue to track level
  }

  // ========================================================================
  // 3. Track-Level Setting
  // ========================================================================
  if (trackId) {
    const trackSetting = await getTrackSyncSetting(
      userId,
      projectId,
      trackId
    );

    if (trackSetting && !trackSetting.inherit_from_project) {
      // Track has explicit setting (doesn't inherit from project)
      return {
        shouldSync: trackSetting.sync_enabled && isEntityTypeEnabled(trackSetting, entityType),
        targetCalendar: trackSetting.target_calendar_type,
        targetSpaceId: trackSetting.target_space_id || undefined,
        source: 'track',
      };
    }

    // Track exists but inherits from project - continue to project level
  }

  // ========================================================================
  // 4. Project-Level Setting
  // ========================================================================
  const projectSetting = await getProjectSyncSetting(userId, projectId);

  if (projectSetting && !projectSetting.inherit_from_global) {
    // Project has explicit setting (doesn't inherit from global)
    return {
      shouldSync: projectSetting.sync_enabled && isEntityTypeEnabled(projectSetting, entityType),
      targetCalendar: projectSetting.target_calendar_type,
      targetSpaceId: projectSetting.target_space_id || undefined,
      source: 'project',
    };
  }

  // ========================================================================
  // 5. Global calendar_sync_settings (Fallback)
  // ========================================================================
  try {
    const globalSettings = await getCalendarSyncSettings(userId);

    return {
      shouldSync: globalSettings.syncGuardrailsToPersonal && isEntityTypeEnabled(
        {
          sync_roadmap_events: globalSettings.syncRoadmapEvents,
          sync_tasks_with_dates: globalSettings.syncTasksWithDates,
          sync_mindmesh_events: globalSettings.syncMindMeshEvents,
        },
        entityType
      ),
      targetCalendar: 'personal', // Global settings always target personal calendar
      targetSpaceId: undefined,
      source: 'global',
    };
  } catch (error) {
    // If global settings don't exist, default to no sync (safety first)
    console.warn('[SyncResolver] Global sync settings not found, defaulting to no sync:', error);
    return {
      shouldSync: false,
      targetCalendar: 'personal',
      targetSpaceId: undefined,
      source: 'global',
    };
  }
}
