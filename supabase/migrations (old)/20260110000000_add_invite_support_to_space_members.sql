/*
  # Add Invite Support to space_members
  
  Adds email and invite_token columns to space_members table
  to support inviting users by email before they have accounts.
*/

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'space_members' AND column_name = 'email'
  ) THEN
    ALTER TABLE space_members ADD COLUMN email text;
    -- Create index for email lookups
    CREATE INDEX IF NOT EXISTS idx_space_members_email ON space_members(email) WHERE email IS NOT NULL;
  END IF;
END $$;

-- Add invite_token column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'space_members' AND column_name = 'invite_token'
  ) THEN
    ALTER TABLE space_members ADD COLUMN invite_token text UNIQUE;
    -- Create index for invite token lookups
    CREATE INDEX IF NOT EXISTS idx_space_members_invite_token ON space_members(invite_token) WHERE invite_token IS NOT NULL;
  END IF;
END $$;

-- Add invited_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'space_members' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE space_members ADD COLUMN invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
    -- Create index for invited_by lookups
    CREATE INDEX IF NOT EXISTS idx_space_members_invited_by ON space_members(invited_by) WHERE invited_by IS NOT NULL;
  END IF;
END $$;
