/*
  # Refresh Guardrails Tracks Schema Cache
  
  This migration forces PostgREST to refresh its schema cache for the guardrails_tracks table.
  This ensures that all columns (including parent_track_id, template_id, metadata, etc.) are
  properly recognized by PostgREST.
  
  The issue: PostgREST's schema cache can become stale after migrations, causing errors like
  "Could not find the 'parent_track_id' column of 'guardrails_tracks' in the schema cache"
  
  Solution: Use PostgreSQL NOTIFY to tell PostgREST to reload its schema cache.
  This is the recommended approach according to Supabase documentation.
*/

-- Force PostgREST to reload its schema cache
-- This notifies PostgREST to refresh its schema cache immediately
NOTIFY pgrst, 'reload schema';
