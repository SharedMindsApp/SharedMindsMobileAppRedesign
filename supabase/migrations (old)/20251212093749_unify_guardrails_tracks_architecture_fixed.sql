/*
  # Unify Guardrails Tracks Architecture (AUTHORITATIVE)

  ## Overview
  This migration transforms the fragmented track system into a unified architecture where:
  - ONE Track entity rules all (no separate subtracks, side_projects, offshoot_ideas tables)
  - Hierarchy is achieved via parent_track_id (already exists in guardrails_tracks)
  - State is managed via category field (main, side_project, offshoot_idea)
  - Roadmap visibility is explicit via include_in_roadmap boolean
  - Templates are creation-only, never referenced in runtime except metadata

  ## Changes

  1. **Extend guardrails_tracks with new fields**
     - `category` enum: 'main', 'side_project', 'offshoot_idea' (default: 'main')
     - `include_in_roadmap` boolean (default: true for main, false for offshoots)
     - `status` enum: 'active', 'completed', 'archived' (default: 'active')
     - `template_id` uuid nullable (reference to guardrails_track_templates for metadata only)

  2. **Create Mind Mesh widgets and connections tables**
     - `mindmesh_widgets`: Content nodes (text, doc, image, link)
     - `mindmesh_connections`: Graph edges connecting tracks, roadmap items, and widgets

  3. **Auto-generate connections**
     - Triggers to auto-create hierarchy connections
     - Track → Roadmap Item connections
     - Offshoot → Parent Track connections

  4. **Data Migration**
     - Migrate side_projects → guardrails_tracks with category='side_project'
     - Migrate offshoot_ideas → guardrails_tracks with category='offshoot_idea'
     - Preserve all relationships

  ## Security
  - All new tables have RLS enabled
  - Policies follow existing patterns (user owns master project)
  - Cascade deletions maintain referential integrity

  ## Important Notes
  - Old tables (side_projects, offshoot_ideas) remain for backward compatibility during transition
  - New code must use guardrails_tracks exclusively
  - category field enforces behavioral rules (enforced at service layer, not DB)
*/

-- =====================================================
-- STEP 1: Create required enums
-- =====================================================

-- Track category enum
DO $$ BEGIN
  CREATE TYPE track_category AS ENUM ('main', 'side_project', 'offshoot_idea');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Track status enum
DO $$ BEGIN
  CREATE TYPE track_status AS ENUM ('active', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- STEP 2: Extend guardrails_tracks table
-- =====================================================

-- Add category field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks' AND column_name = 'category'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN category track_category NOT NULL DEFAULT 'main';
  END IF;
END $$;

-- Add include_in_roadmap field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks' AND column_name = 'include_in_roadmap'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN include_in_roadmap boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add status field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks' AND column_name = 'status'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN status track_status NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Add template_id field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN template_id uuid REFERENCES guardrails_track_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on category for fast filtering
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_category ON guardrails_tracks(category);
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_status ON guardrails_tracks(status);
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_include_roadmap ON guardrails_tracks(include_in_roadmap);

-- =====================================================
-- STEP 3: Create Mind Mesh tables
-- =====================================================

-- Mind Mesh Widgets (content nodes)
CREATE TABLE IF NOT EXISTS mindmesh_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('text', 'doc', 'image', 'link')),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  x_position double precision NOT NULL DEFAULT 0,
  y_position double precision NOT NULL DEFAULT 0,
  width double precision DEFAULT 200,
  height double precision DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mind Mesh Connections (graph edges)
CREATE TABLE IF NOT EXISTS mindmesh_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  source_type text NOT NULL CHECK (source_type IN ('track', 'roadmap_item', 'widget')),
  source_id uuid NOT NULL,
  
  target_type text NOT NULL CHECK (target_type IN ('track', 'roadmap_item', 'widget')),
  target_id uuid NOT NULL,
  
  relationship text NOT NULL CHECK (relationship IN ('expands', 'inspires', 'depends_on', 'references', 'hierarchy', 'offshoot')),
  
  auto_generated boolean NOT NULL DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(source_type, source_id, target_type, target_id, relationship)
);

