/*
  # Add Social and Journal to Life Area Types

  1. Changes
    - Update CHECK constraint on life_area_overviews.area_type to include:
      - 'social' (for Social & Relationships planner section)
      - 'journal' (for Journal & Reflection planner section)
      - 'gratitude' (used by Journal section)
      - 'freewriting' (used by Journal section)

  2. Security
    - No RLS changes needed
*/

-- Drop the old constraint
ALTER TABLE life_area_overviews 
  DROP CONSTRAINT IF EXISTS life_area_overviews_area_type_check;

-- Add the new constraint with all planner sections
ALTER TABLE life_area_overviews 
  ADD CONSTRAINT life_area_overviews_area_type_check 
  CHECK (
    area_type IN (
      'personal', 'work', 'education', 'finance', 'budget', 
      'vision', 'planning', 'household', 'self-care', 'travel',
      'social', 'journal', 'gratitude', 'freewriting'
    )
  );
