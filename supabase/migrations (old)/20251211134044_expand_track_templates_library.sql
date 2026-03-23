/*
  # Expand Track Templates Library

  This migration expands the template library from 12 to 40 track templates
  across all 4 domains (startup, work, personal, passion), adding significant
  depth and flexibility to project structures.

  1. New Track Templates
    Startup Domain (7 new):
      - Product Roadmap
      - Market Research
      - Customer Development
      - Growth Engine
      - Funding & Finance
      - Legal & Compliance
      - Team & Hiring

    Work Domain (7 new):
      - Agile / Scrum Workflow
      - Product Management
      - Stakeholder Management
      - Research & Analysis
      - Implementation
      - Career Development
      - Leadership & Management

    Personal Domain (7 new):
      - Home Management
      - Financial Planning
      - Wellness
      - Relationships
      - Mental Health Care
      - Home Cooking & Meal Planning
      - Life Transformation Plans

    Passion Domain (7 new):
      - Video Production
      - Photography
      - Music Production
      - Art & Illustration
      - Game Design
      - Content Creation
      - Makerspace Builds

  2. Sub-Track Templates
    Each new track template includes 3-5 sub-track templates for
    detailed workflow organization.

  3. Safety
    - Uses ON CONFLICT DO NOTHING to avoid modifying existing templates
    - Preserves all existing template data and relationships
    - Appends new templates with proper ordering_index values
*/

