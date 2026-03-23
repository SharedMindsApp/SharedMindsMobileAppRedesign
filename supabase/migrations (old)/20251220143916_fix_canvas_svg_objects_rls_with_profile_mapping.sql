/*
  # Fix Canvas SVG Objects RLS with Profile ID Mapping

  ## Summary
  Updates the RLS policies for `canvas_svg_objects` to properly map auth.uid() to profiles.id,
  since space_members.user_id references profiles.id, not auth.users.id.

  ## Changes
  - Drop existing RLS policies on canvas_svg_objects
  - Create new policies that properly map auth.uid() to profiles.id
  - Match the pattern used throughout the codebase for space membership checks

  ## Security
  - Users can only access SVG objects in spaces they are members of
  - Properly handles the auth.uid() -> profiles.id mapping
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view canvas SVGs in their space" ON canvas_svg_objects;
DROP POLICY IF EXISTS "Members can insert canvas SVGs" ON canvas_svg_objects;
DROP POLICY IF EXISTS "Members can update canvas SVGs" ON canvas_svg_objects;
DROP POLICY IF EXISTS "Members can delete canvas SVGs" ON canvas_svg_objects;

-- SELECT policy: Members can view SVG objects in their spaces
CREATE POLICY "Members can view canvas SVGs in their space"
  ON canvas_svg_objects FOR SELECT
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- INSERT policy: Members can create SVG objects in their spaces
CREATE POLICY "Members can insert canvas SVGs"
  ON canvas_svg_objects FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- UPDATE policy: Members can update SVG objects in their spaces
CREATE POLICY "Members can update canvas SVGs"
  ON canvas_svg_objects FOR UPDATE
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- DELETE policy: Members can delete SVG objects in their spaces
CREATE POLICY "Members can delete canvas SVGs"
  ON canvas_svg_objects FOR DELETE
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
