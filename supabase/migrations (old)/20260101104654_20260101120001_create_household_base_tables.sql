/*
  # Create Household Base Tables
  
  1. Tables
    - households - Main household entity
    - household_members - Members with roles
    - household_chores, grocery_list, cleaning_tasks, notes, appointments
  
  2. Security with proper RLS
*/

-- Create households table
CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create household_members table
CREATE TABLE IF NOT EXISTS household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
  avatar_color text DEFAULT 'blue',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Household Chores
CREATE TABLE IF NOT EXISTS household_chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES household_members(id) ON DELETE SET NULL,
  assigned_to_name text,
  due_date timestamptz,
  completed boolean DEFAULT false,
  recurring text DEFAULT 'none' CHECK (recurring IN ('none', 'daily', 'weekly', 'monthly')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Household Grocery List
CREATE TABLE IF NOT EXISTS household_grocery_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity text,
  category text,
  checked boolean DEFAULT false,
  added_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  added_by_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Household Cleaning Tasks
CREATE TABLE IF NOT EXISTS household_cleaning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  room text,
  frequency text DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  last_completed timestamptz,
  assigned_to uuid REFERENCES household_members(id) ON DELETE SET NULL,
  assigned_to_name text,
  created_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Household Notes
CREATE TABLE IF NOT EXISTS household_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  category text DEFAULT 'general' CHECK (category IN ('general', 'important', 'reminder', 'announcement')),
  color text DEFAULT 'yellow',
  pinned boolean DEFAULT false,
  created_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Household Appointments
CREATE TABLE IF NOT EXISTS household_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  appointment_date timestamptz NOT NULL,
  appointment_type text DEFAULT 'general' CHECK (appointment_type IN ('medical', 'dental', 'school', 'maintenance', 'social', 'general')),
  location text,
  attendees uuid[] DEFAULT ARRAY[]::uuid[],
  reminder_sent boolean DEFAULT false,
  created_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_grocery_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_cleaning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_appointments ENABLE ROW LEVEL SECURITY;

-- Households policies
CREATE POLICY "Users can view their households"
  ON households FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = households.id
      AND household_members.auth_user_id = auth.uid()
      AND household_members.status = 'active'
    )
  );

CREATE POLICY "Users can create households"
  ON households FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their households"
  ON households FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = households.id
      AND household_members.auth_user_id = auth.uid()
      AND household_members.status = 'active'
    )
  );

-- Household members policies
CREATE POLICY "Members can view household members"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.auth_user_id = auth.uid()
      AND hm.status = 'active'
    )
  );

CREATE POLICY "Users can join households"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- Chores policies
CREATE POLICY "Members can manage chores"
  ON household_chores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_chores.household_id
      AND household_members.auth_user_id = auth.uid()
      AND household_members.status = 'active'
    )
  );

-- Grocery list policies
CREATE POLICY "Members can manage grocery list"
  ON household_grocery_list FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_grocery_list.household_id
      AND household_members.auth_user_id = auth.uid()
      AND household_members.status = 'active'
    )
  );

-- Cleaning tasks policies
CREATE POLICY "Members can manage cleaning tasks"
  ON household_cleaning_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_cleaning_tasks.household_id
      AND household_members.auth_user_id = auth.uid()
      AND household_members.status = 'active'
    )
  );

-- Notes policies
CREATE POLICY "Members can manage notes"
  ON household_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_notes.household_id
      AND household_members.auth_user_id = auth.uid()
      AND household_members.status = 'active'
    )
  );

-- Appointments policies
CREATE POLICY "Members can manage appointments"
  ON household_appointments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_appointments.household_id
      AND household_members.auth_user_id = auth.uid()
      AND household_members.status = 'active'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_auth_user_id ON household_members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_household_chores_household_id ON household_chores(household_id);
CREATE INDEX IF NOT EXISTS idx_household_grocery_household_id ON household_grocery_list(household_id);
CREATE INDEX IF NOT EXISTS idx_household_cleaning_household_id ON household_cleaning_tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_household_notes_household_id ON household_notes(household_id);
CREATE INDEX IF NOT EXISTS idx_household_appointments_household_id ON household_appointments(household_id);
