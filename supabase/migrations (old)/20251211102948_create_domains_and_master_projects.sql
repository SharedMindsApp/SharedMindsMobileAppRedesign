/*
  # Domains and Master Projects System

  1. New Tables
    - `domains`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, one of: work, personal, creative, health)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (user_id, name) to ensure one domain per type per user
    
    - `master_projects`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `domain_id` (uuid, foreign key to domains)
      - `name` (text)
      - `description` (text, nullable)
      - `status` (text, one of: active, completed, abandoned, default: active)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their domains and master projects
    - Only authenticated users can access their own data

  3. Indexes
    - Index on user_id for both tables
    - Index on domain_id for master_projects
    - Unique index on (user_id, domain_id, status='active') for master_projects to ensure only one active project per domain

  4. Notes
    - Each user gets 4 domains (work, personal, creative, health)
    - Each domain can have multiple master projects but only one can be active at a time
    - Master projects can be completed or abandoned, but never deleted (for history)
*/

-- Create domains table
CREATE TABLE IF NOT EXISTS domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (name IN ('work', 'personal', 'creative', 'health')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

-- Create master_projects table
CREATE TABLE IF NOT EXISTS master_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);
CREATE INDEX IF NOT EXISTS idx_master_projects_user_id ON master_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_master_projects_domain_id ON master_projects(domain_id);
CREATE INDEX IF NOT EXISTS idx_master_projects_status ON master_projects(status);

-- Create unique partial index to ensure only one active project per domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_projects_one_active_per_domain 
  ON master_projects(domain_id) 
  WHERE status = 'active';

-- Enable RLS on both tables
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_projects ENABLE ROW LEVEL SECURITY;

-- Domains policies
CREATE POLICY "Users can view their own domains"
  ON domains FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own domains"
  ON domains FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own domains"
  ON domains FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own domains"
  ON domains FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Master Projects policies
CREATE POLICY "Users can view their own master projects"
  ON master_projects FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create master projects in their domains"
  ON master_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM domains d 
      WHERE d.id = master_projects.domain_id 
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own master projects"
  ON master_projects FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own master projects"
  ON master_projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());