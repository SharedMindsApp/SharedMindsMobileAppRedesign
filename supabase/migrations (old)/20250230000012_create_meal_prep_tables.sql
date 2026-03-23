-- Meal Prep & Leftovers System
-- Supports bulk cooking, portion scaling, and leftovers tracking

-- Prepared Meals: Represents a single cooking event
CREATE TABLE IF NOT EXISTS prepared_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  meal_library_id uuid REFERENCES meal_library(id) ON DELETE CASCADE,
  
  -- Recipe reference info (snapshot at prep time)
  recipe_name text NOT NULL,
  base_servings integer NOT NULL CHECK (base_servings > 0),
  prepared_servings numeric(10, 2) NOT NULL CHECK (prepared_servings > 0),
  remaining_servings numeric(10, 2) NOT NULL CHECK (remaining_servings >= 0),
  
  -- Scaling factor: prepared_servings / base_servings
  scaling_factor numeric(10, 4) NOT NULL CHECK (scaling_factor > 0),
  
  -- Metadata
  prepared_at timestamptz NOT NULL DEFAULT now(),
  prepared_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  
  -- Constraints
  CHECK (prepared_servings >= base_servings),
  CHECK (remaining_servings <= prepared_servings),
  CHECK (recipe_id IS NOT NULL OR meal_library_id IS NOT NULL),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Meal Assignments: Links prepared meals to meal slots
CREATE TABLE IF NOT EXISTS meal_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prepared_meal_id uuid REFERENCES prepared_meals(id) ON DELETE CASCADE NOT NULL,
  
  -- Assignment target
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  
  -- Portion consumed
  servings_used numeric(10, 2) NOT NULL CHECK (servings_used > 0),
  
  -- Metadata
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate assignments to same slot
  UNIQUE (prepared_meal_id, space_id, week_start_date, day_of_week, meal_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prepared_meals_space_id ON prepared_meals(space_id);
CREATE INDEX IF NOT EXISTS idx_prepared_meals_recipe_id ON prepared_meals(recipe_id);
CREATE INDEX IF NOT EXISTS idx_prepared_meals_meal_library_id ON prepared_meals(meal_library_id);
CREATE INDEX IF NOT EXISTS idx_prepared_meals_prepared_at ON prepared_meals(prepared_at DESC);
CREATE INDEX IF NOT EXISTS idx_prepared_meals_remaining_servings ON prepared_meals(remaining_servings) WHERE remaining_servings > 0;

CREATE INDEX IF NOT EXISTS idx_meal_assignments_prepared_meal_id ON meal_assignments(prepared_meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_assignments_space_date ON meal_assignments(space_id, week_start_date, day_of_week, meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_assignments_space_id ON meal_assignments(space_id);

-- Function to update remaining_servings when assignments are created/updated/deleted
CREATE OR REPLACE FUNCTION update_prepared_meal_remaining_servings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prepared_meals
    SET remaining_servings = remaining_servings - NEW.servings_used,
        updated_at = now()
    WHERE id = NEW.prepared_meal_id;
    
    -- Check if we're trying to assign more than available
    IF (SELECT remaining_servings FROM prepared_meals WHERE id = NEW.prepared_meal_id) < 0 THEN
      RAISE EXCEPTION 'Cannot assign more servings than remaining. Remaining: %, Requested: %',
        (SELECT remaining_servings + NEW.servings_used FROM prepared_meals WHERE id = NEW.prepared_meal_id),
        NEW.servings_used;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Adjust by the difference
    UPDATE prepared_meals
    SET remaining_servings = remaining_servings + OLD.servings_used - NEW.servings_used,
        updated_at = now()
    WHERE id = NEW.prepared_meal_id;
    
    -- Check if we're trying to assign more than available
    IF (SELECT remaining_servings FROM prepared_meals WHERE id = NEW.prepared_meal_id) < 0 THEN
      RAISE EXCEPTION 'Cannot assign more servings than remaining. Remaining: %, Requested: %',
        (SELECT remaining_servings + NEW.servings_used FROM prepared_meals WHERE id = NEW.prepared_meal_id),
        NEW.servings_used;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prepared_meals
    SET remaining_servings = remaining_servings + OLD.servings_used,
        updated_at = now()
    WHERE id = OLD.prepared_meal_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update remaining_servings
CREATE TRIGGER trigger_update_remaining_servings
  AFTER INSERT OR UPDATE OR DELETE ON meal_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_prepared_meal_remaining_servings();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prepared_meals_updated_at
  BEFORE UPDATE ON prepared_meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_meal_assignments_updated_at
  BEFORE UPDATE ON meal_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE prepared_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view prepared meals in their spaces
CREATE POLICY "Users can view prepared meals in their spaces"
  ON prepared_meals FOR SELECT
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- Users can create prepared meals in their spaces
CREATE POLICY "Users can create prepared meals in their spaces"
  ON prepared_meals FOR INSERT
  WITH CHECK (
    (is_user_personal_space(space_id) OR is_user_household_member(space_id))
    AND (prepared_by IS NULL OR prepared_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- Users can update prepared meals in their spaces
CREATE POLICY "Users can update prepared meals in their spaces"
  ON prepared_meals FOR UPDATE
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- Users can delete prepared meals in their spaces
CREATE POLICY "Users can delete prepared meals in their spaces"
  ON prepared_meals FOR DELETE
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- Users can view meal assignments in their spaces
CREATE POLICY "Users can view meal assignments in their spaces"
  ON meal_assignments FOR SELECT
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- Users can create meal assignments in their spaces
CREATE POLICY "Users can create meal assignments in their spaces"
  ON meal_assignments FOR INSERT
  WITH CHECK (
    (is_user_personal_space(space_id) OR is_user_household_member(space_id))
    AND (assigned_by IS NULL OR assigned_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- Users can update meal assignments in their spaces
CREATE POLICY "Users can update meal assignments in their spaces"
  ON meal_assignments FOR UPDATE
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );

-- Users can delete meal assignments in their spaces
CREATE POLICY "Users can delete meal assignments in their spaces"
  ON meal_assignments FOR DELETE
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
  );
