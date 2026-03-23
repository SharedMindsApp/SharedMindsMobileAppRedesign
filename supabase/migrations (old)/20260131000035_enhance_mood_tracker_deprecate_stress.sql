/*
  # Enhance Mood Tracker and Deprecate Stress Level Tracker
  
  This migration enhances the Mood Tracker to be more intelligent and helpful
  for people dealing with stress, while deprecating the separate Stress Level Tracker.
  
  Context:
  - Mood and stress are closely related - tracking them together provides better insights
  - Mood Tracker can serve as a companion for stress management
  - Having separate trackers creates fragmentation and cognitive load
  - Enhanced Mood Tracker provides optional stress tracking when needed
  
  Architecture:
  - Mood Tracker is enhanced with optional stress-related fields
  - Stress fields are always available (not conditional) but optional
  - This keeps the tracker simple while providing stress management support
  - Stress Level Tracker is deprecated but preserved for backward compatibility
  
  Design Principles:
  - Mood remains primary focus
  - Stress tracking is supportive, not prescriptive
  - No judgment or pressure
  - Awareness-focused, not optimization-focused
*/

-- Step 1: Ensure deprecated_at, icon, and color columns exist (defensive check)
ALTER TABLE tracker_templates
  ADD COLUMN IF NOT EXISTS deprecated_at timestamptz,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text;

-- Step 2: Update Mood Tracker template with enhanced stress support
-- This adds optional stress-related fields while keeping mood as the primary focus
UPDATE tracker_templates
SET 
  description = 'Track your mood throughout the day. Optionally note stress levels, triggers, and what helps. A gentle companion for understanding your emotional patterns.',
  field_schema = jsonb_build_array(
    -- Core mood fields (always shown)
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
      'default', 3,
      'description', 'How are you feeling?'
    ),
    jsonb_build_object(
      'id', 'time_of_day',
      'label', 'Time of Day',
      'type', 'text',
      'validation', jsonb_build_object('maxLength', 50),
      'description', 'When did you check in? (optional)'
    ),
    -- Enhanced stress support fields (optional, always available)
    jsonb_build_object(
      'id', 'stress_level',
      'label', 'Stress Level',
      'type', 'rating',
      'validation', jsonb_build_object('min', 1, 'max', 5),
      'default', 3,
      'description', 'Optional: How stressed do you feel? (1 = very calm, 5 = very stressed)'
    ),
    jsonb_build_object(
      'id', 'stress_triggers',
      'label', 'What Contributed to Stress?',
      'type', 'text',
      'validation', jsonb_build_object('maxLength', 500),
      'description', 'Optional: What situations, thoughts, or events contributed to stress?'
    ),
    jsonb_build_object(
      'id', 'what_helped',
      'label', 'What Helped?',
      'type', 'text',
      'validation', jsonb_build_object('maxLength', 500),
      'description', 'Optional: What helped you manage stress or improve your mood?'
    ),
    jsonb_build_object(
      'id', 'notes',
      'label', 'Notes',
      'type', 'text',
      'validation', jsonb_build_object('maxLength', 1000),
      'description', 'Any additional thoughts or observations'
    )
  ),
  tags = jsonb_build_array('mood', 'emotions', 'stress', 'wellness', 'mental-health', 'self-care', 'tracking', 'awareness'),
  chart_config = jsonb_build_object(
    'enabled', true,
    'charts', jsonb_build_array(
      jsonb_build_object(
        'type', 'time_series',
        'field_id', 'mood_rating',
        'title', 'Mood Over Time',
        'config', jsonb_build_object(
          'yAxisMin', 1,
          'yAxisMax', 5,
          'yAxisLabel', 'Mood'
        )
      ),
      jsonb_build_object(
        'type', 'time_series',
        'field_id', 'stress_level',
        'title', 'Stress Level Over Time',
        'config', jsonb_build_object(
          'yAxisMin', 1,
          'yAxisMax', 5,
          'yAxisLabel', 'Stress Level'
        )
      ),
      jsonb_build_object(
        'type', 'scatter',
        'field_id', 'mood_rating',
        'title', 'Mood vs Stress',
        'config', jsonb_build_object(
          'xField', 'stress_level',
          'yField', 'mood_rating',
          'xAxisLabel', 'Stress Level',
          'yAxisLabel', 'Mood'
        )
      )
    )
  ),
  version = 2,
  updated_at = NOW()
WHERE scope = 'global'
  AND name = 'Mood Tracker'
  AND archived_at IS NULL;

-- Step 3: Mark Stress Level Tracker as deprecated
-- This template is deprecated in favor of the enhanced Mood Tracker
UPDATE tracker_templates
SET deprecated_at = NOW(),
    updated_at = NOW()
WHERE scope = 'global'
  AND name = 'Stress Level Tracker'
  AND deprecated_at IS NULL;

-- Add comments explaining the deprecation
COMMENT ON COLUMN tracker_templates.deprecated_at IS 
  'Timestamp when template was deprecated. Deprecated templates are hidden from new template selection but remain accessible for existing trackers. Use enhanced Mood Tracker instead of Stress Level Tracker. Use Environmental Impact Tracker instead of Weather & Environment Tracker. Use Nutrition & Hydration Tracker instead of Nutrition Log and Water Intake Tracker. Use Health Tracker instead of Medication/Symptom Trackers. Use Fitness Tracker instead of Exercise Tracker.';

-- Comments
COMMENT ON TABLE tracker_templates IS 
  'Templates now include enhanced Mood Tracker (with optional stress tracking), Environmental Impact Tracker (behavior-focused environmental actions), Nutrition & Hydration Tracker (unified food + hydration tracking), Health Tracker (unified medication + symptom tracking), and Fitness Tracker (personalized movement tracking). Stress Level Tracker, Weather & Environment Tracker, Nutrition Log, Water Intake Tracker, Medication Tracker, Symptom Tracker, and Exercise Tracker are deprecated but preserved for backward compatibility.';
