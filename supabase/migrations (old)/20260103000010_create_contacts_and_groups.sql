/*
  # Create Contacts and Groups System
  
  This migration creates a minimal contacts system for sharing permissions.
  Contacts are owned by users and can optionally link to authenticated users.
  
  1. Tables
    - contacts: User-owned contacts (can link to auth.users)
    - contact_groups: User-owned groups of contacts
    - contact_group_members: Many-to-many relationship
    
  2. Safety
    - All tables have RLS enabled
    - Users can only access their own contacts
    - Additive only (no breaking changes)
*/

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contact information
  display_name text NOT NULL,
  email text,
  linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadata
  tags text[] DEFAULT '{}',
  notes text,
  avatar_url text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contact_groups table
CREATE TABLE IF NOT EXISTS contact_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Group information
  name text NOT NULL,
  description text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_group_name_per_owner UNIQUE (owner_user_id, name)
);

-- Create contact_group_members table
CREATE TABLE IF NOT EXISTS contact_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_group_member UNIQUE (group_id, contact_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_linked_user ON contacts(linked_user_id) WHERE linked_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_groups_owner ON contact_groups(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_group ON contact_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_contact ON contact_group_members(contact_id);

-- Create partial unique index for email per owner (only when email is not null)
CREATE UNIQUE INDEX IF NOT EXISTS unique_contact_email_per_owner 
  ON contacts(owner_user_id, email) 
  WHERE email IS NOT NULL;

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
CREATE POLICY "Users can view their own contacts"
  ON contacts FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create their own contacts"
  ON contacts FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own contacts"
  ON contacts FOR UPDATE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their own contacts"
  ON contacts FOR DELETE
  USING (owner_user_id = auth.uid());

-- RLS Policies for contact_groups
CREATE POLICY "Users can view their own groups"
  ON contact_groups FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create their own groups"
  ON contact_groups FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own groups"
  ON contact_groups FOR UPDATE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their own groups"
  ON contact_groups FOR DELETE
  USING (owner_user_id = auth.uid());

-- RLS Policies for contact_group_members
CREATE POLICY "Users can view members of their groups"
  ON contact_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contact_groups
      WHERE id = contact_group_members.group_id
      AND owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add members to their groups"
  ON contact_group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contact_groups
      WHERE id = contact_group_members.group_id
      AND owner_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM contacts
      WHERE id = contact_group_members.contact_id
      AND owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove members from their groups"
  ON contact_group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contact_groups
      WHERE id = contact_group_members.group_id
      AND owner_user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

CREATE TRIGGER update_contact_groups_updated_at
  BEFORE UPDATE ON contact_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

-- Add comments
COMMENT ON TABLE contacts IS 'User-owned contacts for sharing permissions. Can optionally link to authenticated users.';
COMMENT ON TABLE contact_groups IS 'User-owned groups of contacts for bulk sharing.';
COMMENT ON TABLE contact_group_members IS 'Many-to-many relationship between groups and contacts.';

