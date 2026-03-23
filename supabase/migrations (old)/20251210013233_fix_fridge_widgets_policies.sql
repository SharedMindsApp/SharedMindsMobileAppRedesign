/*
  # Fix Fridge Widgets RLS Policies

  1. Problem
    - Policies reference 'household_members' but table is named 'members'
    - Potential infinite recursion when checking members table
    
  2. Solution
    - Drop and recreate policies with correct table name
    - Use SECURITY DEFINER function to avoid recursion
    - Simplify policies to use direct checks
    
  3. Changes
    - Drop all existing fridge_widgets policies
    - Drop all existing fridge_widget_positions policies
    - Create helper function for household membership check
    - Recreate policies with correct table references
*/

-- Create helper function to check household membership (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION user_is_household_member(p_user_id uuid, p_household_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id 
    AND household_id = p_household_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing fridge_widgets policies
DROP POLICY IF EXISTS "Users can view household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can create household widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can update own widgets" ON fridge_widgets;
DROP POLICY IF EXISTS "Users can delete own widgets" ON fridge_widgets;

-- Recreate fridge_widgets policies without recursion
CREATE POLICY "Users can view household widgets"
  ON fridge_widgets FOR SELECT
  TO authenticated
  USING (
    user_is_household_member(auth.uid(), household_id)
  );

CREATE POLICY "Users can create household widgets"
  ON fridge_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_household_member(auth.uid(), household_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own widgets"
  ON fridge_widgets FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own widgets"
  ON fridge_widgets FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Drop existing fridge_widget_positions policies
DROP POLICY IF EXISTS "Users can view own positions" ON fridge_widget_positions;
DROP POLICY IF EXISTS "Users can create own positions" ON fridge_widget_positions;
DROP POLICY IF EXISTS "Users can update own positions" ON fridge_widget_positions;
DROP POLICY IF EXISTS "Users can delete own positions" ON fridge_widget_positions;

-- Recreate fridge_widget_positions policies (simpler, no recursion)
CREATE POLICY "Users can view own positions"
  ON fridge_widget_positions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own positions"
  ON fridge_widget_positions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own positions"
  ON fridge_widget_positions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own positions"
  ON fridge_widget_positions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
