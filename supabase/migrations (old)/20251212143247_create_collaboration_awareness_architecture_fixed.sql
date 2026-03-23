/*
  # Create Collaboration Awareness Architecture (Fixed)

  ## Summary
  Implements a passive awareness and attribution system for Guardrails that tracks
  who is involved, what is being worked on, and where activity is happening.
  
  This is architecture only—no UI, notifications, automation, or real-time systems.
  Pure historical record for future awareness features.

  ## Core Principles
  1. Append-only activity log (no updates, no deletes)
  2. Awareness ≠ permission, assignment, or responsibility
  3. Queryable, auditable, future-ready
  4. Compatible with Shared Tracks, Personal Spaces, Mind Mesh
  5. Permission-safe queries only

  ## Changes
  1. Create enums for collaboration surfaces and activity types
  2. Create collaboration_activity table (append-only)
  3. Create query helper functions
  4. Add RLS policies for permission-safe access
*/

-- Step 1: Create collaboration surface type enum
DO $$ BEGIN
  CREATE TYPE collaboration_surface_type AS ENUM (
    'project',
    'track',
    'roadmap_item',
    'execution_unit',
    'taskflow',
    'mind_mesh',
    'personal_bridge',
    'side_project',
    'offshoot_idea'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create activity type enum
DO $$ BEGIN
  CREATE TYPE collaboration_activity_type AS ENUM (
    'created',
    'updated',
    'commented',
    'viewed',
    'linked',
    'unlinked',
    'status_changed',
    'deadline_changed',
    'assigned',
    'unassigned',
    'shared',
    'archived',
    'restored',
    'converted',
    'synced'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create collaboration_activity table (append-only)
CREATE TABLE IF NOT EXISTS collaboration_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,
  surface_type collaboration_surface_type NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  activity_type collaboration_activity_type NOT NULL,
  context_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Step 4: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_collab_activity_user 
  ON collaboration_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collab_activity_project 
  ON collaboration_activity(project_id, created_at DESC) 
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collab_activity_entity 
  ON collaboration_activity(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collab_activity_surface 
  ON collaboration_activity(surface_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collab_activity_type 
  ON collaboration_activity(activity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collab_activity_composite 
  ON collaboration_activity(entity_type, entity_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collab_activity_metadata 
  ON collaboration_activity USING gin(context_metadata);

-- Step 5: Add helpful comments
COMMENT ON TABLE collaboration_activity IS 
  'Append-only activity log for collaboration awareness. No updates, no deletes. Pure historical record.';

COMMENT ON COLUMN collaboration_activity.user_id IS 
  'User who performed the activity. Not necessarily the owner or assignee.';

COMMENT ON COLUMN collaboration_activity.project_id IS 
  'Project context for the activity. NULL for cross-project entities or personal spaces.';

COMMENT ON COLUMN collaboration_activity.surface_type IS 
  'High-level collaboration surface: project, track, roadmap_item, etc.';

COMMENT ON COLUMN collaboration_activity.entity_type IS 
  'Specific entity type: track, roadmap_item, mind_mesh_node, etc. More granular than surface_type.';

COMMENT ON COLUMN collaboration_activity.entity_id IS 
  'UUID of the entity that was acted upon.';

COMMENT ON COLUMN collaboration_activity.activity_type IS 
  'Type of activity: created, updated, viewed, linked, etc.';

COMMENT ON COLUMN collaboration_activity.context_metadata IS 
  'Additional context: changed fields, related entities, custom data. Flexible JSONB.';

-- Step 6: Create helper function to get collaborators for an entity
CREATE OR REPLACE FUNCTION get_entity_collaborators(
  input_entity_type text,
  input_entity_id uuid,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  activity_count bigint,
  last_activity_at timestamptz,
  activity_types text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.user_id,
    COUNT(*)::bigint as activity_count,
    MAX(ca.created_at) as last_activity_at,
    array_agg(DISTINCT ca.activity_type::text ORDER BY ca.activity_type::text) as activity_types
  FROM collaboration_activity ca
  WHERE ca.entity_type = input_entity_type
    AND ca.entity_id = input_entity_id
  GROUP BY ca.user_id
  ORDER BY MAX(ca.created_at) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 7: Create helper function to get user's collaboration footprint
CREATE OR REPLACE FUNCTION get_user_collaboration_footprint(
  input_user_id uuid,
  input_project_id uuid DEFAULT NULL,
  days_back int DEFAULT 30
)
RETURNS TABLE (
  surface_type collaboration_surface_type,
  entity_type text,
  entity_id uuid,
  activity_count bigint,
  last_activity_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.surface_type,
    ca.entity_type,
    ca.entity_id,
    COUNT(*)::bigint as activity_count,
    MAX(ca.created_at) as last_activity_at
  FROM collaboration_activity ca
  WHERE ca.user_id = input_user_id
    AND ca.created_at >= (now() - (days_back || ' days')::interval)
    AND (input_project_id IS NULL OR ca.project_id = input_project_id)
  GROUP BY ca.surface_type, ca.entity_type, ca.entity_id
  ORDER BY MAX(ca.created_at) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 8: Create helper function for project collaboration heatmap
CREATE OR REPLACE FUNCTION get_project_collaboration_heatmap(
  input_project_id uuid,
  days_back int DEFAULT 30
)
RETURNS TABLE (
  surface_type collaboration_surface_type,
  activity_count bigint,
  unique_users bigint,
  most_recent_activity timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.surface_type,
    COUNT(*)::bigint as activity_count,
    COUNT(DISTINCT ca.user_id)::bigint as unique_users,
    MAX(ca.created_at) as most_recent_activity
  FROM collaboration_activity ca
  WHERE ca.project_id = input_project_id
    AND ca.created_at >= (now() - (days_back || ' days')::interval)
  GROUP BY ca.surface_type
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 9: Create helper function to get active users for surface
CREATE OR REPLACE FUNCTION get_active_users_for_surface(
  input_surface_type collaboration_surface_type,
  input_entity_id uuid DEFAULT NULL,
  days_back int DEFAULT 7
)
RETURNS TABLE (
  user_id uuid,
  activity_count bigint,
  last_activity_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.user_id,
    COUNT(*)::bigint as activity_count,
    MAX(ca.created_at) as last_activity_at
  FROM collaboration_activity ca
  WHERE ca.surface_type = input_surface_type
    AND (input_entity_id IS NULL OR ca.entity_id = input_entity_id)
    AND ca.created_at >= (now() - (days_back || ' days')::interval)
  GROUP BY ca.user_id
  ORDER BY MAX(ca.created_at) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 10: Create helper function to find dormant entities
CREATE OR REPLACE FUNCTION get_dormant_entities_with_collaborators(
  input_project_id uuid,
  dormant_days int DEFAULT 30,
  min_collaborators int DEFAULT 2
)
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  last_activity_at timestamptz,
  collaborator_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH entity_stats AS (
    SELECT 
      ca.entity_type,
      ca.entity_id,
      MAX(ca.created_at) as last_activity_at,
      COUNT(DISTINCT ca.user_id)::bigint as collaborator_count
    FROM collaboration_activity ca
    WHERE ca.project_id = input_project_id
    GROUP BY ca.entity_type, ca.entity_id
  )
  SELECT 
    es.entity_type,
    es.entity_id,
    es.last_activity_at,
    es.collaborator_count
  FROM entity_stats es
  WHERE es.last_activity_at < (now() - (dormant_days || ' days')::interval)
    AND es.collaborator_count >= min_collaborators
  ORDER BY es.last_activity_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 11: Create helper function to get cross-project activity
CREATE OR REPLACE FUNCTION get_cross_project_entity_activity(
  input_entity_type text,
  input_entity_id uuid
)
RETURNS TABLE (
  project_id uuid,
  user_count bigint,
  activity_count bigint,
  last_activity_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.project_id,
    COUNT(DISTINCT ca.user_id)::bigint as user_count,
    COUNT(*)::bigint as activity_count,
    MAX(ca.created_at) as last_activity_at
  FROM collaboration_activity ca
  WHERE ca.entity_type = input_entity_type
    AND ca.entity_id = input_entity_id
    AND ca.project_id IS NOT NULL
  GROUP BY ca.project_id
  ORDER BY MAX(ca.created_at) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 12: Create helper function to get most collaborated tracks
CREATE OR REPLACE FUNCTION get_most_collaborated_tracks(
  input_project_id uuid DEFAULT NULL,
  limit_count int DEFAULT 10,
  days_back int DEFAULT 30
)
RETURNS TABLE (
  track_id uuid,
  collaborator_count bigint,
  activity_count bigint,
  last_activity_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.entity_id as track_id,
    COUNT(DISTINCT ca.user_id)::bigint as collaborator_count,
    COUNT(*)::bigint as activity_count,
    MAX(ca.created_at) as last_activity_at
  FROM collaboration_activity ca
  WHERE ca.entity_type = 'track'
    AND ca.created_at >= (now() - (days_back || ' days')::interval)
    AND (input_project_id IS NULL OR ca.project_id = input_project_id)
  GROUP BY ca.entity_id
  ORDER BY COUNT(DISTINCT ca.user_id) DESC, MAX(ca.created_at) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 13: Create helper function to get participation intensity
CREATE OR REPLACE FUNCTION get_participation_intensity(
  input_entity_type text,
  input_entity_id uuid,
  input_user_id uuid
)
RETURNS TABLE (
  total_activities bigint,
  first_activity_at timestamptz,
  last_activity_at timestamptz,
  days_active bigint,
  activity_types text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_activities,
    MIN(ca.created_at) as first_activity_at,
    MAX(ca.created_at) as last_activity_at,
    COUNT(DISTINCT DATE(ca.created_at))::bigint as days_active,
    array_agg(DISTINCT ca.activity_type::text ORDER BY ca.activity_type::text) as activity_types
  FROM collaboration_activity ca
  WHERE ca.entity_type = input_entity_type
    AND ca.entity_id = input_entity_id
    AND ca.user_id = input_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 14: Add RLS policies
ALTER TABLE collaboration_activity ENABLE ROW LEVEL SECURITY;

-- Users can view activity for projects they have access to
CREATE POLICY "Users can view collaboration activity for accessible projects"
  ON collaboration_activity
  FOR SELECT
  TO authenticated
  USING (
    project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = collaboration_activity.project_id
      AND mp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = collaboration_activity.project_id
      AND pu.user_id = auth.uid()
    )
  );

-- Users can insert their own activity records
CREATE POLICY "Users can create their own collaboration activity"
  ON collaboration_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- No updates allowed (append-only)
CREATE POLICY "No updates allowed on collaboration activity"
  ON collaboration_activity
  FOR UPDATE
  TO authenticated
  USING (false);

-- No deletes allowed (permanent record)
CREATE POLICY "No deletes allowed on collaboration activity"
  ON collaboration_activity
  FOR DELETE
  TO authenticated
  USING (false);

-- Step 15: Add comments on helper functions
COMMENT ON FUNCTION get_entity_collaborators(text, uuid, int) IS 
  'Get all collaborators for a specific entity, ranked by activity.';

COMMENT ON FUNCTION get_user_collaboration_footprint(uuid, uuid, int) IS 
  'Get all entities a user has interacted with, optionally scoped to a project.';

COMMENT ON FUNCTION get_project_collaboration_heatmap(uuid, int) IS 
  'Get collaboration intensity across different surfaces within a project.';

COMMENT ON FUNCTION get_active_users_for_surface(collaboration_surface_type, uuid, int) IS 
  'Get active users for a specific collaboration surface (e.g., all users active in tracks).';

COMMENT ON FUNCTION get_dormant_entities_with_collaborators(uuid, int, int) IS 
  'Find entities with multiple collaborators but no recent activity (potential stalled work).';

COMMENT ON FUNCTION get_cross_project_entity_activity(text, uuid) IS 
  'Get activity breakdown across projects for a shared entity (e.g., shared track).';

COMMENT ON FUNCTION get_most_collaborated_tracks(uuid, int, int) IS 
  'Get tracks with highest collaboration intensity.';

COMMENT ON FUNCTION get_participation_intensity(text, uuid, uuid) IS 
  'Get detailed participation metrics for a user on a specific entity.';
