/*
  # Create Skills Tracker Template
  
  This migration creates a comprehensive Skills Tracker template for Tracker Studio.
  This template is directly linked to the existing skills matrix (user_skills table),
  allowing users to track skill development and practice sessions.
  
  Features:
  - Links to existing skills matrix for skill selection
  - Tracks proficiency and confidence levels
  - Records practice sessions with time spent and activities
  - Supports syncing with Guardrails projects (via observation links)
  - Allows sharing with household, team, etc. (via observation links)
  - Comprehensive tracking of skill development evidence and context
  
  Fields:
  - Skill Name: Reference to skill from skills matrix (text field that can sync)
  - Proficiency Level: Current proficiency rating (1-5)
  - Confidence Level: Current confidence rating (1-5)
  - Skill Category: Category of the skill
  - Practice Activity: Description of what was practiced
  - Time Spent: Minutes spent practicing
  - Context: Where/how the skill was practiced
  - Evidence: Documentation or proof of practice
  - Linked Project: Guardrails project ID (if synced)
  - Notes: Reflections and observations
*/

-- Helper function to check if template already exists (idempotent)
DO $$
DECLARE
  template_exists boolean;
BEGIN
  -- Check if Skills Tracker template already exists
  SELECT EXISTS(
    SELECT 1 FROM tracker_templates
    WHERE scope = 'global'
      AND name = 'Skills Tracker'
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
      icon,
      color,
      chart_config
    ) VALUES (
      NULL, -- Global template has no owner
      NULL, -- System-created
      'Skills Tracker',
      'Track your skill development and practice sessions. Link to your Skills Matrix, sync with Guardrails projects, and share with your household or team. Record practice activities, proficiency levels, confidence, evidence, and reflections.',
      jsonb_build_array(
        -- Skill Name (text field - users can type or reference from skills matrix)
        jsonb_build_object(
          'id', 'skill_name',
          'label', 'Skill Name',
          'type', 'text',
          'validation', jsonb_build_object('required', true, 'maxLength', 200),
          'description', 'Name of the skill being practiced. Can reference a skill from your Skills Matrix or enter a new skill.'
        ),
        -- Proficiency Level (1-5 rating)
        jsonb_build_object(
          'id', 'proficiency_level',
          'label', 'Proficiency Level',
          'type', 'rating',
          'validation', jsonb_build_object('required', true, 'min', 1, 'max', 5),
          'default', 3,
          'description', 'Current proficiency level: 1=Awareness, 2=Developing, 3=Competent, 4=Advanced, 5=Mastery'
        ),
        -- Confidence Level (1-5 rating)
        jsonb_build_object(
          'id', 'confidence_level',
          'label', 'Confidence Level',
          'type', 'rating',
          'validation', jsonb_build_object('required', false, 'min', 1, 'max', 5),
          'default', 3,
          'description', 'How confident you feel with this skill: 1=Very Uncertain, 2=Somewhat Uncertain, 3=Neutral, 4=Fairly Confident, 5=Very Confident'
        ),
        -- Skill Category
        jsonb_build_object(
          'id', 'skill_category',
          'label', 'Skill Category',
          'type', 'text',
          'validation', jsonb_build_object('required', false, 'maxLength', 50),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'cognitive', 'label', 'Cognitive'),
            jsonb_build_object('value', 'emotional', 'label', 'Emotional'),
            jsonb_build_object('value', 'social', 'label', 'Social'),
            jsonb_build_object('value', 'physical', 'label', 'Physical'),
            jsonb_build_object('value', 'technical', 'label', 'Technical'),
            jsonb_build_object('value', 'creative', 'label', 'Creative')
          ),
          'description', 'Category of the skill'
        ),
        -- Practice Activity
        jsonb_build_object(
          'id', 'practice_activity',
          'label', 'Practice Activity',
          'type', 'text',
          'validation', jsonb_build_object('required', false, 'maxLength', 500),
          'description', 'What did you practice? Describe the activity, exercise, project, or work that involved this skill.'
        ),
        -- Time Spent (minutes)
        jsonb_build_object(
          'id', 'time_spent_minutes',
          'label', 'Time Spent (minutes)',
          'type', 'number',
          'validation', jsonb_build_object('min', 0, 'max', 10080),
          'description', 'How many minutes did you spend practicing this skill?'
        ),
        -- Context
        jsonb_build_object(
          'id', 'context',
          'label', 'Context',
          'type', 'text',
          'validation', jsonb_build_object('required', false, 'maxLength', 100),
          'options', jsonb_build_array(
            jsonb_build_object('value', 'work', 'label', 'Work'),
            jsonb_build_object('value', 'education', 'label', 'Education'),
            jsonb_build_object('value', 'personal', 'label', 'Personal'),
            jsonb_build_object('value', 'hobby', 'label', 'Hobby'),
            jsonb_build_object('value', 'health', 'label', 'Health'),
            jsonb_build_object('value', 'therapy', 'label', 'Therapy'),
            jsonb_build_object('value', 'parenting', 'label', 'Parenting'),
            jsonb_build_object('value', 'coaching', 'label', 'Coaching'),
            jsonb_build_object('value', 'other', 'label', 'Other')
          ),
          'description', 'Where or how was this skill practiced?'
        ),
        -- Evidence
        jsonb_build_object(
          'id', 'evidence',
          'label', 'Evidence / Documentation',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 2000),
          'description', 'Documentation, proof, or evidence of practicing this skill. Examples: project link, certificate, feedback received, code written, presentation given, etc.'
        ),
        -- Linked Project (for Guardrails sync)
        jsonb_build_object(
          'id', 'linked_project_id',
          'label', 'Linked Guardrails Project ID',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 50),
          'description', 'Optional: Link this practice session to a Guardrails project. This allows syncing your skills tracker with project requirements.'
        ),
        -- Notes
        jsonb_build_object(
          'id', 'notes',
          'label', 'Notes / Reflections',
          'type', 'text',
          'validation', jsonb_build_object('maxLength', 5000),
          'description', 'Reflections, observations, challenges faced, insights gained, or any other notes about this practice session.'
        )
      ),
      'session', -- Session-based entries (skill practice happens in sessions)
      true, -- System template
      'global', -- Global scope
      true, -- Locked (admin-only edits)
      NOW(), -- Published now
      1, -- Version 1
      jsonb_build_array('skills', 'development', 'learning', 'professional-development', 'competencies', 'capabilities', 'guardrails', 'matrix'),
      'Award', -- Icon: Award icon for skills
      'purple', -- Color: Purple theme for skills/development
      jsonb_build_object(
        'enabledCharts', jsonb_build_array('timeSeries', 'summary', 'heatmap', 'frequency', 'multiField'),
        'defaultDateRange', '90d',
        'showSecondaryCharts', true,
        'chartOrder', jsonb_build_array(
          'proficiency_trend',
          'confidence_trend',
          'practice_time',
          'category_breakdown',
          'context_breakdown'
        )
      )
    );

    RAISE NOTICE 'Successfully created Skills Tracker template';
  ELSE
    RAISE NOTICE 'Skills Tracker template already exists, skipping creation';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE tracker_templates IS 'Templates now include Skills Tracker - a comprehensive skill development tracking system linked to Skills Matrix';
COMMENT ON COLUMN tracker_templates.field_schema IS 'Skills Tracker template includes fields for skill name, proficiency, confidence, practice activities, time spent, context, evidence, and notes';
