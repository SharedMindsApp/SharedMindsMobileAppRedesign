/*
  # Create Global Tracker Templates from Planner Trackers
  
  This migration creates global tracker templates based on existing Planner tracking features.
  These templates will be available to all users as starter templates.
  
  Templates created:
  1. Sleep Tracker
  2. Exercise Tracker
  3. Nutrition Log
  4. Mindfulness & Meditation
  5. Rest & Recovery
  6. Growth Tracking
  7. Gratitude Journal
  8. Personal Journal
  9. Income & Cash Flow
*/

-- Helper function to check if templates already exist (idempotent)
DO $$
DECLARE
  template_count integer;
BEGIN
  -- Check if any planner templates already exist
  SELECT COUNT(*) INTO template_count
  FROM tracker_templates
  WHERE scope = 'global'
    AND name IN (
      'Sleep Tracker',
      'Exercise Tracker',
      'Nutrition Log',
      'Mindfulness & Meditation',
      'Rest & Recovery',
      'Growth Tracking',
      'Gratitude Journal',
      'Personal Journal',
      'Income & Cash Flow'
    );
  
  -- Only proceed if templates don't exist
  IF template_count = 0 THEN
    
    -- 1. Sleep Tracker
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
      version
    ) VALUES (
      NULL, -- Global template has no owner
      NULL, -- System-created
      'Sleep Tracker',
      'Track your sleep patterns gently. Record duration, quality, and any notes about your rest.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'duration_hours',
          'label', 'Duration (hours)',
          'type', 'number',
          'validation', jsonb_build_object('min', 0, 'max', 24)
        ),
        jsonb_build_object(
          'id', 'quality_rating',
          'label', 'Sleep Quality',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000)
        )
      ),
      'daily',
      true,
      'global',
      true,
      NOW(),
      1
    );

    -- 2. Exercise Tracker
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
      version
    ) VALUES (
      NULL,
      NULL,
      'Exercise Tracker',
      'Track movement that feels good. Record activities, duration, intensity, and how it felt.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'activity_type',
          'label', 'Activity Type',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 100)
        ),
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'duration_minutes',
          'label', 'Duration (minutes)',
          'type', 'number',
          'validation', jsonb_build_object('min', 0)
        ),
        jsonb_build_object(
          'id', 'intensity',
          'label', 'Intensity',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 50)
        ),
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500)
        )
      ),
      'daily',
      true,
      'global',
      true,
      NOW(),
      1
    );

    -- 3. Nutrition Log
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
      version
    ) VALUES (
      NULL,
      NULL,
      'Nutrition Log',
      'Track what you eat with awareness. No macro counting, no diet scoring—just mindful awareness.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'meal_type',
          'label', 'Meal Type',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 50)
        ),
        jsonb_build_object(
          'id', 'content',
          'label', 'What did you eat?',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 1000)
        ),
        jsonb_build_object(
          'id', 'tags',
          'label', 'Tags',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 200)
        ),
        jsonb_build_object(
          'id', 'mood_note',
          'label', 'Mood/Feelings',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500)
        )
      ),
      'daily',
      true,
      'global',
      true,
      NOW(),
      1
    );

    -- 4. Mindfulness & Meditation
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
      version
    ) VALUES (
      NULL,
      NULL,
      'Mindfulness & Meditation',
      'Track moments of presence. No timer required, no streak pressure—just awareness of your practice.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'session_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'session_type',
          'label', 'Session Type',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 100)
        ),
        jsonb_build_object(
          'id', 'duration_minutes',
          'label', 'Duration (minutes)',
          'type', 'number',
          'validation', jsonb_build_object('min', 0)
        ),
        jsonb_build_object(
          'id', 'reflection',
          'label', 'Reflection',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000)
        )
      ),
      'daily',
      true,
      'global',
      true,
      NOW(),
      1
    );

    -- 5. Rest & Recovery
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
      version
    ) VALUES (
      NULL,
      NULL,
      'Rest & Recovery',
      'Track rest blocks, recovery days, and burnout notes. Honor your need for rest.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'log_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'log_type',
          'label', 'Type',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 50)
        ),
        jsonb_build_object(
          'id', 'duration_minutes',
          'label', 'Duration (minutes)',
          'type', 'number',
          'validation', jsonb_build_object('min', 0)
        ),
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000)
        )
      ),
      'daily',
      true,
      'global',
      true,
      NOW(),
      1
    );

    -- 6. Growth Tracking
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
      version
    ) VALUES (
      NULL,
      NULL,
      'Growth Tracking',
      'Track your personal growth across key dimensions: confidence, emotional resilience, focus & clarity, and self-trust.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'checkin_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'confidence_level',
          'label', 'Confidence',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5, 'required', true),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'emotional_resilience',
          'label', 'Emotional Resilience',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5, 'required', true),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'focus_clarity',
          'label', 'Focus & Clarity',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5, 'required', true),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'self_trust',
          'label', 'Self-Trust',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5, 'required', true),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500)
        ),
        jsonb_build_object(
          'id', 'reflection',
          'label', 'Reflection',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000)
        )
      ),
      'daily',
      true,
      'global',
      true,
      NOW(),
      1
    );

    -- 7. Gratitude Journal
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
      version
    ) VALUES (
      NULL,
      NULL,
      'Gratitude Journal',
      'Reflect on what you''re grateful for. No forced daily use, just when it feels right.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'format',
          'label', 'Format',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 50)
        ),
        jsonb_build_object(
          'id', 'content',
          'label', 'What are you grateful for?',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 5000)
        )
      ),
      'daily',
      true,
      'global',
      true,
      NOW(),
      1
    );

    -- 8. Personal Journal
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
      version
    ) VALUES (
      NULL,
      NULL,
      'Personal Journal',
      'Your personal journal for thoughts, reflections, and growth. Private by default.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'title',
          'label', 'Title',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 200)
        ),
        jsonb_build_object(
          'id', 'content',
          'label', 'Content',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 10000)
        ),
        jsonb_build_object(
          'id', 'tags',
          'label', 'Tags',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 200)
        )
      ),
      'daily',
      true,
      'global',
      true,
      NOW(),
      1
    );

    -- 9. Income & Cash Flow
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
      version
    ) VALUES (
      NULL,
      NULL,
      'Income & Cash Flow',
      'Track income sources and cash flow. Record expected and actual amounts over time.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'source_name',
          'label', 'Source Name',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 200)
        ),
        jsonb_build_object(
          'id', 'source_type',
          'label', 'Source Type',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 100)
        ),
        jsonb_build_object(
          'id', 'frequency',
          'label', 'Frequency',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 50)
        ),
        jsonb_build_object(
          'id', 'expected_amount',
          'label', 'Expected Amount',
          'type', 'number',
          'validation', jsonb_build_object('min', 0)
        ),
        jsonb_build_object(
          'id', 'actual_amount',
          'label', 'Actual Amount',
          'type', 'number',
          'validation', jsonb_build_object('min', 0)
        ),
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500)
        )
      ),
      'daily',
      true,
      'global',
      true,
      NOW(),
      1
    );

  END IF;
END $$;

-- Comments
COMMENT ON TABLE tracker_templates IS 'Templates now include Planner tracker presets as global templates';
