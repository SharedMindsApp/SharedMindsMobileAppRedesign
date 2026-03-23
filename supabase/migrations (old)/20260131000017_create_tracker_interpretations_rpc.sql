/*
  # Create tracker_interpretations via RPC (Avoid RLS Recursion)
  
  Instead of creating a table with RLS, we use SECURITY DEFINER RPCs to handle
  all CRUD operations. This avoids RLS recursion issues.
  
  The data is stored in a table, but access is controlled entirely through RPCs
  that bypass RLS using SECURITY DEFINER.
*/

-- Create tracker_interpretations table (no RLS, access via RPC only)
CREATE TABLE IF NOT EXISTS tracker_interpretations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  tracker_ids uuid[],
  context_event_id uuid,
  title text,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  
  -- Constraints
  CONSTRAINT check_end_after_start CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT check_body_not_empty CHECK (trim(body) != ''),
  CONSTRAINT check_has_anchor CHECK (
    -- Must have at least one anchor: date range, tracker_ids, or context_event_id
    (tracker_ids IS NOT NULL AND array_length(tracker_ids, 1) > 0) OR
    context_event_id IS NOT NULL OR
    (start_date IS NOT NULL AND end_date IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interpretations_owner 
  ON tracker_interpretations(owner_id) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_interpretations_dates 
  ON tracker_interpretations(start_date, end_date) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_interpretations_context 
  ON tracker_interpretations(context_event_id) 
  WHERE archived_at IS NULL AND context_event_id IS NOT NULL;

-- GIN index for array searches (tracker_ids)
CREATE INDEX IF NOT EXISTS idx_interpretations_tracker_ids 
  ON tracker_interpretations USING GIN(tracker_ids) 
  WHERE archived_at IS NULL;

-- DO NOT enable RLS - access is controlled via RPCs only
-- ALTER TABLE tracker_interpretations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RPC Functions for CRUD Operations (SECURITY DEFINER)
-- ============================================================================

-- List interpretations (with filters)
CREATE OR REPLACE FUNCTION get_tracker_interpretations(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_tracker_id uuid DEFAULT NULL,
  p_context_event_id uuid DEFAULT NULL,
  p_include_archived boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  start_date date,
  end_date date,
  tracker_ids uuid[],
  context_event_id uuid,
  title text,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Return interpretations for current user only
  RETURN QUERY
  SELECT 
    ti.id,
    ti.owner_id,
    ti.start_date,
    ti.end_date,
    ti.tracker_ids,
    ti.context_event_id,
    ti.title,
    ti.body,
    ti.created_at,
    ti.updated_at,
    ti.archived_at
  FROM tracker_interpretations ti
  WHERE ti.owner_id = v_user_id
    AND (p_include_archived = true OR ti.archived_at IS NULL)
    AND (
      (p_start_date IS NULL AND p_end_date IS NULL)
      OR (
        ti.start_date <= COALESCE(p_end_date, ti.start_date)
        AND COALESCE(ti.end_date, ti.start_date) >= COALESCE(p_start_date, ti.start_date)
      )
    )
    AND (p_tracker_id IS NULL OR (ti.tracker_ids IS NOT NULL AND p_tracker_id = ANY(ti.tracker_ids)))
    AND (p_context_event_id IS NULL OR ti.context_event_id = p_context_event_id)
  ORDER BY ti.start_date DESC, ti.created_at DESC;
END;
$$;

-- Get single interpretation by ID
CREATE OR REPLACE FUNCTION get_tracker_interpretation(p_id uuid)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  start_date date,
  end_date date,
  tracker_ids uuid[],
  context_event_id uuid,
  title text,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Return interpretation if user owns it
  RETURN QUERY
  SELECT 
    ti.id,
    ti.owner_id,
    ti.start_date,
    ti.end_date,
    ti.tracker_ids,
    ti.context_event_id,
    ti.title,
    ti.body,
    ti.created_at,
    ti.updated_at,
    ti.archived_at
  FROM tracker_interpretations ti
  WHERE ti.id = p_id
    AND ti.owner_id = v_user_id
    AND ti.archived_at IS NULL
  LIMIT 1;
END;
$$;

-- Create interpretation
CREATE OR REPLACE FUNCTION create_tracker_interpretation(
  p_start_date date,
  p_body text,
  p_end_date date DEFAULT NULL,
  p_tracker_ids uuid[] DEFAULT NULL,
  p_context_event_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  start_date date,
  end_date date,
  tracker_ids uuid[],
  context_event_id uuid,
  title text,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate body
  IF p_body IS NULL OR trim(p_body) = '' THEN
    RAISE EXCEPTION 'Body is required';
  END IF;

  -- Validate dates
  IF p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
    RAISE EXCEPTION 'End date cannot be before start date';
  END IF;

  -- Validate anchor
  IF (p_tracker_ids IS NULL OR array_length(p_tracker_ids, 1) = 0) 
     AND p_context_event_id IS NULL 
     AND (p_start_date IS NULL OR p_end_date IS NULL) THEN
    RAISE EXCEPTION 'Interpretation must be anchored to at least one tracker, context event, or date range';
  END IF;

  -- Insert interpretation
  INSERT INTO tracker_interpretations (
    owner_id,
    start_date,
    end_date,
    tracker_ids,
    context_event_id,
    title,
    body
  )
  VALUES (
    v_user_id,
    p_start_date,
    p_end_date,
    p_tracker_ids,
    p_context_event_id,
    NULLIF(trim(p_title), ''),
    trim(p_body)
  )
  RETURNING tracker_interpretations.id INTO v_id;

  -- Return created interpretation
  RETURN QUERY
  SELECT 
    ti.id,
    ti.owner_id,
    ti.start_date,
    ti.end_date,
    ti.tracker_ids,
    ti.context_event_id,
    ti.title,
    ti.body,
    ti.created_at,
    ti.updated_at,
    ti.archived_at
  FROM tracker_interpretations ti
  WHERE ti.id = v_id;
END;
$$;

-- Update interpretation
CREATE OR REPLACE FUNCTION update_tracker_interpretation(
  p_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_tracker_ids uuid[] DEFAULT NULL,
  p_context_event_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_body text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  start_date date,
  end_date date,
  tracker_ids uuid[],
  context_event_id uuid,
  title text,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_existing RECORD;
  v_final_start_date date;
  v_final_end_date date;
  v_final_tracker_ids uuid[];
  v_final_context_event_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get existing interpretation
  SELECT * INTO v_existing
  FROM tracker_interpretations
  WHERE id = p_id AND owner_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interpretation not found or not authorized';
  END IF;

  -- Prevent updates to archived interpretations
  IF v_existing.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Archived interpretations cannot be modified';
  END IF;

  -- Determine final values
  v_final_start_date := COALESCE(p_start_date, v_existing.start_date);
  v_final_end_date := COALESCE(p_end_date, v_existing.end_date);
  v_final_tracker_ids := COALESCE(p_tracker_ids, v_existing.tracker_ids);
  v_final_context_event_id := COALESCE(p_context_event_id, v_existing.context_event_id);

  -- Validate body if provided
  IF p_body IS NOT NULL AND trim(p_body) = '' THEN
    RAISE EXCEPTION 'Body cannot be empty';
  END IF;

  -- Validate dates
  IF v_final_end_date IS NOT NULL AND v_final_end_date < v_final_start_date THEN
    RAISE EXCEPTION 'End date cannot be before start date';
  END IF;

  -- Validate anchor
  IF (v_final_tracker_ids IS NULL OR array_length(v_final_tracker_ids, 1) = 0) 
     AND v_final_context_event_id IS NULL 
     AND (v_final_start_date IS NULL OR v_final_end_date IS NULL) THEN
    RAISE EXCEPTION 'Interpretation must be anchored to at least one tracker, context event, or date range';
  END IF;

  -- Update interpretation
  UPDATE tracker_interpretations
  SET 
    start_date = v_final_start_date,
    end_date = v_final_end_date,
    tracker_ids = v_final_tracker_ids,
    context_event_id = v_final_context_event_id,
    title = CASE WHEN p_title IS NOT NULL THEN NULLIF(trim(p_title), '') ELSE title END,
    body = CASE WHEN p_body IS NOT NULL THEN trim(p_body) ELSE body END,
    updated_at = now()
  WHERE id = p_id AND owner_id = v_user_id;

  -- Return updated interpretation
  RETURN QUERY
  SELECT 
    ti.id,
    ti.owner_id,
    ti.start_date,
    ti.end_date,
    ti.tracker_ids,
    ti.context_event_id,
    ti.title,
    ti.body,
    ti.created_at,
    ti.updated_at,
    ti.archived_at
  FROM tracker_interpretations ti
  WHERE ti.id = p_id;
END;
$$;

-- Archive interpretation (soft delete)
CREATE OR REPLACE FUNCTION archive_tracker_interpretation(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Archive interpretation
  UPDATE tracker_interpretations
  SET archived_at = now(),
      updated_at = now()
  WHERE id = p_id AND owner_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interpretation not found or not authorized';
  END IF;
END;
$$;

-- Lock down SECURITY DEFINER functions (revoke from PUBLIC, grant to authenticated only)
REVOKE ALL ON FUNCTION get_tracker_interpretations(date, date, uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_tracker_interpretations(date, date, uuid, uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION get_tracker_interpretation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_tracker_interpretation(uuid) TO authenticated;

REVOKE ALL ON FUNCTION create_tracker_interpretation(date, text, date, uuid[], uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_tracker_interpretation(date, text, date, uuid[], uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION update_tracker_interpretation(uuid, date, date, uuid[], uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_tracker_interpretation(uuid, date, date, uuid[], uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION archive_tracker_interpretation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION archive_tracker_interpretation(uuid) TO authenticated;

-- Comments
COMMENT ON TABLE tracker_interpretations IS 'User-authored interpretations (personal meaning layer). Access controlled via RPCs only (no RLS) to avoid recursion.';
COMMENT ON FUNCTION get_tracker_interpretations IS 'List interpretations for current user with optional filters. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION get_tracker_interpretation IS 'Get single interpretation by ID. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION create_tracker_interpretation IS 'Create a new interpretation. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION update_tracker_interpretation IS 'Update an existing interpretation. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION archive_tracker_interpretation IS 'Archive (soft delete) an interpretation. Uses SECURITY DEFINER to bypass RLS.';
