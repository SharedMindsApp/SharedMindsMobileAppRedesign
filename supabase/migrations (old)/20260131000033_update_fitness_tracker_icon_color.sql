-- Update Fitness Tracker template icon and color
-- Migration: 20260131000033_update_fitness_tracker_icon_color.sql

-- Ensure icon and color columns exist first (defensive check)
ALTER TABLE tracker_templates
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text;

-- Update icon and color for Fitness Tracker template to match UI theme
DO $$
DECLARE
  template_id_val UUID;
  columns_exist boolean;
BEGIN
  -- Check if icon and color columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tracker_templates'
      AND column_name IN ('icon', 'color')
  ) INTO columns_exist;

  IF columns_exist THEN
    -- Find Fitness Tracker template
    SELECT id INTO template_id_val
    FROM tracker_templates
    WHERE scope = 'global'
      AND name = 'Fitness Tracker'
      AND archived_at IS NULL;

    IF template_id_val IS NOT NULL THEN
      -- Update icon to 'Activity' and color to 'blue' to match UI theme
      UPDATE tracker_templates
      SET 
        icon = 'Activity',
        color = 'blue',
        updated_at = NOW()
      WHERE id = template_id_val;

      RAISE NOTICE 'Successfully updated Fitness Tracker template icon and color';
    ELSE
      RAISE NOTICE 'Fitness Tracker template not found, skipping update';
    END IF;
  ELSE
    RAISE NOTICE 'Icon and color columns do not exist on tracker_templates, skipping update';
  END IF;
END $$;

COMMENT ON TABLE tracker_templates IS 'Fitness Tracker uses Activity icon and blue color theme';
