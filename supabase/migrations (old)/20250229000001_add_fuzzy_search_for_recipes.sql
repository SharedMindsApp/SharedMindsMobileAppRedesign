/*
  # Add Fuzzy Search Function for Recipes
  
  Creates RPC function for fuzzy recipe name matching using pg_trgm similarity.
  This enables misspelling-tolerant search and better recipe discovery.
*/

-- Ensure pg_trgm extension is available
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_trgm extension not available. Fuzzy search will be limited.';
END $$;

-- Create index on recipe names for trigram similarity (if not exists)
CREATE INDEX IF NOT EXISTS idx_recipes_name_trgm ON recipes USING gin(name gin_trgm_ops);

-- ============================================
-- 1. CREATE FUZZY SEARCH FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION search_recipes_fuzzy(
  search_term text,
  similarity_threshold numeric DEFAULT 0.3,
  meal_type_filter meal_type DEFAULT NULL,
  cuisine_filter cuisine_type DEFAULT NULL,
  difficulty_filter cooking_difficulty DEFAULT NULL,
  household_id_filter uuid DEFAULT NULL,
  include_public boolean DEFAULT false,
  tags_filter text[] DEFAULT NULL,
  limit_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  meal_type meal_type,
  servings int,
  ingredients jsonb,
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
  fiber int,
  sodium int,
  allergies text[],
  dietary_tags text[],
  image_url text,
  image_urls text[],
  source_id uuid,
  source_type text,
  source_url text,
  current_version_id uuid,
  version_count int,
  validation_status text,
  validation_notes text,
  quality_score numeric(3,2),
  created_by uuid,
  household_id uuid,
  is_public boolean,
  created_at timestamptz,
  updated_at timestamptz,
  published_at timestamptz,
  deleted_at timestamptz,
  similarity_score numeric(5,4)
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    r.*,
    similarity(lower(r.name), lower(search_term))::numeric(5,4) as similarity_score
  FROM recipes r
  WHERE 
    r.deleted_at IS NULL
    AND similarity(lower(r.name), lower(search_term)) >= similarity_threshold
    AND (meal_type_filter IS NULL OR r.meal_type = meal_type_filter)
    AND (cuisine_filter IS NULL OR r.cuisine = cuisine_filter)
    AND (difficulty_filter IS NULL OR r.difficulty = difficulty_filter)
    AND (tags_filter IS NULL OR r.dietary_tags && tags_filter)
    AND (
      household_id_filter IS NULL 
      OR r.household_id = household_id_filter
      OR (include_public = true AND r.is_public = true)
    )
    AND r.validation_status IN ('approved', 'pending')
  ORDER BY similarity_score DESC, r.created_at DESC
  LIMIT limit_count;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_recipes_fuzzy TO authenticated;
