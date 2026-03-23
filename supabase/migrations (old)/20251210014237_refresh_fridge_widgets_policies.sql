/*
  # Refresh Fridge Widgets RLS Policies
  
  This migration refreshes the RLS policies for fridge_widgets to ensure
  PostgREST's schema cache properly recognizes the household_members.status column.
  
  1. Changes
    - Drop and recreate fridge_widgets policies to refresh schema cache
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can create household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can update own widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can delete own widgets" ON fridge_widgets;

-- Recreate policies with same logic

-- Users can view widgets in their household
CREATE POLICY "Users can view household widgets"
  ON fridge_widgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = fridge_widgets.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.status = 'active'
    )
  );

-- Users can create widgets in their household
CREATE POLICY "Users can create household widgets"
  ON fridge_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = fridge_widgets.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.status = 'active'
    )
    AND created_by = auth.uid()
  );

-- Users can update widgets they created
CREATE POLICY "Users can update own widgets"
  ON fridge_widgets FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete widgets they created
CREATE POLICY "Users can delete own widgets"
  ON fridge_widgets FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
