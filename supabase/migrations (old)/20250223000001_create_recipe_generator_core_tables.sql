/*
  # Recipe Generator System - Phase 1: Core Tables
  
  1. Creates core recipe system tables:
     - recipes (canonical recipe entity)
     - recipe_sources (source provenance)
     - recipe_versions (version history)
  
  2. Creates ingredient validation trigger
  
  3. Sets up RLS policies
  
  4. Security
    - RLS enabled on all tables
    - Proper access controls for households and personal spaces
*/

-- Ensure enums exist (reuse from meal_library system)
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

-- ============================================
-- 1. CREATE RECIPE SOURCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recipe_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source Type
  source_type text NOT NULL CHECK (source_type IN ('ai', 'user', 'scrape', 'api', 'import')),
  
  -- Source Identification
  source_name text,
  source_url text,
  source_api_key text, -- Encrypted if needed
  
  -- Validation Status
  is_validated boolean DEFAULT false,
  validated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  validated_at timestamptz,
  validation_method text,
  
  -- Source Metadata (JSONB for flexibility)
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Trust & Safety
  trust_score numeric(3,2) DEFAULT 0.5 CHECK (trust_score >= 0 AND trust_score <= 1),
  requires_validation boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for recipe_sources
CREATE INDEX IF NOT EXISTS idx_recipe_sources_type ON recipe_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_recipe_sources_validated ON recipe_sources(is_validated) WHERE is_validated = false;
CREATE INDEX IF NOT EXISTS idx_recipe_sources_trust_score ON recipe_sources(trust_score DESC);

-- ============================================
-- 2. CREATE RECIPES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Recipe Data
  name text NOT NULL,
  description text,
  meal_type meal_type NOT NULL,
  servings int DEFAULT 4,
  
  -- Ingredients (JSONB array)
  -- Structure: [{ food_item_id: uuid, quantity: text, unit: text, optional: boolean, notes: text, substitutions: uuid[], pantry_equivalent: uuid }]
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Instructions
  instructions text,
  instructions_structured jsonb,
  
  -- Metadata
  categories meal_category[] DEFAULT '{}',
  cuisine cuisine_type,
  difficulty cooking_difficulty DEFAULT 'medium',
  prep_time int,
  cook_time int,
  total_time int, -- calculated: prep_time + cook_time
  
  -- Nutrition (all nullable - no enforcement)
  calories int,
  protein int,
  carbs int,
  fat int,
  fiber int,
  sodium int,
  
  -- Dietary Information
  allergies text[] DEFAULT '{}',
  dietary_tags text[] DEFAULT '{}',
  
  -- Media
  image_url text,
  image_urls text[],
  
  -- Source & Provenance
  source_id uuid REFERENCES recipe_sources(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN ('ai', 'user', 'scrape', 'api', 'import')),
  source_url text,
  
  -- Versioning (will be populated after recipe_versions table is created)
  current_version_id uuid,
  version_count int DEFAULT 1,
  
  -- Validation & Quality
  validation_status text DEFAULT 'draft' CHECK (validation_status IN ('draft', 'pending', 'approved', 'needs_review', 'deprecated')),
  validation_notes text,
  quality_score numeric(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  
  -- Ownership & Access
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  is_public boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  
  -- Soft Delete
  deleted_at timestamptz
);

