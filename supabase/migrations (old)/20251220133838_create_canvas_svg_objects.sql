/*
  # Create Canvas SVG Objects System

  1. New Tables
    - `canvas_svg_objects`
      - `id` (uuid, primary key)
      - `space_id` (uuid, references spaces)
      - `source_file_id` (uuid, references files)
      - `x_position` (numeric) - X coordinate on canvas
      - `y_position` (numeric) - Y coordinate on canvas
      - `scale` (numeric, default 1.0) - Scale factor
      - `rotation` (numeric, default 0) - Rotation in degrees
      - `z_index` (integer, default 0) - Stacking order
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `canvas_svg_objects` table
    - Users can view SVG objects in spaces they have access to
    - Users can create SVG objects in spaces they can edit
    - Users can update/delete their own SVG objects or if they have edit access to the space
*/

-- Create canvas SVG objects table
CREATE TABLE IF NOT EXISTS canvas_svg_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  source_file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  x_position numeric NOT NULL DEFAULT 0,
  y_position numeric NOT NULL DEFAULT 0,
  scale numeric NOT NULL DEFAULT 1.0,
  rotation numeric NOT NULL DEFAULT 0,
  z_index integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE canvas_svg_objects ENABLE ROW LEVEL SECURITY;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS canvas_svg_objects_space_id_idx ON canvas_svg_objects(space_id);
CREATE INDEX IF NOT EXISTS canvas_svg_objects_z_index_idx ON canvas_svg_objects(space_id, z_index);

-- SELECT policy: Users can view SVG objects in spaces they have access to
CREATE POLICY "Users can view canvas SVGs in accessible spaces"
  ON canvas_svg_objects FOR SELECT
  TO authenticated
  USING (
    space_id IN (
      SELECT id FROM spaces WHERE
        (space_type = 'personal' AND owner_id = auth.uid()) OR
        (space_type = 'shared' AND id IN (
          SELECT space_id FROM space_members 
          WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND status = 'active'
        ))
    )
  );

-- INSERT policy: Users can create SVG objects in spaces they have access to
CREATE POLICY "Users can create canvas SVGs in accessible spaces"
  ON canvas_svg_objects FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    space_id IN (
      SELECT id FROM spaces WHERE
        (space_type = 'personal' AND owner_id = auth.uid()) OR
        (space_type = 'shared' AND id IN (
          SELECT space_id FROM space_members 
          WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND status = 'active'
        ))
    )
  );

-- UPDATE policy: Users can update canvas SVGs they created or in spaces they can edit
CREATE POLICY "Users can update canvas SVGs in accessible spaces"
  ON canvas_svg_objects FOR UPDATE
  TO authenticated
  USING (
    space_id IN (
      SELECT id FROM spaces WHERE
        (space_type = 'personal' AND owner_id = auth.uid()) OR
        (space_type = 'shared' AND id IN (
          SELECT space_id FROM space_members 
          WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND status = 'active'
        ))
    )
  )
  WITH CHECK (
    space_id IN (
      SELECT id FROM spaces WHERE
        (space_type = 'personal' AND owner_id = auth.uid()) OR
        (space_type = 'shared' AND id IN (
          SELECT space_id FROM space_members 
          WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND status = 'active'
        ))
    )
  );

-- DELETE policy: Users can delete canvas SVGs in spaces they can edit
CREATE POLICY "Users can delete canvas SVGs in accessible spaces"
  ON canvas_svg_objects FOR DELETE
  TO authenticated
  USING (
    space_id IN (
      SELECT id FROM spaces WHERE
        (space_type = 'personal' AND owner_id = auth.uid()) OR
        (space_type = 'shared' AND id IN (
          SELECT space_id FROM space_members 
          WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
          AND status = 'active'
        ))
    )
  );
