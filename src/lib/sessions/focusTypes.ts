export type FocusSessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export type FocusEventType =
  | 'start'
  | 'pause'
  | 'resume'
  | 'end'
  | 'drift'
  | 'return'
  | 'distraction'
  | 'nudge_soft'
  | 'nudge_hard';

export type DriftType = 'offshoot' | 'side_project' | 'external_distraction';

export type RegulationAction = 'stretch' | 'hydrate' | 'meal' | 'rest';

export type SessionOutcome = 'finished' | 'partially' | 'something_came_up';

export type SessionMode = 'group' | 'one_on_one' | 'solo';

export interface FocusSession {
  id: string;
  user_id: string;
  project_id: string | null;
  domain_id: string | null;
  start_time: string;
  end_time: string | null;
  status: FocusSessionStatus;
  intended_duration_minutes: number | null;
  actual_duration_minutes: number | null;
  focus_score: number | null;
  drift_count: number;
  distraction_count: number;
  target_end_time: string | null;
  goal_minutes: number | null;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
  // Community session fields
  session_goal?: string | null;
  session_task_id?: string | null;
  session_outcome?: SessionOutcome | null;
  // Scheduled session fields
  session_type?: 'drop_in' | 'scheduled' | null;
  scheduled_at?: string | null;
  session_title?: string | null;
  join_code?: string | null;
  // Session mode (group vs 1-on-1) + quiet mode
  session_mode?: SessionMode;
  quiet_mode?: boolean;
  partner_user_id?: string | null;
  // Project pin — optional macro-goal context (joined via Supabase select)
  project?: { id: string; title: string; color: string | null } | null;
}

export interface CommunitySession extends FocusSession {
  display_name: string;
  avatar_url?: string | null;
}

export interface FocusEvent {
  id: string;
  session_id: string;
  timestamp: string;
  event_type: FocusEventType;
  metadata: Record<string, any>;
  created_at: string;
}

export interface FocusDriftLog {
  id: string;
  session_id: string;
  project_id: string;
  offshoot_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  drift_type: DriftType;
  notes: string | null;
  created_at: string;
}

export interface StartFocusSessionInput {
  projectId: string;
  durationMinutes?: number;
}

export interface LogDriftInput {
  sessionId: string;
  driftType: DriftType;
  offshootId?: string;
  projectId?: string;
  notes?: string;
}

export interface LogDistractionInput {
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface SendNudgeInput {
  sessionId: string;
  message: string;
}

export interface RegulationCheckResult {
  shouldPause: boolean;
  reason: string;
  requiredAction: RegulationAction | null;
}

export interface FocusSessionSummary {
  session: FocusSession;
  totalDrifts: number;
  totalDistractions: number;
  focusScore: number;
  biggestDriftType: DriftType | null;
  timeline: FocusEvent[];
  driftDetails: FocusDriftLog[];
}

export interface FocusScoreInput {
  driftCount: number;
  distractionCount: number;
  actualMinutes: number;
  intendedMinutes: number | null;
}

export interface DriftDetectionResult {
  isDrift: boolean;
  driftType: DriftType | null;
  reason: string;
}

export type DistractionType = 'phone' | 'social_media' | 'conversation' | 'snack' | 'other';

export interface FocusDistraction {
  id: string;
  session_id: string;
  type: DistractionType;
  notes: string | null;
  timestamp: string;
  created_at: string;
}

export interface FocusAnalyticsCache {
  id: string;
  user_id: string;
  week_start: string;
  average_focus_score: number | null;
  total_minutes: number;
  drift_rate: number | null;
  distraction_rate: number | null;
  total_sessions: number;
  completed_sessions: number;
  generated_at: string;
  created_at: string;
}

export interface LogDistractionStructuredInput {
  sessionId: string;
  type: DistractionType;
  notes?: string;
}
