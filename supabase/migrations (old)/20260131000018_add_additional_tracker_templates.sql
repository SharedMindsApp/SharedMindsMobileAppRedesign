/*
  # Add Additional Tracker Templates from Planner
  
  This migration adds additional tracker templates that weren't included in the initial set.
  These are useful trackers that can be created from Planner features.
*/

-- Helper function to check if templates already exist (idempotent)
DO $$
DECLARE
  template_count integer;
BEGIN
  -- Check if any of these additional templates already exist
  SELECT COUNT(*) INTO template_count
  FROM tracker_templates
  WHERE scope = 'global'
    AND name IN (
      'Mood Tracker',
      'Energy Level Tracker',
      'Water Intake Tracker',
      'Medication Tracker',
      'Symptom Tracker',
      'Stress Level Tracker',
      'Productivity Tracker',
      'Social Connection Tracker',
      'Weather & Environment Tracker',
      'Habit Check-in Tracker'
    );
  
  -- Only proceed if templates don't exist
  IF template_count = 0 THEN
    
    -- 1. Mood Tracker
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
      'Mood Tracker',
      'Track your mood throughout the day. No judgment, just awareness of how you''re feeling.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'mood_rating',
          'label', 'Mood',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5, 'required', true),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'time_of_day',
          'label', 'Time of Day',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 50)
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

    -- 2. Energy Level Tracker
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
      'Energy Level Tracker',
      'Track your energy levels throughout the day. Notice patterns without trying to change them.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'morning_energy',
          'label', 'Morning Energy',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'afternoon_energy',
          'label', 'Afternoon Energy',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'evening_energy',
          'label', 'Evening Energy',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5),
          'default', 3
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

    -- 3. Water Intake Tracker
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
      'Water Intake Tracker',
      'Track your water intake. No goals, no pressure—just awareness of hydration.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'cups_glasses',
          'label', 'Cups/Glasses',
          'type', 'number',
          'validation', jsonb_build_object('min', 0),
          'default', 0
        ),
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes',
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

    -- 4. Medication Tracker
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
      'Medication Tracker',
      'Track medication intake. Simple, non-judgmental logging for your health.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'medication_name',
          'label', 'Medication Name',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 200)
        ),
        jsonb_build_object(
          'id', 'dosage',
          'label', 'Dosage',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 100)
        ),
        jsonb_build_object(
          'id', 'time_taken',
          'label', 'Time Taken',
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

    -- 5. Symptom Tracker
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
      'Symptom Tracker',
      'Track symptoms and how you''re feeling. Useful for understanding patterns over time.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'symptom_type',
          'label', 'Symptom Type',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 200)
        ),
        jsonb_build_object(
          'id', 'severity',
          'label', 'Severity',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'duration',
          'label', 'Duration',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 100)
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

    -- 6. Stress Level Tracker
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
      'Stress Level Tracker',
      'Track stress levels throughout the day. Awareness without judgment.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'stress_level',
          'label', 'Stress Level',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5, 'required', true),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'triggers',
          'label', 'Triggers',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500)
        ),
        jsonb_build_object(
          'id', 'coping_strategies',
          'label', 'Coping Strategies',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500)
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

    -- 7. Productivity Tracker
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
      'Productivity Tracker',
      'Track your productivity and focus. Notice patterns without self-criticism.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'focus_level',
          'label', 'Focus Level',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'tasks_completed',
          'label', 'Tasks Completed',
          'type', 'number',
          'validation', jsonb_build_object('min', 0),
          'default', 0
        ),
        jsonb_build_object(
          'id', 'distractions',
          'label', 'Distractions',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500)
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

    -- 8. Social Connection Tracker
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
      'Social Connection Tracker',
      'Track social interactions and connections. Notice what feels nourishing.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'interaction_type',
          'label', 'Interaction Type',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 100)
        ),
        jsonb_build_object(
          'id', 'quality_rating',
          'label', 'Quality',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5),
          'default', 3
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

    -- 9. Weather & Environment Tracker
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
      'Weather & Environment Tracker',
      'Track weather and environmental factors that might affect how you feel.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'weather',
          'label', 'Weather',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 100)
        ),
        jsonb_build_object(
          'id', 'temperature',
          'label', 'Temperature',
          'type', 'number',
          'validation', jsonb_build_object('max', 150, 'min', -50)
        ),
        jsonb_build_object(
          'id', 'humidity',
          'label', 'Humidity (%)',
          'type', 'number',
          'validation', jsonb_build_object('min', 0, 'max', 100)
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

    -- 10. Habit Check-in Tracker
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
      'Habit Check-in Tracker',
      'Track daily habit check-ins. Simple yes/no tracking without streak pressure.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'habit_name',
          'label', 'Habit Name',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 200)
        ),
        jsonb_build_object(
          'id', 'completed',
          'label', 'Completed',
          'type', 'boolean',
          'validation', jsonb_build_object('required', true),
          'default', false
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
