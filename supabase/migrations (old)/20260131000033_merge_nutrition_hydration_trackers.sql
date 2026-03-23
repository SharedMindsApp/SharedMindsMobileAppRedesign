/*
  # Merge Nutrition Log + Water Intake Tracker into Nutrition & Hydration Tracker
  
  This migration consolidates overlapping nutrition tracking templates by:
  1. Creating a new unified Nutrition & Hydration Tracker template
  2. Marking Nutrition Log and Water Intake Tracker as deprecated
  
  Context:
  - Nutrition tracking and hydration tracking are conceptually part of the same domain: Nutritional input
  - This consolidation simplifies Tracker Studio by reducing overlapping templates
  - Existing user data is preserved (trackers created from old templates continue to work)
  - Deprecated templates are hidden from new template selection but remain accessible for existing trackers
  
  Architecture:
  - Nutrition & Hydration Tracker uses conditional fields based on entry_type (meal, hydration, general_nutrition)
  - The form dynamically shows only relevant fields based on entry_type selection
  - This pattern follows the same structure as Health Tracker (medication + symptom merge)
  
  Design Principles:
  - Observational, not prescriptive
  - No calorie counting, macro tracking, or nutrition scoring
  - No daily goals, targets, or streaks
  - Body-respecting and neutral tone
*/

-- Step 1: Ensure deprecated_at, icon, and color columns exist (defensive check)
ALTER TABLE tracker_templates
  ADD COLUMN IF NOT EXISTS deprecated_at timestamptz,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text;

-- Step 2: Create Nutrition & Hydration Tracker template
-- This template supports multiple nutrition input types within a single tracker
DO $$
DECLARE
  template_exists boolean;
