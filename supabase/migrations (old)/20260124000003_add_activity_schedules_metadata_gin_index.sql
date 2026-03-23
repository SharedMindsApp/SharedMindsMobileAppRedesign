/**
 * Add GIN Index for activity_schedules.metadata
 * 
 * This index optimizes queries that filter or search habit schedules
 * by properties stored in the metadata JSONB column (frequency, timeOfDay, daysOfWeek, etc.).
 * 
 * GIN indexes are ideal for JSONB queries using operators like:
 * - @> (contains)
 * - ? (key exists)
 * - ?& (all keys exist)
 * - ?| (any key exists)
 * 
 * Example queries that benefit:
 * - Find all habits scheduled for morning: WHERE metadata->>'timeOfDay' = 'morning'
 * - Find all daily habits: WHERE metadata->>'frequency' = 'daily'
 * - Find habits scheduled on specific days: WHERE metadata->'daysOfWeek' @> '[1,3,5]'::jsonb
 */

-- Add GIN index on activity_schedules.metadata for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_activity_schedules_metadata_gin 
  ON activity_schedules USING GIN(metadata)
  WHERE metadata IS NOT NULL AND metadata != '{}'::jsonb;

-- Add comment explaining the index
COMMENT ON INDEX idx_activity_schedules_metadata_gin IS
  'GIN index on activity_schedules.metadata for efficient queries on habit scheduling properties (frequency, timeOfDay, daysOfWeek, etc.). Supports JSONB containment and key existence queries.';
