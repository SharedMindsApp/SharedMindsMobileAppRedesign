/*
  # Add Tags to Tracker Templates
  
  This migration adds a tags field to tracker_templates to support
  app-store style categorization and filtering.
*/

-- Add tags column (JSONB array of strings)
ALTER TABLE tracker_templates
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- Add index for tag searches
CREATE INDEX IF NOT EXISTS idx_tracker_templates_tags ON tracker_templates USING GIN (tags);

-- Populate tags for existing templates based on their names
UPDATE tracker_templates
SET tags = CASE
  -- Sleep & Rest
  WHEN LOWER(name) LIKE '%sleep%' THEN '["Health", "Wellness", "Rest"]'::jsonb
  WHEN LOWER(name) LIKE '%rest%' OR LOWER(name) LIKE '%recovery%' THEN '["Health", "Wellness", "Recovery"]'::jsonb
  
  -- Physical Activity
  WHEN LOWER(name) LIKE '%exercise%' OR LOWER(name) LIKE '%activity%' OR LOWER(name) LIKE '%workout%' THEN '["Health", "Fitness", "Activity"]'::jsonb
  
  -- Nutrition
  WHEN LOWER(name) LIKE '%nutrition%' OR LOWER(name) LIKE '%food%' OR LOWER(name) LIKE '%meal%' OR LOWER(name) LIKE '%diet%' THEN '["Health", "Nutrition", "Food"]'::jsonb
  
  -- Mental Health & Mindfulness
  WHEN LOWER(name) LIKE '%mindfulness%' OR LOWER(name) LIKE '%meditation%' THEN '["Mental Health", "Wellness", "Mindfulness"]'::jsonb
  WHEN LOWER(name) LIKE '%mood%' THEN '["Mental Health", "Wellness", "Mood"]'::jsonb
  WHEN LOWER(name) LIKE '%stress%' THEN '["Mental Health", "Wellness", "Stress"]'::jsonb
  
  -- Growth & Development
  WHEN LOWER(name) LIKE '%growth%' OR LOWER(name) LIKE '%development%' THEN '["Personal Growth", "Development"]'::jsonb
  WHEN LOWER(name) LIKE '%gratitude%' THEN '["Personal Growth", "Wellness", "Gratitude"]'::jsonb
  WHEN LOWER(name) LIKE '%journal%' OR LOWER(name) LIKE '%personal%' THEN '["Personal Growth", "Journaling", "Reflection"]'::jsonb
  
  -- Finance
  WHEN LOWER(name) LIKE '%income%' OR LOWER(name) LIKE '%cash%' OR LOWER(name) LIKE '%finance%' OR LOWER(name) LIKE '%money%' THEN '["Finance", "Money"]'::jsonb
  
  -- Health & Wellness
  WHEN LOWER(name) LIKE '%energy%' THEN '["Health", "Wellness", "Energy"]'::jsonb
  WHEN LOWER(name) LIKE '%water%' OR LOWER(name) LIKE '%hydration%' THEN '["Health", "Wellness", "Hydration"]'::jsonb
  WHEN LOWER(name) LIKE '%medication%' THEN '["Health", "Medical", "Medication"]'::jsonb
  WHEN LOWER(name) LIKE '%symptom%' THEN '["Health", "Medical", "Symptoms"]'::jsonb
  
  -- Social & Environment
  WHEN LOWER(name) LIKE '%social%' OR LOWER(name) LIKE '%connection%' THEN '["Social", "Relationships"]'::jsonb
  WHEN LOWER(name) LIKE '%weather%' OR LOWER(name) LIKE '%environment%' THEN '["Environment", "Weather"]'::jsonb
  
  -- Productivity & Habits
  WHEN LOWER(name) LIKE '%productivity%' OR LOWER(name) LIKE '%focus%' THEN '["Productivity", "Focus"]'::jsonb
  WHEN LOWER(name) LIKE '%habit%' THEN '["Habits", "Productivity"]'::jsonb
  
  -- Default
  ELSE '["General"]'::jsonb
END
WHERE tags = '[]'::jsonb OR tags IS NULL;
