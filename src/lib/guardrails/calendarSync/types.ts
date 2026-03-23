/**
 * Granular Calendar Sync Settings Types
 * 
 * Phase 1: Architecture-only types for granular sync intent storage.
 * These types define the structure for project/track/subtrack/event-level sync settings.
 * 
 * IMPORTANT: These are NOT wired into sync logic yet. This is foundation work only.
 */

/**
 * Target calendar type for sync
 */
export type TargetCalendarType = 'personal' | 'shared' | 'both';

/**
 * Entity type that can be synced
 */
export type SyncableEntityType = 'roadmap_event' | 'task' | 'mindmesh_event';

/**
 * Base sync configuration (shared across all levels)
 */
export interface BaseSyncConfig {
  sync_enabled: boolean;
  sync_roadmap_events: boolean;
  sync_tasks_with_dates: boolean;
  sync_mindmesh_events: boolean;
  target_calendar_type: TargetCalendarType;
  target_space_id: string | null;
}

/**
 * Project-level sync settings
 */
export interface ProjectCalendarSyncSettings extends BaseSyncConfig {
  id: string;
  user_id: string;
  project_id: string;
  inherit_from_global: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Track-level sync settings
 */
export interface TrackCalendarSyncSettings extends BaseSyncConfig {
  id: string;
  user_id: string;
  project_id: string;
  track_id: string;
  inherit_from_project: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Subtrack-level sync settings
 */
export interface SubtrackCalendarSyncSettings extends BaseSyncConfig {
  id: string;
  user_id: string;
  project_id: string;
  track_id: string;
  subtrack_id: string;
  inherit_from_track: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Event-level sync settings
 */
export interface EventCalendarSyncSettings {
  id: string;
  user_id: string;
  project_id: string;
  event_id: string;
  entity_type: SyncableEntityType;
  track_id: string | null;
  subtrack_id: string | null;
  sync_enabled: boolean;
  target_calendar_type: TargetCalendarType;
  target_space_id: string | null;
  inherit_from_subtrack: boolean | null;
  inherit_from_track: boolean | null;
  inherit_from_project: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Context for sync resolution
 */
export interface SyncResolutionContext {
  projectId: string;
  trackId?: string;
  subtrackId?: string;
  eventId?: string;
  entityType: SyncableEntityType;
}

/**
 * Result of sync resolution
 */
export interface SyncResolutionResult {
  shouldSync: boolean;
  targetCalendar: TargetCalendarType;
  targetSpaceId?: string;
  source: 'event' | 'subtrack' | 'track' | 'project' | 'global';
}

/**
 * Input for creating/updating project sync settings
 */
export interface CreateProjectSyncSettingsInput {
  user_id: string;
  project_id: string;
  sync_enabled?: boolean;
  sync_roadmap_events?: boolean;
  sync_tasks_with_dates?: boolean;
  sync_mindmesh_events?: boolean;
  target_calendar_type?: TargetCalendarType;
  target_space_id?: string | null;
  inherit_from_global?: boolean;
}

/**
 * Input for creating/updating track sync settings
 */
export interface CreateTrackSyncSettingsInput {
  user_id: string;
  project_id: string;
  track_id: string;
  sync_enabled?: boolean;
  sync_roadmap_events?: boolean;
  sync_tasks_with_dates?: boolean;
  sync_mindmesh_events?: boolean;
  target_calendar_type?: TargetCalendarType;
  target_space_id?: string | null;
  inherit_from_project?: boolean;
}

/**
 * Input for creating/updating subtrack sync settings
 */
export interface CreateSubtrackSyncSettingsInput {
  user_id: string;
  project_id: string;
  track_id: string;
  subtrack_id: string;
  sync_enabled?: boolean;
  sync_roadmap_events?: boolean;
  sync_tasks_with_dates?: boolean;
  sync_mindmesh_events?: boolean;
  target_calendar_type?: TargetCalendarType;
  target_space_id?: string | null;
  inherit_from_track?: boolean;
}

/**
 * Input for creating/updating event sync settings
 */
export interface CreateEventSyncSettingsInput {
  user_id: string;
  project_id: string;
  event_id: string;
  entity_type: SyncableEntityType;
  track_id?: string | null;
  subtrack_id?: string | null;
  sync_enabled?: boolean;
  target_calendar_type?: TargetCalendarType;
  target_space_id?: string | null;
  inherit_from_subtrack?: boolean | null;
  inherit_from_track?: boolean | null;
  inherit_from_project?: boolean | null;
}
