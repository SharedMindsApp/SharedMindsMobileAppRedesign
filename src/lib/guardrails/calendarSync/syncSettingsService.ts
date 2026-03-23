/**
 * Granular Calendar Sync Settings Service
 * 
 * Phase 1: CRUD operations for granular sync settings.
 * 
 * IMPORTANT: These functions are NOT wired into sync logic yet.
 * This is foundation work only - providing the ability to create/read/update/delete
 * granular sync settings, but they don't affect behavior yet.
 * 
 * These functions are safe to call from UI (when UI is built in later phases).
 */

import { supabase } from '../../supabase';
import type {
  ProjectCalendarSyncSettings,
  TrackCalendarSyncSettings,
  SubtrackCalendarSyncSettings,
  EventCalendarSyncSettings,
  CreateProjectSyncSettingsInput,
  CreateTrackSyncSettingsInput,
  CreateSubtrackSyncSettingsInput,
  CreateEventSyncSettingsInput,
} from './types';

// ============================================================================
// Project-Level Sync Settings
// ============================================================================

/**
 * Get project-level sync settings
 */
export async function getProjectSyncSettings(
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
    console.error('[SyncSettingsService] Error fetching project sync settings:', error);
    throw error;
  }

  return data as ProjectCalendarSyncSettings | null;
}

/**
 * Create or update project-level sync settings
 */
export async function upsertProjectSyncSettings(
  input: CreateProjectSyncSettingsInput
): Promise<ProjectCalendarSyncSettings> {
  const { data, error } = await supabase
    .from('project_calendar_sync_settings')
    .upsert(
      {
        user_id: input.user_id,
        project_id: input.project_id,
        sync_enabled: input.sync_enabled ?? false,
        sync_roadmap_events: input.sync_roadmap_events ?? true,
        sync_tasks_with_dates: input.sync_tasks_with_dates ?? true,
        sync_mindmesh_events: input.sync_mindmesh_events ?? true,
        target_calendar_type: input.target_calendar_type ?? 'personal',
        target_space_id: input.target_space_id ?? null,
        inherit_from_global: input.inherit_from_global ?? true,
      },
      {
        onConflict: 'user_id,project_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[SyncSettingsService] Error upserting project sync settings:', error);
    throw error;
  }

  return data as ProjectCalendarSyncSettings;
}

/**
 * Delete project-level sync settings
 */
export async function deleteProjectSyncSettings(
  userId: string,
  projectId: string
): Promise<void> {
  const { error } = await supabase
    .from('project_calendar_sync_settings')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) {
    console.error('[SyncSettingsService] Error deleting project sync settings:', error);
    throw error;
  }
}

// ============================================================================
// Track-Level Sync Settings
// ============================================================================

/**
 * Get track-level sync settings
 */
export async function getTrackSyncSettings(
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
    console.error('[SyncSettingsService] Error fetching track sync settings:', error);
    throw error;
  }

  return data as TrackCalendarSyncSettings | null;
}

/**
 * Get all track-level sync settings for a project
 */
export async function getTrackSyncSettingsForProject(
  userId: string,
  projectId: string
): Promise<TrackCalendarSyncSettings[]> {
  const { data, error } = await supabase
    .from('track_calendar_sync_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[SyncSettingsService] Error fetching track sync settings for project:', error);
    throw error;
  }

  return (data || []) as TrackCalendarSyncSettings[];
}

/**
 * Create or update track-level sync settings
 */
export async function upsertTrackSyncSettings(
  input: CreateTrackSyncSettingsInput
): Promise<TrackCalendarSyncSettings> {
  const { data, error } = await supabase
    .from('track_calendar_sync_settings')
    .upsert(
      {
        user_id: input.user_id,
        project_id: input.project_id,
        track_id: input.track_id,
        sync_enabled: input.sync_enabled ?? false,
        sync_roadmap_events: input.sync_roadmap_events ?? true,
        sync_tasks_with_dates: input.sync_tasks_with_dates ?? true,
        sync_mindmesh_events: input.sync_mindmesh_events ?? true,
        target_calendar_type: input.target_calendar_type ?? 'personal',
        target_space_id: input.target_space_id ?? null,
        inherit_from_project: input.inherit_from_project ?? true,
      },
      {
        onConflict: 'user_id,project_id,track_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[SyncSettingsService] Error upserting track sync settings:', error);
    throw error;
  }

  return data as TrackCalendarSyncSettings;
}

/**
 * Delete track-level sync settings
 */
export async function deleteTrackSyncSettings(
  userId: string,
  projectId: string,
  trackId: string
): Promise<void> {
  const { error } = await supabase
    .from('track_calendar_sync_settings')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('track_id', trackId);

  if (error) {
    console.error('[SyncSettingsService] Error deleting track sync settings:', error);
    throw error;
  }
}

// ============================================================================
// Subtrack-Level Sync Settings
// ============================================================================

