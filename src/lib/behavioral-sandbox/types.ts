/**
 * Stage 1: Behavioral Sandbox Types
 *
 * CRITICAL: These types define the Interpretation Sandbox (Layer B).
 *
 * FORBIDDEN:
 * - NO "success", "failure", "productive", "effective" semantics
 * - NO completion rates, streaks, or productivity scores
 * - NO UI display logic (Stage 2+ only)
 * - NO action triggers or notifications
 *
 * ALLOWED:
 * - Neutral pattern detection (when, duration, count)
 * - Factual aggregations with provenance
 * - Confidence scores and algorithm versioning
 */

export type ConsentKey =
  | 'session_structures'
  | 'time_patterns'
  | 'activity_durations'
  | 'data_quality_basic';

export type SignalKey =
  | 'session_boundaries'
  | 'time_bins_activity_count'
  | 'activity_intervals'
  | 'capture_coverage';

export type SignalStatus = 'candidate' | 'invalidated' | 'deleted';

export type AuditAction =
  | 'computed'
  | 'invalidated'
  | 'deleted'
  | 'consent_granted'
  | 'consent_revoked';

export interface UserConsentFlag {
  id: string;
  user_id: string;
  consent_key: ConsentKey;
  is_enabled: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateSignal<T = SignalValue> {
  signal_id: string;
  user_id: string;
  signal_key: SignalKey;
  signal_version: string;
  time_range_start: string;
  time_range_end: string;
  value_json: T;
  confidence: number;
  provenance_event_ids: string[];
  provenance_hash: string;
  parameters_json: Record<string, unknown>;
  computed_at: string;
  status: SignalStatus;
  invalidated_at: string | null;
  invalidated_reason: string | null;
  created_at: string;
}

export interface SignalAuditLog {
  audit_id: string;
  user_id: string;
  signal_id: string | null;
  action: AuditAction;
  actor: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type SignalValue =
  | SessionBoundariesValue
  | TimeBinsActivityCountValue
  | ActivityIntervalsValue
  | CaptureCoverageValue;

export interface SessionBoundariesValue {
  sessions: SessionBoundary[];
}

export interface SessionBoundary {
  start: string;
  end: string;
  source: 'explicit' | 'gap';
  gap_minutes?: number;
}

export interface TimeBinsActivityCountValue {
  bins: TimeBin[];
  total_count: number;
}

export interface TimeBin {
  bin_start_hour: number;
  bin_end_hour: number;
  count: number;
}

export interface ActivityIntervalsValue {
  intervals: ActivityInterval[];
  total_intervals: number;
}

export interface ActivityInterval {
  activity_type: string;
  start: string;
  end: string;
  duration_seconds: number;
}

export interface CaptureCoverageValue {
  days_in_range: number;
  days_with_any_events: number;
  coverage_ratio: number;
  first_event_date: string | null;
  last_event_date: string | null;
}

export interface ComputeSignalOptions {
  signalKeys?: SignalKey[];
  timeRange?: {
    start: string;
    end: string;
  };
  forceRecompute?: boolean;
}

export interface GetSignalsOptions {
  signalKeys?: SignalKey[];
  timeRange?: {
    start: string;
    end: string;
  };
  status?: SignalStatus;
  limit?: number;
  offset?: number;
}

export interface ComputeResult {
  computed: number;
  skipped: number;
  errors: string[];
  signals: CandidateSignal[];
}

export interface InvalidateResult {
  invalidated_count: number;
  affected_signal_ids: string[];
}

export interface SignalComputeContext {
  userId: string;
  signalKey: SignalKey;
  timeRange: {
    start: Date;
    end: Date;
  };
  parameters: Record<string, unknown>;
}

export interface BehavioralEvent {
  id: string;
  user_id: string;
  event_type: string;
  occurred_at: string;
  intent_id: string | null;
  duration_seconds: number | null;
  context: Record<string, unknown>;
  user_note: string | null;
  user_tags: string[];
  event_data: Record<string, unknown>;
  created_at: string;
  superseded_by: string | null;
}
