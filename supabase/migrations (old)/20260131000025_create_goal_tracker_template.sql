/*
  # Create Goal Tracker Template
  
  This migration creates a Goal Tracker template for Tracker Studio.
  This allows users to track goal progress over time using the Tracker Studio system.
  
  Fields:
  - Goal Name: The goal being tracked
  - Progress: Percentage progress (0-100)
  - Status: Current status of the goal
  - Milestone: Achievements or milestones reached
  - Notes: Reflection on progress, what was done, what's next
  - Target Date: Optional target date for the goal
*/

-- Helper function to check if template already exists (idempotent)
DO $$
DECLARE
  template_exists boolean;
BEGIN
  -- Check if Goal Tracker template already exists
  SELECT EXISTS(
    SELECT 1 FROM tracker_templates
    WHERE scope = 'global'
      AND name = 'Goal Tracker'
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
      'Goal Tracker',
      'Track your goals and progress over time. Log daily progress, milestones, and reflections.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'goal_name',
          'label', 'Goal Name',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 200)
        ),
        jsonb_build_object(
          'id', 'progress',
          'label', 'Progress (%)',
          'type', 'number',
          'validation', jsonb_build_object('min', 0, 'max', 100, 'required', true),
          'default', 0
        ),
        jsonb_build_object(
          'id', 'status',
          'label', 'Status',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 50),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'active', 'label', 'Active'),
            jsonb_build_object('value', 'in_progress', 'label', 'In Progress'),
            jsonb_build_object('value', 'completed', 'label', 'Completed'),
            jsonb_build_object('value', 'paused', 'label', 'Paused'),
            jsonb_build_object('value', 'archived', 'label', 'Archived')
          )
        ),
        jsonb_build_object(
          'id', 'milestone',
          'label', 'Milestone / Achievement',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500)
        ),
        jsonb_build_object(
          'id', 'target_date',
          'label', 'Target Date',
          'type', 'date',
          'validation', jsonb_build_object()
        ),
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes / Reflection',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000)
        )
      ),
      'daily', -- Daily entries to track progress over time
      true, -- System template
      'global', -- Global scope
      true, -- Locked (admin-only edits)
      NOW(), -- Published now
      1, -- Version 1
      jsonb_build_array('goals', 'planning', 'productivity', 'personal-development', 'tracking'),
      jsonb_build_object(
        'enabled', true,
        'charts', jsonb_build_array(
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'progress',
            'title', 'Progress Over Time',
            'config', jsonb_build_object(
              'yAxisMin', 0,
              'yAxisMax', 100,
              'yAxisLabel', 'Progress (%)'
            )
          )
        )
      )
    );

    RAISE NOTICE 'Successfully created Goal Tracker template';
  ELSE
    RAISE NOTICE 'Goal Tracker template already exists, skipping creation';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE tracker_templates IS 'Templates now include Goal Tracker for tracking goal progress over time';
