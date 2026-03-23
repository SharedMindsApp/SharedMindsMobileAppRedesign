/*
  # Phase 1: Roadmap Projection RPC Function
  
  This migration creates a Postgres RPC function that efficiently reads
  roadmap projections with their domain entity data.
  
  Phase 0 Rule: Roadmap reads structure from roadmap_items, semantics from domain.
  
  The function returns roadmap structure with denormalized domain fields
  to avoid N+1 queries. This is a read-optimized projection.
*/

-- ============================================================================
-- get_roadmap_projection RPC Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_roadmap_projection(
  p_master_project_id uuid,
  p_track_id uuid DEFAULT NULL
)
RETURNS TABLE (
  -- Roadmap structure fields
  roadmap_item_id uuid,
  track_id uuid,
  subtrack_id uuid,
  parent_item_id uuid,
  order_index integer,
  item_depth integer,
  
  -- Entity reference
  domain_entity_type text,
  domain_entity_id uuid,
  
  -- Domain entity fields (denormalized for performance)
  title text,
  description text,
  status text,
  start_date date,
  end_date date,
  metadata jsonb,
  
  -- Task-specific fields (null for events)
  progress integer,
  due_at timestamptz,
  
  -- Event-specific fields (null for tasks)
  start_at timestamptz,
  end_at timestamptz,
  location text,
  timezone text,
  
  -- Timestamps
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ri.id as roadmap_item_id,
    ri.track_id,
    ri.subtrack_id,
    ri.parent_item_id,
    COALESCE(ri.order_index, 0) as order_index,  -- Note: roadmap_items uses 'order_index' not 'ordering_index'
    COALESCE(ri.item_depth, 0) as item_depth,
    
    -- Entity reference
    ri.domain_entity_type,
    ri.domain_entity_id,
    
    -- Domain fields (from appropriate table)
    CASE 
      WHEN ri.domain_entity_type = 'task' THEN gt.title
      WHEN ri.domain_entity_type = 'event' THEN ge.title
      ELSE ri.title  -- Fallback to roadmap legacy field if no domain entity
    END as title,
    
    CASE 
      WHEN ri.domain_entity_type = 'task' THEN gt.description
      WHEN ri.domain_entity_type = 'event' THEN ge.description
      ELSE ri.description
    END as description,
    
    CASE 
      WHEN ri.domain_entity_type = 'task' THEN gt.status::text
      WHEN ri.domain_entity_type = 'event' THEN NULL
      ELSE ri.status::text
    END as status,
    
    CASE 
      WHEN ri.domain_entity_type = 'task' THEN gt.due_at::date
      WHEN ri.domain_entity_type = 'event' THEN ge.start_at::date
      ELSE ri.start_date
    END as start_date,
    
    CASE 
      WHEN ri.domain_entity_type = 'task' THEN gt.due_at::date
      WHEN ri.domain_entity_type = 'event' THEN ge.end_at::date
      ELSE ri.end_date
    END as end_date,
    
    CASE 
      WHEN ri.domain_entity_type = 'task' THEN gt.metadata
      WHEN ri.domain_entity_type = 'event' THEN ge.metadata
      ELSE ri.metadata
    END as metadata,
    
    -- Task-specific
    CASE WHEN ri.domain_entity_type = 'task' THEN gt.progress ELSE NULL END as progress,
    CASE WHEN ri.domain_entity_type = 'task' THEN gt.due_at ELSE NULL END as due_at,
    
    -- Event-specific
    CASE WHEN ri.domain_entity_type = 'event' THEN ge.start_at ELSE NULL END as start_at,
    CASE WHEN ri.domain_entity_type = 'event' THEN ge.end_at ELSE NULL END as end_at,
    CASE WHEN ri.domain_entity_type = 'event' THEN ge.location ELSE NULL END as location,
    CASE WHEN ri.domain_entity_type = 'event' THEN ge.timezone ELSE NULL END as timezone,
    
    -- Timestamps
    CASE 
      WHEN ri.domain_entity_type = 'task' THEN gt.created_at
      WHEN ri.domain_entity_type = 'event' THEN ge.created_at
      ELSE ri.created_at
    END as created_at,
    
    CASE 
      WHEN ri.domain_entity_type = 'task' THEN gt.updated_at
      WHEN ri.domain_entity_type = 'event' THEN ge.updated_at
      ELSE ri.updated_at
    END as updated_at,
    
    ri.archived_at
    
  FROM roadmap_items ri
  LEFT JOIN guardrails_tasks gt ON ri.domain_entity_type = 'task' AND gt.id = ri.domain_entity_id
  LEFT JOIN guardrails_events ge ON ri.domain_entity_type = 'event' AND ge.id = ri.domain_entity_id
  WHERE ri.master_project_id = p_master_project_id
    AND ri.archived_at IS NULL
    AND (p_track_id IS NULL OR ri.track_id = p_track_id)
    AND (
      (ri.domain_entity_type = 'task' AND gt.archived_at IS NULL) OR
      (ri.domain_entity_type = 'event' AND ge.archived_at IS NULL) OR
      (ri.domain_entity_type IS NULL)  -- Legacy items without domain entity (shouldn't happen after migration)
    )
  ORDER BY ri.order_index;  -- Note: roadmap_items uses 'order_index' not 'ordering_index'
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_roadmap_projection(uuid, uuid) TO authenticated;
