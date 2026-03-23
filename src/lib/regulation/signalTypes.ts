export type SignalKey =
  | 'rapid_context_switching'
  | 'runaway_scope_expansion'
  | 'fragmented_focus_session'
  | 'prolonged_inactivity_gap'
  | 'high_task_intake_without_completion';

export type SignalIntensity = 'low' | 'medium' | 'high';
export type SignalState = 'active' | 'recently_seen' | 'inactive';
export type SignalSensitivity = 'earlier' | 'as_is' | 'only_when_strong';
export type SignalRelevance = 'very_relevant' | 'sometimes_useful' | 'not_useful_right_now';
export type SignalVisibility = 'prominently' | 'quietly' | 'hide_unless_strong';

export interface SignalDefinition {
  id: string;
  signal_key: SignalKey;
  human_label: string;
  short_description: string;
  explanation_text: string;
  rule_parameters: Record<string, any>;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ActiveSignal {
  id: string;
  user_id: string;
  signal_key: SignalKey;
  title: string;
  description: string;
  explanation_why: string;
  context_data: Record<string, any>;
  detected_at: string;
  expires_at: string;
  dismissed_at: string | null;
  snoozed_until: string | null;
  intensity: SignalIntensity;
  session_id: string | null;
  created_at: string;
}

export interface SignalCalibration {
  id: string;
  user_id: string;
  signal_key: SignalKey;
  sensitivity: SignalSensitivity;
  relevance: SignalRelevance;
  visibility: SignalVisibility;
  user_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignalContext {
  userId: string;
  sessionId?: string;
  lookbackMinutes?: number;
  currentProjectId?: string | null;
  currentTrackId?: string | null;
}

export interface EnrichedSignal extends ActiveSignal {
  state: SignalState;
  timeWindow: string;
  calibration?: SignalCalibration;
  definition?: SignalDefinition;
}
