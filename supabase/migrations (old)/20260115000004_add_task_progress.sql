/*
  # Add Task Progress Support (0-100%)

  1. Add progress column
    - `progress` (integer, 0-100, default 0)
    - Represents completion percentage
    
  2. Update status trigger
    - progress = 100 → automatically set status = 'completed' and completed_at = now()
    - progress < 100 → status = 'pending' and completed_at = NULL
    
  3. Update existing trigger
    - Modify sync_task_status_and_completed_at_trigger to handle progress changes
*/

-- Add progress column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_tasks' AND column_name = 'progress') THEN
    ALTER TABLE event_tasks ADD COLUMN progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
  END IF;
END $$;

-- Set initial progress for existing completed tasks
UPDATE event_tasks SET progress = 100 WHERE completed = true AND (progress IS NULL OR progress < 100);

-- Set initial progress for existing pending tasks
UPDATE event_tasks SET progress = 0 WHERE completed = false AND (progress IS NULL OR progress >= 100);

-- Create or replace function to sync status, completed_at, and progress
-- Handles both INSERT (OLD is NULL) and UPDATE (OLD exists) cases
CREATE OR REPLACE FUNCTION sync_task_status_and_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Priority 1: If progress is set, derive status and completed_at from it
  IF NEW.progress IS NOT NULL THEN
    IF NEW.progress = 100 THEN
      -- Progress is 100% → mark as completed
      NEW.status = 'completed';
      NEW.completed = true;
      IF NEW.completed_at IS NULL THEN
        NEW.completed_at = now();
      END IF;
    ELSIF NEW.progress < 100 THEN
      -- Progress is less than 100% → mark as pending
      NEW.status = 'pending';
      NEW.completed = false;
      NEW.completed_at = NULL;
    END IF;
  END IF;

  -- Priority 2: If completed boolean is set, sync status and completed_at
  -- Only check OLD if this is an UPDATE (OLD exists)
  IF NEW.completed IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.completed IS DISTINCT FROM NEW.completed)) THEN
    IF NEW.completed = true THEN
      NEW.status = 'completed';
      IF NEW.progress IS NULL OR NEW.progress < 100 THEN
        NEW.progress = 100;
      END IF;
      IF NEW.completed_at IS NULL THEN
        NEW.completed_at = now();
      END IF;
    ELSIF NEW.completed = false THEN
      NEW.status = 'pending';
      NEW.completed_at = NULL;
      -- Don't reset progress to 0 if it was already set (preserve partial progress)
      -- Only reset if progress was 100 (completed)
      IF NEW.progress = 100 THEN
        -- For INSERT, default to 0. For UPDATE, use old progress or 0
        IF TG_OP = 'INSERT' THEN
          NEW.progress = 0;
        ELSE
          NEW.progress = COALESCE(OLD.progress, 0);
        END IF;
      END IF;
    END IF;
  END IF;

  -- Priority 3: If status is set directly, sync completed and completed_at
  -- Only check OLD if this is an UPDATE (OLD exists)
  IF NEW.status IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)) THEN
    NEW.completed = (NEW.status = 'completed');
    IF NEW.status = 'completed' THEN
      IF NEW.progress IS NULL OR NEW.progress < 100 THEN
        NEW.progress = 100;
      END IF;
      IF NEW.completed_at IS NULL THEN
        NEW.completed_at = now();
      END IF;
    ELSIF NEW.status = 'pending' THEN
      NEW.completed_at = NULL;
      -- Don't reset progress unless it was 100
      IF NEW.progress = 100 THEN
        -- For INSERT, default to 0. For UPDATE, use old progress or 0
        IF TG_OP = 'INSERT' THEN
          NEW.progress = 0;
        ELSE
          NEW.progress = COALESCE(OLD.progress, 0);
        END IF;
      END IF;
    END IF;
  END IF;

  -- Ensure progress is always within valid range
  IF NEW.progress IS NOT NULL THEN
    NEW.progress = GREATEST(0, LEAST(100, NEW.progress));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers (separate for INSERT and UPDATE since INSERT can't reference OLD)
DROP TRIGGER IF EXISTS sync_task_status_and_completed_at_insert_trigger ON event_tasks;
DROP TRIGGER IF EXISTS sync_task_status_and_completed_at_update_trigger ON event_tasks;

-- INSERT trigger: Always execute (for initial status/progress sync)
CREATE TRIGGER sync_task_status_and_completed_at_insert_trigger
  BEFORE INSERT ON event_tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_status_and_completed_at();

-- UPDATE trigger: Only execute when relevant columns change (can reference OLD)
CREATE TRIGGER sync_task_status_and_completed_at_update_trigger
  BEFORE UPDATE ON event_tasks
  FOR EACH ROW
  WHEN (
    OLD.completed IS DISTINCT FROM NEW.completed 
    OR OLD.status IS DISTINCT FROM NEW.status
    OR OLD.progress IS DISTINCT FROM NEW.progress
    OR (NEW.progress IS NOT NULL AND NEW.progress = 100 AND OLD.completed_at IS NULL)
  )
  EXECUTE FUNCTION sync_task_status_and_completed_at();

-- Add index for progress filtering
CREATE INDEX IF NOT EXISTS idx_event_tasks_progress ON event_tasks(progress) WHERE progress > 0 AND progress < 100;

-- Add comments
COMMENT ON COLUMN event_tasks.progress IS 'Task completion progress (0-100). Progress = 100 automatically sets status to completed.';
COMMENT ON FUNCTION sync_task_status_and_completed_at() IS 'Syncs status, completed, completed_at, and progress. Progress = 100 → completed. Progress < 100 → pending.';
