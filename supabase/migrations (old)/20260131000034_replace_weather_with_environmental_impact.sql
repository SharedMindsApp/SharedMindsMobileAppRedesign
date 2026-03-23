/*
  # Replace Weather & Environment Tracker with Environmental Impact Tracker
  
  This migration replaces the Weather & Environment Tracker with a behavior-focused
  Environmental Impact Tracker that tracks user-controlled environmental actions.
  
  Context:
  - Weather tracking provides low user value (data is externally available)
  - Weather does not reflect user behavior or support intentional change
  - Environmental Impact Tracker focuses on user actions, not external conditions
  - This aligns with values-based planning and behavioral feedback
  
  Architecture:
  - Environmental Impact Tracker uses conditional fields based on entry_type
  - The form dynamically shows only relevant fields based on entry_type selection
  - This pattern follows the same structure as Health Tracker and Nutrition & Hydration Tracker
  
  Design Principles:
  - Observational, not prescriptive
  - No carbon scoring, moral language, or guilt-based framing
  - Focuses on awareness and intention, not optimization
  - Tracks what actions were taken, not environmental outcomes
*/

-- Step 1: Ensure deprecated_at, icon, and color columns exist (defensive check)
ALTER TABLE tracker_templates
  ADD COLUMN IF NOT EXISTS deprecated_at timestamptz,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text;

-- Step 2: Create Environmental Impact Tracker template
-- This template supports multiple environmental action types within a single tracker
DO $$
DECLARE
  template_exists boolean;
