/*
  # Create Sub-Track Categories System

  ## Overview
  System-defined sub-track categories that describe what kind of work happens in a sub-track.
  Categories are filtered based on the parent track's category.
  
  ## Schema
  - `subtrack_categories`: System defaults (activity primitives)
  - `track_category_subtrack_categories`: Maps track categories to allowed sub-track categories
  - `guardrails_tracks.subtrack_category_id`: Links sub-tracks (tracks with parent_track_id) to categories (nullable)
  
  ## Seed Data
  This migration also seeds all system sub-track categories and their mappings to track categories.
  
  ## Validation
  - A sub-track category can only be assigned if allowed by the parent track's category
  - Validation enforced in both UI and backend
*/

-- Create subtrack_categories table (system defaults)
CREATE TABLE IF NOT EXISTS subtrack_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_subtrack_categories_key
  ON subtrack_categories(key);

-- Create track_category_subtrack_categories mapping table
CREATE TABLE IF NOT EXISTS track_category_subtrack_categories (
  track_category_key text NOT NULL,
  subtrack_category_id uuid NOT NULL REFERENCES subtrack_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (track_category_key, subtrack_category_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_track_category_subtrack_track_key
  ON track_category_subtrack_categories(track_category_key);

CREATE INDEX IF NOT EXISTS idx_track_category_subtrack_category_id
  ON track_category_subtrack_categories(subtrack_category_id);

-- Add subtrack_category_id to guardrails_tracks
-- Note: This column is only relevant for tracks with parent_track_id IS NOT NULL (i.e., subtracks)
-- The unified architecture uses guardrails_tracks for both tracks and subtracks
ALTER TABLE guardrails_tracks
ADD COLUMN IF NOT EXISTS subtrack_category_id uuid
REFERENCES subtrack_categories(id)
ON DELETE SET NULL;

-- Create index for subtrack_category_id
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_subtrack_category
  ON guardrails_tracks(subtrack_category_id)
  WHERE subtrack_category_id IS NOT NULL;

-- Seed sub-track categories
INSERT INTO subtrack_categories (key, label, description) VALUES
  ('research', 'Research', 'Gathering information, data, and understanding'),
  ('discovery', 'Discovery', 'Exploring possibilities and uncovering insights'),
  ('ideation', 'Ideation', 'Generating ideas and concepts'),
  ('analysis', 'Analysis', 'Examining and interpreting information'),
  ('planning', 'Planning', 'Creating plans, timelines, and structures'),
  ('design', 'Design', 'Creating designs, concepts, and visualizations'),
  ('task_breakdown', 'Task Breakdown', 'Breaking work into smaller tasks and steps'),
  ('development', 'Development', 'Building, coding, and creating technical solutions'),
  ('implementation', 'Implementation', 'Putting plans into practice and making things real'),
  ('testing', 'Testing', 'Validating work through trials and checks'),
  ('feedback', 'Feedback', 'Gathering input and responses from stakeholders'),
  ('refinement', 'Refinement', 'Improving and polishing work based on learnings'),
  ('iteration', 'Iteration', 'Repeating cycles of improvement'),
  ('documentation', 'Documentation', 'Creating written records and guides'),
  ('progress_tracking', 'Progress Tracking', 'Monitoring and tracking work progress'),
  ('review', 'Review', 'Reviewing outcomes and planning next steps'),
  ('delivery', 'Delivery', 'Completing and handing off finished work'),
  ('launch', 'Launch', 'Releasing products, services, or content'),
  ('maintenance', 'Maintenance', 'Keeping systems and work in good condition'),
  ('support', 'Support', 'Providing assistance and help'),
  ('learning', 'Learning', 'Acquiring knowledge and new skills'),
  ('practice', 'Practice', 'Repeated exercise to improve skills'),
  ('communication', 'Communication', 'Sharing information and coordinating'),
  ('collaboration', 'Collaboration', 'Working together with others'),
  ('reporting', 'Reporting', 'Creating reports and summaries')
ON CONFLICT (key) DO NOTHING;

-- Seed track category to sub-track category mappings
DO $$
DECLARE
  subtrack_cat_id uuid;
  track_key text;
BEGIN
  -- Vision
  FOR track_key IN SELECT unnest(ARRAY['vision']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('ideation', 'research', 'planning', 'analysis', 'review')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Strategy
  FOR track_key IN SELECT unnest(ARRAY['strategy']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('research', 'analysis', 'planning', 'ideation', 'review', 'documentation')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Goals
  FOR track_key IN SELECT unnest(ARRAY['goals']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'task_breakdown', 'progress_tracking', 'review')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Success Criteria
  FOR track_key IN SELECT unnest(ARRAY['success_criteria']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'analysis', 'review', 'reporting', 'documentation')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Research
  FOR track_key IN SELECT unnest(ARRAY['research']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('research', 'discovery', 'analysis', 'documentation', 'reporting', 'review')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Discovery
  FOR track_key IN SELECT unnest(ARRAY['discovery']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('research', 'discovery', 'ideation', 'analysis', 'documentation')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Insights
  FOR track_key IN SELECT unnest(ARRAY['insights']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('analysis', 'research', 'review', 'documentation', 'reporting')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Planning
  FOR track_key IN SELECT unnest(ARRAY['planning']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'task_breakdown', 'documentation', 'review')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Structure
  FOR track_key IN SELECT unnest(ARRAY['structure']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'design', 'task_breakdown', 'documentation')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Scope
  FOR track_key IN SELECT unnest(ARRAY['scope']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'analysis', 'task_breakdown', 'documentation')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Dependencies
  FOR track_key IN SELECT unnest(ARRAY['dependencies']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'analysis', 'task_breakdown', 'progress_tracking', 'communication')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Design
  FOR track_key IN SELECT unnest(ARRAY['design']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('ideation', 'research', 'design', 'planning', 'refinement', 'feedback', 'review')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Development
  FOR track_key IN SELECT unnest(ARRAY['development']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'task_breakdown', 'development', 'implementation', 'testing', 'refinement', 'documentation')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Content
  FOR track_key IN SELECT unnest(ARRAY['content']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('ideation', 'planning', 'implementation', 'refinement', 'review', 'delivery')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Assets
  FOR track_key IN SELECT unnest(ARRAY['assets']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'implementation', 'refinement', 'documentation', 'delivery')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Execution
  FOR track_key IN SELECT unnest(ARRAY['execution']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('task_breakdown', 'implementation', 'progress_tracking', 'communication', 'collaboration')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Implementation
  FOR track_key IN SELECT unnest(ARRAY['implementation']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('task_breakdown', 'implementation', 'testing', 'refinement', 'progress_tracking')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Iteration
  FOR track_key IN SELECT unnest(ARRAY['iteration']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('testing', 'feedback', 'refinement', 'iteration', 'review')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Testing
  FOR track_key IN SELECT unnest(ARRAY['testing']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('testing', 'feedback', 'analysis', 'refinement', 'documentation')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Feedback
  FOR track_key IN SELECT unnest(ARRAY['feedback']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('feedback', 'analysis', 'refinement', 'communication', 'collaboration')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Refinement
  FOR track_key IN SELECT unnest(ARRAY['refinement']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('refinement', 'iteration', 'testing', 'feedback', 'review')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Delivery
  FOR track_key IN SELECT unnest(ARRAY['delivery']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('implementation', 'documentation', 'delivery', 'review', 'communication')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Launch
  FOR track_key IN SELECT unnest(ARRAY['launch']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'implementation', 'delivery', 'launch', 'communication', 'documentation')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Rollout
  FOR track_key IN SELECT unnest(ARRAY['rollout']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'implementation', 'delivery', 'launch', 'communication', 'support')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Operations
  FOR track_key IN SELECT unnest(ARRAY['operations']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('implementation', 'maintenance', 'support', 'progress_tracking', 'reporting', 'communication')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Maintenance
  FOR track_key IN SELECT unnest(ARRAY['maintenance']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('maintenance', 'testing', 'refinement', 'documentation', 'reporting')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Support
  FOR track_key IN SELECT unnest(ARRAY['support']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('support', 'communication', 'documentation', 'reporting', 'collaboration')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- People Management
  FOR track_key IN SELECT unnest(ARRAY['people_management']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'communication', 'collaboration', 'feedback', 'review', 'reporting')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Self-Improvement
  FOR track_key IN SELECT unnest(ARRAY['self_improvement']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('learning', 'practice', 'review', 'progress_tracking', 'refinement')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Health Management
  FOR track_key IN SELECT unnest(ARRAY['health_management']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'practice', 'progress_tracking', 'review', 'reporting')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Learning
  FOR track_key IN SELECT unnest(ARRAY['learning']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('learning', 'practice', 'research', 'review', 'documentation')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Practice
  FOR track_key IN SELECT unnest(ARRAY['practice']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('practice', 'implementation', 'refinement', 'progress_tracking', 'review')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Reflection
  FOR track_key IN SELECT unnest(ARRAY['reflection']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('review', 'analysis', 'documentation', 'reporting')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Finance
  FOR track_key IN SELECT unnest(ARRAY['finance']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'analysis', 'documentation', 'reporting', 'review')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Legal
  FOR track_key IN SELECT unnest(ARRAY['legal']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('research', 'analysis', 'documentation', 'review', 'communication')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Administration
  FOR track_key IN SELECT unnest(ARRAY['administration']) LOOP
    FOR subtrack_cat_id IN 
      SELECT id FROM subtrack_categories WHERE key IN ('planning', 'implementation', 'documentation', 'reporting', 'communication')
    LOOP
      INSERT INTO track_category_subtrack_categories (track_category_key, subtrack_category_id)
      VALUES (track_key, subtrack_cat_id)
      ON CONFLICT (track_category_key, subtrack_category_id) DO NOTHING;
    END LOOP;
  END LOOP;

END $$;
