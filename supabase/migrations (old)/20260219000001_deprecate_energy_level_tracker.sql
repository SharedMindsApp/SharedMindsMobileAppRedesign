/*
  # Deprecate Energy Level Tracker Template
  
  This migration deprecates the Energy Level Tracker template.
  The template will be hidden from new template selection but existing
  trackers created from it will continue to function normally.
*/

-- Deprecate the Energy Level Tracker template
UPDATE tracker_templates
SET deprecated_at = NOW()
WHERE name = 'Energy Level Tracker' 
  AND scope = 'global' 
  AND archived_at IS NULL
  AND deprecated_at IS NULL;

-- Add comment explaining the deprecation
COMMENT ON TABLE tracker_templates IS 'Energy Level Tracker template has been deprecated - use Mood Tracker or other wellness trackers instead';
