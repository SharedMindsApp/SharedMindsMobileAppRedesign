/*
  # Add Journey Stages and Module Insights

  1. Changes to Sections Table
    - Add `stage` column to group sections into journey stages
    - Add `stage_order` to control order within stages
    - Add `icon` column for visual representation
    - Add `emotional_copy` for softer narrative language
    - Add `completion_insight` for micro-dopamine hit after completion

  2. Journey Stages
    - Stage 1: "You, as an Individual"
    - Stage 2: "You in Daily Life"
    - Stage 3: "You in Relationships"
    - Stage 4: "You in Your Home"

  3. Security
    - Maintain existing RLS policies
*/

-- Add new columns to sections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sections' AND column_name = 'stage'
  ) THEN
    ALTER TABLE sections ADD COLUMN stage text DEFAULT 'individual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sections' AND column_name = 'stage_order'
  ) THEN
    ALTER TABLE sections ADD COLUMN stage_order integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sections' AND column_name = 'icon'
  ) THEN
    ALTER TABLE sections ADD COLUMN icon text DEFAULT 'brain';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sections' AND column_name = 'emotional_copy'
  ) THEN
    ALTER TABLE sections ADD COLUMN emotional_copy text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sections' AND column_name = 'completion_insight'
  ) THEN
    ALTER TABLE sections ADD COLUMN completion_insight text;
  END IF;
END $$;

-- Update existing sections with stage information
UPDATE sections SET 
  stage = 'individual',
  stage_order = 1,
  icon = 'user',
  emotional_copy = 'Let''s understand who you are at your core',
  completion_insight = 'You''re building a clear picture of yourself'
WHERE title ILIKE '%personal%profile%' OR title ILIKE '%about%you%';

UPDATE sections SET 
  stage = 'daily_life',
  stage_order = 1,
  icon = 'home',
  emotional_copy = 'How does your home function day-to-day?',
  completion_insight = 'Your household rhythm is becoming clearer'
WHERE title ILIKE '%household%responsibilities%' OR title ILIKE '%responsibilities%';

UPDATE sections SET 
  stage = 'daily_life',
  stage_order = 2,
  icon = 'alert-circle',
  emotional_copy = 'What overwhelms you, and what helps you feel calm?',
  completion_insight = 'You''ve identified your stress patterns'
WHERE title ILIKE '%emotional%trigger%' OR title ILIKE '%stress%';

UPDATE sections SET 
  stage = 'relationships',
  stage_order = 1,
  icon = 'heart',
  emotional_copy = 'How do you prefer to be supported when things are hard?',
  completion_insight = 'You know what support looks like for you'
WHERE title ILIKE '%support%preference%' OR title ILIKE '%support%';

UPDATE sections SET 
  stage = 'relationships',
  stage_order = 2,
  icon = 'eye',
  emotional_copy = 'Understanding how you see things differently',
  completion_insight = 'You''ve uncovered important perspective differences'
WHERE title ILIKE '%perception%gap%' OR title ILIKE '%perception%';

UPDATE sections SET 
  stage = 'home',
  stage_order = 1,
  icon = 'flag',
  emotional_copy = 'What matters most in your shared space?',
  completion_insight = 'Your household values are now clear'
WHERE title ILIKE '%household%expectation%' OR title ILIKE '%values%' OR title ILIKE '%expectation%';
