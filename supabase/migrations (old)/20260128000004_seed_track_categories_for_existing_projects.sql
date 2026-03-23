/*
  # Seed Track Categories for Existing Projects

  Seeds system track categories for all existing projects that don't have them yet.
  
  This migration:
  1. Identifies all projects without system track categories
  2. Inserts the full set of system categories for each project
  3. Uses the same categories defined in trackCategories.ts
  
  Note: New projects automatically get categories seeded via seedSystemCategoriesForProject()
  This migration is for existing projects created before the category system was implemented.
*/

-- Seed system track categories for all existing projects that don't have them
DO $$
DECLARE
  project_record RECORD;
BEGIN
  -- Loop through all projects
  FOR project_record IN 
    SELECT id 
    FROM master_projects
    WHERE NOT EXISTS (
      -- Only process projects that don't have any system categories yet
      SELECT 1 FROM project_track_categories ptc
      WHERE ptc.master_project_id = master_projects.id
      AND ptc.is_system = true
    )
  LOOP
    -- Insert all system categories for this project
    INSERT INTO project_track_categories (master_project_id, key, name, description, is_system)
    VALUES
      -- Direction & Thinking
      (project_record.id, 'vision', 'Vision', 'Defines the long-term direction or desired end state', true),
      (project_record.id, 'strategy', 'Strategy', 'High-level approach and planning for achieving goals', true),
      (project_record.id, 'goals', 'Goals', 'Specific objectives and targets to achieve', true),
      (project_record.id, 'success_criteria', 'Success Criteria', 'Metrics and conditions that define successful completion', true),
      
      -- Understanding & Exploration
      (project_record.id, 'research', 'Research', 'Gathering information, data, and understanding', true),
      (project_record.id, 'discovery', 'Discovery', 'Exploring possibilities and uncovering insights', true),
      (project_record.id, 'insights', 'Insights', 'Synthesizing learnings and developing understanding', true),
      
      -- Planning & Organisation
      (project_record.id, 'planning', 'Planning', 'Creating plans, timelines, and roadmaps', true),
      (project_record.id, 'structure', 'Structure', 'Organizing work, systems, and frameworks', true),
      (project_record.id, 'scope', 'Scope', 'Defining boundaries and what is included', true),
      (project_record.id, 'dependencies', 'Dependencies', 'Managing relationships and prerequisites between work items', true),
      
      -- Creation & Development
      (project_record.id, 'design', 'Design', 'Creating designs, concepts, and visualizations', true),
      (project_record.id, 'development', 'Development', 'Building, coding, and creating technical solutions', true),
      (project_record.id, 'content', 'Content', 'Creating written, visual, or multimedia content', true),
      (project_record.id, 'assets', 'Assets', 'Producing files, resources, and deliverables', true),
      
      -- Execution & Progress
      (project_record.id, 'execution', 'Execution', 'Carrying out planned work and activities', true),
      (project_record.id, 'implementation', 'Implementation', 'Putting plans into practice and making things real', true),
      (project_record.id, 'iteration', 'Iteration', 'Repeating cycles of improvement and refinement', true),
      
      -- Evaluation & Improvement
      (project_record.id, 'testing', 'Testing', 'Validating work through trials and checks', true),
      (project_record.id, 'feedback', 'Feedback', 'Gathering input and responses from stakeholders', true),
      (project_record.id, 'refinement', 'Refinement', 'Improving and polishing work based on learnings', true),
      
      -- Completion & Release
      (project_record.id, 'delivery', 'Delivery', 'Completing and handing off finished work', true),
      (project_record.id, 'launch', 'Launch', 'Releasing products, services, or content to users', true),
      (project_record.id, 'rollout', 'Rollout', 'Gradually deploying or releasing to broader audiences', true),
      
      -- Maintenance & Continuity
      (project_record.id, 'operations', 'Operations', 'Ongoing operational activities and processes', true),
      (project_record.id, 'maintenance', 'Maintenance', 'Keeping systems and work in good condition', true),
      (project_record.id, 'support', 'Support', 'Providing assistance and help to users or stakeholders', true),
      
      -- Human & Personal (intentional two-word categories)
      (project_record.id, 'people_management', 'People Management', 'Managing teams, relationships, and people-related activities', true),
      (project_record.id, 'self_improvement', 'Self-Improvement', 'Personal growth, skill development, and self-care', true),
      (project_record.id, 'health_management', 'Health Management', 'Managing physical and mental health goals', true),
      
      -- Learning & Growth
      (project_record.id, 'learning', 'Learning', 'Acquiring knowledge and new skills', true),
      (project_record.id, 'practice', 'Practice', 'Repeated exercise to improve skills or performance', true),
      (project_record.id, 'reflection', 'Reflection', 'Reviewing outcomes, learning, and planning next steps', true),
      
      -- Governance & Practicalities
      (project_record.id, 'finance', 'Finance', 'Financial planning, budgeting, and money management', true),
      (project_record.id, 'legal', 'Legal', 'Legal matters, compliance, and regulatory requirements', true),
      (project_record.id, 'administration', 'Administration', 'Organizational tasks and administrative work', true)
    ON CONFLICT (master_project_id, key) DO NOTHING;
    
    -- Log progress (optional, can be removed if not needed)
    RAISE NOTICE 'Seeded track categories for project %', project_record.id;
  END LOOP;
END $$;
