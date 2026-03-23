/*
  # Evolve Screen Time Tracker → Digital Wellness Tracker
  
  This migration expands the Screen Time Tracker into a comprehensive Digital Wellness Tracker
  while preserving 100% of existing functionality and data.
  
  Changes:
  1. Rename template: "Screen Time Tracker" → "Digital Wellness Tracker"
  2. Update description to reflect broader scope
  3. Add new optional fields for:
     - Attention & Interruption
     - Intentional Use & Boundaries
     - Subjective Digital Wellbeing
  4. Keep ALL existing fields unchanged (backward compatible)
  5. Update tags and chart configuration
  6. Update icon and color
  
  Backward Compatibility:
  - All existing fields remain unchanged
  - All existing data remains valid
  - Existing trackers continue to work
  - New fields are all optional (nullable)
*/

-- Ensure icon and color columns exist (defensive check)
ALTER TABLE tracker_templates
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text;

-- Update Screen Time Tracker to Digital Wellness Tracker
DO $$
DECLARE
  template_id_val UUID;
  existing_schema jsonb;
  new_fields jsonb;
BEGIN
  -- Find the Screen Time Tracker template
  SELECT id, field_schema INTO template_id_val, existing_schema
  FROM tracker_templates
  WHERE scope = 'global'
    AND name = 'Screen Time Tracker'
    AND archived_at IS NULL
  LIMIT 1;

  IF template_id_val IS NOT NULL THEN
    -- Build new fields array: keep all existing fields, add new ones
    -- Use jsonb array concatenation to append new fields to existing ones
    new_fields := existing_schema || jsonb_build_array(
      -- Attention & Interruption Fields
      jsonb_build_object(
        'id', 'interruption_level',
        'label', 'Interruption Level',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'default', 3,
        'description', 'How interrupted did you feel by your devices today? (1 = not interrupted, 5 = very interrupted)'
      ),
      jsonb_build_object(
        'id', 'primary_distraction_source',
        'label', 'Primary Distraction Source',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'social_media', 'label', 'Social Media'),
          jsonb_build_object('value', 'messaging', 'label', 'Messaging'),
          jsonb_build_object('value', 'news', 'label', 'News'),
          jsonb_build_object('value', 'work_apps', 'label', 'Work Apps'),
          jsonb_build_object('value', 'entertainment', 'label', 'Entertainment'),
          jsonb_build_object('value', 'notifications', 'label', 'Notifications'),
          jsonb_build_object('value', 'other', 'label', 'Other')
        ),
        'description', 'What was the main source of distraction today?'
      ),
      -- Intentional Use & Boundaries Fields
      jsonb_build_object(
        'id', 'intended_use_window',
        'label', 'Intended Use',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'focus', 'label', 'Focus'),
          jsonb_build_object('value', 'rest', 'label', 'Rest'),
          jsonb_build_object('value', 'connection', 'label', 'Connection'),
          jsonb_build_object('value', 'entertainment', 'label', 'Entertainment'),
          jsonb_build_object('value', 'work', 'label', 'Work'),
          jsonb_build_object('value', 'other', 'label', 'Other')
        ),
        'description', 'What was your intention for using your device?'
      ),
      jsonb_build_object(
        'id', 'boundary_respected',
        'label', 'Boundary Respected',
        'type', 'boolean',
        'description', 'Did your actual usage match your intention?'
      ),
      jsonb_build_object(
        'id', 'boundary_notes',
        'label', 'Boundary Notes',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 1000),
        'description', 'Notes about boundaries, intentions, or how usage felt'
      ),
      -- Subjective Digital Wellbeing Fields
      jsonb_build_object(
        'id', 'digital_wellbeing_score',
        'label', 'Digital Wellbeing Score',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'default', 3,
        'description', 'How did your digital habits feel today? (1 = not well, 5 = very well)'
      ),
      jsonb_build_object(
        'id', 'emotional_impact',
        'label', 'Emotional Impact',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'energising', 'label', 'Energising'),
          jsonb_build_object('value', 'neutral', 'label', 'Neutral'),
          jsonb_build_object('value', 'draining', 'label', 'Draining'),
          jsonb_build_object('value', 'anxious', 'label', 'Anxious'),
          jsonb_build_object('value', 'overstimulating', 'label', 'Overstimulating')
        ),
        'description', 'How did your digital use feel emotionally?'
      ),
      jsonb_build_object(
        'id', 'after_use_state',
        'label', 'After Use State',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'focused', 'label', 'Focused'),
          jsonb_build_object('value', 'calm', 'label', 'Calm'),
          jsonb_build_object('value', 'distracted', 'label', 'Distracted'),
          jsonb_build_object('value', 'tired', 'label', 'Tired'),
          jsonb_build_object('value', 'overloaded', 'label', 'Overloaded')
        ),
        'description', 'How did you feel after using your devices?'
      )
    );

    -- Update the template
    UPDATE tracker_templates
    SET 
      name = 'Digital Wellness Tracker',
      description = 'Understand how your digital environment affects your attention, energy, mood, and behavior. Track app usage, interruptions, boundaries, and how your digital habits feel—without judgment or enforcement.',
      field_schema = new_fields,
      tags = jsonb_build_array('digital-wellness', 'screen-time', 'attention', 'boundaries', 'wellness', 'self-care', 'mobile', 'tracking'),
      chart_config = jsonb_build_object(
        'enabled', true,
        'charts', jsonb_build_array(
          -- Existing charts (preserved)
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'usage_minutes',
            'title', 'App Usage Over Time',
            'config', jsonb_build_object(
              'yAxisLabel', 'Minutes',
              'stacked', true,
              'groupBy', 'app_name'
            )
          ),
          jsonb_build_object(
            'type', 'pie',
            'field_id', 'app_category',
            'title', 'Time by App Category',
            'config', jsonb_build_object()
          ),
          jsonb_build_object(
            'type', 'bar',
            'field_id', 'pickups',
            'title', 'Phone Pickups per Day',
            'config', jsonb_build_object(
              'yAxisLabel', 'Pickups'
            )
          ),
          jsonb_build_object(
            'type', 'line',
            'field_id', 'total_screen_time',
            'title', 'Total Screen Time Trend',
            'config', jsonb_build_object(
              'yAxisLabel', 'Minutes',
              'showGoal', true
            )
          ),
          -- New optional charts
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'digital_wellbeing_score',
            'title', 'Digital Wellbeing Score Over Time',
            'config', jsonb_build_object(
              'yAxisMin', 1,
              'yAxisMax', 5,
              'yAxisLabel', 'Wellbeing Score'
            )
          ),
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'interruption_level',
            'title', 'Interruption Level Trend',
            'config', jsonb_build_object(
              'yAxisMin', 1,
              'yAxisMax', 5,
              'yAxisLabel', 'Interruption Level'
            )
          ),
          jsonb_build_object(
            'type', 'bar',
            'field_id', 'boundary_respected',
            'title', 'Boundary Respected vs Broken',
            'config', jsonb_build_object()
          ),
          jsonb_build_object(
            'type', 'bar',
            'field_id', 'intended_use_window',
            'title', 'Usage Intention Distribution',
            'config', jsonb_build_object()
          )
        )
      ),
      icon = 'Smartphone',
      color = 'violet',
      updated_at = NOW(),
      version = 2 -- Increment version to indicate schema change
    WHERE id = template_id_val;

    RAISE NOTICE 'Successfully evolved Screen Time Tracker to Digital Wellness Tracker';
  ELSE
    RAISE NOTICE 'Screen Time Tracker template not found, skipping evolution';
  END IF;
END $$;

-- Update any existing trackers that reference the old template name
-- Note: Trackers store schema snapshots, so they won't break, but we can update their names
-- if they match exactly (optional, for better UX)
UPDATE trackers
SET 
  name = 'Digital Wellness Tracker',
  updated_at = NOW()
WHERE template_id IN (
  SELECT id FROM tracker_templates 
  WHERE name = 'Digital Wellness Tracker' 
  AND scope = 'global'
)
AND name = 'Screen Time Tracker'
AND archived_at IS NULL;

-- Comments
COMMENT ON TABLE tracker_templates IS 
  'Templates now include Digital Wellness Tracker (evolved from Screen Time Tracker). All existing screen time functionality preserved with expanded digital wellness tracking.';
