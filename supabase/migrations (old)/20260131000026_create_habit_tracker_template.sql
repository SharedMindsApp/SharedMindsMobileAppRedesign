/*
  # Create Habit Tracker Template
  
  This migration creates a comprehensive Habit Tracker template for Tracker Studio.
  This replaces the current Habit Tracker in the Planner with a Tracker Studio-based version.
  
  Fields:
  - Habit Name: The habit being tracked
  - Status: done, missed, skipped, or partial
  - Value: Numeric value (for count/minutes/rating habits) or boolean (for yes/no habits)
  - Notes: Optional notes about the check-in
*/

-- Helper function to check if template already exists (idempotent)
DO $$
DECLARE
  template_exists boolean;
BEGIN
  -- Check if Habit Tracker template already exists
  SELECT EXISTS(
    SELECT 1 FROM tracker_templates
    WHERE scope = 'global'
      AND name = 'Habit Tracker'
  ) INTO template_exists;
  
  -- Only proceed if template doesn't exist
  IF NOT template_exists THEN
    
    INSERT INTO tracker_templates (
      owner_id,
      created_by,
      name,
      description,
      field_schema,
      entry_granularity,
      is_system_template,
      scope,
      is_locked,
      published_at,
      version,
      tags,
      chart_config
    ) VALUES (
      NULL, -- Global template has no owner
      NULL, -- System-created
      'Habit Tracker',
      'Track your daily habits. Log check-ins with status, values, and notes. Support habits without streak pressure.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'habit_name',
          'label', 'Habit Name',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 200)
        ),
        jsonb_build_object(
          'id', 'status',
          'label', 'Status',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 50),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'done', 'label', 'Done'),
            jsonb_build_object('value', 'missed', 'label', 'Missed'),
            jsonb_build_object('value', 'skipped', 'label', 'Skipped'),
            jsonb_build_object('value', 'partial', 'label', 'Partial')
          )
        ),
        jsonb_build_object(
          'id', 'value_numeric',
          'label', 'Value (Count/Minutes/Rating)',
          'type', 'number',
          'validation', jsonb_build_object('min', 0)
        ),
        jsonb_build_object(
          'id', 'value_boolean',
          'label', 'Completed',
          'type', 'boolean',
          'validation', jsonb_build_object()
        ),
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000)
        )
      ),
      'daily', -- Daily entries to track habits
      true, -- System template
      'global', -- Global scope
      true, -- Locked (admin-only edits)
      '2020-01-01 00:00:00+00'::timestamptz, -- Very early date to ensure it appears first
      1, -- Version 1
      jsonb_build_array('habits', 'productivity', 'personal-development', 'tracking', 'daily-routine'),
      jsonb_build_object(
        'enabled', true,
        'charts', jsonb_build_array(
          jsonb_build_object(
            'type', 'heatmap',
            'field_id', 'status',
            'title', 'Habit Check-in Heatmap'
          ),
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'value_numeric',
            'title', 'Habit Value Over Time'
          )
        )
      )
    );

    RAISE NOTICE 'Successfully created Habit Tracker template';
  ELSE
    RAISE NOTICE 'Habit Tracker template already exists, skipping creation';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE tracker_templates IS 'Templates now include Habit Tracker for tracking daily habits';
