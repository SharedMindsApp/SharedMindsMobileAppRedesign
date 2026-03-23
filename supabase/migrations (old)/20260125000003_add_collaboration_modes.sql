/**
 * Add Collaboration Modes to Household & Team Habits
 * 
 * This migration adds:
 * 1. collaboration_mode to activities.metadata (for household/team habits)
 * 2. role to tracker_participants (participant | observer)
 * 
 * Collaboration modes:
 * - collaborative: Everyone does it together
 * - visible: One person does it, others observe
 * - competitive: Friendly competition
 * 
 * Roles:
 * - participant: Can check in
 * - observer: Can see but not check in
 */

-- ============================================================================
-- 1. Add role column to tracker_participants
-- ============================================================================

ALTER TABLE tracker_participants
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'participant'
CHECK (role IN ('participant', 'observer'));

-- Add index for role lookups
CREATE INDEX IF NOT EXISTS idx_tracker_participants_role 
ON tracker_participants(role) 
WHERE role = 'observer';

-- ============================================================================
-- 2. Add comment
-- ============================================================================

COMMENT ON COLUMN tracker_participants.role IS 
  'Role in the activity: participant (can check in) or observer (can see but not check in)';

-- Note: collaboration_mode is stored in activities.metadata as JSONB
-- No schema change needed - it's already flexible