-- Startup Domain: Product Roadmap
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('startup', 'Product Roadmap', 'Strategic product planning and feature prioritization', 3, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Vision & Strategy', 'Product vision and strategic direction', 0, true),
      (v_track_id, 'Feature Scoping', 'Feature definition and scoping', 1, true),
      (v_track_id, 'Prioritisation (RICE / MoSCoW)', 'Feature prioritization frameworks', 2, true),
      (v_track_id, 'Release Planning', 'Release scheduling and coordination', 3, true),
      (v_track_id, 'Product Metrics & KPIs', 'Success metrics and tracking', 4, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Startup Domain: Market Research
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('startup', 'Market Research', 'Comprehensive market and competitor analysis', 4, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Competitor Research', 'Competitive landscape analysis', 0, true),
      (v_track_id, 'User Interviews', 'Customer discovery interviews', 1, true),
      (v_track_id, 'Surveys & Data', 'Quantitative research and data collection', 2, true),
      (v_track_id, 'Persona Creation', 'User persona development', 3, true),
      (v_track_id, 'Insights Synthesis', 'Research insights and recommendations', 4, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Startup Domain: Customer Development
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('startup', 'Customer Development', 'Continuous customer feedback and validation', 5, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Hypothesis Mapping', 'Problem and solution hypotheses', 0, true),
      (v_track_id, 'User Testing', 'Product testing with real users', 1, true),
      (v_track_id, 'Feedback Loops', 'Continuous feedback collection', 2, true),
      (v_track_id, 'Adoption Tracking', 'User adoption and engagement metrics', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Startup Domain: Growth Engine
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('startup', 'Growth Engine', 'Scalable growth strategies and optimization', 6, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'SEO', 'Search engine optimization', 0, true),
      (v_track_id, 'Viral Loops', 'Viral growth mechanics', 1, true),
      (v_track_id, 'Retention Strategy', 'Customer retention optimization', 2, true),
      (v_track_id, 'Referrals', 'Referral program development', 3, true),
      (v_track_id, 'A/B Testing', 'Growth experiment testing', 4, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Startup Domain: Funding & Finance
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('startup', 'Funding & Finance', 'Fundraising and financial management', 7, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Pitch Deck Creation', 'Investment pitch development', 0, true),
      (v_track_id, 'Investor Outreach', 'Investor networking and meetings', 1, true),
      (v_track_id, 'Budgeting & Burn Rate', 'Financial planning and cash management', 2, true),
      (v_track_id, 'Financial Forecasting', 'Revenue and growth projections', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Startup Domain: Legal & Compliance
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('startup', 'Legal & Compliance', 'Legal setup and regulatory compliance', 8, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Company Formation', 'Business entity setup', 0, true),
      (v_track_id, 'IP & Trademark', 'Intellectual property protection', 1, true),
      (v_track_id, 'Terms & Privacy', 'Legal agreements and policies', 2, true),
      (v_track_id, 'Regulatory Checks', 'Compliance verification', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Startup Domain: Team & Hiring
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('startup', 'Team & Hiring', 'Team building and talent acquisition', 9, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Role Definitions', 'Position requirements and descriptions', 0, true),
      (v_track_id, 'Recruiting', 'Candidate sourcing and outreach', 1, true),
      (v_track_id, 'Interviewing', 'Interview process and evaluation', 2, true),
      (v_track_id, 'Onboarding', 'New team member integration', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Work Domain: Agile / Scrum Workflow
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('work', 'Agile / Scrum Workflow', 'Agile project management methodology', 3, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Backlog Creation', 'User story and task backlog', 0, true),
      (v_track_id, 'Sprint Planning', 'Sprint goal and task selection', 1, true),
      (v_track_id, 'Stand-ups', 'Daily synchronization meetings', 2, true),
      (v_track_id, 'Retrospectives', 'Sprint reflection and improvement', 3, true),
      (v_track_id, 'Review & Documentation', 'Sprint review and documentation', 4, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Work Domain: Product Management
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('work', 'Product Management', 'Product strategy and feature management', 4, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Roadmapping', 'Product roadmap creation', 0, true),
      (v_track_id, 'Requirements Gathering', 'Feature requirements documentation', 1, true),
      (v_track_id, 'Prioritisation', 'Feature prioritization', 2, true),
      (v_track_id, 'UX Alignment', 'User experience collaboration', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Work Domain: Stakeholder Management
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('work', 'Stakeholder Management', 'Communication and stakeholder engagement', 5, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Communication Plan', 'Stakeholder communication strategy', 0, true),
      (v_track_id, 'Reporting', 'Progress reports and updates', 1, true),
      (v_track_id, 'Approval Gateways', 'Decision checkpoints', 2, true),
      (v_track_id, 'Feedback Tracking', 'Stakeholder feedback management', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Work Domain: Research & Analysis
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('work', 'Research & Analysis', 'Data-driven research and analysis', 6, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Data Collection', 'Research data gathering', 0, true),
      (v_track_id, 'Modelling', 'Data analysis and modeling', 1, true),
      (v_track_id, 'Insights Generation', 'Actionable insights development', 2, true),
      (v_track_id, 'Documentation', 'Research documentation', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Work Domain: Implementation
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('work', 'Implementation', 'Technical implementation and deployment', 7, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Build', 'Core development work', 0, true),
      (v_track_id, 'Integrations', 'System integrations', 1, true),
      (v_track_id, 'Testing', 'Quality assurance testing', 2, true),
      (v_track_id, 'Deployment', 'Production deployment', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Work Domain: Career Development
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('work', 'Career Development', 'Professional growth and advancement', 8, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Strength Assessment', 'Skills and strengths evaluation', 0, true),
      (v_track_id, 'Goal Setting', 'Career goals and objectives', 1, true),
      (v_track_id, 'Skill Plan', 'Professional development planning', 2, true),
      (v_track_id, 'Quarterly Review', 'Progress assessment', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Work Domain: Leadership & Management
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('work', 'Leadership & Management', 'Team leadership and management practices', 9, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Delegation', 'Task and responsibility delegation', 0, true),
      (v_track_id, 'Feedback Cycles', 'Regular feedback and coaching', 1, true),
      (v_track_id, 'Meeting Systems', 'Effective meeting management', 2, true),
      (v_track_id, 'Team Culture', 'Culture building and maintenance', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Personal Domain: Home Management
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('personal', 'Home Management', 'Household organization and maintenance', 3, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Cleaning System', 'Regular cleaning routines', 0, true),
      (v_track_id, 'Organisation', 'Home organization systems', 1, true),
      (v_track_id, 'Maintenance', 'Preventive home maintenance', 2, true),
      (v_track_id, 'Renovation Projects', 'Home improvement projects', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Personal Domain: Financial Planning
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('personal', 'Financial Planning', 'Personal financial management and planning', 4, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Budgeting', 'Monthly budget planning', 0, true),
      (v_track_id, 'Savings', 'Savings goals and tracking', 1, true),
      (v_track_id, 'Investments', 'Investment portfolio management', 2, true),
      (v_track_id, 'Bills & Subscriptions', 'Bill payments and subscriptions', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Personal Domain: Wellness
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('personal', 'Wellness', 'Emotional and spiritual wellness', 5, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Meditation', 'Meditation and mindfulness practice', 0, true),
      (v_track_id, 'Emotional Check-in', 'Regular emotional awareness', 1, true),
      (v_track_id, 'Stress Management', 'Stress reduction techniques', 2, true),
      (v_track_id, 'Gratitude Logging', 'Daily gratitude practice', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Personal Domain: Relationships
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('personal', 'Relationships', 'Personal relationships and connections', 6, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Family Time', 'Quality time with family', 0, true),
      (v_track_id, 'Quality Time', 'Meaningful connection activities', 1, true),
      (v_track_id, 'Communication', 'Relationship communication', 2, true),
      (v_track_id, 'Planning Shared Events', 'Event planning together', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Personal Domain: Mental Health Care
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('personal', 'Mental Health Care', 'Mental health maintenance and support', 7, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Triggers Journal', 'Mental health trigger tracking', 0, true),
      (v_track_id, 'Coping Strategies', 'Coping mechanism development', 1, true),
      (v_track_id, 'Appointments', 'Therapy and professional support', 2, true),
      (v_track_id, 'Daily Mood Log', 'Daily mood tracking', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Personal Domain: Home Cooking & Meal Planning
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('personal', 'Home Cooking & Meal Planning', 'Meal planning and home cooking', 8, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Weekly Meal Plan', 'Weekly meal planning', 0, true),
      (v_track_id, 'Prep & Batch Cook', 'Meal preparation and batch cooking', 1, true),
      (v_track_id, 'Nutrition Tracking', 'Nutritional monitoring', 2, true),
      (v_track_id, 'Recipe Management', 'Recipe collection and organization', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Personal Domain: Life Transformation Plans
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('personal', 'Life Transformation Plans', 'Major life changes and transformations', 9, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Vision Planning', 'Life vision and goal setting', 0, true),
      (v_track_id, 'Habit Stacks', 'Habit building and stacking', 1, true),
      (v_track_id, 'Progress Review', 'Regular transformation progress review', 2, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Passion Domain: Video Production
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('passion', 'Video Production', 'End-to-end video creation', 3, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Concepting', 'Video concept development', 0, true),
      (v_track_id, 'Scripting', 'Script writing', 1, true),
      (v_track_id, 'Storyboard', 'Visual storyboarding', 2, true),
      (v_track_id, 'Shooting', 'Video filming', 3, true),
      (v_track_id, 'Editing', 'Post-production editing', 4, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Passion Domain: Photography
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('passion', 'Photography', 'Photography projects and portfolios', 4, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Location Planning', 'Shoot location scouting', 0, true),
      (v_track_id, 'Shot List', 'Photography shot planning', 1, true),
      (v_track_id, 'Shooting', 'Photo capture sessions', 2, true),
      (v_track_id, 'Selection & Editing', 'Photo curation and editing', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Passion Domain: Music Production
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('passion', 'Music Production', 'Music creation and production', 5, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Composition', 'Musical composition', 0, true),
      (v_track_id, 'Recording', 'Audio recording', 1, true),
      (v_track_id, 'Mixing', 'Audio mixing', 2, true),
      (v_track_id, 'Mastering', 'Final mastering', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Passion Domain: Art & Illustration
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('passion', 'Art & Illustration', 'Visual art and illustration projects', 6, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Inspiration', 'Inspiration and reference gathering', 0, true),
      (v_track_id, 'Sketch Concepts', 'Initial concept sketches', 1, true),
      (v_track_id, 'Final Rendering', 'Final artwork creation', 2, true),
      (v_track_id, 'Publishing & Sharing', 'Artwork sharing and publishing', 3, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Passion Domain: Game Design
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('passion', 'Game Design', 'Game concept to playable prototype', 7, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Concept', 'Game concept and design doc', 0, true),
      (v_track_id, 'Mechanics', 'Core mechanics design', 1, true),
      (v_track_id, 'Prototyping', 'Playable prototype creation', 2, true),
      (v_track_id, 'Playtesting', 'Testing with players', 3, true),
      (v_track_id, 'Balancing', 'Game balance tuning', 4, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Passion Domain: Content Creation
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('passion', 'Content Creation', 'Digital content creation and publishing', 8, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Topic Ideation', 'Content topic brainstorming', 0, true),
      (v_track_id, 'Research', 'Content research', 1, true),
      (v_track_id, 'Writing/Scripting', 'Content creation', 2, true),
      (v_track_id, 'Publishing', 'Content publication', 3, true),
      (v_track_id, 'Analytics Review', 'Performance analytics', 4, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;

-- Passion Domain: Makerspace Builds
DO $$
DECLARE
  v_track_id uuid;
BEGIN
  INSERT INTO guardrails_track_templates (domain_type, name, description, ordering_index, is_default)
  VALUES ('passion', 'Makerspace Builds', 'Physical making and building projects', 9, false)
  ON CONFLICT (domain_type, ordering_index) DO NOTHING
  RETURNING id INTO v_track_id;

  IF v_track_id IS NOT NULL THEN
    INSERT INTO guardrails_subtrack_templates (track_template_id, name, description, ordering_index, is_default)
    VALUES 
      (v_track_id, 'Blueprint', 'Design and planning', 0, true),
      (v_track_id, 'Material Prep', 'Material sourcing and preparation', 1, true),
      (v_track_id, 'Build', 'Construction and assembly', 2, true),
      (v_track_id, 'Sanding/Finish', 'Finishing touches', 3, true),
      (v_track_id, 'Showcase', 'Project documentation and sharing', 4, true)
    ON CONFLICT (track_template_id, ordering_index) DO NOTHING;
  END IF;
END $$;
