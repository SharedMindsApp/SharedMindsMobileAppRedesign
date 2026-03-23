/*
  # Add Missing Planner Tracker Templates
  
  This migration adds tracker templates that were identified in the Planner section
  but weren't included in the initial migrations.
  
  Templates added:
  1. Mental Health Check-in Tracker
  2. Financial Reflection Tracker
  3. Monthly Vision Check-in Tracker
*/

-- Helper function to check if templates already exist (idempotent)
DO $$
DECLARE
  template_count integer;
BEGIN
  -- Check if any of these templates already exist
  SELECT COUNT(*) INTO template_count
  FROM tracker_templates
  WHERE scope = 'global'
    AND name IN (
      'Mental Health Check-in',
      'Financial Reflection',
      'Monthly Vision Check-in'
    );
  
  -- Only proceed if templates don't exist
  IF template_count = 0 THEN
    
    -- 1. Mental Health Check-in Tracker
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
      NULL,
      NULL,
      'Mental Health Check-in',
      'A gentle space to check in with yourself. Track mood, energy, stress, and reflections without judgment.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'mood',
          'label', 'Mood',
          'type', 'text',
          'validation', jsonb_build_object('required', true),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'peaceful', 'label', 'Peaceful'),
            jsonb_build_object('value', 'happy', 'label', 'Happy'),
            jsonb_build_object('value', 'content', 'label', 'Content'),
            jsonb_build_object('value', 'neutral', 'label', 'Neutral'),
            jsonb_build_object('value', 'anxious', 'label', 'Anxious'),
            jsonb_build_object('value', 'sad', 'label', 'Sad'),
            jsonb_build_object('value', 'overwhelmed', 'label', 'Overwhelmed'),
            jsonb_build_object('value', 'tired', 'label', 'Tired')
          )
        ),
        jsonb_build_object(
          'id', 'energy_level',
          'label', 'Energy Level',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5, 'required', true),
          'default', 3
        ),
        jsonb_build_object(
          'id', 'stress_level',
          'label', 'Stress Level',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5, 'required', true),
          'default', 3
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
      1,
      ARRAY['mental-health', 'wellness', 'self-care', 'check-in'],
      jsonb_build_object(
        'enabled', true,
        'charts', jsonb_build_array(
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'energy_level',
            'title', 'Energy Level Over Time'
          ),
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'stress_level',
            'title', 'Stress Level Over Time'
          ),
          jsonb_build_object(
            'type', 'bar',
            'field_id', 'mood',
            'title', 'Mood Distribution'
          )
        )
      )
    );

    -- 2. Financial Reflection Tracker
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
      NULL,
      NULL,
      'Financial Reflection',
      'Reflect on your financial journey. Track what went well, challenges, insights, and decisions made.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'reflection_date',
          'label', 'Reflection Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'reflection_type',
          'label', 'Reflection Period',
          'type', 'text',
          'validation', jsonb_build_object('required', true),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'monthly', 'label', 'Monthly'),
            jsonb_build_object('value', 'quarterly', 'label', 'Quarterly'),
            jsonb_build_object('value', 'annual', 'label', 'Annual')
          )
        ),
        jsonb_build_object(
          'id', 'title',
          'label', 'Title',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 200)
        ),
        jsonb_build_object(
          'id', 'what_went_well',
          'label', 'What Went Well',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000)
        ),
        jsonb_build_object(
          'id', 'what_was_hard',
          'label', 'What Was Hard',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000)
        ),
        jsonb_build_object(
          'id', 'emotional_check_in',
          'label', 'Emotional Check-in',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000)
        ),
        jsonb_build_object(
          'id', 'key_insights',
          'label', 'Key Insights',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000)
        ),
        jsonb_build_object(
          'id', 'decisions_made',
          'label', 'Decisions Made',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000)
        ),
        jsonb_build_object(
          'id', 'goals_for_next_period',
          'label', 'Goals for Next Period',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000)
        )
      ),
      'range', -- Can be monthly, quarterly, or annual
      true,
      'global',
      true,
      NOW(),
      1,
      ARRAY['finance', 'reflection', 'planning', 'financial-wellness'],
      NULL -- No numeric fields for charts
    );

    -- 3. Monthly Vision Check-in Tracker
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
      NULL,
      NULL,
      'Monthly Vision Check-in',
      'Monthly check-in to reflect on alignment with your vision. Notice what feels aligned, what doesn''t, and small adjustments you can make.',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'checkin_date',
          'label', 'Check-in Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        jsonb_build_object(
          'id', 'what_felt_aligned',
          'label', 'What Felt Aligned',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 2000)
        ),
        jsonb_build_object(
          'id', 'what_didnt_feel_aligned',
          'label', 'What Didn''t Feel Aligned',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000)
        ),
        jsonb_build_object(
          'id', 'small_adjustment',
          'label', 'Small Adjustment',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000)
        ),
        jsonb_build_object(
          'id', 'overall_feeling',
          'label', 'Overall Feeling',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500)
        )
      ),
      'range', -- Monthly entries
      true,
      'global',
      true,
      NOW(),
      1,
      ARRAY['vision', 'reflection', 'planning', 'alignment', 'monthly-checkin'],
      NULL -- No numeric fields for charts
    );

    RAISE NOTICE 'Successfully created 3 additional tracker templates from Planner section';
  ELSE
    RAISE NOTICE 'Some templates already exist, skipping creation';
  END IF;
END $$;
