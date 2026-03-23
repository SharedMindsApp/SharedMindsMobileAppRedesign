/*
  # Create Project Users and Permissions System

  ## Summary
  This migration implements the foundational architecture for real user accounts and project-level
  permissions in Guardrails. It enables authenticated users to collaborate on projects with explicit
  role-based permissions.

  ## Core Principles
  - **People ≠ Users**: People can exist without accounts, users always have accounts
  - **Explicit Access Only**: Only authenticated users with explicit permissions can edit
  - **Project-Scoped**: Permissions apply per project, not globally
  - **Separation of Concerns**: Users and People remain separate concepts

  ## Tables Created
  1. `project_users`
    - Authenticated user membership per project
    - Role-based permissions (owner, editor, viewer)
    - Soft deletion via archived_at

  ## Schema Changes
  1. Add optional `linked_user_id` to `global_people`
    - Links a Global Person to an authenticated user account
    - Optional: People can exist without users
    - One-to-one: One user links to at most one global person

  ## Permission Roles
  - **owner**: Full edit rights, can manage project users
  - **editor**: Can edit project content, cannot manage users
  - **viewer**: Read-only access

  ## Security
  - RLS enabled on all tables
  - Users can only see projects they belong to
  - Owners can manage project members
  - Editors and viewers have read-only access to membership
*/

-- Step 1: Create project_user_role enum
DO $$ BEGIN
  CREATE TYPE project_user_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create project_users table
CREATE TABLE IF NOT EXISTS project_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  role project_user_role NOT NULL DEFAULT 'editor',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  
  CONSTRAINT unique_active_project_user UNIQUE (user_id, master_project_id)
);

-- Step 3: Add comment for documentation
COMMENT ON TABLE project_users IS 
  'Authenticated user membership and roles per project. Enables collaborative editing with explicit permissions.';

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(master_project_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_users_role ON project_users(role) WHERE archived_at IS NULL;

-- Step 5: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_users_updated_at ON project_users;
CREATE TRIGGER trigger_update_project_users_updated_at
  BEFORE UPDATE ON project_users
  FOR EACH ROW
  EXECUTE FUNCTION update_project_users_updated_at();

-- Step 6: Auto-create owner record when master_project is created
CREATE OR REPLACE FUNCTION auto_add_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_users (user_id, master_project_id, role)
  VALUES (NEW.user_id, NEW.id, 'owner')
  ON CONFLICT (user_id, master_project_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_add_project_owner ON master_projects;
CREATE TRIGGER trigger_auto_add_project_owner
  AFTER INSERT ON master_projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_project_owner();

-- Step 7: Enable Row Level Security
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;

-- Step 8: RLS Policies for project_users

-- Users can view project_users for projects they belong to
CREATE POLICY "Users can view members of their projects"
  ON project_users FOR SELECT
  TO authenticated
  USING (
    archived_at IS NULL AND
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = project_users.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.archived_at IS NULL
    )
  );

-- Only owners can add users to projects
CREATE POLICY "Owners can add users to projects"
  ON project_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = project_users.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role = 'owner'
      AND pu.archived_at IS NULL
    )
  );

-- Only owners can update user roles
CREATE POLICY "Owners can update user roles"
  ON project_users FOR UPDATE
  TO authenticated
  USING (
    archived_at IS NULL AND
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = project_users.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role = 'owner'
      AND pu.archived_at IS NULL
    )
  )
  WITH CHECK (
    archived_at IS NULL AND
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = project_users.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role = 'owner'
      AND pu.archived_at IS NULL
    )
  );

-- Only owners can remove users (soft delete)
CREATE POLICY "Owners can remove users from projects"
  ON project_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = project_users.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role = 'owner'
      AND pu.archived_at IS NULL
    )
  );

-- Step 9: Add identity linking to global_people
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'global_people' AND column_name = 'linked_user_id'
  ) THEN
    ALTER TABLE global_people 
    ADD COLUMN linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    
    -- Add unique constraint: one user can link to at most one global person
    ALTER TABLE global_people 
    ADD CONSTRAINT unique_linked_user_id UNIQUE (linked_user_id);
    
    -- Add index
    CREATE INDEX idx_global_people_linked_user_id ON global_people(linked_user_id);
    
    -- Add comment
    COMMENT ON COLUMN global_people.linked_user_id IS 
      'Optional link to authenticated user account. One user → one global person max. People can exist without users.';
  END IF;
END $$;

-- Step 10: Helper function to check if user has permission on project
CREATE OR REPLACE FUNCTION user_has_project_permission(
  p_user_id uuid,
  p_project_id uuid,
  p_required_role project_user_role
)
RETURNS boolean AS $$
DECLARE
  user_role project_user_role;
BEGIN
  -- Get user's role for this project
  SELECT role INTO user_role
  FROM project_users
  WHERE user_id = p_user_id
    AND master_project_id = p_project_id
    AND archived_at IS NULL;
  
  -- If user not found, no permission
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Owner has all permissions
  IF user_role = 'owner' THEN
    RETURN true;
  END IF;
  
  -- Editor can do editor and viewer actions
  IF user_role = 'editor' AND p_required_role IN ('editor', 'viewer') THEN
    RETURN true;
  END IF;
  
  -- Viewer can only do viewer actions
  IF user_role = 'viewer' AND p_required_role = 'viewer' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Helper function to check if user can edit project
CREATE OR REPLACE FUNCTION user_can_edit_project(
  p_user_id uuid,
  p_project_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN user_has_project_permission(p_user_id, p_project_id, 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Helper function to check if user can view project
CREATE OR REPLACE FUNCTION user_can_view_project(
  p_user_id uuid,
  p_project_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN user_has_project_permission(p_user_id, p_project_id, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Helper function to check if user is project owner
CREATE OR REPLACE FUNCTION user_is_project_owner(
  p_user_id uuid,
  p_project_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN user_has_project_permission(p_user_id, p_project_id, 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
