/*
  # Add Role-Based Access System

  1. New Enum Types
    - `user_role` - Enum for user roles: free, premium, admin

  2. Updates to Existing Tables
    - `profiles`
      - Add `email` (text) - User's email address
      - Add `role` (user_role) - User's subscription tier
      - Add `updated_at` (timestamptz) - Last profile update
    
    - `households`
      - Add `created_by` (uuid, FK) - User who created the household
      - Add `member_limit` (int) - Max members based on subscription tier

  3. New Tables
    - `analytics_events`
      - `id` (uuid, PK) - Unique identifier
      - `user_id` (uuid, FK) - User who triggered event
      - `event_type` (text) - Type of event
      - `metadata` (jsonb) - Additional event data
      - `created_at` (timestamptz) - When event occurred
    
    - `admin_logs`
      - `id` (uuid, PK) - Unique identifier
      - `admin_id` (uuid, FK) - Admin who performed action
      - `action_type` (text) - Type of admin action
      - `target_id` (uuid) - Target user/household ID
      - `notes` (text) - Admin notes
      - `created_at` (timestamptz) - When action occurred

  4. Updated Security (RLS)
    - Free & premium users can ONLY access their own data
    - Admins have full access to all data (bypass RLS checks)
    - Admin-only tables: analytics_events, admin_logs
    
  5. Important Notes
    - Default role is 'free' for new users
    - Member limits: free=2, premium=4, admin=unlimited
    - Admins can view/modify any user or household data
*/

-- Create enum type for user roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('free', 'premium', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'free' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index on role for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add columns to households table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'households' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE households ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'households' AND column_name = 'member_limit'
  ) THEN
    ALTER TABLE households ADD COLUMN member_limit int DEFAULT 2 NOT NULL;
  END IF;
END $$;

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);

-- Enable RLS on new tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to recreate with admin access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Updated RLS Policies for profiles (with admin access)
CREATE POLICY "Users can view own profile or admin can view all"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile or admin can update any"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- Drop and recreate household policies with admin access
DROP POLICY IF EXISTS "Users can view their household" ON households;
DROP POLICY IF EXISTS "Users can update their household" ON households;
DROP POLICY IF EXISTS "Users can insert their household" ON households;

CREATE POLICY "Users can view their household or admin can view all"
  ON households FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT household_id FROM members WHERE user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Users can update their household or admin can update any"
  ON households FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT household_id FROM members WHERE user_id = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    id IN (SELECT household_id FROM members WHERE user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Users can insert their household"
  ON households FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can delete households"
  ON households FOR DELETE
  TO authenticated
  USING (is_admin());

-- Drop and recreate member policies with admin access
DROP POLICY IF EXISTS "Users can view members in their household" ON members;
DROP POLICY IF EXISTS "Users can update their own member profile" ON members;
DROP POLICY IF EXISTS "Users can insert members" ON members;

CREATE POLICY "Users can view members in their household or admin can view all"
  ON members FOR SELECT
  TO authenticated
  USING (
    household_id IN (SELECT household_id FROM members WHERE user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Users can update their own member profile or admin can update any"
  ON members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (is_admin());

-- Drop and recreate answer policies with admin access
DROP POLICY IF EXISTS "Users can view their own answers" ON answers;
DROP POLICY IF EXISTS "Users can insert their own answers" ON answers;
DROP POLICY IF EXISTS "Users can update their own answers" ON answers;

CREATE POLICY "Users can view their own answers or admin can view all"
  ON answers FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Users can insert their own answers"
  ON answers FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own answers or admin can update any"
  ON answers FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR is_admin()
  );

-- Drop and recreate progress policies with admin access
DROP POLICY IF EXISTS "Users can view progress in their household" ON progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON progress;

CREATE POLICY "Users can view progress in their household or admin can view all"
  ON progress FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members 
      WHERE household_id IN (
        SELECT household_id FROM members WHERE user_id = auth.uid()
      )
    )
    OR is_admin()
  );

CREATE POLICY "Users can update their own progress or admin can update any"
  ON progress FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Users can insert their own progress"
  ON progress FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- RLS Policies for analytics_events (admin only)
CREATE POLICY "Admin can view all analytics events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "System can insert analytics events"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can delete analytics events"
  ON analytics_events FOR DELETE
  TO authenticated
  USING (is_admin());

-- RLS Policies for admin_logs (admin only)
CREATE POLICY "Admin can view all admin logs"
  ON admin_logs FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can insert admin logs"
  ON admin_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete admin logs"
  ON admin_logs FOR DELETE
  TO authenticated
  USING (is_admin());

-- Create trigger to update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to log analytics events
CREATE OR REPLACE FUNCTION log_analytics_event(
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO analytics_events (user_id, event_type, metadata)
  VALUES (auth.uid(), p_event_type, p_metadata)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type text,
  p_target_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can log admin actions';
  END IF;

  INSERT INTO admin_logs (admin_id, action_type, target_id, notes)
  VALUES (auth.uid(), p_action_type, p_target_id, p_notes)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;