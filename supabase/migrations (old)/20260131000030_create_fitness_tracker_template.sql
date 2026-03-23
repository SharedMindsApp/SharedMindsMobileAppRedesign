/*
  # Create Fitness Tracker Template
  
  This migration creates a Fitness Tracker template for Tracker Studio.
  This is a special template that triggers a discovery flow to learn about
  the user's movement patterns, then dynamically creates personalized trackers.
  
  The Fitness Tracker is not a single tracker - it's a personalized movement
  system assembled at setup based on what the user actually does.
*/

-- Helper function to check if template already exists (idempotent)
DO $$
DECLARE
  template_exists boolean;
BEGIN
  -- Check if Fitness Tracker template already exists
  SELECT EXISTS(
    SELECT 1 FROM tracker_templates
    WHERE scope = 'global'
      AND name = 'Fitness Tracker'
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
      'Fitness Tracker',
      'A personalized movement intelligence system. First, we learn about your movement patterns (gym, running, sports, etc.), then we build a tracker tailored to you. No goals, no judgment—just understanding and support.',
      jsonb_build_array(
        -- This is a special template - the actual fields are created dynamically
        -- after discovery. These are placeholder fields for the template structure.
        jsonb_build_object(
          'id', 'movement_type',
          'label', 'Movement Type',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 100),
          'description', 'Type of movement (will be customized after discovery)'
        ),
        jsonb_build_object(
          'id', 'perceived_intensity',
          'label', 'Intensity (1-5)',
          'type', 'number',
          'validation', jsonb_build_object('min', 1, 'max', 5),
          'description', 'How intense did this feel?'
        ),
        jsonb_build_object(
          'id', 'body_state',
          'label', 'Body State',
          'type', 'text',
          'validation', jsonb_build_object(),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'fresh', 'label', 'Fresh'),
            jsonb_build_object('value', 'sore', 'label', 'Sore'),
            jsonb_build_object('value', 'fatigued', 'label', 'Fatigued'),
            jsonb_build_object('value', 'stiff', 'label', 'Stiff'),
            jsonb_build_object('value', 'injured', 'label', 'Injured'),
            jsonb_build_object('value', 'recovered', 'label', 'Recovered')
          ),
          'description', 'How does your body feel?'
        ),
        jsonb_build_object(
          'id', 'enjoyment',
          'label', 'Enjoyment (1-5)',
          'type', 'number',
          'validation', jsonb_build_object('min', 1, 'max', 5),
          'description', 'How much did you enjoy this?'
        ),
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000),
          'description', 'Any additional notes'
        )
      ),
      'session', -- Session-based entries (not daily)
      true, -- System template
      'global', -- Global scope
      true, -- Locked (admin-only edits)
      NOW(), -- Published now
      1, -- Version 1
      jsonb_build_array('fitness', 'movement', 'exercise', 'sports', 'health', 'wellness', 'personalized', 'intelligent'),
      jsonb_build_object(
        'enabled', true,
        'charts', jsonb_build_array(
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'perceived_intensity',
            'title', 'Intensity Over Time',
            'config', jsonb_build_object(
              'yAxisMin', 1,
              'yAxisMax', 5,
              'yAxisLabel', 'Intensity'
            )
          )
        )
      )
    );

    RAISE NOTICE 'Successfully created Fitness Tracker template';
  ELSE
    RAISE NOTICE 'Fitness Tracker template already exists, skipping creation';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE tracker_templates IS 'Templates now include Fitness Tracker - a personalized movement intelligence system';
