/*
  # Add Todo-Calendar Sync Support
  
  This migration adds calendar integration to personal todos:
  1. Add calendar_event_id to personal_todos (nullable, links to calendar_events)
  2. Add index for calendar event lookups
  3. Ensure RLS allows linking to personal calendar events
*/

-- Step 1: Add calendar_event_id column to personal_todos
ALTER TABLE personal_todos 
  ADD COLUMN IF NOT EXISTS calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL;

-- Step 2: Create index for calendar event lookups
CREATE INDEX IF NOT EXISTS idx_personal_todos_calendar_event_id 
  ON personal_todos(calendar_event_id) 
  WHERE calendar_event_id IS NOT NULL;

-- Step 3: Create index for finding todos by calendar event
CREATE INDEX IF NOT EXISTS idx_personal_todos_user_calendar 
  ON personal_todos(user_id, calendar_event_id) 
  WHERE calendar_event_id IS NOT NULL;

-- Note: RLS policies don't need changes because:
-- 1. calendar_event_id is nullable (doesn't affect existing todos)
-- 2. Users can only link to their own calendar events (enforced by application logic)
-- 3. The foreign key constraint ensures calendar_event_id references valid events
-- 4. ON DELETE SET NULL ensures todos aren't deleted if calendar event is deleted
