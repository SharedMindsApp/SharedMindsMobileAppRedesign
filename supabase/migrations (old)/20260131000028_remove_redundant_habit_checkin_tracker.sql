/*
  # Remove Redundant Habit Check-in Tracker Template
  
  The "Habit Check-in Tracker" template is redundant because:
  - "Habit Tracker" already covers all use cases
  - "Habit Tracker" has value_boolean field for yes/no tracking
  - "Habit Tracker" has more comprehensive status options (done/missed/skipped/partial)
  - Having both templates is confusing for users
  
  This migration archives the "Habit Check-in Tracker" template to prevent new instances,
  while preserving existing tracker instances that may have been created from it.
*/

-- Archive the "Habit Check-in Tracker" template
UPDATE tracker_templates
SET 
  archived_at = NOW(),
  updated_at = NOW()
WHERE 
  name = 'Habit Check-in Tracker'
  AND scope = 'global'
  AND archived_at IS NULL;

-- Add a comment explaining why this template was archived
COMMENT ON COLUMN tracker_templates.archived_at IS 'Archived templates are hidden from selection but preserved for existing tracker instances';
