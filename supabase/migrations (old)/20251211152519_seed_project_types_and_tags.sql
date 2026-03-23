/*
  # Seed Project Types and Tags

  1. Seed Template Tags
    - Core discipline tags like: writing, design, research, coding, marketing, finance, etc.
    
  2. Seed Project Types
    - ~20 common project types across all domains (Work, Personal, Passion, Startup)
    
  3. Link Project Types to Tags
    - Define which tags apply to each project type
    
  4. Notes
    - This provides the foundation for tag-based template filtering
    - Project types are user-facing specializations
    - Tags are internal categorization for templates
*/

-- Insert template tags
INSERT INTO guardrails_template_tags (name) VALUES
  ('writing'),
  ('design'),
  ('research'),
  ('coding'),
  ('marketing'),
  ('finance'),
  ('planning'),
  ('execution'),
  ('learning'),
  ('creativity'),
  ('analysis'),
  ('communication'),
  ('management'),
  ('sales'),
  ('operations'),
  ('strategy'),
  ('art'),
  ('music'),
  ('video'),
  ('content'),
  ('community'),
  ('networking'),
  ('fitness'),
  ('health'),
  ('mindfulness'),
  ('organization'),
  ('systems'),
  ('automation'),
  ('prototyping'),
  ('testing')
ON CONFLICT (name) DO NOTHING;

-- Insert project types for WORK domain
INSERT INTO guardrails_project_types (name, domain_type, description) VALUES
  ('Product Launch', 'work', 'Launching a new product or feature to market'),
  ('Process Improvement', 'work', 'Optimizing workflows and operational efficiency'),
  ('Team Initiative', 'work', 'Cross-functional team projects and initiatives'),
  ('Skill Development', 'work', 'Professional skill building and career growth'),
  ('Strategic Planning', 'work', 'Long-term strategic initiatives and planning')
ON CONFLICT (name) DO NOTHING;

-- Insert project types for PERSONAL domain
INSERT INTO guardrails_project_types (name, domain_type, description) VALUES
  ('Fitness Goal', 'personal', 'Physical health and fitness objectives'),
  ('Home Improvement', 'personal', 'Home renovation and organization projects'),
  ('Learning Project', 'personal', 'Personal education and skill acquisition'),
  ('Financial Planning', 'personal', 'Budget management and financial goals'),
  ('Family Goal', 'personal', 'Family-oriented projects and objectives')
ON CONFLICT (name) DO NOTHING;

-- Insert project types for PASSION domain
INSERT INTO guardrails_project_types (name, domain_type, description) VALUES
  ('Music Production', 'passion', 'Creating, recording, and producing music'),
  ('Writing Project', 'passion', 'Creative writing, blogging, or publishing'),
  ('Art Project', 'passion', 'Visual arts, illustration, or creative design'),
  ('Game Development', 'passion', 'Video game creation and development'),
  ('Content Creation', 'passion', 'YouTube, podcasting, or social media content'),
  ('Craft/Hobby', 'passion', 'Hands-on creative hobbies and crafts')
ON CONFLICT (name) DO NOTHING;

-- Insert project types for STARTUP domain
INSERT INTO guardrails_project_types (name, domain_type, description) VALUES
  ('MVP Build', 'startup', 'Building a minimum viable product'),
  ('SaaS Launch', 'startup', 'Launching a software-as-a-service product'),
  ('Mobile App', 'startup', 'Developing and launching a mobile application'),
  ('E-commerce Business', 'startup', 'Starting an online retail business'),
  ('Service Business', 'startup', 'Launching a service-based business'),
  ('Community Platform', 'startup', 'Building a community or social platform')
ON CONFLICT (name) DO NOTHING;

-- Link project types to tags

-- Product Launch (work)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Product Launch'
  AND tt.name IN ('planning', 'execution', 'marketing', 'research', 'strategy', 'communication')
ON CONFLICT DO NOTHING;

-- Process Improvement (work)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Process Improvement'
  AND tt.name IN ('analysis', 'planning', 'systems', 'automation', 'operations')
ON CONFLICT DO NOTHING;

