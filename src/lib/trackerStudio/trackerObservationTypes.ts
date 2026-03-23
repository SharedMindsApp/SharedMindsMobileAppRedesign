/**
 * Tracker Observation Types
 * 
 * Types for contextual, read-only observation of trackers.
 * Observation is relationship-scoped and consent-based.
 */

export type ObservationContextType = 'guardrails_project' | 'team' | 'household';

export interface TrackerObservationLink {
  id: string;
  tracker_id: string;
  observer_user_id: string; // auth.uid
  context_type: ObservationContextType;
  context_id: string; // e.g., project_id
  granted_by: string; // auth.uid of tracker owner
  created_at: string;
  revoked_at: string | null;
}

export interface CreateObservationLinkInput {
  tracker_id: string;
  observer_user_id: string; // auth.uid
  context_type: ObservationContextType;
  context_id: string; // e.g., project_id
}

export interface ObservationContext {
  type: ObservationContextType;
  id: string;
}
