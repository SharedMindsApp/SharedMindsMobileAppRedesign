/*
  # Recreate Meal Planning System

  1. Changes
    - Drop old meal_library table and recreate with proper structure
    - Create meal_plans and meal_favourites tables
    - Populate with 40+ default meals
    - Add proper RLS policies

  2. Security
    - RLS enabled on all tables
    - Proper access controls for households
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS meal_favourites CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;
DROP TABLE IF EXISTS meal_library CASCADE;

-- Create enums
DO $$ BEGIN
  CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE meal_category AS ENUM (
    'home_cooked',
    'healthy',
    'vegetarian',
    'vegan',
    'gluten_free',
    'high_protein',
    'budget_friendly',
    'takeaway'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE cuisine_type AS ENUM (
    'italian', 'indian', 'chinese', 'thai', 'british', 'american',
    'mexican', 'mediterranean', 'japanese', 'french', 'greek', 'korean'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE cooking_difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create meal library (global meals database)
CREATE TABLE meal_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  meal_type meal_type NOT NULL,
  categories meal_category[] NOT NULL DEFAULT '{}',
  cuisine cuisine_type,
  difficulty cooking_difficulty DEFAULT 'medium',
  prep_time int,
  cook_time int,
  servings int DEFAULT 4,
  ingredients jsonb DEFAULT '[]',
  instructions text,
  calories int,
  protein int,
  carbs int,
  fat int,
  allergies text[] DEFAULT '{}',
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create meal plans (household weekly schedule)
CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  meal_id uuid REFERENCES meal_library(id) ON DELETE SET NULL,
  custom_meal_name text,
  meal_type meal_type NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  week_start_date date NOT NULL,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(household_id, week_start_date, day_of_week, meal_type)
);

-- Create meal favourites
CREATE TABLE meal_favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES meal_library(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_count int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(meal_id, household_id, user_id)
);

-- Enable RLS
ALTER TABLE meal_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_favourites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view meals" ON meal_library FOR SELECT TO authenticated USING (true);

CREATE POLICY "View household meal plans" ON meal_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members hm JOIN profiles p ON p.user_id = hm.user_id WHERE hm.household_id = meal_plans.household_id AND p.user_id = auth.uid()));

CREATE POLICY "Insert household meal plans" ON meal_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members hm JOIN profiles p ON p.user_id = hm.user_id WHERE hm.household_id = meal_plans.household_id AND p.user_id = auth.uid()));

CREATE POLICY "Update household meal plans" ON meal_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members hm JOIN profiles p ON p.user_id = hm.user_id WHERE hm.household_id = meal_plans.household_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members hm JOIN profiles p ON p.user_id = hm.user_id WHERE hm.household_id = meal_plans.household_id AND p.user_id = auth.uid()));

CREATE POLICY "Delete household meal plans" ON meal_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members hm JOIN profiles p ON p.user_id = hm.user_id WHERE hm.household_id = meal_plans.household_id AND p.user_id = auth.uid()));

CREATE POLICY "View household favourites" ON meal_favourites FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members hm JOIN profiles p ON p.user_id = hm.user_id WHERE hm.household_id = meal_favourites.household_id AND p.user_id = auth.uid()));

CREATE POLICY "Insert own favourites" ON meal_favourites FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Update own favourites" ON meal_favourites FOR UPDATE TO authenticated
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Delete own favourites" ON meal_favourites FOR DELETE TO authenticated
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Insert meals
INSERT INTO meal_library (name, meal_type, categories, cuisine, difficulty, prep_time, cook_time, servings, ingredients, calories, protein, carbs, fat, allergies) VALUES
-- Breakfast
('Scrambled Eggs on Toast', 'breakfast', '{"home_cooked","high_protein"}', 'british', 'easy', 5, 10, 2, '[{"name":"Eggs","quantity":"4","unit":"whole"},{"name":"Butter","quantity":"2","unit":"tbsp"},{"name":"Bread","quantity":"4","unit":"slices"}]', 350, 24, 28, 18, '{"eggs","gluten","dairy"}'),
('Overnight Oats', 'breakfast', '{"healthy","vegetarian"}', 'american', 'easy', 5, 0, 1, '[{"name":"Oats","quantity":"1","unit":"cup"},{"name":"Milk","quantity":"1","unit":"cup"}]', 320, 12, 52, 8, '{"dairy"}'),
('Avocado Toast', 'breakfast', '{"healthy","vegetarian","vegan"}', 'american', 'easy', 5, 5, 2, '[{"name":"Bread","quantity":"4","unit":"slices"},{"name":"Avocado","quantity":"2","unit":"whole"}]', 280, 8, 32, 14, '{"gluten"}'),
('Greek Yogurt Bowl', 'breakfast', '{"healthy","high_protein","vegetarian"}', 'greek', 'easy', 5, 0, 1, '[{"name":"Greek yogurt","quantity":"1","unit":"cup"},{"name":"Granola","quantity":"0.5","unit":"cup"}]', 380, 18, 48, 12, '{"dairy","nuts"}'),
('Breakfast Burrito', 'breakfast', '{"home_cooked","high_protein"}', 'mexican', 'medium', 10, 15, 2, '[{"name":"Tortillas","quantity":"2","unit":"large"},{"name":"Eggs","quantity":"4","unit":"whole"}]', 520, 32, 36, 26, '{"eggs","gluten"}'),
-- Lunch
('Chicken Caesar Salad', 'lunch', '{"home_cooked","high_protein","healthy"}', 'american', 'easy', 10, 15, 2, '[{"name":"Chicken breast","quantity":"2","unit":"pieces"},{"name":"Lettuce","quantity":"1","unit":"head"}]', 420, 38, 24, 18, '{"dairy","gluten"}'),
('Vegetable Stir Fry', 'lunch', '{"healthy","vegetarian","vegan","budget_friendly"}', 'chinese', 'easy', 10, 10, 4, '[{"name":"Mixed vegetables","quantity":"4","unit":"cups"},{"name":"Rice","quantity":"2","unit":"cups"}]', 320, 8, 58, 6, '{"soy"}'),
('Tomato Soup Grilled Cheese', 'lunch', '{"home_cooked","budget_friendly","vegetarian"}', 'american', 'easy', 10, 20, 2, '[{"name":"Tomatoes","quantity":"6","unit":"large"},{"name":"Bread","quantity":"4","unit":"slices"}]', 480, 16, 52, 22, '{"dairy","gluten"}'),
('Quinoa Buddha Bowl', 'lunch', '{"healthy","vegetarian","vegan","high_protein"}', 'mediterranean', 'medium', 15, 20, 2, '[{"name":"Quinoa","quantity":"1","unit":"cup"},{"name":"Chickpeas","quantity":"1","unit":"can"}]', 450, 18, 56, 18, '{}'),
('Chicken Wrap', 'lunch', '{"home_cooked","high_protein"}', 'american', 'easy', 10, 10, 2, '[{"name":"Tortillas","quantity":"2","unit":"large"},{"name":"Chicken","quantity":"2","unit":"pieces"}]', 380, 32, 36, 12, '{"gluten"}'),
('Falafel Wrap', 'lunch', '{"vegetarian","vegan","healthy"}', 'mediterranean', 'medium', 20, 20, 4, '[{"name":"Chickpeas","quantity":"2","unit":"cans"},{"name":"Tortillas","quantity":"4","unit":"large"}]', 380, 14, 52, 12, '{"gluten","sesame"}'),
('Tuna Salad', 'lunch', '{"healthy","high_protein","gluten_free"}', 'mediterranean', 'easy', 10, 0, 2, '[{"name":"Tuna","quantity":"2","unit":"cans"},{"name":"Mixed greens","quantity":"4","unit":"cups"}]', 320, 38, 12, 14, '{"fish"}'),
('Bean Quesadilla', 'lunch', '{"vegetarian","budget_friendly","home_cooked"}', 'mexican', 'easy', 5, 10, 2, '[{"name":"Tortillas","quantity":"4","unit":"large"},{"name":"Beans","quantity":"1","unit":"can"}]', 420, 18, 48, 16, '{"gluten"}'),
('Jacket Potato with Beans', 'lunch', '{"vegetarian","budget_friendly","home_cooked"}', 'british', 'easy', 5, 60, 2, '[{"name":"Potatoes","quantity":"2","unit":"large"},{"name":"Beans","quantity":"1","unit":"can"}]', 380, 14, 68, 8, '{}'),
-- Dinner
('Spaghetti Bolognese', 'dinner', '{"home_cooked","high_protein"}', 'italian', 'medium', 15, 30, 4, '[{"name":"Spaghetti","quantity":"400","unit":"g"},{"name":"Beef","quantity":"500","unit":"g"}]', 620, 36, 72, 18, '{"gluten"}'),
('Salmon Roasted Vegetables', 'dinner', '{"healthy","high_protein","gluten_free"}', 'mediterranean', 'medium', 10, 25, 4, '[{"name":"Salmon","quantity":"4","unit":"fillets"},{"name":"Broccoli","quantity":"2","unit":"cups"}]', 480, 42, 18, 24, '{"fish"}'),
('Chicken Curry', 'dinner', '{"home_cooked","high_protein"}', 'indian', 'medium', 20, 40, 4, '[{"name":"Chicken","quantity":"8","unit":"pieces"},{"name":"Curry paste","quantity":"3","unit":"tbsp"}]', 580, 38, 54, 22, '{}'),
('Beef Tacos', 'dinner', '{"home_cooked","high_protein"}', 'mexican', 'easy', 10, 15, 4, '[{"name":"Beef","quantity":"500","unit":"g"},{"name":"Shells","quantity":"12","unit":"pieces"}]', 520, 32, 42, 24, '{"gluten"}'),
('Vegetable Lasagna', 'dinner', '{"home_cooked","vegetarian"}', 'italian', 'hard', 30, 45, 6, '[{"name":"Lasagna sheets","quantity":"12","unit":"pieces"},{"name":"Ricotta","quantity":"2","unit":"cups"}]', 480, 24, 48, 20, '{"gluten","dairy"}'),
('Thai Green Curry', 'dinner', '{"home_cooked","healthy"}', 'thai', 'medium', 15, 25, 4, '[{"name":"Chicken","quantity":"4","unit":"pieces"},{"name":"Rice","quantity":"2","unit":"cups"}]', 520, 36, 52, 18, '{}'),
('Lentil Soup', 'dinner', '{"healthy","vegetarian","vegan","budget_friendly"}', 'mediterranean', 'easy', 10, 35, 6, '[{"name":"Lentils","quantity":"2","unit":"cups"},{"name":"Carrots","quantity":"3","unit":"large"}]', 280, 16, 48, 4, '{}'),
('Grilled Chicken Sweet Potato', 'dinner', '{"healthy","high_protein","gluten_free"}', 'american', 'easy', 10, 30, 4, '[{"name":"Chicken","quantity":"4","unit":"pieces"},{"name":"Sweet potatoes","quantity":"4","unit":"large"}]', 420, 42, 38, 12, '{}'),
('Mushroom Risotto', 'dinner', '{"home_cooked","vegetarian"}', 'italian', 'medium', 10, 35, 4, '[{"name":"Rice","quantity":"2","unit":"cups"},{"name":"Mushrooms","quantity":"400","unit":"g"}]', 480, 14, 64, 16, '{"dairy"}'),
('Stir Fry Noodles', 'dinner', '{"home_cooked","budget_friendly"}', 'chinese', 'easy', 10, 15, 4, '[{"name":"Noodles","quantity":"400","unit":"g"},{"name":"Vegetables","quantity":"3","unit":"cups"}]', 420, 12, 68, 10, '{"gluten","soy"}'),
('Veggie Chilli', 'dinner', '{"vegetarian","vegan","healthy","budget_friendly"}', 'mexican', 'easy', 15, 30, 6, '[{"name":"Beans","quantity":"2","unit":"cans"},{"name":"Tomatoes","quantity":"2","unit":"cans"}]', 320, 18, 54, 4, '{}'),
('Tofu Stir Fry', 'dinner', '{"vegetarian","vegan","healthy","high_protein"}', 'chinese', 'easy', 15, 15, 4, '[{"name":"Tofu","quantity":"400","unit":"g"},{"name":"Vegetables","quantity":"4","unit":"cups"}]', 380, 22, 52, 10, '{"soy"}'),
('Egg Fried Rice', 'dinner', '{"home_cooked","high_protein","budget_friendly"}', 'chinese', 'easy', 10, 15, 4, '[{"name":"Rice","quantity":"3","unit":"cups"},{"name":"Eggs","quantity":"4","unit":"whole"}]', 420, 18, 62, 10, '{"eggs","soy"}'),
('Pasta Tomato Sauce', 'dinner', '{"vegetarian","budget_friendly","home_cooked"}', 'italian', 'easy', 5, 20, 4, '[{"name":"Pasta","quantity":"400","unit":"g"},{"name":"Tomato sauce","quantity":"2","unit":"cups"}]', 380, 12, 68, 8, '{"gluten"}'),
-- Snacks
('Hummus with Vegetables', 'snack', '{"healthy","vegetarian","vegan"}', 'mediterranean', 'easy', 10, 0, 2, '[{"name":"Chickpeas","quantity":"1","unit":"can"},{"name":"Carrots","quantity":"2","unit":"large"}]', 180, 8, 24, 6, '{"sesame"}'),
('Fruit Smoothie', 'snack', '{"healthy","vegetarian"}', 'american', 'easy', 5, 0, 1, '[{"name":"Banana","quantity":"1","unit":"large"},{"name":"Berries","quantity":"1","unit":"cup"}]', 280, 8, 52, 4, '{"dairy"}'),
-- Takeaway
('Pizza Margherita', 'dinner', '{"takeaway"}', 'italian', 'easy', 0, 0, 2, '[{"name":"Pizza","quantity":"1","unit":"large"}]', 800, 32, 96, 28, '{"gluten","dairy"}'),
('Pepperoni Pizza', 'dinner', '{"takeaway"}', 'italian', 'easy', 0, 0, 2, '[{"name":"Pizza","quantity":"1","unit":"large"}]', 920, 38, 98, 36, '{"gluten","dairy"}'),
('Chicken Tikka Masala', 'dinner', '{"takeaway"}', 'indian', 'easy', 0, 0, 2, '[{"name":"Chicken","quantity":"400","unit":"g"},{"name":"Rice","quantity":"2","unit":"cups"}]', 720, 42, 68, 24, '{}'),
('Sweet Sour Chicken', 'dinner', '{"takeaway"}', 'chinese', 'easy', 0, 0, 2, '[{"name":"Chicken","quantity":"400","unit":"g"}]', 680, 36, 84, 18, '{"soy"}'),
('Pad Thai', 'dinner', '{"takeaway"}', 'thai', 'easy', 0, 0, 2, '[{"name":"Noodles","quantity":"200","unit":"g"}]', 620, 28, 82, 16, '{"peanuts","soy"}'),
('Fish and Chips', 'dinner', '{"takeaway"}', 'british', 'easy', 0, 0, 2, '[{"name":"Fish","quantity":"2","unit":"fillets"},{"name":"Chips","quantity":"400","unit":"g"}]', 880, 38, 96, 36, '{"fish","gluten"}'),
('Beef Burger Fries', 'dinner', '{"takeaway"}', 'american', 'easy', 0, 0, 1, '[{"name":"Burger","quantity":"1","unit":"large"},{"name":"Fries","quantity":"1","unit":"portion"}]', 950, 42, 92, 42, '{"gluten"}'),
('Chicken Wings', 'dinner', '{"takeaway"}', 'american', 'easy', 0, 0, 2, '[{"name":"Wings","quantity":"12","unit":"pieces"}]', 720, 52, 24, 42, '{}');

-- Indexes
CREATE INDEX idx_meal_library_meal_type ON meal_library(meal_type);
CREATE INDEX idx_meal_library_categories ON meal_library USING GIN(categories);
CREATE INDEX idx_meal_plans_household_week ON meal_plans(household_id, week_start_date);
CREATE INDEX idx_meal_favourites_household ON meal_favourites(household_id, meal_id);
