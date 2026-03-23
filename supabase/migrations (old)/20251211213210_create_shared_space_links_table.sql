/*
  # Create Shared Space Links System

  1. New Table
    - `shared_space_links`
      - `id` (uuid, primary key)
      - `shared_space_id` (uuid, FK to spaces)
      - `item_type` (text - calendar, task, note, roadmap_item, goal, etc.)
      - `item_id` (uuid - reference to original item)
      - `link_type` (text - send, duplicate, linked)
      - `allow_edit` (boolean - whether shared space can edit)
      - `created_by` (uuid - FK to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Members of shared space can view links
    - Only creator can add/update/delete links
*/

CREATE TABLE IF NOT EXISTS shared_space_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN (
    'calendar_event',
    'task',
    'note',
    'roadmap_item',
    'goal',
    'habit',
    'reminder',
    'offshoot_idea',
    'side_project',
    'focus_session',
    'mind_mesh_node',
    'fridge_widget'
  )),
  item_id uuid NOT NULL,
  link_type text NOT NULL DEFAULT 'send' CHECK (link_type IN ('send', 'duplicate', 'linked')),
  allow_edit boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shared_space_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Space members can view shared space links"
  ON shared_space_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = shared_space_links.shared_space_id
      AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND space_members.status = 'active'
    )
  );

CREATE POLICY "Users can insert shared space links to spaces they are members of"
  ON shared_space_links FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = shared_space_links.shared_space_id
      AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND space_members.status = 'active'
    )
  );

CREATE POLICY "Users can update their own shared space links"
  ON shared_space_links FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own shared space links"
  ON shared_space_links FOR DELETE
  TO authenticated
  USING (created_by = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_shared_space_links_shared_space_id ON shared_space_links(shared_space_id);
CREATE INDEX IF NOT EXISTS idx_shared_space_links_item ON shared_space_links(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_shared_space_links_created_by ON shared_space_links(created_by);