-- Indexes for recipes
CREATE INDEX IF NOT EXISTS idx_recipes_household_id ON recipes(household_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipes_validation_status ON recipes(validation_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public) WHERE deleted_at IS NULL AND is_public = true;
CREATE INDEX IF NOT EXISTS idx_recipes_quality_score ON recipes(quality_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipes_source_type ON recipes(source_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipes_current_version_id ON recipes(current_version_id) WHERE current_version_id IS NOT NULL;

-- GIN index for JSONB ingredients (for pantry matching queries)
CREATE INDEX IF NOT EXISTS idx_recipes_ingredients_gin ON recipes USING gin(ingredients) WHERE deleted_at IS NULL;

-- Full-text search index (using pg_trgm if available)
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_recipes_name_trgm ON recipes USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL;
EXCEPTION
  WHEN undefined_function THEN
    -- Fallback if pg_trgm not available
    CREATE INDEX IF NOT EXISTS idx_recipes_name_lower ON recipes(lower(name)) WHERE deleted_at IS NULL;
END $$;

-- ============================================
-- 3. CREATE RECIPE VERSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recipe_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Version Metadata
  version_number int NOT NULL,
  parent_version_id uuid REFERENCES recipe_versions(id) ON DELETE SET NULL,
  
  -- Full Recipe Snapshot (at time of version creation)
  name text NOT NULL,
  description text,
  meal_type meal_type NOT NULL,
  servings int,
  ingredients jsonb NOT NULL,
  instructions text,
  instructions_structured jsonb,
  categories meal_category[],
  cuisine cuisine_type,
  difficulty cooking_difficulty,
  prep_time int,
  cook_time int,
  total_time int,
  calories int,
  protein int,
  carbs int,
  fat int,
  allergies text[],
  dietary_tags text[],
  image_url text,
  image_urls text[],
  
  -- Version-Specific Metadata
  change_reason text,
  change_notes text,
  generated_by_job_id uuid, -- Will reference recipe_generation_jobs in Phase 3
  
  -- AI Context (if applicable)
  generation_prompt text,
  generation_context jsonb,
  
  -- Created By
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Version Comparison
  diff_summary jsonb
);

-- Indexes for recipe_versions
CREATE INDEX IF NOT EXISTS idx_recipe_versions_recipe_id ON recipe_versions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_versions_version_number ON recipe_versions(recipe_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_versions_parent ON recipe_versions(parent_version_id) WHERE parent_version_id IS NOT NULL;

-- Add foreign key constraint for current_version_id now that recipe_versions exists
ALTER TABLE recipes
ADD CONSTRAINT fk_recipes_current_version 
FOREIGN KEY (current_version_id) REFERENCES recipe_versions(id) ON DELETE SET NULL;

-- ============================================
-- 4. CREATE INGREDIENT VALIDATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION validate_recipe_ingredients()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  ingredient_record jsonb;
  food_item_id_value uuid;
BEGIN
  -- Validate all ingredients have food_item_id
  FOR ingredient_record IN SELECT * FROM jsonb_array_elements(NEW.ingredients)
  LOOP
    IF ingredient_record->>'food_item_id' IS NULL THEN
      RAISE EXCEPTION 'All ingredients must have food_item_id. Ingredient: %', ingredient_record;
    END IF;
    
    -- Validate food_item_id references exist
    food_item_id_value := (ingredient_record->>'food_item_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM food_items WHERE id = food_item_id_value) THEN
      RAISE EXCEPTION 'Invalid food_item_id reference: %. Ingredient: %', food_item_id_value, ingredient_record;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_recipe_ingredients_trigger
  BEFORE INSERT OR UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION validate_recipe_ingredients();

-- ============================================
-- 5. ENABLE RLS
-- ============================================

ALTER TABLE recipe_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_versions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES
-- ============================================

-- Ensure helper functions exist (reuse from pantry RLS migration)
CREATE OR REPLACE FUNCTION is_user_personal_space(check_household_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM spaces s
    JOIN space_members sm ON sm.space_id = s.id
    JOIN profiles p ON p.id = sm.user_id
    WHERE (s.id = check_household_id OR s.context_id = check_household_id)
    AND s.context_type = 'personal'
    AND p.user_id = auth.uid()
    AND sm.status = 'active'
  )
  OR EXISTS(
    SELECT 1
    FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE h.id = check_household_id
    AND h.type = 'personal'
    AND hm.auth_user_id = auth.uid()
    AND hm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_user_household_member(check_household_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM household_members
    WHERE household_id = check_household_id
    AND auth_user_id = auth.uid()
    AND status = 'active'
  );
$$;

-- Recipe Sources RLS Policies
CREATE POLICY "Anyone can view recipe sources"
  ON recipe_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create recipe sources"
  ON recipe_sources FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Recipes RLS Policies
CREATE POLICY "Users can view accessible recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- Public recipes
      (is_public = true AND household_id IS NULL)
      OR
      -- Recipes in user's personal space
      (household_id IS NOT NULL AND is_user_personal_space(household_id))
      OR
      -- Recipes in user's shared households
      (household_id IS NOT NULL AND is_user_household_member(household_id))
      OR
      -- User's own recipes (regardless of household)
      (created_by = auth.uid())
    )
  );

CREATE POLICY "Users can create recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      -- Can create in personal space
      (household_id IS NOT NULL AND is_user_personal_space(household_id))
      OR
      -- Can create in shared households they're members of
      (household_id IS NOT NULL AND is_user_household_member(household_id))
      OR
      -- Can create public recipes
      (is_public = true AND household_id IS NULL)
    )
  );

CREATE POLICY "Users can update their own recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  );

CREATE POLICY "Users can delete their own recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  );

-- Recipe Versions RLS Policies
CREATE POLICY "Users can view recipe versions for accessible recipes"
  ON recipe_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_versions.recipe_id
      AND r.deleted_at IS NULL
      AND (
        (r.is_public = true AND r.household_id IS NULL)
        OR (r.household_id IS NOT NULL AND is_user_personal_space(r.household_id))
        OR (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
        OR (r.created_by = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create recipe versions for their recipes"
  ON recipe_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_versions.recipe_id
      AND (r.created_by = auth.uid() OR (r.household_id IS NOT NULL AND is_user_household_member(r.household_id)))
    )
  );

CREATE POLICY "Users can update their recipe versions"
  ON recipe_versions FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to automatically create initial version when recipe is created
CREATE OR REPLACE FUNCTION create_initial_recipe_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_version_id uuid;
BEGIN
  -- Create initial version
  INSERT INTO recipe_versions (
    recipe_id,
    version_number,
    name,
    description,
    meal_type,
    servings,
    ingredients,
    instructions,
    instructions_structured,
    categories,
    cuisine,
    difficulty,
    prep_time,
    cook_time,
    total_time,
    calories,
    protein,
    carbs,
    fat,
    allergies,
    dietary_tags,
    image_url,
    image_urls,
    change_reason,
    created_by
  )
  VALUES (
    NEW.id,
    1,
    NEW.name,
    NEW.description,
    NEW.meal_type,
    NEW.servings,
    NEW.ingredients,
    NEW.instructions,
    NEW.instructions_structured,
    NEW.categories,
    NEW.cuisine,
    NEW.difficulty,
    NEW.prep_time,
    NEW.cook_time,
    NEW.total_time,
    NEW.calories,
    NEW.protein,
    NEW.carbs,
    NEW.fat,
    NEW.allergies,
    NEW.dietary_tags,
    NEW.image_url,
    NEW.image_urls,
    'initial_creation',
    NEW.created_by
  )
  RETURNING id INTO new_version_id;
  
  -- Update recipe with current_version_id
  UPDATE recipes
  SET current_version_id = new_version_id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_initial_recipe_version_trigger
  AFTER INSERT ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_recipe_version();

-- Function to calculate total_time from prep_time and cook_time
CREATE OR REPLACE FUNCTION calculate_total_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.prep_time IS NOT NULL OR NEW.cook_time IS NOT NULL THEN
    NEW.total_time := COALESCE(NEW.prep_time, 0) + COALESCE(NEW.cook_time, 0);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_total_time_trigger
  BEFORE INSERT OR UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_time();

CREATE TRIGGER calculate_total_time_version_trigger
  BEFORE INSERT OR UPDATE ON recipe_versions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_time();

-- ============================================
-- 8. UPDATE TIMESTAMP TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_recipe_sources_updated_at
  BEFORE UPDATE ON recipe_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
