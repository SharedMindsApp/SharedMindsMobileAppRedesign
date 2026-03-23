/*
  # Brain Profile System

  1. New Tables
    - `brain_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `completed_at` (timestamptz) - when profile was completed
      - `processing_style` (text array) - visual, audio, hands-on, etc.
      - `task_style` (text array) - structure, flexibility, etc.
      - `time_relationship` (text array) - time tracking preferences
      - `sensory_needs` (text array) - sensory environment preferences
      - `communication_preference` (text array) - how they prefer to communicate
      - `overwhelm_triggers` (text array) - what overwhelms them
      - `stress_helpers` (text array) - what helps when stressed
      - `avoid_behaviors` (text array) - what NOT to do
      - `understanding_needs` (text array) - how they feel understood
      - `support_style` (text array) - preferred support approach
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `brain_profile_cards`
      - `id` (uuid, primary key)
      - `brain_profile_id` (uuid, references brain_profiles)
      - `card_type` (text) - how_brain_works, communication, struggling, support_others
      - `title` (text)
      - `content` (jsonb) - array of bullet points
      - `is_visible` (boolean)
      - `custom_edits` (jsonb) - user customizations
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `brain_profile_settings`
      - `id` (uuid, primary key)
      - `brain_profile_id` (uuid, references brain_profiles)
      - `theme_preset` (text) - calm, vibrant, standard
      - `notification_style` (text) - minimal, standard, structured
      - `communication_rewriting` (text) - direct, soft, balanced
      - `task_handling` (jsonb) - show_fewer_tasks, more_structure, etc.
      - `sensory_toggles` (jsonb) - reduce_animation, adjust_brightness, etc.
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own brain profile data
*/

-- Create brain_profiles table
CREATE TABLE IF NOT EXISTS brain_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  completed_at timestamptz DEFAULT now(),
  processing_style text[] DEFAULT '{}',
  task_style text[] DEFAULT '{}',
  time_relationship text[] DEFAULT '{}',
  sensory_needs text[] DEFAULT '{}',
  communication_preference text[] DEFAULT '{}',
  overwhelm_triggers text[] DEFAULT '{}',
  stress_helpers text[] DEFAULT '{}',
  avoid_behaviors text[] DEFAULT '{}',
  understanding_needs text[] DEFAULT '{}',
  support_style text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create brain_profile_cards table
CREATE TABLE IF NOT EXISTS brain_profile_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_profile_id uuid REFERENCES brain_profiles(id) ON DELETE CASCADE NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('how_brain_works', 'communication', 'struggling', 'support_others')),
  title text NOT NULL DEFAULT '',
  content jsonb DEFAULT '[]'::jsonb,
  is_visible boolean DEFAULT true,
  custom_edits jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create brain_profile_settings table
CREATE TABLE IF NOT EXISTS brain_profile_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_profile_id uuid REFERENCES brain_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme_preset text DEFAULT 'standard' CHECK (theme_preset IN ('calm', 'vibrant', 'standard')),
  notification_style text DEFAULT 'standard' CHECK (notification_style IN ('minimal', 'standard', 'structured')),
  communication_rewriting text DEFAULT 'balanced' CHECK (communication_rewriting IN ('direct', 'soft', 'balanced')),
  task_handling jsonb DEFAULT '{}'::jsonb,
  sensory_toggles jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE brain_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_profile_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_profile_settings ENABLE ROW LEVEL SECURITY;

-- Policies for brain_profiles
CREATE POLICY "Users can view own brain profile"
  ON brain_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brain profile"
  ON brain_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brain profile"
  ON brain_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own brain profile"
  ON brain_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for brain_profile_cards
CREATE POLICY "Users can view own profile cards"
  ON brain_profile_cards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brain_profiles
      WHERE brain_profiles.id = brain_profile_cards.brain_profile_id
      AND brain_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own profile cards"
  ON brain_profile_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brain_profiles
      WHERE brain_profiles.id = brain_profile_cards.brain_profile_id
      AND brain_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile cards"
  ON brain_profile_cards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brain_profiles
      WHERE brain_profiles.id = brain_profile_cards.brain_profile_id
      AND brain_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brain_profiles
      WHERE brain_profiles.id = brain_profile_cards.brain_profile_id
      AND brain_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own profile cards"
  ON brain_profile_cards FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brain_profiles
      WHERE brain_profiles.id = brain_profile_cards.brain_profile_id
      AND brain_profiles.user_id = auth.uid()
    )
  );

-- Policies for brain_profile_settings
CREATE POLICY "Users can view own profile settings"
  ON brain_profile_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brain_profiles
      WHERE brain_profiles.id = brain_profile_settings.brain_profile_id
      AND brain_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own profile settings"
  ON brain_profile_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brain_profiles
      WHERE brain_profiles.id = brain_profile_settings.brain_profile_id
      AND brain_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile settings"
  ON brain_profile_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brain_profiles
      WHERE brain_profiles.id = brain_profile_settings.brain_profile_id
      AND brain_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brain_profiles
      WHERE brain_profiles.id = brain_profile_settings.brain_profile_id
      AND brain_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own profile settings"
  ON brain_profile_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brain_profiles
      WHERE brain_profiles.id = brain_profile_settings.brain_profile_id
      AND brain_profiles.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS brain_profiles_user_id_idx ON brain_profiles(user_id);
CREATE INDEX IF NOT EXISTS brain_profile_cards_profile_id_idx ON brain_profile_cards(brain_profile_id);
CREATE INDEX IF NOT EXISTS brain_profile_settings_profile_id_idx ON brain_profile_settings(brain_profile_id);
