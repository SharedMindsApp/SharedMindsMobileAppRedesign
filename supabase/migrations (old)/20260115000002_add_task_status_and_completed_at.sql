/*
  # Add Task Status and Completed At Timestamp

  1. Add status column
    - `status` (text, 'pending' | 'completed')
    - Defaults to 'pending'
    - Must match completed boolean (enforced via trigger)

  2. Add completed_at column
    - `completed_at` (timestamptz, nullable)
    - Set when task is marked as completed
    - Cleared when task is unmarked as completed

  3. Update indexes
    - Add index on status for filtering
    - Add index on completed_at for sorting completed tasks

  4. Create trigger to sync status with completed boolean
*/

-- Add status column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_tasks' AND column_name = 'status') THEN
    ALTER TABLE event_tasks ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed'));
  END IF;
END $$;

-- Add completed_at column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_tasks' AND column_name = 'completed_at') THEN
    ALTER TABLE event_tasks ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Set initial status based on completed boolean for existing records
UPDATE event_tasks SET status = CASE WHEN completed THEN 'completed' ELSE 'pending' END WHERE status IS NULL;

-- Set initial completed_at for existing completed tasks (use updated_at as approximation)
UPDATE event_tasks SET completed_at = updated_at WHERE completed = true AND completed_at IS NULL;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_event_tasks_status ON event_tasks(status);
CREATE INDEX IF NOT EXISTS idx_event_tasks_completed_at ON event_tasks(completed_at) WHERE completed_at IS NOT NULL;

-- Create function to sync status and completed_at with completed boolean
CREATE OR REPLACE FUNCTION sync_task_status_and_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync status from completed boolean
  IF NEW.completed = true AND OLD.completed = false THEN
    -- Task was just completed
    NEW.status = 'completed';
    NEW.completed_at = now();
  ELSIF NEW.completed = false AND OLD.completed = true THEN
    -- Task was just uncompleted
    NEW.status = 'pending';
    NEW.completed_at = NULL;
  ELSIF NEW.completed IS NOT NULL THEN
    -- Ensure status matches completed (for direct status updates)
    NEW.status = CASE WHEN NEW.completed THEN 'completed' ELSE 'pending' END;
    IF NEW.completed = true AND NEW.completed_at IS NULL THEN
      NEW.completed_at = now();
    ELSIF NEW.completed = false THEN
      NEW.completed_at = NULL;
    END IF;
  END IF;
  
  -- If status is updated directly, sync completed boolean
  IF NEW.status != OLD.status THEN
    NEW.completed = (NEW.status = 'completed');
    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at = now();
    ELSIF NEW.status = 'pending' THEN
      NEW.completed_at = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync status and completed_at
DROP TRIGGER IF EXISTS sync_task_status_and_completed_at_trigger ON event_tasks;
CREATE TRIGGER sync_task_status_and_completed_at_trigger
  BEFORE UPDATE ON event_tasks
  FOR EACH ROW
  WHEN (OLD.completed IS DISTINCT FROM NEW.completed OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_task_status_and_completed_at();

-- Add comments
COMMENT ON COLUMN event_tasks.status IS 'Task status: pending or completed. Synced with completed boolean.';
COMMENT ON COLUMN event_tasks.completed_at IS 'Timestamp when task was marked as completed. Set automatically when completed=true.';
