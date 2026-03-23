/*
  # Populate Example Text for All Project Types

  Adds wizard example text for the Idea step to all existing project types
  that don't already have example_text set.

  This migration is idempotent - it only updates project types where example_text IS NULL,
  so it won't overwrite existing example text (e.g., from the Health domain seed).

  Structure:
  {
    "idea": "string",
    "startingPoint": "string",
    "expectations": "string"
  }
*/

-- Update example_text for project types (only if column exists and example_text is NULL)
DO $$
BEGIN
  -- Check if example_text column exists before trying to update it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_project_types' AND column_name = 'example_text'
  ) THEN
    UPDATE guardrails_project_types
    SET example_text = CASE name
      -- Creative & Art Projects
      WHEN 'Art Project' THEN '{"idea": "This project focuses on creating visual art, illustration, or creative design work.", "startingPoint": "I have ideas for creative work but haven''t structured them into a clear project yet.", "expectations": "I expect this will involve regular creative practice, learning new techniques, and producing finished pieces."}'::jsonb
      
      WHEN 'Writing Project' THEN '{"idea": "This project is about creative writing, blogging, or publishing written content.", "startingPoint": "I have ideas and some writing experience, but haven''t committed to a regular writing practice or publication goal.", "expectations": "I expect this will involve setting aside time for writing, developing my voice, and potentially sharing or publishing my work."}'::jsonb
      
      WHEN 'Music Production' THEN '{"idea": "This project focuses on creating, recording, and producing music.", "startingPoint": "I have musical ideas or skills but haven''t established a consistent production workflow or release schedule.", "expectations": "I expect this will involve learning production tools, regular practice, and completing tracks for release."}'::jsonb
      
      WHEN 'Craft/Hobby' THEN '{"idea": "This project is about developing hands-on creative hobbies and crafts.", "startingPoint": "I''m interested in this craft but haven''t committed to regular practice or completing projects.", "expectations": "I expect this will involve learning techniques, practicing regularly, and completing projects to build skills."}'::jsonb
      
      WHEN 'Game Development' THEN '{"idea": "This project is about creating and developing video games.", "startingPoint": "I have game ideas and some technical knowledge, but haven''t structured them into a clear development plan.", "expectations": "I expect this will involve learning game development tools, designing mechanics, and building a playable game."}'::jsonb

      -- Business & Startup Projects
      WHEN 'Community Platform' THEN '{"idea": "This project focuses on building a community or social platform.", "startingPoint": "I see a need for a community space but haven''t validated the concept or built the infrastructure yet.", "expectations": "I expect this will involve research, platform design, technical development, and community building."}'::jsonb
      
      WHEN 'E-commerce Business' THEN '{"idea": "This project is about starting an online retail business.", "startingPoint": "I have product ideas or sources, but haven''t set up the infrastructure, processes, or market presence needed to sell online.", "expectations": "I expect this will involve setting up an online store, managing inventory, marketing, and handling customer service."}'::jsonb
      
      WHEN 'Service Business' THEN '{"idea": "This project focuses on launching a service-based business.", "startingPoint": "I have service skills or ideas, but haven''t structured them into a business with clients, pricing, and processes.", "expectations": "I expect this will involve defining services, setting prices, finding clients, and delivering quality work consistently."}'::jsonb
      
      WHEN 'SaaS Launch' THEN '{"idea": "This project is about launching a software-as-a-service product.", "startingPoint": "I have a software idea that could solve a problem, but haven''t validated demand or built the product yet.", "expectations": "I expect this will involve market research, product development, user acquisition, and ongoing support."}'::jsonb
      
      WHEN 'MVP Build' THEN '{"idea": "This project focuses on building a minimum viable product to test a concept.", "startingPoint": "I have an idea I want to validate, but haven''t built the core features needed to test it with users yet.", "expectations": "I expect this will involve identifying core features, rapid development, user testing, and iterating based on feedback."}'::jsonb
      
      WHEN 'Product Launch' THEN '{"idea": "This project is about launching a new product or feature to market.", "startingPoint": "I have a product or feature ready, but haven''t completed the launch planning, marketing, or rollout strategy.", "expectations": "I expect this will involve finalizing the product, creating launch materials, marketing, and monitoring initial user response."}'::jsonb
      
      WHEN 'Mobile App' THEN '{"idea": "This project focuses on developing and launching a mobile application.", "startingPoint": "I have an app idea that could solve a problem, but haven''t validated it or started development yet.", "expectations": "I expect this will involve design, development, testing, app store submission, and user acquisition."}'::jsonb

      -- Work & Professional Projects
      WHEN 'Content Creation' THEN '{"idea": "This project is about creating YouTube videos, podcasts, or social media content.", "startingPoint": "I have content ideas but haven''t established a consistent creation schedule or audience yet.", "expectations": "I expect this will involve planning content, recording/creating regularly, editing, and building an audience."}'::jsonb
      
      WHEN 'Process Improvement' THEN '{"idea": "This project focuses on optimizing workflows and operational efficiency.", "startingPoint": "I see inefficiencies in current processes but haven''t analyzed them systematically or implemented improvements yet.", "expectations": "I expect this will involve analyzing current processes, identifying improvements, and implementing changes with monitoring."}'::jsonb
      
      WHEN 'Strategic Planning' THEN '{"idea": "This project is about long-term strategic initiatives and planning.", "startingPoint": "I have strategic goals but haven''t broken them down into actionable plans with timelines and metrics.", "expectations": "I expect this will involve research, planning, setting milestones, and tracking progress toward strategic objectives."}'::jsonb
      
      WHEN 'Team Initiative' THEN '{"idea": "This project focuses on cross-functional team projects and initiatives.", "startingPoint": "There''s a team initiative that needs coordination, but it hasn''t been structured with clear goals, roles, and timelines yet.", "expectations": "I expect this will involve aligning stakeholders, defining roles, coordinating work, and tracking progress across the team."}'::jsonb

      -- Personal & Life Projects
      WHEN 'Learning Project' THEN '{"idea": "This project is about personal education and skill acquisition.", "startingPoint": "I want to learn something new, but haven''t structured a learning plan with goals, resources, and practice time yet.", "expectations": "I expect this will involve finding learning resources, setting aside regular study time, practicing, and tracking my progress."}'::jsonb
      
      WHEN 'Financial Planning' THEN '{"idea": "This project focuses on budget management and financial goals.", "startingPoint": "I want to improve my financial situation, but haven''t created a clear budget, savings plan, or goal structure yet.", "expectations": "I expect this will involve tracking expenses, creating budgets, setting financial goals, and developing better money habits."}'::jsonb
      
      WHEN 'Home Improvement' THEN '{"idea": "This project is about home renovation and organization projects.", "startingPoint": "I have home improvement ideas but haven''t prioritized them, planned the work, or allocated resources yet.", "expectations": "I expect this will involve planning projects, budgeting, coordinating work, and completing renovations or organization tasks."}'::jsonb
      
      WHEN 'Family Goal' THEN '{"idea": "This project focuses on family-oriented projects and objectives.", "startingPoint": "I have family goals but haven''t structured them into a clear plan with everyone''s involvement and timelines.", "expectations": "I expect this will involve family discussions, setting shared goals, coordinating activities, and tracking progress together."}'::jsonb

      -- Health domain project types are already seeded in 20260105000001_seed_health_domain_project_types.sql
      -- So we skip: Fitness Goal, Weight Loss, Nutrition & Diet Improvement, Mental Wellbeing, 
      -- Sleep Improvement, Health Condition Management, Lifestyle Change

      ELSE NULL
    END
    WHERE name IN (
      'Art Project',
      'Community Platform',
      'Content Creation',
      'Craft/Hobby',
      'E-commerce Business',
      'Family Goal',
      'Financial Planning',
      'Game Development',
      'Home Improvement',
      'Learning Project',
      'Mobile App',
      'Music Production',
      'MVP Build',
      'Process Improvement',
      'Product Launch',
      'SaaS Launch',
      'Service Business',
      'Strategic Planning',
      'Team Initiative',
      'Writing Project'
    )
    AND example_text IS NULL;
  END IF;
END $$;
