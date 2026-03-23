/*
  # Seed Health Domain Project Types

  Adds Project Types for the Health domain with wizard example text for the Idea step.
  
  Each Project Type:
  - Is linked to the Health domain
  - Includes example_text for wizard guidance (idea, startingPoint, expectations)
  - Can be edited later via the Admin UI
  
  Safety:
  - Uses ON CONFLICT DO NOTHING to avoid overwriting existing project types
  - Only inserts if project type doesn't already exist (by name)
  - Example text is set only if the project type is newly created
  - Handles case where example_text column may not exist yet
*/

-- Insert Health domain Project Types (without example_text to handle column existence)
-- Note: We use ON CONFLICT DO NOTHING to avoid overwriting existing project types
-- This ensures the migration is idempotent and safe to run multiple times

INSERT INTO guardrails_project_types (name, description, is_system)
VALUES
  ('Fitness Goal', 'Improving physical fitness through regular exercise and activity', true),
  ('Weight Loss', 'Losing weight in a healthy and sustainable way', true),
  ('Nutrition & Diet Improvement', 'Improving diet and developing healthier eating habits', true),
  ('Mental Wellbeing', 'Improving mental wellbeing and emotional health', true),
  ('Sleep Improvement', 'Improving the quality and consistency of sleep', true),
  ('Health Condition Management', 'Managing an ongoing health condition more effectively', true),
  ('Lifestyle Change', 'Making broader lifestyle changes to improve overall health', true)
ON CONFLICT (name) DO NOTHING;

-- Update example_text for all project types (only if column exists and example_text is NULL)
-- This ensures project types that already exist (like "Fitness Goal") get example_text
-- but we don't overwrite existing example_text data
DO $$
BEGIN
  -- Check if example_text column exists before trying to update it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_project_types' AND column_name = 'example_text'
  ) THEN
    UPDATE guardrails_project_types
    SET example_text = CASE name
      WHEN 'Fitness Goal' THEN '{"idea": "This project is about improving my physical fitness by becoming more active and consistent with exercise.", "startingPoint": "I don''t exercise regularly at the moment and haven''t had a consistent routine for a while.", "expectations": "I expect this will involve regular workouts and changes to my routine over time."}'::jsonb
      WHEN 'Weight Loss' THEN '{"idea": "This project focuses on losing weight in a healthy and sustainable way.", "startingPoint": "I''m currently unhappy with my weight and haven''t been able to maintain long-term changes.", "expectations": "I expect this will involve changes to my diet, activity levels, and habits."}'::jsonb
      WHEN 'Nutrition & Diet Improvement' THEN '{"idea": "This project is about improving my diet and developing healthier eating habits.", "startingPoint": "At the moment, my eating habits are inconsistent or not aligned with my health goals.", "expectations": "I expect this will involve learning about nutrition and making gradual dietary changes."}'::jsonb
      WHEN 'Mental Wellbeing' THEN '{"idea": "This project focuses on improving my mental wellbeing and emotional health.", "startingPoint": "I currently feel stressed, overwhelmed, or not as balanced as I''d like to be.", "expectations": "I expect this will involve reflection, new coping strategies, and regular self-check-ins."}'::jsonb
      WHEN 'Sleep Improvement' THEN '{"idea": "This project is about improving the quality and consistency of my sleep.", "startingPoint": "My sleep routine is currently inconsistent or not very restful.", "expectations": "I expect this will involve adjusting routines and experimenting with better sleep habits."}'::jsonb
      WHEN 'Health Condition Management' THEN '{"idea": "This project focuses on managing an ongoing health condition more effectively.", "startingPoint": "I''m currently managing this condition but feel there''s room for better structure or support.", "expectations": "I expect this will involve tracking symptoms, routines, and working within my limitations."}'::jsonb
      WHEN 'Lifestyle Change' THEN '{"idea": "This project is about making broader lifestyle changes to improve my overall health.", "startingPoint": "Right now, my daily habits don''t fully support the kind of life I want to live.", "expectations": "I expect this will involve gradual changes across multiple areas of my life."}'::jsonb
    END
    WHERE name IN (
      'Fitness Goal',
      'Weight Loss',
      'Nutrition & Diet Improvement',
      'Mental Wellbeing',
      'Sleep Improvement',
      'Health Condition Management',
      'Lifestyle Change'
    )
    AND example_text IS NULL;
  END IF;
END $$;

-- Link all Health project types to the Health domain
-- First, get the project type IDs we just inserted (or that already exist)
-- Then link them to the 'health' domain via guardrails_project_type_domains

INSERT INTO guardrails_project_type_domains (project_type_id, domain_type)
SELECT pt.id, 'health'::text
FROM guardrails_project_types pt
WHERE pt.name IN (
  'Fitness Goal',
  'Weight Loss',
  'Nutrition & Diet Improvement',
  'Mental Wellbeing',
  'Sleep Improvement',
  'Health Condition Management',
  'Lifestyle Change'
)
AND NOT EXISTS (
  SELECT 1
  FROM guardrails_project_type_domains ptd
  WHERE ptd.project_type_id = pt.id
  AND ptd.domain_type = 'health'
)
ON CONFLICT (project_type_id, domain_type) DO NOTHING;
