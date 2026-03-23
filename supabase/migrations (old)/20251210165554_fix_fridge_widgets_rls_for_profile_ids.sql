/*
  # Fix Fridge Widgets RLS Policies for Profile IDs

  The fridge_widgets table uses profile.id for created_by, but policies
  were checking against auth.uid(). This migration fixes all policies
  to properly check profile IDs.

  1. Changes
    - Drop and recreate INSERT policies to check profile.id properly
    - Update DELETE policies to check profile ownership correctly
    - Update UPDATE policies to check profile ownership correctly
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can insert household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can delete own widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can delete household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can update own widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can update household widgets" ON fridge_widgets;

-- Create corrected INSERT policy
CREATE POLICY "Users can create household widgets"
  ON fridge_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be an active member of the household
    EXISTS (
      SELECT 1 FROM household_members hm
      JOIN profiles p ON p.id = hm.user_id
      WHERE hm.household_id = fridge_widgets.household_id
        AND p.user_id = auth.uid()
        AND hm.status = 'active'
    )
    AND
    -- created_by must be the user's profile ID
    created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Create corrected DELETE policy for own widgets
CREATE POLICY "Users can delete own widgets"
  ON fridge_widgets FOR DELETE
  TO authenticated
  USING (
    created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Create corrected UPDATE policy for own widgets
CREATE POLICY "Users can update own widgets"
  ON fridge_widgets FOR UPDATE
  TO authenticated
  USING (
    created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Allow household members to update shared widgets
CREATE POLICY "Users can update household widgets"
  ON fridge_widgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      JOIN profiles p ON p.id = hm.user_id
      WHERE hm.household_id = fridge_widgets.household_id
        AND p.user_id = auth.uid()
        AND hm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      JOIN profiles p ON p.id = hm.user_id
      WHERE hm.household_id = fridge_widgets.household_id
        AND p.user_id = auth.uid()
        AND hm.status = 'active'
    )
  );