BEGIN
  -- Check if Nutrition & Hydration Tracker template already exists
  SELECT EXISTS(
    SELECT 1 FROM tracker_templates
    WHERE scope = 'global'
      AND name = 'Nutrition & Hydration Tracker'
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
      'Nutrition & Hydration Tracker',
      'Track what you eat and drink with awareness — no macro counting, no targets, no pressure. This tracker records inputs, not outcomes.',
      jsonb_build_array(
        -- Core fields (always shown)
        -- entry_type comes first so users can select it and see relevant fields
        jsonb_build_object(
          'id', 'entry_type',
          'label', 'Entry Type',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 50),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'meal', 'label', 'Meal'),
            jsonb_build_object('value', 'hydration', 'label', 'Hydration'),
            jsonb_build_object('value', 'general_nutrition', 'label', 'General Nutrition')
          ),
          'description', 'Select the type of nutrition entry you want to track'
        ),
        jsonb_build_object(
          'id', 'entry_date',
          'label', 'Date',
          'type', 'date',
          'validation', jsonb_build_object('required', true)
        ),
        -- Meal fields (conditional: shown when entry_type = 'meal')
        jsonb_build_object(
          'id', 'meal_type',
          'label', 'Meal Type',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 50),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'meal'),
          'description', 'e.g., Breakfast, Lunch, Dinner, Snack'
        ),
        jsonb_build_object(
          'id', 'food_description',
          'label', 'What did you eat?',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 1000),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'meal'),
          'description', 'Describe what you ate'
        ),
        jsonb_build_object(
          'id', 'tags',
          'label', 'Tags',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 200),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'meal'),
          'description', 'Optional tags for categorization'
        ),
        jsonb_build_object(
          'id', 'mood_or_feelings',
          'label', 'Mood/Feelings',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 500),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'meal'),
          'description', 'How did eating feel?'
        ),
        jsonb_build_object(
          'id', 'meal_notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'meal'),
          'description', 'Additional notes about the meal'
        ),
        -- Hydration fields (conditional: shown when entry_type = 'hydration')
        jsonb_build_object(
          'id', 'hydration_amount',
          'label', 'Amount',
          'type', 'number',
          'validation', jsonb_build_object('min', 0),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'hydration'),
          'description', 'Amount of hydration consumed'
        ),
        jsonb_build_object(
          'id', 'hydration_unit',
          'label', 'Unit',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 50),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'Cups', 'label', 'Cups'),
            jsonb_build_object('value', 'Glasses', 'label', 'Glasses'),
            jsonb_build_object('value', 'ml', 'label', 'ml')
          ),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'hydration'),
          'description', 'Unit of measurement'
        ),
        jsonb_build_object(
          'id', 'hydration_notes',
          'label', 'Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 200),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'hydration'),
          'description', 'Additional notes about hydration'
        ),
        -- General nutrition fields (conditional: shown when entry_type = 'general_nutrition')
        jsonb_build_object(
          'id', 'nutrition_notes',
          'label', 'Nutrition Notes',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 1000),
          'conditional', jsonb_build_object('field', 'entry_type', 'value', 'general_nutrition'),
          'description', 'For things like appetite, cravings, digestion, or general observations'
        )
      ),
      'daily', -- Daily entries
      true, -- System template
      'global', -- Global scope
      true, -- Locked (admin-only edits)
      NOW(), -- Published now
      1, -- Version 1
      jsonb_build_array('nutrition', 'hydration', 'food', 'wellness', 'self-care', 'tracking', 'health'),
      jsonb_build_object(
        'enabled', true,
        'charts', jsonb_build_array(
          jsonb_build_object(
            'type', 'bar',
            'field_id', 'entry_type',
            'title', 'Nutrition Entries by Type',
            'config', jsonb_build_object()
          ),
          jsonb_build_object(
            'type', 'time_series',
            'field_id', 'hydration_amount',
            'title', 'Hydration Over Time',
            'config', jsonb_build_object(
              'yAxisLabel', 'Amount',
              'groupBy', 'hydration_unit'
            )
          )
        )
      ),
      'UtensilsCrossed', -- Icon: UtensilsCrossed for nutrition (food + hydration)
      'green' -- Color: Green theme for nutrition (fresh, natural, health-related)
    );

    RAISE NOTICE 'Successfully created Nutrition & Hydration Tracker template';
  ELSE
    -- Template already exists, update icon and color
    UPDATE tracker_templates
    SET 
      icon = 'UtensilsCrossed',
      color = 'green',
      updated_at = NOW()
    WHERE scope = 'global'
      AND name = 'Nutrition & Hydration Tracker'
      AND archived_at IS NULL;
    
    RAISE NOTICE 'Nutrition & Hydration Tracker template already exists, updated icon and color';
  END IF;
END $$;

-- Step 3: Mark deprecated templates
-- These templates are hidden from new template selection but remain accessible for existing trackers
-- - Nutrition Log & Water Intake Tracker: Merged into Nutrition & Hydration Tracker
UPDATE tracker_templates
SET deprecated_at = NOW(),
    updated_at = NOW()
WHERE scope = 'global'
  AND name IN ('Nutrition Log', 'Water Intake Tracker')
  AND deprecated_at IS NULL;

-- Add comments explaining the deprecation
COMMENT ON COLUMN tracker_templates.deprecated_at IS 
  'Timestamp when template was deprecated. Deprecated templates are hidden from new template selection but remain accessible for existing trackers. Use Nutrition & Hydration Tracker instead of Nutrition Log and Water Intake Tracker. Use Health Tracker instead of Medication/Symptom Trackers. Use Fitness Tracker instead of Exercise Tracker.';

-- Comments
COMMENT ON TABLE tracker_templates IS 
  'Templates now include Nutrition & Hydration Tracker (unified food + hydration tracking), Health Tracker (unified medication + symptom tracking), and Fitness Tracker (personalized movement tracking). Nutrition Log, Water Intake Tracker, Medication Tracker, Symptom Tracker, and Exercise Tracker are deprecated but preserved for backward compatibility.';
