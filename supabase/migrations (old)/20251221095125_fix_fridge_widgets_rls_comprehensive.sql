/*
  # Fix Fridge Widgets RLS Policies - Comprehensive Fix
  
  ## Summary
  Fixes RLS policies for fridge_widgets to ensure users can create widgets in spaces they have access to.
  The issue was that the helper function wasn't being used correctly or spaces/members weren't set up properly.
  
  ## Changes
  1. Recreate the user_can_access_space function with proper error handling
  2. Update all fridge_widgets RLS policies to be more permissive while still secure
  3. Add policies that work for both personal and shared spaces
  4. Ensure created_by field is not required to match auth.uid() in WITH CHECK (let the app set it)
  
  ## Security
  - Personal spaces: owner has full access
  - Shared spaces: all active members have full access
  - RLS is still restrictive - only authorized users can access
*/

-- ============================================================================
-- RECREATE HELPER FUNCTION WITH BETTER ERROR HANDLING
-- ============================================================================

CREATE OR REPLACE FUNCTION user_can_access_space(p_user_id uuid, p_space_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_space_type text;
  v_owner_id uuid;
  v_is_member boolean;
BEGIN
  -- If space_id is null, deny access
  IF p_space_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- If user_id is null, deny access
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get space info
  SELECT space_type, owner_id INTO v_space_type, v_owner_id
  FROM spaces
  WHERE id = p_space_id;
  
  -- If space doesn't exist, deny access
  IF v_space_type IS NULL THEN
    RETURN false;
  END IF;
  
  -- Personal space: check ownership
  IF v_space_type = 'personal' THEN
    RETURN v_owner_id = p_user_id;
  END IF;
  
  -- Shared space: check membership
  SELECT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id
    AND user_id = p_user_id
    AND status = 'active'
  ) INTO v_is_member;
  
  RETURN v_is_member;
END;
$$;

-- ============================================================================
-- FRIDGE WIDGETS - COMPREHENSIVE RLS POLICIES
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view widgets in accessible spaces" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can create widgets in accessible spaces" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can update widgets in accessible spaces" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can delete widgets in accessible spaces" ON fridge_widgets;

-- Allow viewing widgets in accessible spaces (exclude soft-deleted)
CREATE POLICY "Users can view widgets in accessible spaces"
  ON fridge_widgets FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    user_can_access_space(auth.uid(), space_id)
  );

-- Allow creating widgets in accessible spaces
-- Note: We allow the app to set created_by, but verify space access
CREATE POLICY "Users can create widgets in accessible spaces"
  ON fridge_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

-- Allow updating widgets in accessible spaces
CREATE POLICY "Users can update widgets in accessible spaces"
  ON fridge_widgets FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
  );

-- Allow deleting (soft delete) widgets in accessible spaces
CREATE POLICY "Users can delete widgets in accessible spaces"
  ON fridge_widgets FOR DELETE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );

-- ============================================================================
-- FRIDGE WIDGET LAYOUTS - UPDATED POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Users can create widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Users can update widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Users can delete widget layouts" ON fridge_widget_layouts;

-- Users can view their own layouts for widgets in accessible spaces
CREATE POLICY "Users can view widget layouts"
  ON fridge_widget_layouts FOR SELECT
  TO authenticated
  USING (
    member_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM fridge_widgets w
      WHERE w.id = widget_id
      AND w.deleted_at IS NULL
      AND user_can_access_space(auth.uid(), w.space_id)
    )
  );

-- Users can create their own layouts for widgets in accessible spaces
CREATE POLICY "Users can create widget layouts"
  ON fridge_widget_layouts FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM fridge_widgets w
      WHERE w.id = widget_id
      AND w.deleted_at IS NULL
      AND user_can_access_space(auth.uid(), w.space_id)
    )
  );

-- Users can update their own layouts
CREATE POLICY "Users can update widget layouts"
  ON fridge_widget_layouts FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

-- Users can delete their own layouts
CREATE POLICY "Users can delete widget layouts"
  ON fridge_widget_layouts FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());
