-- Add performance indexes for Fitness Tracker queries
-- Migration: 20260131000032_add_fitness_tracker_indexes.sql

-- Index on user_movement_profiles for discovery status lookups
CREATE INDEX IF NOT EXISTS idx_user_movement_profiles_user_discovery 
  ON user_movement_profiles(user_id, discovery_completed) 
  WHERE discovery_completed = true;

-- Index on user_movement_profiles for primary domains lookup
CREATE INDEX IF NOT EXISTS idx_user_movement_profiles_domains 
  ON user_movement_profiles USING GIN(primary_domains);

-- Composite index for tracker entries used by fitness sessions
-- (tracker_entries already has indexes, but optimize for date range queries)
-- Note: tracker_entries is append-only (no archived_at column)
CREATE INDEX IF NOT EXISTS idx_tracker_entries_user_date_desc 
  ON tracker_entries(user_id, entry_date DESC);

-- Index for pattern analysis date range queries
-- Note: Date filtering is done in queries, not index predicates (CURRENT_DATE is not immutable)
CREATE INDEX IF NOT EXISTS idx_tracker_entries_tracker_date_desc 
  ON tracker_entries(tracker_id, entry_date DESC);

COMMENT ON INDEX idx_user_movement_profiles_user_discovery IS 
  'Optimizes profile lookup by user and discovery status';

COMMENT ON INDEX idx_user_movement_profiles_domains IS 
  'GIN index for efficient array membership queries on primary_domains';

COMMENT ON INDEX idx_tracker_entries_user_date_desc IS 
  'Optimizes session list queries sorted by date (most recent first)';

COMMENT ON INDEX idx_tracker_entries_tracker_date_desc IS 
  'Optimizes pattern analysis queries sorted by date for specific trackers';
