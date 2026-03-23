/*
  # Add Professional to user_role enum
  
  This migration adds the 'professional' value to the existing user_role enum type.
  This must be done in a separate transaction before we can use it.
*/

-- Add professional to the user_role enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'professional' 
    AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'professional';
  END IF;
END $$;