/**
 * Get subtrack-level sync settings
 */
export async function getSubtrackSyncSettings(
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
    console.error('[SyncSettingsService] Error fetching subtrack sync settings:', error);
    throw error;
  }

  return data as SubtrackCalendarSyncSettings | null;
}

/**
 * Get all subtrack-level sync settings for a track
 */
export async function getSubtrackSyncSettingsForTrack(
  userId: string,
  projectId: string,
  trackId: string
): Promise<SubtrackCalendarSyncSettings[]> {
  const { data, error } = await supabase
    .from('subtrack_calendar_sync_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('track_id', trackId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[SyncSettingsService] Error fetching subtrack sync settings for track:', error);
    throw error;
  }

  return (data || []) as SubtrackCalendarSyncSettings[];
}

/**
 * Create or update subtrack-level sync settings
 */
export async function upsertSubtrackSyncSettings(
  input: CreateSubtrackSyncSettingsInput
): Promise<SubtrackCalendarSyncSettings> {
  const { data, error } = await supabase
    .from('subtrack_calendar_sync_settings')
    .upsert(
      {
        user_id: input.user_id,
        project_id: input.project_id,
        track_id: input.track_id,
        subtrack_id: input.subtrack_id,
        sync_enabled: input.sync_enabled ?? false,
        sync_roadmap_events: input.sync_roadmap_events ?? true,
        sync_tasks_with_dates: input.sync_tasks_with_dates ?? true,
        sync_mindmesh_events: input.sync_mindmesh_events ?? true,
        target_calendar_type: input.target_calendar_type ?? 'personal',
        target_space_id: input.target_space_id ?? null,
        inherit_from_track: input.inherit_from_track ?? true,
      },
      {
        onConflict: 'user_id,project_id,track_id,subtrack_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[SyncSettingsService] Error upserting subtrack sync settings:', error);
    throw error;
  }

  return data as SubtrackCalendarSyncSettings;
}

/**
 * Delete subtrack-level sync settings
 */
export async function deleteSubtrackSyncSettings(
  userId: string,
  projectId: string,
  trackId: string,
  subtrackId: string
): Promise<void> {
  const { error } = await supabase
    .from('subtrack_calendar_sync_settings')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('track_id', trackId)
    .eq('subtrack_id', subtrackId);

  if (error) {
    console.error('[SyncSettingsService] Error deleting subtrack sync settings:', error);
    throw error;
  }
}

// ============================================================================
// Event-Level Sync Settings
// ============================================================================

/**
 * Get event-level sync settings
 */
export async function getEventSyncSettings(
  userId: string,
  projectId: string,
  eventId: string,
  entityType: 'roadmap_event' | 'task' | 'mindmesh_event'
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
    console.error('[SyncSettingsService] Error fetching event sync settings:', error);
    throw error;
  }

  return data as EventCalendarSyncSettings | null;
}

/**
 * Get all event-level sync settings for a project
 */
export async function getEventSyncSettingsForProject(
  userId: string,
  projectId: string
): Promise<EventCalendarSyncSettings[]> {
  const { data, error } = await supabase
    .from('event_calendar_sync_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[SyncSettingsService] Error fetching event sync settings for project:', error);
    throw error;
  }

  return (data || []) as EventCalendarSyncSettings[];
}

/**
 * Create or update event-level sync settings
 */
export async function upsertEventSyncSettings(
  input: CreateEventSyncSettingsInput
): Promise<EventCalendarSyncSettings> {
  const { data, error } = await supabase
    .from('event_calendar_sync_settings')
    .upsert(
      {
        user_id: input.user_id,
        project_id: input.project_id,
        event_id: input.event_id,
        entity_type: input.entity_type,
        track_id: input.track_id ?? null,
        subtrack_id: input.subtrack_id ?? null,
        sync_enabled: input.sync_enabled ?? false,
        target_calendar_type: input.target_calendar_type ?? 'personal',
        target_space_id: input.target_space_id ?? null,
        inherit_from_subtrack: input.inherit_from_subtrack ?? null,
        inherit_from_track: input.inherit_from_track ?? null,
        inherit_from_project: input.inherit_from_project ?? null,
      },
      {
        onConflict: 'user_id,project_id,event_id,entity_type',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[SyncSettingsService] Error upserting event sync settings:', error);
    throw error;
  }

  return data as EventCalendarSyncSettings;
}

/**
 * Delete event-level sync settings
 */
export async function deleteEventSyncSettings(
  userId: string,
  projectId: string,
  eventId: string,
  entityType: 'roadmap_event' | 'task' | 'mindmesh_event'
): Promise<void> {
  const { error } = await supabase
    .from('event_calendar_sync_settings')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('event_id', eventId)
    .eq('entity_type', entityType);

  if (error) {
    console.error('[SyncSettingsService] Error deleting event sync settings:', error);
    throw error;
  }
}
