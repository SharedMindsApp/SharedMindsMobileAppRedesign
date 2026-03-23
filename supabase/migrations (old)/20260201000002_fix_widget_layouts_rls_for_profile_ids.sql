-- Fix RLS policies for fridge_widget_layouts to use profile.id instead of auth.uid()
-- The code sets member_id to profile.id (from profiles table), not auth.uid()
-- This migration updates all policies to match the actual data model

-- Drop existing policies that incorrectly check member_id = auth.uid()
DROP POLICY IF EXISTS "Users can view widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Users can create widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Users can update widget layouts" ON fridge_widget_layouts;
DROP POLICY IF EXISTS "Users can delete widget layouts" ON fridge_widget_layouts;

-- Users can view their own layouts (member_id is profile.id for current user)
CREATE POLICY "Users can view widget layouts"
  ON fridge_widget_layouts FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM fridge_widgets w
      WHERE w.id = widget_id
      AND w.deleted_at IS NULL
      AND user_can_access_space(auth.uid(), w.space_id)
    )
  );

-- Users can create their own layouts (member_id must be profile.id for current user)
CREATE POLICY "Users can create widget layouts"
  ON fridge_widget_layouts FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM fridge_widgets w
      WHERE w.id = widget_id
      AND w.deleted_at IS NULL
      AND user_can_access_space(auth.uid(), w.space_id)
    )
  );

-- Users can update their own layouts (member_id must be profile.id for current user)
CREATE POLICY "Users can update widget layouts"
  ON fridge_widget_layouts FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Users can delete their own layouts (member_id must be profile.id for current user)
CREATE POLICY "Users can delete widget layouts"
  ON fridge_widget_layouts FOR DELETE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
