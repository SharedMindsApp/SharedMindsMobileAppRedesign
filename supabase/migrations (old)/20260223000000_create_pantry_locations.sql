-- Create pantry_locations table
-- Pantry locations are scoped to spaces (personal/household/team)
-- Lightweight spatial organization without inventory pressure

CREATE TABLE IF NOT EXISTS pantry_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL,
  name text NOT NULL,
  icon text, -- optional emoji or icon key
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT pantry_locations_space_id_fkey 
    FOREIGN KEY (space_id) 
    REFERENCES households(id) 
    ON DELETE CASCADE
);

-- Add location_id to household_pantry_items (backward compatible)
ALTER TABLE household_pantry_items
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES pantry_locations(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pantry_locations_space_id 
  ON pantry_locations(space_id);

CREATE INDEX IF NOT EXISTS idx_pantry_locations_order 
  ON pantry_locations(space_id, order_index);

CREATE INDEX IF NOT EXISTS idx_pantry_items_location_id 
  ON household_pantry_items(location_id);

-- Enable RLS
ALTER TABLE pantry_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotence)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view pantry locations in their spaces" ON pantry_locations;
  DROP POLICY IF EXISTS "Users can create pantry locations in their spaces" ON pantry_locations;
  DROP POLICY IF EXISTS "Users can update pantry locations they created" ON pantry_locations;
  DROP POLICY IF EXISTS "Users can delete pantry locations they created" ON pantry_locations;
END $$;

-- RLS Policies for pantry_locations

-- SELECT: Users can view locations in spaces they have access to
CREATE POLICY "Users can view pantry locations in their spaces"
  ON pantry_locations
  FOR SELECT
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- INSERT: Users can create locations in spaces they have access to
CREATE POLICY "Users can create pantry locations in their spaces"
  ON pantry_locations
  FOR INSERT
  WITH CHECK (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- UPDATE: Users can update locations in spaces they have access to
CREATE POLICY "Users can update pantry locations they created"
  ON pantry_locations
  FOR UPDATE
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  )
  WITH CHECK (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- DELETE: Users can delete locations in spaces they have access to
CREATE POLICY "Users can delete pantry locations they created"
  ON pantry_locations
  FOR DELETE
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );
