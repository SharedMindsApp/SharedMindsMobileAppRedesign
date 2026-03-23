/**
 * Unified Activity System Types
 * 
 * Canonical types for activities (habits, goals, tasks, etc.)
 * that project to the calendar without duplication.
 */

export type ActivityType =
  | 'habit'
  | 'goal'
  | 'task'
  | 'meeting'
  | 'meal'
  | 'reminder'
  | 'time_block'
  | 'appointment'
  | 'milestone'
  | 'travel_segment'
  | 'event';

export type ActivityStatus = 'active' | 'completed' | 'archived' | 'inactive';

export type ScheduleType = 'single' | 'recurring' | 'deadline' | 'time_block';

export type ProjectionState = 'active' | 'hidden' | 'removed';

/**
 * Canonical Activity (source of truth)
 */
export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  owner_id: string;
  status: ActivityStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Activity Schedule (when/how activity occurs)
 */
export interface ActivitySchedule {
  id: string;
  activity_id: string;
  schedule_type: ScheduleType;
  start_at: string | null;
  end_at: string | null;
  recurrence_rule: string | null; // RRULE format
  timezone: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Create Activity Input
 */
export interface CreateActivityInput {
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  status?: ActivityStatus;
  // Ownership (optional, defaults to user-owned)
  owner_type?: TrackerOwnerType;
  household_owner_id?: string;
  team_owner_id?: string;
  team_group_id?: string;
}

/**
 * Update Activity Input
 */
export interface UpdateActivityInput {
  title?: string;
  description?: string;
  status?: ActivityStatus;
  metadata?: Record<string, any>;
}

/**
 * Create Activity Schedule Input
 */
export interface CreateActivityScheduleInput {
  activity_id: string;
  schedule_type: ScheduleType;
  start_at?: string;
  end_at?: string;
  recurrence_rule?: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

/**
 * Update Activity Schedule Input
 */
export interface UpdateActivityScheduleInput {
  schedule_type?: ScheduleType;
  start_at?: string;
  end_at?: string;
  recurrence_rule?: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

/**
 * Activity with Schedules (for queries)
 */
export interface ActivityWithSchedules extends Activity {
  schedules: ActivitySchedule[];
}

// ============================================================================
// Tracker Ownership & Participation Types
// ============================================================================

export type TrackerOwnerType = 'user' | 'household' | 'team';

export type ParticipationMode = 'individual' | 'collective';

export interface TrackerVisibility {
  show_daily_status: boolean;
  show_streaks: boolean;
  show_totals: boolean;
}

export interface TrackerParticipant {
  id: string;
  activity_id: string;
  user_id: string;
  participation_mode: ParticipationMode;
  role: ParticipantRole;
  visibility: TrackerVisibility;
  joined_at: string;
  updated_at: string;
}

// ============================================================================
// Collaboration Mode Types
// ============================================================================

export type CollaborationMode = 'collaborative' | 'visible' | 'competitive';

export type ParticipantRole = 'participant' | 'observer';

/**
 * Get collaboration mode from activity metadata
 */
export function getCollaborationMode(activity: Activity): CollaborationMode {
  return activity.metadata?.collaboration_mode || 'collaborative';
}

/**
 * Set collaboration mode in activity metadata
 */
export function setCollaborationMode(
  metadata: Record<string, any>,
  mode: CollaborationMode
): Record<string, any> {
  return {
    ...metadata,
    collaboration_mode: mode,
  };
}






