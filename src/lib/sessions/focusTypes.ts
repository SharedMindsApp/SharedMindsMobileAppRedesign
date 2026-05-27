export type FocusSessionStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'scheduled'
  | 'waiting_for_match';

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
  /** Set by the host's End button OR the timer-zero auto-trigger. Once
      non-null, every participant's client opens the debrief overlay. */
  debrief_started_at?: string | null;
  /** Solo body-double mode: silent video coworking in a shared room.
      Only meaningful when session_mode = 'solo'. */
  body_double?: boolean;
  /** Real-world / offline mode. User is away from their screen entirely
      (allotment, exercise, household, etc). The active-session UI flips
      to a phone-optimised chrome and the community feed shows a
      "focusing offline" badge instead of attempting any video room.
      In practice only set when session_mode = 'solo'. */
  is_offline?: boolean;
  /** True when created via the Quick Timer flow (activity-tagged,
   *  low-friction). Distinct from the full Solo Session even though
   *  both store session_mode='solo'. UI surfaces them differently
   *  (TIMER vs SOLO pill on the calendar). */
  is_quick_timer?: boolean;
  /** Ordered segments copied from a session_templates row at creation
   *  time. Drives the structure timeline in the detail sheet and the
   *  (future) mid-session auto-advance runtime. NULL = unstructured. */
  segments?: Array<{
    kind: 'intro' | 'intentions' | 'work' | 'break' | 'reflect' | 'farewell' | 'wizard';
    label: string;
    minutes: number;
    wizard?: string;
  }> | null;
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
  /** Single trusted person promoted by the host. Same control surface as
   *  the host: extend, end, launch wizards, change music, lock joins.
   *  Doesn't bypass the public-hosting gate (still keyed off auth.uid()). */
  co_host_user_id?: string | null;
  /** When false, no new participants can join this session. Host or co-host
   *  toggles this mid-session. Existing joiners are unaffected. */
  accept_joiners?: boolean;
  // Project pin — optional macro-goal context (joined via Supabase select)
  project?: { id: string; title: string; color: string | null } | null;
  // Admin-curated cadence (weekly review / community / workshop)
  session_purpose?: 'weekly_review' | 'community' | 'workshop' | null;
  recurring_template_id?: string | null;
  /** "Match me now" lobby — when status='waiting_for_match', this row
   *  auto-cancels at this timestamp if no partner has joined. */
  match_expires_at?: string | null;
  /** Open-to-match: session starts as solo but is flagged for drop-in.
   *  Visible in the "Live now — drop in" lane. When a joiner claims via
   *  claim_open_session(), session_mode flips to 'one_on_one' and
   *  partner_user_id is set. */
  open_to_match?: boolean;
  /** Host's social preference for matched sessions. Drives the intro-
   *  phase length + auto-mute behaviour:
   *  • silent   → no intro, mics muted from the start
   *  • brief_hi → 2-min hi, then heads-down (default)
   *  • chatty   → 5-min hi, mics stay unmuted during breaks */
  vibe?: 'silent' | 'brief_hi' | 'chatty' | null;
  /** Timestamp the intro phase ends. Non-null only while an intro is
   *  active — both clients tick a countdown against this. RPC nulls it
   *  on transition OR when either party calls finish_intro_phase(). */
  intro_phase_ends_at?: string | null;
  /** When the joiner claimed the session — drives "X joined N min in"
   *  pills + retroactive intro-length decisions. */
  match_joined_at?: string | null;
  /** Three-level visibility — see migration 20260527000009.
   *  • private  → invisible everywhere except the host
   *  • presence → connections see "focusing now" (status only, no goal)
   *  • public   → fully discoverable + goal text shared */
  visibility?: 'private' | 'presence' | 'public';
}

export interface CommunitySession extends FocusSession {
  display_name: string;
  avatar_url?: string | null;
  /** Optional fields used by the home-page community pulse. Sourced from
   *  the profiles join; absent on older sessions. */
  country_code?: string | null;
  work_type?: string | null;
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
