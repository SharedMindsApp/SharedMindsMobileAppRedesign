/*
  # Fix Collections RLS to Use space_members Table

  1. Changes
    - Drop existing policies
    - Recreate policies using space_members table instead of members table
    - space_members tracks which users have access to which spaces
    - members table is for profile data, not space membership
  
  2. Security
    - Personal collections: User must own the collection
    - Shared collections: User must be in space_members for that space
    - All operations follow same pattern
*/

-- Drop all existing policies for collections
DROP POLICY IF EXISTS "Users can view own personal collections" ON collections;
DROP POLICY IF EXISTS "Users can view shared space collections" ON collections;
DROP POLICY IF EXISTS "Users can create personal collections" ON collections;
DROP POLICY IF EXISTS "Users can create shared space collections" ON collections;
DROP POLICY IF EXISTS "Users can update own personal collections" ON collections;
DROP POLICY IF EXISTS "Users can update shared space collections" ON collections;
DROP POLICY IF EXISTS "Users can delete own personal collections" ON collections;
DROP POLICY IF EXISTS "Users can delete shared space collections" ON collections;

-- Recreate policies for collections with correct table references

-- SELECT policies
CREATE POLICY "Users can view own personal collections"
  ON collections FOR SELECT
  TO authenticated
  USING (
    space_type = 'personal' AND user_id = auth.uid()
  );

CREATE POLICY "Users can view shared space collections"
  ON collections FOR SELECT
  TO authenticated
  USING (
    space_type = 'shared' AND
    space_id IN (
      SELECT space_id FROM space_members 
      WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND status = 'active'
    )
  );

-- INSERT policies
CREATE POLICY "Users can create personal collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (
    space_type = 'personal' AND 
    user_id = auth.uid() AND
    space_id IS NULL
  );

CREATE POLICY "Users can create shared space collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (
    space_type = 'shared' AND
    user_id = auth.uid() AND
    space_id IN (
      SELECT space_id FROM space_members 
      WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND status = 'active'
    )
  );

-- UPDATE policies
CREATE POLICY "Users can update own personal collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (space_type = 'personal' AND user_id = auth.uid())
  WITH CHECK (space_type = 'personal' AND user_id = auth.uid());

CREATE POLICY "Users can update shared space collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (
    space_type = 'shared' AND
    space_id IN (
      SELECT space_id FROM space_members 
      WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND status = 'active'
    )
  )
  WITH CHECK (
    space_type = 'shared' AND
    space_id IN (
      SELECT space_id FROM space_members 
      WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND status = 'active'
    )
  );

-- DELETE policies
CREATE POLICY "Users can delete own personal collections"
  ON collections FOR DELETE
  TO authenticated
  USING (space_type = 'personal' AND user_id = auth.uid());

CREATE POLICY "Users can delete shared space collections"
  ON collections FOR DELETE
  TO authenticated
  USING (
    space_type = 'shared' AND
    space_id IN (
      SELECT space_id FROM space_members 
      WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND status = 'active'
    )
  );

-- Drop all existing policies for collection_references
DROP POLICY IF EXISTS "Users can view references in accessible collections" ON collection_references;
DROP POLICY IF EXISTS "Users can add references to accessible collections" ON collection_references;
DROP POLICY IF EXISTS "Users can update references in accessible collections" ON collection_references;
DROP POLICY IF EXISTS "Users can remove references from accessible collections" ON collection_references;

-- Recreate policies for collection_references

-- SELECT policy
CREATE POLICY "Users can view references in accessible collections"
  ON collection_references FOR SELECT
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE
        (space_type = 'personal' AND user_id = auth.uid()) OR
        (space_type = 'shared' AND space_id IN (
          SELECT space_id FROM space_members 
          WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND status = 'active'
        ))
    )
  );

-- INSERT policy
CREATE POLICY "Users can add references to accessible collections"
  ON collection_references FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by = auth.uid() AND
    collection_id IN (
      SELECT id FROM collections WHERE
        (space_type = 'personal' AND user_id = auth.uid()) OR
        (space_type = 'shared' AND space_id IN (
          SELECT space_id FROM space_members 
          WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND status = 'active'
        ))
    )
  );

-- UPDATE policy
CREATE POLICY "Users can update references in accessible collections"
  ON collection_references FOR UPDATE
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE
        (space_type = 'personal' AND user_id = auth.uid()) OR
        (space_type = 'shared' AND space_id IN (
          SELECT space_id FROM space_members 
          WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND status = 'active'
        ))
    )
  )
  WITH CHECK (
    collection_id IN (
      SELECT id FROM collections WHERE
        (space_type = 'personal' AND user_id = auth.uid()) OR
        (space_type = 'shared' AND space_id IN (
          SELECT space_id FROM space_members 
          WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND status = 'active'
        ))
    )
  );

-- DELETE policy
CREATE POLICY "Users can remove references from accessible collections"
  ON collection_references FOR DELETE
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE
        (space_type = 'personal' AND user_id = auth.uid()) OR
        (space_type = 'shared' AND space_id IN (
          SELECT space_id FROM space_members 
          WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND status = 'active'
        ))
    )
  );
