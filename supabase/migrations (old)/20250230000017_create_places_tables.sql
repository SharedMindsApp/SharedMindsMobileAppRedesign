/*
  # Places & Eat Out System
  
  Creates tables for managing restaurants, cafes, takeaways, and other places
  where users can eat out. Supports favourites, tags, saved orders, and meal assignments.
*/

-- Create places table
CREATE TABLE IF NOT EXISTS places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('restaurant', 'cafe', 'takeaway', 'delivery', 'pub', 'other')),
  tags jsonb DEFAULT '[]'::jsonb NOT NULL,
  cuisine text,
  favourite boolean DEFAULT false NOT NULL,
  location_text text,
  website_url text,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one place per name per space (optional - can be relaxed)
  CONSTRAINT unique_place_name_per_space UNIQUE (space_id, name)
);

-- Create place_orders table (saved go-to meals/orders)
CREATE TABLE IF NOT EXISTS place_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  
  name text NOT NULL,
  notes text,
  dietary_tags jsonb DEFAULT '[]'::jsonb NOT NULL,
  favourite boolean DEFAULT false NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create meal_slot_assignments table (extends existing meal_plans)
-- This replaces/enhances the existing meal_plans table to support eat_out
CREATE TABLE IF NOT EXISTS meal_slot_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  meal_slot_id text NOT NULL, -- References MealSlot.id from meal schedule
  
  -- Fulfillment type and associated data
  fulfillment_type text NOT NULL CHECK (fulfillment_type IN ('recipe', 'prepared_meal', 'eat_out', 'freeform')),
  
  -- Recipe assignment
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Meal prep assignment
  prepared_meal_id uuid REFERENCES prepared_meals(id) ON DELETE CASCADE,
  servings_used numeric(4,2),
  
  -- Eat out assignment
  place_id uuid REFERENCES places(id) ON DELETE CASCADE,
  place_order_id uuid REFERENCES place_orders(id) ON DELETE CASCADE,
  eat_out_notes text,
  
  -- Freeform assignment
  freeform_label text,
  freeform_notes text,
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one assignment per slot per day
  CONSTRAINT unique_meal_slot_assignment UNIQUE (space_id, week_start_date, day_of_week, meal_slot_id)
);

-- Create weekly_meal_preferences table (for recurring patterns)
CREATE TABLE IF NOT EXISTS weekly_meal_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  meal_slot_id text NOT NULL,
  
  -- Same fulfillment structure as meal_slot_assignments
  fulfillment_type text NOT NULL CHECK (fulfillment_type IN ('recipe', 'prepared_meal', 'eat_out', 'freeform')),
  
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  prepared_meal_id uuid REFERENCES prepared_meals(id) ON DELETE CASCADE,
  servings_used numeric(4,2),
  place_id uuid REFERENCES places(id) ON DELETE CASCADE,
  place_order_id uuid REFERENCES place_orders(id) ON DELETE CASCADE,
  eat_out_notes text,
  freeform_label text,
  freeform_notes text,
  
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One preference per slot per day per space
  CONSTRAINT unique_weekly_preference UNIQUE (space_id, day_of_week, meal_slot_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_places_space_id ON places(space_id);
CREATE INDEX IF NOT EXISTS idx_places_favourite ON places(favourite) WHERE favourite = true;
CREATE INDEX IF NOT EXISTS idx_places_type ON places(type);
CREATE INDEX IF NOT EXISTS idx_place_orders_place_id ON place_orders(place_id);
CREATE INDEX IF NOT EXISTS idx_meal_slot_assignments_space_week ON meal_slot_assignments(space_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_meal_slot_assignments_fulfillment ON meal_slot_assignments(fulfillment_type);
CREATE INDEX IF NOT EXISTS idx_weekly_meal_preferences_space ON weekly_meal_preferences(space_id, is_active);

-- Enable RLS
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_slot_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_meal_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for places
CREATE POLICY "Users can view places in their spaces"
  ON places FOR SELECT
  TO authenticated
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

CREATE POLICY "Users can insert places in their spaces"
  ON places FOR INSERT
  TO authenticated
  WITH CHECK (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

CREATE POLICY "Users can update places in their spaces"
  ON places FOR UPDATE
  TO authenticated
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  )
  WITH CHECK (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

CREATE POLICY "Users can delete places in their spaces"
  ON places FOR DELETE
  TO authenticated
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- RLS Policies for place_orders
CREATE POLICY "Users can view place orders for their places"
  ON place_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM places p
      WHERE p.id = place_orders.place_id
      AND (
        is_user_personal_space(p.space_id)
        OR is_user_household_member(p.space_id)
      )
    )
  );

CREATE POLICY "Users can insert place orders for their places"
  ON place_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM places p
      WHERE p.id = place_orders.place_id
      AND (
        is_user_personal_space(p.space_id)
        OR is_user_household_member(p.space_id)
      )
    )
  );

