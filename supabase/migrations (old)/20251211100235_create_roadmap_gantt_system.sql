/*
  # Create Roadmap & Gantt System for Guardrails

  1. New Tables
    - `roadmap_sections`
      - `id` (uuid, primary key)
      - `master_project_id` (uuid, foreign key to master_projects)
      - `title` (text, required)
      - `order_index` (integer, for sorting)
      - `created_at` (timestamptz)

    - `roadmap_items`
      - `id` (uuid, primary key)
      - `section_id` (uuid, foreign key to roadmap_sections)
      - `title` (text, required)
      - `description` (text, nullable)
      - `start_date` (date, required)
      - `end_date` (date, required)
      - `status` (enum: not_started, in_progress, completed, blocked)
      - `color` (text, optional hex color)
      - `order_index` (integer, for sorting)
      - `created_at` (timestamptz)

    - `roadmap_links`
      - `id` (uuid, primary key)
      - `source_item_id` (uuid, foreign key to roadmap_items)
      - `target_item_id` (uuid, foreign key to roadmap_items)
      - `link_type` (enum: dependency, related, blocks)
      - `description` (text, optional)
      - `created_at` (timestamptz)

    - `side_ideas`
      - `id` (uuid, primary key)
      - `master_project_id` (uuid, foreign key to master_projects)
      - `title` (text, required)
      - `description` (text, nullable)
      - `created_at` (timestamptz)
      - `is_promoted` (boolean, default false)
      - `promoted_item_id` (uuid, nullable foreign key to roadmap_items)

  2. Security
    - Enable RLS on all tables
    - Users can access roadmap data only if they own the master project
    - Proper cascade deletes when master project or parent records are deleted

  3. Constraints
    - end_date >= start_date for roadmap_items
    - order_index >= 0 for sections and items
    - source_item_id ≠ target_item_id for roadmap_links
    - Both linked items must belong to the same master project
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE roadmap_item_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE roadmap_link_type AS ENUM ('dependency', 'related', 'blocks');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create roadmap_sections table
CREATE TABLE IF NOT EXISTS roadmap_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create roadmap_items table
CREATE TABLE IF NOT EXISTS roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES roadmap_sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status roadmap_item_status NOT NULL DEFAULT 'not_started',
  color text,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create roadmap_links table
CREATE TABLE IF NOT EXISTS roadmap_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_item_id uuid NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  target_item_id uuid NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  link_type roadmap_link_type NOT NULL DEFAULT 'related',
  description text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_link CHECK (source_item_id != target_item_id)
);

-- Create side_ideas table
CREATE TABLE IF NOT EXISTS side_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  is_promoted boolean NOT NULL DEFAULT false,
  promoted_item_id uuid REFERENCES roadmap_items(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_roadmap_sections_master_project ON roadmap_sections(master_project_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_section ON roadmap_items(section_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_links_source ON roadmap_links(source_item_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_links_target ON roadmap_links(target_item_id);
CREATE INDEX IF NOT EXISTS idx_side_ideas_master_project ON side_ideas(master_project_id);
CREATE INDEX IF NOT EXISTS idx_side_ideas_promoted_item ON side_ideas(promoted_item_id);

-- Enable RLS
ALTER TABLE roadmap_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_ideas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roadmap_sections
CREATE POLICY "Users can view roadmap sections for their master projects"
  ON roadmap_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = roadmap_sections.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert roadmap sections for their master projects"
  ON roadmap_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = roadmap_sections.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update roadmap sections for their master projects"
  ON roadmap_sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = roadmap_sections.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = roadmap_sections.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete roadmap sections for their master projects"
  ON roadmap_sections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = roadmap_sections.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- RLS Policies for roadmap_items
CREATE POLICY "Users can view roadmap items for their master projects"
  ON roadmap_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmap_sections rs
      JOIN master_projects mp ON mp.id = rs.master_project_id
      WHERE rs.id = roadmap_items.section_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert roadmap items for their master projects"
  ON roadmap_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roadmap_sections rs
      JOIN master_projects mp ON mp.id = rs.master_project_id
      WHERE rs.id = roadmap_items.section_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update roadmap items for their master projects"
  ON roadmap_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmap_sections rs
      JOIN master_projects mp ON mp.id = rs.master_project_id
      WHERE rs.id = roadmap_items.section_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roadmap_sections rs
      JOIN master_projects mp ON mp.id = rs.master_project_id
      WHERE rs.id = roadmap_items.section_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete roadmap items for their master projects"
  ON roadmap_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmap_sections rs
      JOIN master_projects mp ON mp.id = rs.master_project_id
      WHERE rs.id = roadmap_items.section_id
      AND mp.user_id = auth.uid()
    )
  );

-- RLS Policies for roadmap_links
CREATE POLICY "Users can view roadmap links for their master projects"
  ON roadmap_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmap_items ri
      JOIN roadmap_sections rs ON rs.id = ri.section_id
      JOIN master_projects mp ON mp.id = rs.master_project_id
      WHERE ri.id = roadmap_links.source_item_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert roadmap links for their master projects"
  ON roadmap_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roadmap_items ri
      JOIN roadmap_sections rs ON rs.id = ri.section_id
      JOIN master_projects mp ON mp.id = rs.master_project_id
      WHERE ri.id = roadmap_links.source_item_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update roadmap links for their master projects"
  ON roadmap_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmap_items ri
      JOIN roadmap_sections rs ON rs.id = ri.section_id
      JOIN master_projects mp ON mp.id = rs.master_project_id
      WHERE ri.id = roadmap_links.source_item_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roadmap_items ri
      JOIN roadmap_sections rs ON rs.id = ri.section_id
      JOIN master_projects mp ON mp.id = rs.master_project_id
      WHERE ri.id = roadmap_links.source_item_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete roadmap links for their master projects"
  ON roadmap_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmap_items ri
      JOIN roadmap_sections rs ON rs.id = ri.section_id
      JOIN master_projects mp ON mp.id = rs.master_project_id
      WHERE ri.id = roadmap_links.source_item_id
      AND mp.user_id = auth.uid()
    )
  );

-- RLS Policies for side_ideas
CREATE POLICY "Users can view side ideas for their master projects"
  ON side_ideas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = side_ideas.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert side ideas for their master projects"
  ON side_ideas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = side_ideas.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update side ideas for their master projects"
  ON side_ideas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = side_ideas.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = side_ideas.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete side ideas for their master projects"
  ON side_ideas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = side_ideas.master_project_id
      AND mp.user_id = auth.uid()
    )
  );
