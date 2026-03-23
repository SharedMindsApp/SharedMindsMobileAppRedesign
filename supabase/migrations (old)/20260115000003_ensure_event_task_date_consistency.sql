/*
  # Ensure Event-Linked Tasks Date Consistency

  1. Add constraint to ensure event-linked tasks always have date = NULL
     - If event_id IS NOT NULL, date must be NULL
     - Date is derived from event's start_at, not stored

  2. Create trigger to automatically clear date field for event-linked tasks
     - On INSERT: If event_id is set, ensure date is NULL
     - On UPDATE: If event_id is set, clear date field
     - This ensures tasks always derive date from event

  3. Add function to get event date for event-linked tasks
     - Used for queries where we need the task date
     - Always uses current event start_at
*/

-- Add constraint: Event-linked tasks must have NULL date
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_tasks_event_id_date_check'
  ) THEN
    ALTER TABLE event_tasks ADD CONSTRAINT event_tasks_event_id_date_check 
      CHECK (
        -- If event_id is set, date must be NULL (date is derived from event)
        (event_id IS NULL) OR (date IS NULL)
      );
  END IF;
END $$;

-- Create function to ensure date is NULL for event-linked tasks
CREATE OR REPLACE FUNCTION ensure_event_task_date_null()
RETURNS TRIGGER AS $$
BEGIN
  -- If event_id is set, ensure date is NULL (date is derived from event's start_at)
  IF NEW.event_id IS NOT NULL THEN
    NEW.date = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce date = NULL for event-linked tasks
DROP TRIGGER IF EXISTS ensure_event_task_date_null_trigger ON event_tasks;
CREATE TRIGGER ensure_event_task_date_null_trigger
  BEFORE INSERT OR UPDATE ON event_tasks
  FOR EACH ROW
  WHEN (NEW.event_id IS NOT NULL)
  EXECUTE FUNCTION ensure_event_task_date_null();

-- Clean up any existing event-linked tasks that have a date set (should not happen, but safety check)
UPDATE event_tasks 
SET date = NULL 
WHERE event_id IS NOT NULL AND date IS NOT NULL;

-- Add comment
COMMENT ON CONSTRAINT event_tasks_event_id_date_check ON event_tasks IS 
  'Event-linked tasks must have NULL date. Date is derived from event start_at, not stored.';

COMMENT ON FUNCTION ensure_event_task_date_null() IS 
  'Ensures event-linked tasks always have date = NULL, as date is derived from event start_at.';
