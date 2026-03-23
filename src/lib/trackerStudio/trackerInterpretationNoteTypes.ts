/**
 * Tracker Interpretation Note Types
 * 
 * Types for user-authored interpretations (personal meaning layer).
 * These are user-written reflections that never affect analytics or system behavior.
 */

export interface TrackerInterpretation {
  id: string;
  owner_id: string; // auth.uid
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date: string | null; // ISO date string (YYYY-MM-DD) or null
  tracker_ids: string[] | null; // Array of tracker IDs
  context_event_id: string | null; // Context event ID
  title: string | null;
  body: string; // Required body text
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateInterpretationInput {
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date?: string | null; // ISO date string (YYYY-MM-DD) or null
  tracker_ids?: string[] | null; // Array of tracker IDs
  context_event_id?: string | null; // Context event ID
  title?: string | null;
  body: string; // Required
}

export interface UpdateInterpretationInput {
  start_date?: string; // ISO date string (YYYY-MM-DD)
  end_date?: string | null; // ISO date string (YYYY-MM-DD) or null
  tracker_ids?: string[] | null; // Array of tracker IDs
  context_event_id?: string | null; // Context event ID
  title?: string | null;
  body?: string;
}

export interface ListInterpretationsOptions {
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  tracker_id?: string; // Filter by tracker
  context_event_id?: string; // Filter by context event
  include_archived?: boolean;
}