-- Team Initiative (work)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Team Initiative'
  AND tt.name IN ('planning', 'communication', 'management', 'execution', 'strategy')
ON CONFLICT DO NOTHING;

-- Skill Development (work)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Skill Development'
  AND tt.name IN ('learning', 'planning', 'research', 'execution')
ON CONFLICT DO NOTHING;

-- Strategic Planning (work)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Strategic Planning'
  AND tt.name IN ('strategy', 'planning', 'analysis', 'research', 'communication')
ON CONFLICT DO NOTHING;

-- Fitness Goal (personal)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Fitness Goal'
  AND tt.name IN ('fitness', 'health', 'planning', 'execution', 'organization')
ON CONFLICT DO NOTHING;

-- Home Improvement (personal)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Home Improvement'
  AND tt.name IN ('planning', 'execution', 'design', 'organization', 'finance')
ON CONFLICT DO NOTHING;

-- Learning Project (personal)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Learning Project'
  AND tt.name IN ('learning', 'research', 'planning', 'execution', 'organization')
ON CONFLICT DO NOTHING;

-- Financial Planning (personal)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Financial Planning'
  AND tt.name IN ('finance', 'planning', 'analysis', 'organization', 'strategy')
ON CONFLICT DO NOTHING;

-- Family Goal (personal)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Family Goal'
  AND tt.name IN ('planning', 'communication', 'organization', 'execution')
ON CONFLICT DO NOTHING;

-- Music Production (passion)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Music Production'
  AND tt.name IN ('music', 'creativity', 'planning', 'execution', 'learning', 'art')
ON CONFLICT DO NOTHING;

-- Writing Project (passion)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Writing Project'
  AND tt.name IN ('writing', 'creativity', 'planning', 'research', 'execution', 'communication')
ON CONFLICT DO NOTHING;

-- Art Project (passion)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Art Project'
  AND tt.name IN ('art', 'design', 'creativity', 'planning', 'execution')
ON CONFLICT DO NOTHING;

-- Game Development (passion)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Game Development'
  AND tt.name IN ('coding', 'design', 'art', 'writing', 'planning', 'execution', 'creativity', 'systems')
ON CONFLICT DO NOTHING;

-- Content Creation (passion)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Content Creation'
  AND tt.name IN ('content', 'creativity', 'video', 'writing', 'design', 'planning', 'execution', 'marketing')
ON CONFLICT DO NOTHING;

-- Craft/Hobby (passion)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Craft/Hobby'
  AND tt.name IN ('creativity', 'art', 'planning', 'execution', 'learning')
ON CONFLICT DO NOTHING;

-- MVP Build (startup)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'MVP Build'
  AND tt.name IN ('coding', 'design', 'planning', 'execution', 'prototyping', 'testing', 'strategy', 'research')
ON CONFLICT DO NOTHING;

-- SaaS Launch (startup)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'SaaS Launch'
  AND tt.name IN ('coding', 'design', 'marketing', 'sales', 'planning', 'execution', 'strategy', 'systems', 'operations')
ON CONFLICT DO NOTHING;

-- Mobile App (startup)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Mobile App'
  AND tt.name IN ('coding', 'design', 'planning', 'execution', 'marketing', 'testing', 'prototyping')
ON CONFLICT DO NOTHING;

-- E-commerce Business (startup)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'E-commerce Business'
  AND tt.name IN ('marketing', 'sales', 'operations', 'finance', 'planning', 'execution', 'strategy', 'design')
ON CONFLICT DO NOTHING;

-- Service Business (startup)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Service Business'
  AND tt.name IN ('marketing', 'sales', 'operations', 'communication', 'planning', 'execution', 'strategy', 'networking')
ON CONFLICT DO NOTHING;

-- Community Platform (startup)
INSERT INTO guardrails_project_type_tags (project_type_id, tag_id)
SELECT pt.id, tt.id
FROM guardrails_project_types pt
CROSS JOIN guardrails_template_tags tt
WHERE pt.name = 'Community Platform'
  AND tt.name IN ('coding', 'design', 'community', 'content', 'planning', 'execution', 'marketing', 'communication', 'strategy')
ON CONFLICT DO NOTHING;