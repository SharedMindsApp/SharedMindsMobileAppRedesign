/*
  # Refresh PostgREST Schema Cache for template_id and universal_track_info
  
  This migration refreshes the PostgREST schema cache to recognize:
  - The template_id column that was added to guardrails_tracks
  - The universal_track_info table and its RLS policies
  
  The issue: PostgREST's schema cache can become stale after migrations, causing errors like:
  - "Could not find the 'template_id' column of 'guardrails_tracks' in the schema cache"
  - 406 (Not Acceptable) errors when querying universal_track_info
  
  This migration ensures that PostgREST's schema cache is refreshed so that all recent
  schema changes are properly recognized.
*/

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
