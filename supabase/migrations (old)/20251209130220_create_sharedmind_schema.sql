/*
  # SharedMinds MVP Database Schema

  1. New Tables
    - `households`
      - `id` (uuid, primary key) - Unique identifier for household
      - `name` (text) - Name of the household
      - `created_at` (timestamptz) - When household was created
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `members`
      - `id` (uuid, primary key) - Unique identifier for member
      - `household_id` (uuid, foreign key) - Links to households table
      - `user_id` (uuid, foreign key) - Links to auth.users for authentication
      - `name` (text) - Member's name
      - `age` (int) - Member's age
      - `role` (text) - Member's role (e.g., "ADHD", "Partner", "Child")
      - `created_at` (timestamptz) - When member was created
    
    - `sections`
      - `id` (uuid, primary key) - Unique identifier for section
      - `title` (text) - Section title
      - `description` (text) - Section description
      - `order_index` (int) - Order in which sections appear
    
    - `questions`
      - `id` (uuid, primary key) - Unique identifier for question
      - `section_id` (uuid, foreign key) - Links to sections table
      - `question_text` (text) - The actual question text
      - `type` (text) - Question type: "text", "scale", "multiple_choice"
      - `metadata` (jsonb) - Additional question configuration
    
    - `answers`
      - `id` (uuid, primary key) - Unique identifier for answer
      - `member_id` (uuid, foreign key) - Links to members table
      - `question_id` (uuid, foreign key) - Links to questions table
      - `answer` (jsonb) - The answer data (flexible format)
      - `updated_at` (timestamptz) - When answer was last updated
      - Unique constraint on (member_id, question_id)
    
    - `progress`
      - `id` (uuid, primary key) - Unique identifier for progress record
      - `member_id` (uuid, foreign key) - Links to members table
      - `section_id` (uuid, foreign key) - Links to sections table
      - `questions_completed` (int) - Number of questions completed
      - `questions_total` (int) - Total questions in section
      - `completed` (boolean) - Whether section is complete
      - `updated_at` (timestamptz) - When progress was last updated
      - Unique constraint on (member_id, section_id)

  2. Security (Row Level Security)
    - Enable RLS on all tables
    - Households: Users can view and update their own household
    - Members: Users can view all members in their household, update only their own profile
    - Sections & Questions: Readable by all authenticated users
    - Answers: Users can only read/write their own answers
    - Progress: Users can view progress of all household members, but only update their own
  
  3. Seed Data
    - 6 sections: Personal Profile, Household Responsibilities, Emotional Triggers & Stress, 
      Support Preferences, Perception Gaps, Household Expectations & Values
*/

-- Create households table
CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  age int,
  role text,
  created_at timestamptz DEFAULT now()
);

-- Create sections table
CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  order_index int NOT NULL
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, question_id)
);

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  questions_completed int DEFAULT 0,
  questions_total int DEFAULT 0,
  completed boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, section_id)
);

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for households
CREATE POLICY "Users can view their household"
  ON households FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT household_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their household"
  ON households FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT household_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their household"
  ON households FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for members
CREATE POLICY "Users can view members in their household"
  ON members FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own member profile"
  ON members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for sections (readable by all authenticated users)
CREATE POLICY "Authenticated users can view sections"
  ON sections FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for questions (readable by all authenticated users)
CREATE POLICY "Authenticated users can view questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for answers
CREATE POLICY "Users can view their own answers"
  ON answers FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own answers"
  ON answers FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own answers"
  ON answers FOR UPDATE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for progress (users can see progress of household members)
CREATE POLICY "Users can view progress in their household"
  ON progress FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members 
      WHERE household_id IN (
        SELECT household_id FROM members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own progress"
  ON progress FOR UPDATE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own progress"
  ON progress FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- Seed sections
INSERT INTO sections (title, description, order_index) VALUES
  ('Personal Profile', 'Basic information about yourself and your daily routines', 1),
  ('Household Responsibilities', 'Understanding how tasks and responsibilities are shared in the household', 2),
  ('Emotional Triggers & Stress', 'Identifying what causes stress and how you respond to it', 3),
  ('Support Preferences', 'How you prefer to give and receive support', 4),
  ('Perception Gaps', 'Understanding how you see yourself versus how others might see you', 5),
  ('Household Expectations & Values', 'Shared values and expectations within the household', 6)
ON CONFLICT DO NOTHING;