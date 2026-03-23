/*
  # Enhance Goal Tracker Template - Intelligent & Comprehensive
  
  This migration enhances the Goal Tracker template with intelligent features:
  - Link to Goals Activity system (optional sync)
  - Progress momentum tracking
  - Milestone recognition
  - Goal category and priority
  - Confidence level tracking
  - Obstacle/challenge tracking
  - Next steps suggestions
  - Celebration moments
  - All existing fields preserved (backward compatible)
*/

-- Update Goal Tracker template
DO $$
DECLARE
  template_id_val UUID;
  existing_schema jsonb;
  new_fields jsonb;
BEGIN
  -- Find the Goal Tracker template
  SELECT id, field_schema INTO template_id_val, existing_schema
  FROM tracker_templates
  WHERE scope = 'global'
    AND name = 'Goal Tracker'
    AND archived_at IS NULL
  LIMIT 1;

  IF template_id_val IS NOT NULL THEN
    -- Build new fields array: keep all existing fields, add intelligent ones
    new_fields := existing_schema || jsonb_build_array(
      -- Goal Intelligence & Context
      jsonb_build_object(
        'id', 'goal_category',
        'label', 'Goal Category',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 100),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'personal_growth', 'label', 'Personal Growth'),
          jsonb_build_object('value', 'career', 'label', 'Career'),
          jsonb_build_object('value', 'health', 'label', 'Health'),
          jsonb_build_object('value', 'fitness', 'label', 'Fitness'),
          jsonb_build_object('value', 'relationships', 'label', 'Relationships'),
          jsonb_build_object('value', 'financial', 'label', 'Financial'),
          jsonb_build_object('value', 'learning', 'label', 'Learning/Education'),
          jsonb_build_object('value', 'creative', 'label', 'Creative'),
          jsonb_build_object('value', 'spiritual', 'label', 'Spiritual'),
          jsonb_build_object('value', 'other', 'label', 'Other')
        ),
        'description', 'What area of life does this goal belong to?'
      ),
      jsonb_build_object(
        'id', 'goal_priority',
        'label', 'Priority Level',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 50),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'critical', 'label', 'Critical'),
          jsonb_build_object('value', 'high', 'label', 'High'),
          jsonb_build_object('value', 'medium', 'label', 'Medium'),
          jsonb_build_object('value', 'low', 'label', 'Low')
        ),
        'description', 'How important is this goal right now?'
      ),
      jsonb_build_object(
        'id', 'confidence_level',
        'label', 'Confidence Level',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'default', 3,
        'description', 'How confident do you feel about achieving this goal? (1 = very uncertain, 5 = very confident)'
      ),
      jsonb_build_object(
        'id', 'momentum',
        'label', 'Momentum',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 50),
        'options', jsonb_build_array(
          jsonb_build_object('value', 'accelerating', 'label', 'Accelerating'),
          jsonb_build_object('value', 'steady', 'label', 'Steady Progress'),
          jsonb_build_object('value', 'slowing', 'label', 'Slowing Down'),
          jsonb_build_object('value', 'stalled', 'label', 'Stalled'),
          jsonb_build_object('value', 'regressing', 'label', 'Regressing')
        ),
        'description', 'How is your progress feeling right now?'
      ),
      
      -- Obstacles & Support
      jsonb_build_object(
        'id', 'obstacle_challenge',
        'label', 'Obstacle / Challenge',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 500),
        'description', 'What obstacles or challenges are you facing with this goal?'
      ),
      jsonb_build_object(
        'id', 'support_needed',
        'label', 'Support Needed',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 500),
        'description', 'What support, resources, or help would help you move forward?'
      ),
      
      -- Action & Next Steps
      jsonb_build_object(
        'id', 'action_taken',
        'label', 'Action Taken',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 500),
        'description', 'What action did you take toward this goal today?'
      ),
      jsonb_build_object(
        'id', 'next_step',
        'label', 'Next Step',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 500),
        'description', 'What is the next step you plan to take?'
      ),
      jsonb_build_object(
        'id', 'next_step_date',
        'label', 'Next Step Date',
        'type', 'date',
        'validation', jsonb_build_object(),
        'description', 'When do you plan to take the next step?'
      ),
      
      -- Celebration & Motivation
      jsonb_build_object(
        'id', 'celebration',
        'label', 'Celebration / Win',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 500),
        'description', 'What did you celebrate or achieve? Even small wins count!'
      ),
      jsonb_build_object(
        'id', 'motivation_level',
        'label', 'Motivation Level',
        'type', 'rating',
        'validation', jsonb_build_object('min', 1, 'max', 5),
        'default', 3,
        'description', 'How motivated do you feel about this goal? (1 = very low, 5 = very high)'
      ),
      jsonb_build_object(
        'id', 'why_this_matters',
        'label', 'Why This Matters',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 1000),
        'description', 'Why is achieving this goal important to you? (Reminder of your "why")'
      ),
      
      -- Integration & Linking
      jsonb_build_object(
        'id', 'linked_goal_id',
        'label', 'Linked Goal Activity ID',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 50),
        'description', 'Optional: Link this tracker entry to a Goal Activity from the Goals system. This enables syncing progress.'
      ),
      jsonb_build_object(
        'id', 'linked_habits',
        'label', 'Linked Habits',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 500),
        'description', 'What habits are helping you achieve this goal? (comma-separated)'
      ),
      jsonb_build_object(
        'id', 'linked_projects',
        'label', 'Linked Projects',
        'type', 'text',
        'validation', jsonb_build_object('maxLength', 500),
        'description', 'What Guardrails projects relate to this goal? (comma-separated)'
      ),
      
      -- Timeline & Planning
      jsonb_build_object(
        'id', 'start_date',
        'label', 'Start Date',
        'type', 'date',
        'validation', jsonb_build_object(),
        'description', 'When did you start working on this goal?'
      ),
      jsonb_build_object(
        'id', 'time_remaining_days',
        'label', 'Days Remaining',
        'type', 'number',
        'validation', jsonb_build_object('min', 0, 'max', 36500),
        'description', 'How many days until your target date? (auto-calculated if target date set)'
      ),
      jsonb_build_object(
        'id', 'progress_velocity',
        'label', 'Progress Velocity',
        'type', 'number',
        'validation', jsonb_build_object('min', -100, 'max', 100),
        'description', 'Change in progress since last entry (auto-calculated: current progress - previous progress)'
      )
    );

    -- Update the template
    UPDATE tracker_templates
    SET 
      description = 'Intelligent goal tracking with progress insights, milestone recognition, and actionable support. Track your goals comprehensively with momentum tracking, obstacle identification, next steps planning, and celebration of wins. Optionally sync with the Goals Activity system for unified goal management.',
      field_schema = new_fields,
      tags = jsonb_build_array(
        'goals', 'planning', 'productivity', 'personal-development', 'tracking',
        'intelligent', 'assistance', 'milestones', 'progress', 'motivation'
      ),
      icon = 'Target',
      color = 'blue',
      updated_at = NOW(),
      version = 2 -- Increment version to indicate enhancement
    WHERE id = template_id_val;

    RAISE NOTICE 'Successfully enhanced Goal Tracker template with intelligent features';
  ELSE
    RAISE NOTICE 'Goal Tracker template not found, skipping enhancement';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE tracker_templates IS 
  'Goal Tracker template has been enhanced with intelligent features: progress momentum, milestone tracking, obstacle identification, next steps planning, confidence levels, and optional Goals Activity system integration.';
