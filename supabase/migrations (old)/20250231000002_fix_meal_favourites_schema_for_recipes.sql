/*
  # Fix Meal Favourites Schema to Support Recipe Favourites
  
  ## Problem
  The meal_favourites table currently enforces meal_id NOT NULL, which prevents
  inserting recipe favorites (where recipe_id is set and meal_id should be NULL).
  
  Error: null value in column "meal_id" violates not-null constraint
  
  ## Solution
  1. Make meal_id nullable (to allow recipe favorites)
  2. Ensure recipe_id is nullable (already done in 20250227000001)
  3. Add CHECK constraint to ensure exactly one of meal_id or recipe_id is set
  4. Update unique indexes to work with nullable columns
  5. Keep all foreign keys and RLS policies unchanged
*/

-- ============================================
-- 1. ALTER meal_id TO ALLOW NULL
-- ============================================
-- This allows recipe favorites where meal_id is NULL and recipe_id is set
ALTER TABLE meal_favourites
ALTER COLUMN meal_id DROP NOT NULL;

-- ============================================
-- 2. ENSURE recipe_id IS NULLABLE
-- ============================================
-- This should already be done in 20250227000001, but ensure it's nullable
-- (No-op if already nullable, safe to run multiple times)
DO $$
BEGIN
  -- Check if recipe_id column exists and is NOT NULL
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meal_favourites'
      AND column_name = 'recipe_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE meal_favourites
    ALTER COLUMN recipe_id DROP NOT NULL;
  END IF;
END $$;

-- ============================================
-- 3. UPDATE CHECK CONSTRAINT
-- ============================================
-- The existing constraint meal_favourites_meal_or_recipe_check from 20250227000001
-- should already enforce this, but we'll ensure it exists with the correct name
-- Drop old constraint if it exists (from 20250227000001)
ALTER TABLE meal_favourites
DROP CONSTRAINT IF EXISTS meal_favourites_meal_or_recipe_check;

-- Drop our new constraint name if it exists
ALTER TABLE meal_favourites
DROP CONSTRAINT IF EXISTS meal_favourites_requires_exactly_one_target;

-- Add explicit constraint with clear name
ALTER TABLE meal_favourites
ADD CONSTRAINT meal_favourites_requires_exactly_one_target
CHECK (
  -- Exactly one must be NOT NULL (not both, not neither)
  (recipe_id IS NOT NULL AND meal_id IS NULL)
  OR
  (recipe_id IS NULL AND meal_id IS NOT NULL)
);

-- ============================================
-- 4. UPDATE UNIQUE INDEXES
-- ============================================
-- The existing unique indexes from 20250227000001 should work, but let's ensure they exist
-- and are correct for the nullable columns

-- Drop existing unique indexes if they exist (will recreate with correct structure)
DROP INDEX IF EXISTS idx_meal_favourites_meal_unique;
DROP INDEX IF EXISTS idx_meal_favourites_recipe_unique;

-- Unique index for meal favorites: (user_id, meal_id) where meal_id IS NOT NULL
-- Note: user_id is the profile_id. This ensures one user can only favorite a meal once globally.
-- If space-scoped uniqueness is needed, use (user_id, space_id, meal_id) instead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_favourites_meal_unique 
ON meal_favourites(user_id, meal_id) 
WHERE meal_id IS NOT NULL;

-- Unique index for recipe favorites: (user_id, recipe_id) where recipe_id IS NOT NULL
-- Note: user_id is the profile_id. This ensures one user can only favorite a recipe once globally.
-- If space-scoped uniqueness is needed, use (user_id, space_id, recipe_id) instead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_favourites_recipe_unique 
ON meal_favourites(user_id, recipe_id) 
WHERE recipe_id IS NOT NULL;

-- ============================================
-- 5. VERIFICATION COMMENTS
-- ============================================

COMMENT ON CONSTRAINT meal_favourites_requires_exactly_one_target ON meal_favourites IS
  'Ensures exactly one of meal_id or recipe_id is set. Recipe favorites have recipe_id NOT NULL and meal_id NULL. Meal favorites have meal_id NOT NULL and recipe_id NULL.';

COMMENT ON INDEX idx_meal_favourites_meal_unique IS
  'Unique constraint for meal favorites: prevents duplicate (user_id, meal_id) combinations. Only applies when meal_id IS NOT NULL. Ensures one user can only favorite a meal once globally.';

COMMENT ON INDEX idx_meal_favourites_recipe_unique IS
  'Unique constraint for recipe favorites: prevents duplicate (user_id, recipe_id) combinations. Only applies when recipe_id IS NOT NULL. Ensures one user can only favorite a recipe once globally.';

-- ============================================
-- 6. EXAMPLE VERIFICATION QUERIES
-- ============================================
/*
  -- Example 1: Insert recipe favorite (should succeed)
  -- Replace <profile_id>, <recipe_id>, <space_id> with actual UUIDs
  INSERT INTO meal_favourites (recipe_id, user_id, space_id, vote_count)
  VALUES (
    '<recipe_id>'::uuid,
    '<profile_id>'::uuid,
    '<space_id>'::uuid,
    1
  );
  
  -- Example 2: Insert meal favorite (should succeed)
  -- Replace <profile_id>, <meal_id>, <space_id> with actual UUIDs
  INSERT INTO meal_favourites (meal_id, user_id, space_id, vote_count)
  VALUES (
    '<meal_id>'::uuid,
    '<profile_id>'::uuid,
    '<space_id>'::uuid,
    1
  );
  
  -- Example 3: Invalid - both NULL (should fail with CHECK constraint violation)
  INSERT INTO meal_favourites (user_id, space_id, vote_count)
  VALUES (
    '<profile_id>'::uuid,
    '<space_id>'::uuid,
    1
  );
  -- Expected error: new row for relation "meal_favourites" violates check constraint "meal_favourites_requires_exactly_one_target"
  
  -- Example 4: Invalid - both set (should fail with CHECK constraint violation)
  INSERT INTO meal_favourites (meal_id, recipe_id, user_id, space_id, vote_count)
  VALUES (
    '<meal_id>'::uuid,
    '<recipe_id>'::uuid,
    '<profile_id>'::uuid,
    '<space_id>'::uuid,
    1
  );
  -- Expected error: new row for relation "meal_favourites" violates check constraint "meal_favourites_requires_exactly_one_target"
*/
