/*
  # Create Profiles Table

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - Unique identifier for profile
      - `user_id` (uuid, foreign key) - Links to auth.users table
      - `full_name` (text) - User's full name
      - `created_at` (timestamptz) - When profile was created
  
  2. Security
    - Enable RLS on profiles table
    - Users can view their own profile
    - Users can update their own profile
    - Users can insert their own profile
  
  3. Important Notes
    - This table stores additional user information beyond what's in auth.users
    - The full_name is captured during signup and can be updated later
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);