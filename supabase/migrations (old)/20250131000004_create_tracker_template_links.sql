/*
  # Create Tracker Template Share Links
  
  1. Changes
    - Create tracker_template_links table for sharing templates via links
    - Supports expiry, max uses, and revocation
    - Tokens are unguessable secure random strings
  
  2. Notes
    - Templates are structure-only (no data)
    - Import always creates a copy
    - Links are owned by template creator
*/

-- Create tracker_template_links table
CREATE TABLE IF NOT EXISTS tracker_template_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES tracker_templates(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE,
  expires_at timestamptz,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT check_use_count_non_negative CHECK (use_count >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_template_links_template_id 
  ON tracker_template_links(template_id) 
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_template_links_created_by 
  ON tracker_template_links(created_by) 
  WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_links_token 
  ON tracker_template_links(share_token) 
  WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE tracker_template_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Template owners can create links for their templates
CREATE POLICY "Template owners can create links"
  ON tracker_template_links
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS(
      SELECT 1 FROM tracker_templates
      WHERE id = template_id
      AND owner_id = auth.uid()
      AND archived_at IS NULL
    )
  );

-- Template owners can view their own links
CREATE POLICY "Template owners can view their links"
  ON tracker_template_links
  FOR SELECT
  USING (
    created_by = auth.uid()
  );

-- Template owners can revoke their links
CREATE POLICY "Template owners can revoke their links"
  ON tracker_template_links
  FOR UPDATE
  USING (
    created_by = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- Anyone with the token can read the link (for preview/import)
CREATE POLICY "Token holders can read active links"
  ON tracker_template_links
  FOR SELECT
  USING (
    revoked_at IS NULL AND
    (expires_at IS NULL OR expires_at > now()) AND
    (max_uses IS NULL OR use_count < max_uses)
  );

-- System can update use_count (via service layer with SECURITY DEFINER if needed)
-- For now, we'll handle this in the service layer with proper checks

-- Function to get template via share token (bypasses RLS for preview)
-- This allows reading templates via valid share links
CREATE OR REPLACE FUNCTION get_template_by_share_token(p_token text)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  description text,
  version integer,
  field_schema jsonb,
  entry_granularity tracker_entry_granularity,
  is_system_template boolean,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
BEGIN
  -- Validate token and get template_id
  SELECT template_id INTO v_template_id
  FROM tracker_template_links
  WHERE share_token = p_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses);

  IF v_template_id IS NULL THEN
    RETURN; -- No rows returned
  END IF;

  -- Return template (bypasses RLS via SECURITY DEFINER)
  RETURN QUERY
  SELECT 
    t.id,
    t.owner_id,
    t.name,
    t.description,
    t.version,
    t.field_schema,
    t.entry_granularity,
    t.is_system_template,
    t.created_at,
    t.updated_at,
    t.archived_at
  FROM tracker_templates t
  WHERE t.id = v_template_id
    AND t.archived_at IS NULL;
END;
$$;

COMMENT ON FUNCTION get_template_by_share_token IS 'Returns template structure via valid share token. Bypasses RLS for preview/import.';

-- Comments
COMMENT ON TABLE tracker_template_links IS 'Share links for tracker templates. Import always creates a copy.';
COMMENT ON COLUMN tracker_template_links.share_token IS 'Unguessable secure random token for accessing template';
COMMENT ON COLUMN tracker_template_links.expires_at IS 'Optional expiry date. NULL = never expires.';
COMMENT ON COLUMN tracker_template_links.max_uses IS 'Optional maximum number of imports. NULL = unlimited.';
COMMENT ON COLUMN tracker_template_links.use_count IS 'Number of times this link has been used for import';
COMMENT ON COLUMN tracker_template_links.revoked_at IS 'Soft delete timestamp. Revoked links stop working.';
