/*
  # Add User-Created Meals Support

  1. Changes
    - Add `created_by` column to `meal_library` table
    - Add `household_id` column to `meal_library` table for household-specific meals
    - Add `is_public` column to indicate if meal is available to all households
    - Create indexes for efficient querying
    - Update RLS policies to allow users to create their own meals
  
  2. Security
    - Users can create meals for their household
    - Users can view public meals and their household's meals
    - Users can update/delete only their own created meals
*/

-- Add new columns to meal_library table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_library' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE meal_library ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_library' AND column_name = 'household_id'
  ) THEN
    ALTER TABLE meal_library ADD COLUMN household_id uuid REFERENCES households(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_library' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE meal_library ADD COLUMN is_public boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meal_library_household_id ON meal_library(household_id);
CREATE INDEX IF NOT EXISTS idx_meal_library_created_by ON meal_library(created_by);
CREATE INDEX IF NOT EXISTS idx_meal_library_is_public ON meal_library(is_public);

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view public and household meals" ON meal_library;
DROP POLICY IF EXISTS "Users can create meals for their household" ON meal_library;
DROP POLICY IF EXISTS "Users can update their own meals" ON meal_library;
DROP POLICY IF EXISTS "Users can delete their own meals" ON meal_library;

-- Enable RLS
ALTER TABLE meal_library ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view public meals or meals from their household
CREATE POLICY "Users can view public and household meals"
  ON meal_library FOR SELECT
  TO authenticated
  USING (
    is_public = true 
    OR household_id IN (
      SELECT hm.household_id 
      FROM household_members hm
      INNER JOIN profiles p ON p.user_id = hm.user_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Policy: Users can create meals for their household
CREATE POLICY "Users can create meals for their household"
  ON meal_library FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND (
      household_id IS NULL
      OR household_id IN (
        SELECT hm.household_id 
        FROM household_members hm
        INNER JOIN profiles p ON p.user_id = hm.user_id
        WHERE p.user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own meals
CREATE POLICY "Users can update their own meals"
  ON meal_library FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Policy: Users can delete their own meals
CREATE POLICY "Users can delete their own meals"
  ON meal_library FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );