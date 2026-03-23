/*
  # Prevent Duplicate Default Schedules
  
  Ensures only one default schedule can exist per space
*/

-- Add unique constraint to prevent multiple default schedules per space
-- First, ensure we don't have existing duplicates
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count spaces with multiple default schedules
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT space_id, COUNT(*) as cnt
    FROM meal_schedules
    WHERE is_default = true
    GROUP BY space_id
    HAVING COUNT(*) > 1
  ) duplicates;

  -- If duplicates exist, keep only the oldest one per space
  IF duplicate_count > 0 THEN
    UPDATE meal_schedules
    SET is_default = false
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY space_id ORDER BY created_at ASC) as rn
        FROM meal_schedules
        WHERE is_default = true
      ) ranked
      WHERE rn > 1
    );
  END IF;
END $$;

-- Create unique partial index to enforce one default per space
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_schedules_one_default_per_space
  ON meal_schedules(space_id)
  WHERE is_default = true;

-- Comment
COMMENT ON INDEX idx_meal_schedules_one_default_per_space IS 'Ensures only one default schedule exists per space';
