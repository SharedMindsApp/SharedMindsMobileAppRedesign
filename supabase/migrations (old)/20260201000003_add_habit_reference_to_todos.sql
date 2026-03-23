-- Add habit activity reference to personal_todos
-- This allows tasks to reference the habit activity they were derived from
-- Habit-derived tasks are projections, not duplicates

ALTER TABLE personal_todos
ADD COLUMN IF NOT EXISTS habit_activity_id uuid REFERENCES activities(id) ON DELETE CASCADE;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_personal_todos_habit_activity_id 
ON personal_todos(habit_activity_id) 
WHERE habit_activity_id IS NOT NULL;

-- Add index for habit occurrence date lookup
-- This helps with deduplication and sync
CREATE INDEX IF NOT EXISTS idx_personal_todos_habit_date 
ON personal_todos(habit_activity_id, due_date) 
WHERE habit_activity_id IS NOT NULL AND due_date IS NOT NULL;

-- Comment explaining the column
COMMENT ON COLUMN personal_todos.habit_activity_id IS 
'Reference to the habit activity this task was derived from. NULL for regular tasks. Habit-derived tasks are projections, not duplicates.';
