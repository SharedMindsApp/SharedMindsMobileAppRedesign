/*
  # Recipe Generator System - Phase 5: Duplicate Detection
  
  1. Creates recipe_duplicates table:
     - Tracks duplicate relationships between recipes
     - Stores similarity scores and detection metadata
     - Supports merge workflow and user review
  
  2. Creates similarity calculation functions:
     - calculate_name_similarity() - Trigram similarity for recipe names
     - calculate_ingredient_similarity() - Jaccard similarity for ingredient sets
     - calculate_combined_similarity() - Weighted combination
  
  3. Creates duplicate detection function:
     - detect_recipe_duplicates() - Main detection function
     - Compares recipes and creates duplicate records
  
  4. Creates trigger for auto-detection on recipe insert
  
  5. Sets up RLS policies
*/

-- Ensure pg_trgm extension is available (for similarity calculations)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_trgm extension not available. Some similarity calculations may be limited.';
END $$;

-- ============================================
-- 1. CREATE RECIPE DUPLICATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recipe_duplicates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Duplicate Relationship
  primary_recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  duplicate_recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Detection Metadata
  similarity_score numeric(5,4) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  detection_method text NOT NULL CHECK (detection_method IN ('name_match', 'ingredient_match', 'combined', 'user_reported', 'ai_detected')),
  detection_confidence text NOT NULL CHECK (detection_confidence IN ('high', 'medium', 'low')),
  
  -- Similarity Breakdown (JSONB for detailed analysis)
  similarity_details jsonb DEFAULT '{}'::jsonb,
  -- Structure:
  -- {
  --   "name_similarity": 0.95,
  --   "ingredient_similarity": 0.88,
  --   "matching_ingredients": ["food_item_id1", "food_item_id2"]
  -- }
  
  -- Status
  status text NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'pending_review', 'confirmed', 'merged', 'rejected', 'false_positive')),
  
  -- Merge Decision
  merge_action text CHECK (merge_action IN ('merge', 'keep_separate', 'pending')),
  merged_into_recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  merged_at timestamptz,
  merged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- User Review
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  
  -- Timestamps
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CHECK (primary_recipe_id != duplicate_recipe_id),
  UNIQUE(primary_recipe_id, duplicate_recipe_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_duplicates_primary ON recipe_duplicates(primary_recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_duplicates_duplicate ON recipe_duplicates(duplicate_recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_duplicates_status ON recipe_duplicates(status) WHERE status IN ('detected', 'pending_review');
CREATE INDEX IF NOT EXISTS idx_recipe_duplicates_similarity ON recipe_duplicates(similarity_score DESC) WHERE status = 'detected';
CREATE INDEX IF NOT EXISTS idx_recipe_duplicates_merged_into ON recipe_duplicates(merged_into_recipe_id) WHERE merged_into_recipe_id IS NOT NULL;

-- ============================================
-- 2. CREATE SIMILARITY CALCULATION FUNCTIONS
-- ============================================

-- Function to calculate name similarity using trigram similarity
CREATE OR REPLACE FUNCTION calculate_name_similarity(name1 text, name2 text)
RETURNS numeric(5,4)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN name1 IS NULL OR name2 IS NULL THEN 0::numeric(5,4)
    ELSE similarity(lower(trim(name1)), lower(trim(name2)))::numeric(5,4)
  END;
$$;

-- Function to calculate ingredient similarity using Jaccard similarity
-- Compares sets of food_item_ids (excluding optional ingredients)
CREATE OR REPLACE FUNCTION calculate_ingredient_similarity(ingredients1 jsonb, ingredients2 jsonb)
RETURNS numeric(5,4)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  set1 uuid[];
  set2 uuid[];
  intersection_size int;
  union_size int;
BEGIN
  -- Extract food_item_ids from ingredients1 (excluding optional)
  SELECT array_agg(DISTINCT (ing->>'food_item_id')::uuid)
  INTO set1
  FROM jsonb_array_elements(ingredients1) AS ing
  WHERE (ing->>'optional')::boolean IS NOT TRUE
    AND ing->>'food_item_id' IS NOT NULL;
  
  -- Extract food_item_ids from ingredients2 (excluding optional)
  SELECT array_agg(DISTINCT (ing->>'food_item_id')::uuid)
  INTO set2
  FROM jsonb_array_elements(ingredients2) AS ing
  WHERE (ing->>'optional')::boolean IS NOT TRUE
    AND ing->>'food_item_id' IS NOT NULL;
  
  -- Handle empty sets
  IF set1 IS NULL OR array_length(set1, 1) IS NULL THEN
    RETURN CASE WHEN set2 IS NULL OR array_length(set2, 1) IS NULL THEN 1.0::numeric(5,4) ELSE 0.0::numeric(5,4) END;
  END IF;
  
  IF set2 IS NULL OR array_length(set2, 1) IS NULL THEN
    RETURN 0.0::numeric(5,4);
  END IF;
  
  -- Calculate intersection size (matching ingredients)
  SELECT COUNT(*) INTO intersection_size
  FROM unnest(set1) AS elem
  WHERE elem = ANY(set2);
  
  -- Calculate union size
  SELECT COUNT(DISTINCT elem) INTO union_size
  FROM (
    SELECT unnest(set1) AS elem
    UNION ALL
    SELECT unnest(set2) AS elem
  ) AS combined;
  
  -- Jaccard similarity: intersection / union
  IF union_size = 0 THEN
    RETURN 0.0::numeric(5,4);
  END IF;
  
  RETURN (intersection_size::numeric / union_size::numeric)::numeric(5,4);
END;
$$;

-- Function to calculate combined similarity (weighted combination)
-- 40% name similarity + 60% ingredient similarity
CREATE OR REPLACE FUNCTION calculate_combined_similarity(
  name1 text,
  name2 text,
  ingredients1 jsonb,
  ingredients2 jsonb
)
RETURNS numeric(5,4)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    calculate_name_similarity(name1, name2) * 0.4 +
    calculate_ingredient_similarity(ingredients1, ingredients2) * 0.6
  )::numeric(5,4);
$$;

-- ============================================
-- 3. CREATE DUPLICATE DETECTION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION detect_recipe_duplicates(
  new_recipe_id uuid,
  check_household_id uuid DEFAULT NULL,
  similarity_threshold numeric DEFAULT 0.75
)
RETURNS TABLE(
  duplicate_id uuid,
  similarity_score numeric(5,4),
  detection_method text
)
LANGUAGE plpgsql
AS $$
DECLARE
  new_recipe recipes%ROWTYPE;
  candidate recipes%ROWTYPE;
  name_sim numeric(5,4);
  ingredient_sim numeric(5,4);
  combined_sim numeric(5,4);
BEGIN
  -- Get new recipe data
  SELECT * INTO new_recipe
  FROM recipes
  WHERE id = new_recipe_id
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Find candidate duplicates
  -- Check recipes in same household + public recipes
  FOR candidate IN
    SELECT r.*
    FROM recipes r
    WHERE r.id != new_recipe_id
      AND r.deleted_at IS NULL
      AND (
        -- Recipes in same household
        (check_household_id IS NOT NULL AND r.household_id = check_household_id)
        OR
        -- Public recipes
        (r.is_public = true)
        OR
        -- Or check all recipes if no household specified
        (check_household_id IS NULL)
      )
    ORDER BY r.created_at DESC
  LOOP
    -- Calculate similarities
    name_sim := calculate_name_similarity(new_recipe.name, candidate.name);
    ingredient_sim := calculate_ingredient_similarity(new_recipe.ingredients, candidate.ingredients);
    combined_sim := calculate_combined_similarity(
      new_recipe.name,
      candidate.name,
      new_recipe.ingredients,
      candidate.ingredients
    );
    
    -- If above threshold, record as potential duplicate
    IF combined_sim >= similarity_threshold THEN
      -- Determine detection method and confidence
      DECLARE
        method text;
        confidence text;
        matching_ingredients uuid[];
      BEGIN
        -- Extract matching ingredients
        SELECT array_agg(DISTINCT (ing->>'food_item_id')::uuid)
        INTO matching_ingredients
        FROM jsonb_array_elements(new_recipe.ingredients) AS ing
        WHERE ing->>'food_item_id' IS NOT NULL
          AND (ing->>'food_item_id')::uuid IN (
            SELECT (ing2->>'food_item_id')::uuid
            FROM jsonb_array_elements(candidate.ingredients) AS ing2
            WHERE ing2->>'food_item_id' IS NOT NULL
          );
        
        -- Determine method and confidence based on similarities
        IF name_sim >= 0.90 AND ingredient_sim >= 0.85 THEN
          method := 'combined';
          confidence := 'high';
        ELSIF name_sim >= 0.85 THEN
          method := 'name_match';
          confidence := 'medium';
        ELSIF ingredient_sim >= 0.80 THEN
          method := 'ingredient_match';
          confidence := 'medium';
        ELSE
          method := 'combined';
          confidence := 'low';
        END IF;
        
        -- Insert duplicate record (if not already exists)
        INSERT INTO recipe_duplicates (
          primary_recipe_id,
          duplicate_recipe_id,
          similarity_score,
          detection_method,
          detection_confidence,
          similarity_details,
          status
        )
        VALUES (
          new_recipe_id,
          candidate.id,
          combined_sim,
          method,
          confidence,
          jsonb_build_object(
            'name_similarity', name_sim,
            'ingredient_similarity', ingredient_sim,
            'matching_ingredients', COALESCE(matching_ingredients, ARRAY[]::uuid[])
          ),
          'detected'
        )
        ON CONFLICT (primary_recipe_id, duplicate_recipe_id) DO NOTHING;
        
        -- Return result
        duplicate_id := candidate.id;
        similarity_score := combined_sim;
        detection_method := method;
        RETURN NEXT;
      END;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- ============================================
-- 4. CREATE DETECTION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION check_duplicates_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  duplicate_count int;
BEGIN
  -- Run duplicate detection (only if recipe is not deleted)
  IF NEW.deleted_at IS NULL THEN
    PERFORM detect_recipe_duplicates(
      NEW.id,
      NEW.household_id,
      0.75 -- similarity threshold
    );
    
    -- Count detected duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM recipe_duplicates
    WHERE (primary_recipe_id = NEW.id OR duplicate_recipe_id = NEW.id)
      AND status = 'detected';
    
    -- Log detection (can be used for notifications later)
    IF duplicate_count > 0 THEN
      RAISE NOTICE 'Found % potential duplicates for recipe %', duplicate_count, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_duplicates_on_recipe_insert
  AFTER INSERT ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicates_on_insert();

-- ============================================
-- 5. ENABLE RLS
-- ============================================

ALTER TABLE recipe_duplicates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES
-- ============================================

-- Users can view duplicate records for recipes they can access
CREATE POLICY "Users can view duplicates for accessible recipes"
  ON recipe_duplicates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_duplicates.primary_recipe_id
      AND r.deleted_at IS NULL
      AND (
        (r.is_public = true AND r.household_id IS NULL)
        OR (r.household_id IS NOT NULL AND is_user_personal_space(r.household_id))
        OR (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
        OR (r.created_by = auth.uid())
      )
    )
  );

-- Users can create duplicate records (via triggers/app logic)
CREATE POLICY "Users can create duplicate records"
  ON recipe_duplicates FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Detection happens automatically, so allow

-- Users can update duplicate records for review/merge
CREATE POLICY "Users can update duplicates for their recipes"
  ON recipe_duplicates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_duplicates.primary_recipe_id
      AND (
        r.created_by = auth.uid()
        OR (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_duplicates.primary_recipe_id
      AND (
        r.created_by = auth.uid()
        OR (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
      )
    )
  );

-- ============================================
-- 7. CREATE MERGE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION merge_recipe_duplicates(
  p_primary_recipe_id uuid,
  p_duplicate_recipe_id uuid,
  p_merged_by_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update duplicate record (handle both directions)
  UPDATE recipe_duplicates
  SET 
    status = 'merged',
    merge_action = 'merge',
    merged_into_recipe_id = p_primary_recipe_id,
    merged_at = now(),
    merged_by = p_merged_by_user_id,
    updated_at = now()
  WHERE (primary_recipe_id = p_primary_recipe_id AND duplicate_recipe_id = p_duplicate_recipe_id)
     OR (primary_recipe_id = p_duplicate_recipe_id AND duplicate_recipe_id = p_primary_recipe_id);
  
  -- Also update any reverse duplicate records (where roles are swapped)
  UPDATE recipe_duplicates
  SET 
    status = 'merged',
    merge_action = 'merge',
    merged_into_recipe_id = p_primary_recipe_id,
    merged_at = now(),
    merged_by = p_merged_by_user_id,
    updated_at = now()
  WHERE (primary_recipe_id = p_duplicate_recipe_id AND duplicate_recipe_id = p_primary_recipe_id)
     OR (primary_recipe_id = p_primary_recipe_id AND duplicate_recipe_id = p_duplicate_recipe_id);
  
  -- Note: In Phase 7, we'll update meal_plans to reference recipe_id
  -- For now, if meal_plans has a recipe_id column, we'll update it
  -- Otherwise, this will be handled in Phase 7 integration
  
  -- Deprecate duplicate recipe (soft delete)
  UPDATE recipes
  SET 
    validation_status = 'deprecated',
    deleted_at = now(),
    updated_at = now()
  WHERE id = p_duplicate_recipe_id;
  
  -- Transfer any version history reference (optional - could keep for audit trail)
  -- For now, we just deprecate the duplicate
END;
$$;

-- Function to reject a duplicate (mark as false positive)
CREATE OR REPLACE FUNCTION reject_recipe_duplicate(
  p_primary_recipe_id uuid,
  p_duplicate_recipe_id uuid,
  p_reviewed_by_user_id uuid,
  p_review_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update duplicate record to rejected
  UPDATE recipe_duplicates
  SET 
    status = 'rejected',
    merge_action = 'keep_separate',
    reviewed_by = p_reviewed_by_user_id,
    reviewed_at = now(),
    review_notes = p_review_notes,
    updated_at = now()
  WHERE (primary_recipe_id = p_primary_recipe_id AND duplicate_recipe_id = p_duplicate_recipe_id)
     OR (primary_recipe_id = p_duplicate_recipe_id AND duplicate_recipe_id = p_primary_recipe_id);
END;
$$;

-- ============================================
-- 8. CREATE TRIGGER FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_recipe_duplicates_updated_at
  BEFORE UPDATE ON recipe_duplicates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