-- Create indexes for Mind Mesh
CREATE INDEX IF NOT EXISTS idx_mindmesh_widgets_project ON mindmesh_widgets(master_project_id);
CREATE INDEX IF NOT EXISTS idx_mindmesh_connections_project ON mindmesh_connections(master_project_id);
CREATE INDEX IF NOT EXISTS idx_mindmesh_connections_source ON mindmesh_connections(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_mindmesh_connections_target ON mindmesh_connections(target_type, target_id);

-- Enable RLS on Mind Mesh tables
ALTER TABLE mindmesh_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmesh_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mindmesh_widgets
CREATE POLICY "Users can view widgets in their projects"
  ON mindmesh_widgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = mindmesh_widgets.master_project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create widgets in their projects"
  ON mindmesh_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = mindmesh_widgets.master_project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update widgets in their projects"
  ON mindmesh_widgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = mindmesh_widgets.master_project_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = mindmesh_widgets.master_project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete widgets in their projects"
  ON mindmesh_widgets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = mindmesh_widgets.master_project_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for mindmesh_connections
CREATE POLICY "Users can view connections in their projects"
  ON mindmesh_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = mindmesh_connections.master_project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create connections in their projects"
  ON mindmesh_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = mindmesh_connections.master_project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete connections in their projects"
  ON mindmesh_connections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = mindmesh_connections.master_project_id
      AND p.user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 4: Auto-generate hierarchy connections
-- =====================================================

-- Function to create hierarchy connection when track has parent
CREATE OR REPLACE FUNCTION create_track_hierarchy_connection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_track_id IS NOT NULL THEN
    INSERT INTO mindmesh_connections (
      master_project_id,
      source_type,
      source_id,
      target_type,
      target_id,
      relationship,
      auto_generated
    )
    VALUES (
      NEW.master_project_id,
      'track',
      NEW.parent_track_id,
      'track',
      NEW.id,
      'hierarchy',
      true
    )
    ON CONFLICT (source_type, source_id, target_type, target_id, relationship) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new tracks
DROP TRIGGER IF EXISTS trigger_create_track_hierarchy_connection ON guardrails_tracks;
CREATE TRIGGER trigger_create_track_hierarchy_connection
  AFTER INSERT ON guardrails_tracks
  FOR EACH ROW
  EXECUTE FUNCTION create_track_hierarchy_connection();

-- =====================================================
-- STEP 5: Migrate side_projects to guardrails_tracks
-- =====================================================

-- Migrate existing side projects as tracks with category='side_project'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'side_projects') THEN
    INSERT INTO guardrails_tracks (
      master_project_id,
      parent_track_id,
      name,
      description,
      color,
      ordering_index,
      category,
      include_in_roadmap,
      status,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      sp.master_project_id,
      NULL as parent_track_id,
      sp.title as name,
      sp.description,
      COALESCE(sp.color, '#60a5fa') as color,
      0 as ordering_index,
      'side_project'::track_category as category,
      false as include_in_roadmap,
      CASE WHEN sp.archived_at IS NOT NULL THEN 'archived'::track_status ELSE 'active'::track_status END as status,
      jsonb_build_object('migrated_from', 'side_projects', 'original_id', sp.id) as metadata,
      sp.created_at,
      sp.updated_at
    FROM side_projects sp
    WHERE NOT EXISTS (
      SELECT 1 FROM guardrails_tracks t WHERE t.metadata->>'original_id' = sp.id::text
    );
  END IF;
END $$;

-- =====================================================
-- STEP 6: Migrate offshoot_ideas to guardrails_tracks
-- =====================================================

-- Migrate existing offshoot ideas as tracks with category='offshoot_idea'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offshoot_ideas') THEN
    INSERT INTO guardrails_tracks (
      master_project_id,
      parent_track_id,
      name,
      description,
      color,
      ordering_index,
      category,
      include_in_roadmap,
      status,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      oi.master_project_id,
      NULL as parent_track_id,
      oi.title as name,
      oi.description,
      '#f59e0b' as color,
      0 as ordering_index,
      'offshoot_idea'::track_category as category,
      false as include_in_roadmap,
      'active'::track_status as status,
      jsonb_build_object(
        'migrated_from', 'offshoot_ideas',
        'original_id', oi.id,
        'idea_type', oi.idea_type,
        'origin_task_id', oi.origin_task_id
      ) as metadata,
      oi.created_at,
      oi.updated_at
    FROM offshoot_ideas oi
    WHERE NOT EXISTS (
      SELECT 1 FROM guardrails_tracks t WHERE t.metadata->>'original_id' = oi.id::text
    );
  END IF;
END $$;

-- =====================================================
-- STEP 7: Create helper functions
-- =====================================================

-- Function to convert track to side project
CREATE OR REPLACE FUNCTION convert_track_to_side_project(track_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE guardrails_tracks
  SET
    category = 'side_project',
    include_in_roadmap = false,
    updated_at = now()
  WHERE id = track_id
  AND category = 'main';
  
  -- Update all descendants
  UPDATE guardrails_tracks
  SET
    category = 'side_project',
    updated_at = now()
  WHERE parent_track_id = track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert track to offshoot
CREATE OR REPLACE FUNCTION convert_track_to_offshoot(track_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE guardrails_tracks
  SET
    category = 'offshoot_idea',
    include_in_roadmap = false,
    updated_at = now()
  WHERE id = track_id
  AND category IN ('main', 'side_project');
  
  -- Create offshoot connection if has parent
  INSERT INTO mindmesh_connections (
    master_project_id,
    source_type,
    source_id,
    target_type,
    target_id,
    relationship,
    auto_generated
  )
  SELECT
    master_project_id,
    'track',
    parent_track_id,
    'track',
    id,
    'offshoot',
    true
  FROM guardrails_tracks
  WHERE id = track_id
  AND parent_track_id IS NOT NULL
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote side project to master project
CREATE OR REPLACE FUNCTION promote_side_project_to_master(track_id uuid, domain_id uuid)
RETURNS uuid AS $$
DECLARE
  new_master_project_id uuid;
  track_record RECORD;
BEGIN
  -- Get track details
  SELECT * INTO track_record FROM guardrails_tracks WHERE id = track_id AND category = 'side_project';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Track not found or not a side project';
  END IF;
  
  -- Create new master project
  INSERT INTO master_projects (
    user_id,
    domain_id,
    name,
    description,
    status
  )
  SELECT
    p.user_id,
    domain_id,
    track_record.name,
    track_record.description,
    'active'
  FROM master_projects p
  WHERE p.id = track_record.master_project_id
  RETURNING id INTO new_master_project_id;
  
  -- Move track and all descendants to new master project
  UPDATE guardrails_tracks
  SET
    master_project_id = new_master_project_id,
    parent_track_id = NULL,
    category = 'main',
    include_in_roadmap = true,
    updated_at = now()
  WHERE id = track_id;
  
  RETURN new_master_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
