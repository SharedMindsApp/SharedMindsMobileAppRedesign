/*
  # Add UPDATE Policy for Fridge Widget Layouts

  The fridge_widget_layouts table was missing an UPDATE policy,
  preventing users from updating their widget positions.

  1. Changes
    - Add UPDATE policy allowing users to update their own layouts
*/

-- Add UPDATE policy for fridge_widget_layouts
CREATE POLICY "fwl_update"
  ON fridge_widget_layouts FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    member_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
