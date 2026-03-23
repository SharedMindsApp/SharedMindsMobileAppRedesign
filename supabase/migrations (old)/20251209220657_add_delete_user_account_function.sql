/*
  # Add Delete User Account Function

  1. New Functions
    - `delete_user_account()` - Allows users to delete their own account
      - Deletes all user-related data from profiles, household_members, members, messages, etc.
      - Removes the user from auth.users
      - Can only be executed by the authenticated user for their own account
  
  2. Security
    - Function executes with SECURITY DEFINER to allow deletion from auth schema
    - Validates that the user is deleting their own account
    - Uses CASCADE to clean up related data automatically where foreign keys are defined
*/

-- Create function to delete user account and all related data
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user's conversations participation
  DELETE FROM conversation_participants WHERE user_id = v_user_id;
  
  -- Delete user's messages
  DELETE FROM messages WHERE sender_id = v_user_id;
  
  -- Delete user's reactions
  DELETE FROM message_reactions WHERE user_id = v_user_id;
  
  -- Delete user's UI preferences
  DELETE FROM user_ui_preferences WHERE user_id = v_user_id;
  
  -- Delete professional access requests
  DELETE FROM professional_access_requests WHERE professional_id = v_user_id;
  
  -- Delete professional profile
  DELETE FROM professional_profiles WHERE user_id = v_user_id;
  
  -- Remove user from household members (but don't delete the household)
  DELETE FROM household_members WHERE user_id = v_user_id;
  
  -- Delete questionnaire members associated with user
  DELETE FROM members WHERE user_id = v_user_id;
  
  -- Delete user's profile
  DELETE FROM profiles WHERE user_id = v_user_id;
  
  -- Finally, delete the auth user
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
