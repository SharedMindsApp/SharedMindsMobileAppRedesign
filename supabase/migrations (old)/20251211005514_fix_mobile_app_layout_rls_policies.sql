/*
  # Fix Mobile App Layout RLS Policies

  1. Issue
    - Current policies check `auth.uid() = profile_id`
    - But profile_id references profiles(id), not profiles(user_id)
    - auth.uid() returns the auth user ID from auth.users
    - We need to check if auth.uid() matches the user_id of the profile

  2. Changes
    - Drop existing RLS policies for mobile_app_layout and mobile_app_folders
    - Create new policies that correctly check profiles.user_id against auth.uid()

  3. Security
    - Users can only manage layouts for profiles they own
    - Check is done via profiles table join
*/

-- Drop existing mobile_app_layout policies
DROP POLICY IF EXISTS "Users can view own app layout" ON mobile_app_layout;
DROP POLICY IF EXISTS "Users can insert own app layout" ON mobile_app_layout;
DROP POLICY IF EXISTS "Users can update own app layout" ON mobile_app_layout;
DROP POLICY IF EXISTS "Users can delete own app layout" ON mobile_app_layout;

-- Create corrected mobile_app_layout policies
CREATE POLICY "Users can view own app layout"
  ON mobile_app_layout FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = mobile_app_layout.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own app layout"
  ON mobile_app_layout FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = mobile_app_layout.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own app layout"
  ON mobile_app_layout FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = mobile_app_layout.profile_id
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = mobile_app_layout.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own app layout"
  ON mobile_app_layout FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = mobile_app_layout.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Drop existing mobile_app_folders policies
DROP POLICY IF EXISTS "Users can view own folders" ON mobile_app_folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON mobile_app_folders;
DROP POLICY IF EXISTS "Users can update own folders" ON mobile_app_folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON mobile_app_folders;

-- Create corrected mobile_app_folders policies
CREATE POLICY "Users can view own folders"
  ON mobile_app_folders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = mobile_app_folders.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own folders"
  ON mobile_app_folders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = mobile_app_folders.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own folders"
  ON mobile_app_folders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = mobile_app_folders.profile_id
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = mobile_app_folders.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own folders"
  ON mobile_app_folders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = mobile_app_folders.profile_id
      AND profiles.user_id = auth.uid()
    )
  );
