/**
 * Stage 4.4: Absence and Return States
 *
 * Types for calm, optional re-entry support after inactivity gaps.
 */

export type ReturnReasonCategory =
  | 'health_energy'
  | 'family_life'
  | 'travel'
  | 'work_overload'
  | 'project_paused'
  | 'other'
  | 'prefer_not_to_say';

export type ReturnBehaviorPreference =
  | 'normal'       // Keep showing signals normally
  | 'quiet'        // Show signals quietly for a week
  | 'strong_only'  // Hide signals unless strong for a week
  | 'safe_mode';   // Turn on Safe Mode

export interface ReturnContext {
  id: string;
  user_id: string;

  // Detection
  absence_detected_at: string;
  last_activity_before_absence: string | null;
  gap_duration_days: number | null;

  // User-provided context (all optional)
  reason_category: ReturnReasonCategory | null;
  user_note: string | null;

  // Behavior preference
  behavior_preference: ReturnBehaviorPreference;
  behavior_preference_until: string | null;

  // State
  context_provided: boolean;
  banner_shown: boolean;
  banner_dismissed: boolean;
  reorientation_shown: boolean;

  created_at: string;
  updated_at: string;
}

export interface ReturnDetectionResult {
  isReturning: boolean;
  gapDays: number | null;
  lastActivityAt: string | null;
  existingContext: ReturnContext | null;
  shouldShowBanner: boolean;
  shouldShowReorientation: boolean;
}

export interface ReturnContextInput {
  reason_category?: ReturnReasonCategory;
  user_note?: string;
  behavior_preference?: ReturnBehaviorPreference;
}

export interface ReorientationInfo {
  lastProject: {
    id: string;
    name: string;
    type: string;
  } | null;
  lastAction: {
    description: string;
    timestamp: string;
  } | null;
  suggestedEntry: {
    label: string;
    action: () => void;
  } | null;
}

// Human-readable labels
export const RETURN_REASON_LABELS: Record<ReturnReasonCategory, string> = {
  health_energy: 'Health / energy',
  family_life: 'Family / life admin',
  travel: 'Travel / time away',
  work_overload: 'Work overload',
  project_paused: 'Project paused intentionally',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export const BEHAVIOR_PREFERENCE_LABELS: Record<ReturnBehaviorPreference, string> = {
  normal: 'Keep showing signals normally',
  quiet: 'Show signals quietly for a week',
  strong_only: 'Hide signals unless strong for a week',
  safe_mode: 'Turn on Safe Mode',
};

export const BEHAVIOR_PREFERENCE_DESCRIPTIONS: Record<ReturnBehaviorPreference, string> = {
  normal: 'Signals will appear as usual',
  quiet: 'Signals will be less prominent in the UI',
  strong_only: 'Only strong signals will be visible',
  safe_mode: 'Safe Mode will be activated, hiding all behavioral insights',
};
