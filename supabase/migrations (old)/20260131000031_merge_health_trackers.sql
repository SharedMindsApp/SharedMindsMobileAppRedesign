/*
  # Merge Medication Tracker + Symptom Tracker into Health Tracker
  
  This migration consolidates overlapping health tracking templates by:
  1. Adding deprecated_at field to support template deprecation
  2. Creating a new unified Health Tracker template
  3. Marking Medication Tracker and Symptom Tracker as deprecated
  
  Context:
  - Medication tracking and symptom tracking are conceptually part of the same domain: Health management
  - This consolidation simplifies Tracker Studio by reducing overlapping templates
  - Existing user data is preserved (trackers created from old templates continue to work)
  - Deprecated templates are hidden from new template selection but remain accessible for existing trackers
  
  Architecture:
  - Health Tracker uses conditional fields based on entry_type (medication, symptom, general_health)
  - The form dynamically shows only relevant fields based on entry_type selection
  - This pattern can be reused for future tracker consolidations
*/

-- Step 1: Add deprecated_at field to tracker_templates
ALTER TABLE tracker_templates
  ADD COLUMN IF NOT EXISTS deprecated_at timestamptz;

-- Ensure icon and color columns exist (defensive check)
ALTER TABLE tracker_templates
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text;

-- Create index for deprecated templates
CREATE INDEX IF NOT EXISTS idx_tracker_templates_deprecated 
  ON tracker_templates(deprecated_at) 
  WHERE deprecated_at IS NOT NULL;

-- Step 2: Create Health Tracker template
-- This template supports multiple health event types within a single tracker
DO $$
DECLARE
  template_exists boolean;
BEGIN
  -- Check if Health Tracker template already exists
  SELECT EXISTS(
    SELECT 1 FROM tracker_templates
    WHERE scope = 'global'
      AND name = 'Health Tracker'
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
      chart_config,
      icon,
      color
    ) VALUES (
      NULL, -- Global template has no owner
      NULL, -- System-created
      'Health Tracker',
      'Track medications, symptoms, and general health events in one place. Select the type of entry first, then fill in the relevant fields.',
      jsonb_build_array(
        -- Core fields (always shown)
        -- entry_type comes first so users can select it and see relevant fields
        jsonb_build_object(
          'id', 'entry_type',
          'label', 'Entry Type',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 50),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'medication', 'label', 'Medication'),
            jsonb_build_object('value', 'symptom', 'label', 'Symptom'),
            jsonb_build_object('value', 'general_health', 'label', 'General Health')
          ),
          'description', 'Select the type of health event you want to track'
        ),
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        -- Medication fields (conditional: shown when entry_type = 'medication')
        jsonb_build_object(
          'id', 'medication_name',
          'label', 'Medication Name',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 200),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'medication'),
          'description', 'Name of the medication'
        ),
        jsonb_build_object(
          'id', 'dosage',
          'label', 'Dosage',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 100),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'medication'),
          'description', 'Dosage amount (e.g., "10mg", "1 tablet")'
        ),
        jsonb_build_object(
          'id', 'time_taken',
          'label', 'Time Taken',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 50),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'medication'),
          'description', 'Time when medication was taken'
        ),
        jsonb_build_object(
          'id', 'medication_notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'medication'),
          'description', 'Additional notes about the medication'
        ),
        -- Symptom fields (conditional: shown when entry_type = 'symptom')
        jsonb_build_object(
          'id', 'symptom_name',
          'label', 'Symptom Name',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 200),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'symptom'),
          'description', 'Name or type of symptom'
        ),
        jsonb_build_object(
          'id', 'severity',
          'label', 'Severity',
          'type', 'rating',
          'validation', jsonb_build_object('min', 1, 'max', 5),
          'default', 3,
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'symptom'),
          'description', 'Severity level (1 = mild, 5 = severe)'
        ),
        jsonb_build_object(
          'id', 'duration',
          'label', 'Duration',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 100),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'symptom'),
          'description', 'How long the symptom lasted (e.g., "2 hours", "all day")'
        ),
        jsonb_build_object(
          'id', 'symptom_notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'symptom'),
          'description', 'Additional notes about the symptom'
        ),
        -- General health fields (conditional: shown when entry_type = 'general_health')
        jsonb_build_object(
          'id', 'health_notes',
          'label', 'Health Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'general_health'),
          'description', 'General health observations or notes'
        )
      ),
      'daily', -- Daily entries
      true, -- System template
      'global', -- Global scope
      true, -- Locked (admin-only edits)
      NOW(), -- Published now
      1, -- Version 1
      jsonb_build_array('health', 'medication', 'symptoms', 'wellness', 'self-care', 'tracking'),
      jsonb_build_object(
        'enabled', true,
        'charts', jsonb_build_array(
          jsonb_build_object(
            'type', 'bar',
            'field_id', 'entry_type',
            'title', 'Health Events by Type',
            'config', jsonb_build_object()
          ),
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'severity',
            'title', 'Symptom Severity Over Time',
            'config', jsonb_build_object(
              'yAxisMin', 1,
              'yAxisMax', 5,
              'yAxisLabel', 'Severity'
            )
          )
        )
      ),
      'Heart', -- Icon: Heart symbol for health and wellness
      'red' -- Color: Red theme for health (warm, caring, health-related)
    );

    RAISE NOTICE 'Successfully created Health Tracker template';
  ELSE
    -- Template already exists, update icon and color
    UPDATE tracker_templates
    SET 
      icon = 'Heart',
      color = 'red',
      updated_at = NOW()
    WHERE scope = 'global'
      AND name = 'Health Tracker'
      AND archived_at IS NULL;
    
    RAISE NOTICE 'Health Tracker template already exists, updated icon and color';
  END IF;
END $$;

-- Step 3: Mark deprecated templates
-- These templates are hidden from new template selection but remain accessible for existing trackers
-- - Medication Tracker & Symptom Tracker: Merged into Health Tracker
-- - Exercise Tracker: Replaced by Fitness Tracker (which provides personalized movement tracking)
UPDATE tracker_templates
SET deprecated_at = NOW(),
    updated_at = NOW()
WHERE scope = 'global'
  AND name IN ('Medication Tracker', 'Symptom Tracker', 'Exercise Tracker')
  AND deprecated_at IS NULL;

-- Add comments explaining the deprecation
COMMENT ON COLUMN tracker_templates.deprecated_at IS 
  'Timestamp when template was deprecated. Deprecated templates are hidden from new template selection but remain accessible for existing trackers. Use Health Tracker instead of Medication/Symptom Trackers. Use Fitness Tracker instead of Exercise Tracker.';

-- Comments
COMMENT ON TABLE tracker_templates IS 
  'Templates now include Health Tracker (unified medication + symptom tracking) and Fitness Tracker (personalized movement tracking). Medication Tracker, Symptom Tracker, and Exercise Tracker are deprecated but preserved for backward compatibility.';
