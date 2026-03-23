/*
  # Recipe Generator System - Phase 4: Validation & Quality Assurance
  
  1. Creates recipe_validation_status table:
     - Tracks detailed validation results for each recipe
     - Stores validation checks and quality scores
     - Supports automated and human validation workflows
  
  2. Sets up RLS policies for validation status table
  
  3. Security
    - RLS enabled on validation_status table
    - Users can view validation status for accessible recipes
    - Only recipe creators/admins can update validation status
*/

-- ============================================
-- 1. CREATE RECIPE VALIDATION STATUS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recipe_validation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Validation Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'needs_review', 'deprecated')),
  
  -- Validation Checks (JSONB for flexibility)
  ingredient_validation jsonb DEFAULT '{}'::jsonb,
  -- Structure: { "all_ingredients_mapped": true, "unknown_ingredients": [], "warnings": [] }
  
  instruction_validation jsonb DEFAULT '{}'::jsonb,
  -- Structure: { "has_instructions": true, "step_count": 5, "completeness_score": 0.95 }
  
  nutrition_validation jsonb DEFAULT '{}'::jsonb,
  -- Structure: { "has_nutrition": false, "estimated": true, "source": "ai_estimate" }
  
  source_validation jsonb DEFAULT '{}'::jsonb,
  -- Structure: { "source_verified": true, "url_accessible": true, "trust_score": 0.8 }
  
  -- Overall Quality Score
  quality_score numeric(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  
  -- Validation Metadata
  validated_by uuid REFERENCES profiles(id) ON DELETE SET NULL, -- Human validator
  validated_at timestamptz,
  validation_method text CHECK (validation_method IN ('automated', 'human', 'hybrid')),
  validation_notes text, -- Human notes about validation
  
  -- Automated Validation Results
  automated_checks jsonb DEFAULT '{}'::jsonb,
  -- Structure: { "check_name": "ingredient_mapping", "passed": true, "details": {...} }
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One validation record per recipe
  UNIQUE(recipe_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_validation_status ON recipe_validation_status(status);
CREATE INDEX IF NOT EXISTS idx_validation_quality ON recipe_validation_status(quality_score DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_validation_needs_review ON recipe_validation_status(recipe_id) WHERE status = 'needs_review';
CREATE INDEX IF NOT EXISTS idx_validation_recipe_id ON recipe_validation_status(recipe_id);

-- ============================================
-- 2. ENABLE RLS
-- ============================================

ALTER TABLE recipe_validation_status ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE RLS POLICIES
-- ============================================

-- Users can view validation status for recipes they can access
CREATE POLICY "Users can view validation status for accessible recipes"
  ON recipe_validation_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_validation_status.recipe_id
      AND r.deleted_at IS NULL
      AND (
        -- Public recipes
        (r.is_public = true AND r.household_id IS NULL)
        OR
        -- Recipes in user's personal space
        (r.household_id IS NOT NULL AND is_user_personal_space(r.household_id))
        OR
        -- Recipes in user's shared households
        (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
        OR
        -- User's own recipes
        (r.created_by = auth.uid())
      )
    )
  );

-- Users can create validation status records (via triggers/app logic)
CREATE POLICY "Users can create validation status for their recipes"
  ON recipe_validation_status FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_validation_status.recipe_id
      AND (
        r.created_by = auth.uid()
        OR
        (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
      )
    )
  );

-- Users can update validation status for their own recipes or if they're household members
CREATE POLICY "Users can update validation status for their recipes"
  ON recipe_validation_status FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_validation_status.recipe_id
      AND (
        r.created_by = auth.uid()
        OR
        (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_validation_status.recipe_id
      AND (
        r.created_by = auth.uid()
        OR
        (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
      )
    )
  );

-- ============================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_validation_status_updated_at
  BEFORE UPDATE ON recipe_validation_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. CREATE TRIGGER TO AUTO-CREATE VALIDATION STATUS
-- ============================================

-- Function to automatically create a validation status record when recipe is created
CREATE OR REPLACE FUNCTION create_initial_validation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create initial validation status record if it doesn't exist
  INSERT INTO recipe_validation_status (
    recipe_id,
    status,
    validation_method
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.validation_status, 'draft')::text,
    'automated'
  )
  ON CONFLICT (recipe_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_initial_validation_status_trigger
  AFTER INSERT ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_validation_status();

-- ============================================
-- 6. CREATE TRIGGER TO SYNC VALIDATION STATUS
-- ============================================

-- Function to sync validation_status changes from recipes table
-- This ensures the validation_status table stays in sync with recipes table
CREATE OR REPLACE FUNCTION sync_recipe_validation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update validation_status table when recipe.validation_status changes
  IF OLD.validation_status IS DISTINCT FROM NEW.validation_status THEN
    UPDATE recipe_validation_status
    SET status = NEW.validation_status::text,
        updated_at = now()
    WHERE recipe_id = NEW.id;
  END IF;
  
  -- Update quality_score when it changes
  IF OLD.quality_score IS DISTINCT FROM NEW.quality_score THEN
    UPDATE recipe_validation_status
    SET quality_score = NEW.quality_score,
        updated_at = now()
    WHERE recipe_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_recipe_validation_status_trigger
  AFTER UPDATE ON recipes
  FOR EACH ROW
  WHEN (OLD.validation_status IS DISTINCT FROM NEW.validation_status 
        OR OLD.quality_score IS DISTINCT FROM NEW.quality_score)
  EXECUTE FUNCTION sync_recipe_validation_status();
