/*
  # Create Feature Unlock System

  1. New Tables
    - `app_features`
      - `id` (uuid, primary key)
      - `name` (text) - Feature name
      - `slug` (text) - URL-safe identifier
      - `description` (text) - Short description
      - `icon` (text) - Icon name from lucide-react
      - `unlock_requirement` (text) - Which stage unlocks this feature
      - `microcopy` (text) - Encouraging message shown in modal
      - `order_index` (integer) - Display order
      - `created_at` (timestamptz)
    
    - `member_feature_unlocks`
      - `id` (uuid, primary key)
      - `member_id` (uuid, foreign key to members)
      - `feature_id` (uuid, foreign key to app_features)
      - `unlocked_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Members can read their own unlocked features
    - Members can read all available features
    - System handles unlock logic via function

  3. Initial Data
    - Insert 5 core features with their unlock requirements
*/

-- Create app_features table
CREATE TABLE IF NOT EXISTS app_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'sparkles',
  unlock_requirement text NOT NULL,
  microcopy text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create member_feature_unlocks table
CREATE TABLE IF NOT EXISTS member_feature_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  feature_id uuid REFERENCES app_features(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, feature_id)
);

-- Enable RLS
ALTER TABLE app_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_feature_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_features (all authenticated users can read features)
CREATE POLICY "Anyone can read app features"
  ON app_features
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for member_feature_unlocks
CREATE POLICY "Members can read own feature unlocks"
  ON member_feature_unlocks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = member_feature_unlocks.member_id
      AND members.user_id = auth.uid()
    )
  );

-- Insert 5 core features
INSERT INTO app_features (name, slug, description, icon, unlock_requirement, microcopy, order_index)
VALUES
  (
    'Daily Insight Feed',
    'daily-insight-feed',
    'Your personalised brain weather forecast every morning',
    'sunrise',
    'individual',
    'See your personalised "brain weather forecast" every morning. Get gentle heads-ups about energy dips, focus windows, and when you might need extra support — all tailored to your unique rhythms.',
    1
  ),
  (
    'Task Translator',
    'task-translator',
    'Turn overwhelming tasks into simple, doable steps',
    'list-checks',
    'daily_life',
    'Turn overwhelming tasks into simple, doable steps tailored to ADHD, dyslexia, or your thinking style. Break down "clean the kitchen" into actually manageable micro-steps that work with your brain.',
    2
  ),
  (
    'Communication Translator',
    'communication-translator',
    'Make conversations smoother and clearer',
    'message-circle',
    'relationships',
    'Make conversations smoother by understanding how you and others naturally communicate. Get real-time suggestions for reframing messages, asking for what you need, and navigating tricky moments.',
    3
  ),
  (
    'Household Harmony Plan',
    'household-harmony-plan',
    'Create a calmer home with shared routines',
    'home',
    'home',
    'Create a calmer home with shared routines and sensory-friendly suggestions. Build a living plan that respects everyone''s needs, energy levels, and ways of being.',
    4
  ),
  (
    'Habit Flow Assistant',
    'habit-flow-assistant',
    'Build habits that work with your brain',
    'trending-up',
    'daily_life',
    'Build habits in a way that works with your brain — no guilt, no pressure. Get gentle reminders, celebrate micro-wins, and adjust your routine based on what actually works for you.',
    5
  )
ON CONFLICT (slug) DO NOTHING;

-- Create function to check and unlock features based on progress
CREATE OR REPLACE FUNCTION check_and_unlock_features(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_household_id uuid;
  v_individual_complete boolean;
  v_daily_life_complete boolean;
  v_relationships_complete boolean;
  v_home_complete boolean;
  v_feature record;
BEGIN
  -- Get member's household
  SELECT household_id INTO v_household_id
  FROM members
  WHERE id = p_member_id;

  -- Check completion of each stage
  SELECT 
    COUNT(*) = COUNT(*) FILTER (WHERE p.completed = true)
  INTO v_individual_complete
  FROM sections s
  LEFT JOIN progress p ON p.section_id = s.id AND p.member_id = p_member_id
  WHERE s.stage = 'individual';

  SELECT 
    COUNT(*) = COUNT(*) FILTER (WHERE p.completed = true)
  INTO v_daily_life_complete
  FROM sections s
  LEFT JOIN progress p ON p.section_id = s.id AND p.member_id = p_member_id
  WHERE s.stage = 'daily_life';

  SELECT 
    COUNT(*) = COUNT(*) FILTER (WHERE p.completed = true)
  INTO v_relationships_complete
  FROM sections s
  LEFT JOIN progress p ON p.section_id = s.id AND p.member_id = p_member_id
  WHERE s.stage = 'relationships';

  SELECT 
    COUNT(*) = COUNT(*) FILTER (WHERE p.completed = true)
  INTO v_home_complete
  FROM sections s
  LEFT JOIN progress p ON p.section_id = s.id AND p.member_id = p_member_id
  WHERE s.stage = 'home';

  -- Unlock features based on stage completion
  FOR v_feature IN 
    SELECT * FROM app_features
  LOOP
    IF (v_feature.unlock_requirement = 'individual' AND v_individual_complete) OR
       (v_feature.unlock_requirement = 'daily_life' AND v_daily_life_complete) OR
       (v_feature.unlock_requirement = 'relationships' AND v_relationships_complete) OR
       (v_feature.unlock_requirement = 'home' AND v_home_complete) THEN
      
      -- Insert unlock record if it doesn't exist
      INSERT INTO member_feature_unlocks (member_id, feature_id)
      VALUES (p_member_id, v_feature.id)
      ON CONFLICT (member_id, feature_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;