CREATE POLICY "Users can update place orders for their places"
  ON place_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM places p
      WHERE p.id = place_orders.place_id
      AND (
        is_user_personal_space(p.space_id)
        OR is_user_household_member(p.space_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM places p
      WHERE p.id = place_orders.place_id
      AND (
        is_user_personal_space(p.space_id)
        OR is_user_household_member(p.space_id)
      )
    )
  );

CREATE POLICY "Users can delete place orders for their places"
  ON place_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM places p
      WHERE p.id = place_orders.place_id
      AND (
        is_user_personal_space(p.space_id)
        OR is_user_household_member(p.space_id)
      )
    )
  );

-- RLS Policies for meal_slot_assignments
CREATE POLICY "Users can view meal slot assignments in their spaces"
  ON meal_slot_assignments FOR SELECT
  TO authenticated
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

CREATE POLICY "Users can insert meal slot assignments in their spaces"
  ON meal_slot_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

CREATE POLICY "Users can update meal slot assignments in their spaces"
  ON meal_slot_assignments FOR UPDATE
  TO authenticated
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  )
  WITH CHECK (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

CREATE POLICY "Users can delete meal slot assignments in their spaces"
  ON meal_slot_assignments FOR DELETE
  TO authenticated
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- RLS Policies for weekly_meal_preferences
CREATE POLICY "Users can view weekly meal preferences in their spaces"
  ON weekly_meal_preferences FOR SELECT
  TO authenticated
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

CREATE POLICY "Users can insert weekly meal preferences in their spaces"
  ON weekly_meal_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

CREATE POLICY "Users can update weekly meal preferences in their spaces"
  ON weekly_meal_preferences FOR UPDATE
  TO authenticated
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  )
  WITH CHECK (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

CREATE POLICY "Users can delete weekly meal preferences in their spaces"
  ON weekly_meal_preferences FOR DELETE
  TO authenticated
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- Functions to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_places_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_place_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_meal_slot_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_weekly_meal_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW
  EXECUTE FUNCTION update_places_updated_at();

CREATE TRIGGER place_orders_updated_at
  BEFORE UPDATE ON place_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_place_orders_updated_at();

CREATE TRIGGER meal_slot_assignments_updated_at
  BEFORE UPDATE ON meal_slot_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_slot_assignments_updated_at();

CREATE TRIGGER weekly_meal_preferences_updated_at
  BEFORE UPDATE ON weekly_meal_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_meal_preferences_updated_at();

-- Comments
COMMENT ON TABLE places IS 'Restaurants, cafes, takeaways, and other places where users can eat out';
COMMENT ON TABLE place_orders IS 'Saved go-to meals/orders for places';
COMMENT ON TABLE meal_slot_assignments IS 'Extended meal slot assignments supporting recipes, meal prep, eat out, and freeform';
COMMENT ON TABLE weekly_meal_preferences IS 'Recurring weekly meal preferences for auto-filling meal slots';
