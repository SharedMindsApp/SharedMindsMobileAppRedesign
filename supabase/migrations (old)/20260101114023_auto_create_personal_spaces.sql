/*
  # Auto-Create Personal Spaces for Users

  1. Function
    - Creates a personal space for a user if they don't have one
  
  2. Trigger
    - Runs when a user signs up to ensure they have a personal space
*/

-- Function to create or get personal space for a user
CREATE OR REPLACE FUNCTION ensure_personal_space(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  personal_household_id uuid;
  user_email text;
BEGIN
  -- Check if user already has a personal space
  SELECT h.id INTO personal_household_id
  FROM households h
  INNER JOIN household_members hm ON hm.household_id = h.id
  WHERE h.type = 'personal'
    AND hm.auth_user_id = user_id
    AND hm.status = 'active'
  LIMIT 1;
  
  -- If no personal space exists, create one
  IF personal_household_id IS NULL THEN
    -- Get user email for naming
    SELECT email INTO user_email FROM auth.users WHERE id = user_id;
    
    -- Create personal household
    INSERT INTO households (name, created_by, type)
    VALUES ('Personal Space', user_id, 'personal')
    RETURNING id INTO personal_household_id;
    
    -- Add user as owner of personal space
    INSERT INTO household_members (household_id, auth_user_id, name, role, status)
    VALUES (personal_household_id, user_id, COALESCE(user_email, 'User'), 'owner', 'active');
  END IF;
  
  RETURN personal_household_id;
END;
$$;

-- Function to auto-create personal space on user signup
CREATE OR REPLACE FUNCTION auto_create_personal_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create personal space for new user
  PERFORM ensure_personal_space(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_create_personal_space'
  ) THEN
    CREATE TRIGGER on_auth_user_created_create_personal_space
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION auto_create_personal_space();
  END IF;
END $$;
