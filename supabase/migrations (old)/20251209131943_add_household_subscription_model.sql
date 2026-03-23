/*
  # Add Household Subscription Model
  
  1. Changes to Existing Tables
    - Add plan and billing_owner_id to households table
  
  2. New Tables
    - household_members table for user-level access control
  
  3. Security
    - RLS policies for household_members table
    - Only billing owners can manage memberships
*/

-- Add columns to households table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'households' AND column_name = 'plan'
  ) THEN
    ALTER TABLE households ADD COLUMN plan text DEFAULT 'free' NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'households' AND column_name = 'billing_owner_id'
  ) THEN
    ALTER TABLE households ADD COLUMN billing_owner_id uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Create household_members table
CREATE TABLE IF NOT EXISTS household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending',
  invite_token text UNIQUE,
  invited_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  CONSTRAINT valid_role CHECK (role IN ('owner', 'member')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'left'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_email ON household_members(email);
CREATE INDEX IF NOT EXISTS idx_household_members_invite_token ON household_members(invite_token);

-- Enable RLS
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of households they belong to
CREATE POLICY "Users can view household members"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      ) AND status = 'active'
    )
    OR email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Only billing owners can insert invites
CREATE POLICY "Billing owners can invite members"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      JOIN profiles p ON hm.user_id = p.id
      WHERE hm.household_id = household_members.household_id
      AND p.user_id = auth.uid()
      AND hm.role = 'owner'
      AND hm.status = 'active'
    )
  );

-- Users can update their own pending invites to accept them
CREATE POLICY "Users can accept invites"
  ON household_members FOR UPDATE
  TO authenticated
  USING (
    (status = 'pending' AND email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ))
    OR
    (user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (status = 'pending' AND email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ))
    OR
    (user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ))
  );

-- Only billing owners can delete members
CREATE POLICY "Billing owners can remove members"
  ON household_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      JOIN profiles p ON hm.user_id = p.id
      WHERE hm.household_id = household_members.household_id
      AND p.user_id = auth.uid()
      AND hm.role = 'owner'
      AND hm.status = 'active'
    )
  );