/*
  # Fix Canvas SVG Objects RLS Policies

  ## Summary
  Simplifies the RLS policies for `canvas_svg_objects` to match the pattern used by `fridge_widgets`.
  Instead of checking the `spaces` table, we check the `space_members` table directly.

  ## Changes
  - Drop existing complex RLS policies on canvas_svg_objects
  - Create simple policies that check space_members table
  - Users can access SVG objects in spaces where they are members

  ## Security
  - Users can only access SVG objects in spaces they are members of
  - Uses the same pattern as fridge_widgets for consistency
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view canvas SVGs in accessible spaces" ON canvas_svg_objects;
DROP POLICY IF EXISTS "Users can create canvas SVGs in accessible spaces" ON canvas_svg_objects;
DROP POLICY IF EXISTS "Users can update canvas SVGs in accessible spaces" ON canvas_svg_objects;
DROP POLICY IF EXISTS "Users can delete canvas SVGs in accessible spaces" ON canvas_svg_objects;

-- SELECT policy: Members can view SVG objects in their spaces
CREATE POLICY "Members can view canvas SVGs in their space"
  ON canvas_svg_objects FOR SELECT
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
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
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE policy: Members can update SVG objects in their spaces
CREATE POLICY "Members can update canvas SVGs"
  ON canvas_svg_objects FOR UPDATE
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  );

-- DELETE policy: Members can delete SVG objects in their spaces
CREATE POLICY "Members can delete canvas SVGs"
  ON canvas_svg_objects FOR DELETE
  TO authenticated
  USING (
    space_id IN (
      SELECT space_id FROM space_members
      WHERE user_id = auth.uid()
    )
  );
