/*
  # Wipe Recipe Library - Clean Slate for AI-Driven System
  
  This migration completely wipes all recipe-related data to allow
  building from scratch with the new AI-driven recipe library.
  
  WARNING: This will delete ALL recipe data including:
  - Recipes
  - Recipe sources
  - Recipe versions
  - Validation statuses
  - Feedback
  - Usage statistics
  - Duplicate records
  
  This is irreversible. Use with caution.
*/

-- ============================================
-- 1. CLEAR RECIPE REFERENCES FROM MEAL PLANNER
-- ============================================

-- Clear recipe_id from meal_plans (set to NULL, keep meal_id if exists)
UPDATE meal_plans
SET recipe_id = NULL
WHERE recipe_id IS NOT NULL;

-- Clear recipe_id from meal_favourites (delete entries that only have recipe_id)
DELETE FROM meal_favourites
WHERE recipe_id IS NOT NULL AND meal_id IS NULL;

-- For meal_favourites that have both meal_id and recipe_id, just clear recipe_id
UPDATE meal_favourites
SET recipe_id = NULL
WHERE recipe_id IS NOT NULL AND meal_id IS NOT NULL;

-- ============================================
-- 2. DELETE ALL RECIPE-RELATED DATA
-- ============================================

-- Delete in order to respect foreign key constraints

-- Recipe duplicates (references recipes)
DELETE FROM recipe_duplicates;

-- Recipe feedback (references recipes)
DELETE FROM recipe_feedback;

-- Recipe usage stats (references recipes)
DELETE FROM recipe_usage_stats;

-- Recipe validation status (references recipes)
DELETE FROM recipe_validation_status;

-- Recipe versions (references recipes)
DELETE FROM recipe_versions;

-- Recipe sources (referenced by recipes)
DELETE FROM recipe_sources;

-- Recipes (main table)
DELETE FROM recipes;

-- ============================================
-- 2. RESET SEQUENCES (if any)
-- ============================================

-- Reset any auto-increment sequences if they exist
-- (PostgreSQL uses UUIDs, so this may not be necessary, but included for completeness)

-- ============================================
-- 3. VERIFY DELETION
-- ============================================

-- Optional: Add a check to verify all tables are empty
DO $$
DECLARE
  recipe_count int;
  source_count int;
  version_count int;
  validation_count int;
  feedback_count int;
  stats_count int;
  duplicate_count int;
BEGIN
  SELECT COUNT(*) INTO recipe_count FROM recipes;
  SELECT COUNT(*) INTO source_count FROM recipe_sources;
  SELECT COUNT(*) INTO version_count FROM recipe_versions;
  SELECT COUNT(*) INTO validation_count FROM recipe_validation_status;
  SELECT COUNT(*) INTO feedback_count FROM recipe_feedback;
  SELECT COUNT(*) INTO stats_count FROM recipe_usage_stats;
  SELECT COUNT(*) INTO duplicate_count FROM recipe_duplicates;
  
  IF recipe_count > 0 OR source_count > 0 OR version_count > 0 OR 
     validation_count > 0 OR feedback_count > 0 OR stats_count > 0 OR 
     duplicate_count > 0 THEN
    RAISE WARNING 'Some recipe data may still exist. Recipe count: %, Source count: %, Version count: %, Validation count: %, Feedback count: %, Stats count: %, Duplicate count: %',
      recipe_count, source_count, version_count, validation_count, feedback_count, stats_count, duplicate_count;
  END IF;
END $$;