BEGIN
  -- Check if Environmental Impact Tracker template already exists
  SELECT EXISTS(
    SELECT 1 FROM tracker_templates
    WHERE scope = 'global'
      AND name = 'Environmental Impact Tracker'
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
      'Environmental Impact Tracker',
      'Track environmentally conscious actions you take. Notice patterns, reflect on choices, and build awareness—no scoring, no judgment.',
      jsonb_build_array(
        -- Core fields (always shown)
        -- entry_type comes first so users can select it and see relevant fields
        jsonb_build_object(
          'id', 'entry_type',
          'label', 'Entry Type',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 50),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'waste', 'label', 'Waste Management'),
            jsonb_build_object('value', 'transport', 'label', 'Transport'),
            jsonb_build_object('value', 'energy', 'label', 'Energy Use'),
            jsonb_build_object('value', 'consumption', 'label', 'Consumption Choices'),
            jsonb_build_object('value', 'general_environment', 'label', 'General Environmental Reflection')
          ),
          'description', 'Select the type of environmental action you want to track'
        ),
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        -- Waste Management fields (conditional: shown when entry_type = 'waste')
        jsonb_build_object(
          'id', 'waste_action',
          'label', 'Waste Action',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 100),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'Recycled', 'label', 'Recycled'),
            jsonb_build_object('value', 'Composted', 'label', 'Composted'),
            jsonb_build_object('value', 'Reduced Waste', 'label', 'Reduced Waste'),
            jsonb_build_object('value', 'Reused Item', 'label', 'Reused Item'),
            jsonb_build_object('value', 'Avoided Single-Use Plastic', 'label', 'Avoided Single-Use Plastic'),
            jsonb_build_object('value', 'Other', 'label', 'Other')
          ),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'waste'),
          'description', 'What waste management action did you take?'
        ),
        jsonb_build_object(
          'id', 'waste_notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'waste'),
          'description', 'Additional notes about your waste action'
        ),
        -- Transport fields (conditional: shown when entry_type = 'transport')
        jsonb_build_object(
          'id', 'transport_mode',
          'label', 'Transport Mode',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 100),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'Walking', 'label', 'Walking'),
            jsonb_build_object('value', 'Cycling', 'label', 'Cycling'),
            jsonb_build_object('value', 'Public Transport', 'label', 'Public Transport'),
            jsonb_build_object('value', 'Car', 'label', 'Car'),
            jsonb_build_object('value', 'Car Share', 'label', 'Car Share'),
            jsonb_build_object('value', 'Remote / No Travel', 'label', 'Remote / No Travel')
          ),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'transport'),
          'description', 'How did you travel?'
        ),
        jsonb_build_object(
          'id', 'distance_estimate',
          'label', 'Distance Estimate',
          'type', 'number',
          'validation', jsonb_build_object('min', 0),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'transport'),
          'description', 'Approximate distance (optional)'
        ),
        jsonb_build_object(
          'id', 'transport_notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'transport'),
          'description', 'Additional notes about your transport choice'
        ),
        -- Energy Use fields (conditional: shown when entry_type = 'energy')
        jsonb_build_object(
          'id', 'energy_action',
          'label', 'Energy Action',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 100),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'Reduced Usage', 'label', 'Reduced Usage'),
            jsonb_build_object('value', 'Used Renewable Source', 'label', 'Used Renewable Source'),
            jsonb_build_object('value', 'Energy-Efficient Choice', 'label', 'Energy-Efficient Choice'),
            jsonb_build_object('value', 'Monitored Consumption', 'label', 'Monitored Consumption')
          ),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'energy'),
          'description', 'What energy-related action did you take?'
        ),
        jsonb_build_object(
          'id', 'energy_notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'energy'),
          'description', 'Additional notes about your energy action'
        ),
        -- Consumption Choices fields (conditional: shown when entry_type = 'consumption')
        jsonb_build_object(
          'id', 'consumption_action',
          'label', 'Consumption Action',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 100),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'Bought Second-Hand', 'label', 'Bought Second-Hand'),
            jsonb_build_object('value', 'Avoided Purchase', 'label', 'Avoided Purchase'),
            jsonb_build_object('value', 'Chose Sustainable Product', 'label', 'Chose Sustainable Product'),
            jsonb_build_object('value', 'Repaired Item', 'label', 'Repaired Item')
          ),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'consumption'),
          'description', 'What consumption choice did you make?'
        ),
        jsonb_build_object(
          'id', 'consumption_notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'consumption'),
          'description', 'Additional notes about your consumption choice'
        ),
        -- General Environmental Reflection fields (conditional: shown when entry_type = 'general_environment')
        jsonb_build_object(
          'id', 'environment_notes',
          'label', 'Environmental Reflection',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1500),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'general_environment'),
          'description', 'Reflect on your environmental awareness, values, or observations'
        )
      ),
      'daily', -- Daily entries
      true, -- System template
      'global', -- Global scope
      true, -- Locked (admin-only edits)
      NOW(), -- Published now
      1, -- Version 1
      jsonb_build_array('environment', 'sustainability', 'values', 'behavior', 'tracking', 'awareness', 'impact'),
      jsonb_build_object(
        'enabled', true,
        'charts', jsonb_build_array(
          jsonb_build_object(
            'type', 'bar',
            'field_id', 'entry_type',
            'title', 'Environmental Actions by Type',
            'config', jsonb_build_object()
          ),
          jsonb_build_object(
            'type', 'bar',
            'field_id', 'waste_action',
            'title', 'Waste Management Actions',
            'config', jsonb_build_object()
          ),
          jsonb_build_object(
            'type', 'bar',
            'field_id', 'transport_mode',
            'title', 'Transport Mode Distribution',
            'config', jsonb_build_object()
          )
        )
      ),
      'Trees', -- Icon: Trees symbol for environmental impact
      'green' -- Color: Green theme for environmental/sustainability
    );

    RAISE NOTICE 'Successfully created Environmental Impact Tracker template';
  ELSE
    -- Template already exists, update icon and color
    UPDATE tracker_templates
    SET 
      icon = 'Trees',
      color = 'green',
      updated_at = NOW()
    WHERE scope = 'global'
      AND name = 'Environmental Impact Tracker'
      AND archived_at IS NULL;
    
    RAISE NOTICE 'Environmental Impact Tracker template already exists, updated icon and color';
  END IF;
END $$;

-- Step 3: Mark Weather & Environment Tracker as deprecated
-- This template is intentionally deprecated - weather data is not migrated
-- Existing trackers remain accessible for historical reference
UPDATE tracker_templates
SET deprecated_at = NOW(),
    updated_at = NOW()
WHERE scope = 'global'
  AND name = 'Weather & Environment Tracker'
  AND deprecated_at IS NULL;

-- Add comments explaining the deprecation
COMMENT ON COLUMN tracker_templates.deprecated_at IS 
  'Timestamp when template was deprecated. Deprecated templates are hidden from new template selection but remain accessible for existing trackers. Use Environmental Impact Tracker instead of Weather & Environment Tracker. Use Nutrition & Hydration Tracker instead of Nutrition Log and Water Intake Tracker. Use Health Tracker instead of Medication/Symptom Trackers. Use Fitness Tracker instead of Exercise Tracker.';

-- Comments
COMMENT ON TABLE tracker_templates IS 
  'Templates now include Environmental Impact Tracker (behavior-focused environmental actions), Nutrition & Hydration Tracker (unified food + hydration tracking), Health Tracker (unified medication + symptom tracking), and Fitness Tracker (personalized movement tracking). Weather & Environment Tracker, Nutrition Log, Water Intake Tracker, Medication Tracker, Symptom Tracker, and Exercise Tracker are deprecated but preserved for backward compatibility.';
