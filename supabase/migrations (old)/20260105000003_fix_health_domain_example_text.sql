/*
  # Fix Health Domain Project Type Example Text

  Updates example_text for all Health domain project types.
  This migration fixes any corrupted or missing example_text data.

  This migration will overwrite existing example_text for Health domain project types,
  ensuring they all have correct, valid JSON data.

  Safety:
  - Only updates Health domain project types (by name)
  - Only runs if example_text column exists
  - Can be run multiple times safely
*/

-- Update example_text for all Health domain project types
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
      ELSE NULL
    END
    WHERE name IN (
      'Fitness Goal',
      'Weight Loss',
      'Nutrition & Diet Improvement',
      'Mental Wellbeing',
      'Sleep Improvement',
      'Health Condition Management',
      'Lifestyle Change'
    );
  END IF;
END $$;





