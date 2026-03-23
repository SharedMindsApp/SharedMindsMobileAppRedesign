/*
  # Add created_for_profile_id for AI Personal Recipes

  ## Problem
  AI recipes in personal spaces fail RLS because:
  - created_by must be NULL (enforced by constraint)
  - household_id is NULL (personal space)
  - RLS requires either created_by OR household_id membership
  - Result: AI recipes in personal spaces cannot be created

  ## Solution
  Add created_for_profile_id to attribute AI recipes to users in personal spaces:
  - created_for_profile_id uuid NULL references profiles(id)
  - For AI recipes in personal spaces: created_for_profile_id = user's profile.id
  - For AI recipes in households: created_for_profile_id = NULL (household_id provides scope)
  - For user-created recipes: created_for_profile_id = NULL (created_by provides ownership)

  ## Changes
  1. Add created_for_profile_id column
  2. Add CHECK constraints to enforce rules
  3. Add index for performance
  4. Update RLS policies (separate migration)
*/

-- Add created_for_profile_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'created_for_profile_id'
  ) THEN
    ALTER TABLE recipes
    ADD COLUMN created_for_profile_id uuid NULL
    REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add CHECK constraint: AI personal recipes must have created_for_profile_id
-- This ensures AI recipes in personal spaces (household_id NULL, is_public false) have attribution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_personal_recipes_require_created_for'
  ) THEN
    ALTER TABLE recipes
    ADD CONSTRAINT ai_personal_recipes_require_created_for
    CHECK (
      -- If AI recipe, must be public OR have household_id OR have created_for_profile_id
      source_type != 'ai'
      OR is_public = true
      OR household_id IS NOT NULL
      OR created_for_profile_id IS NOT NULL
    );
  END IF;
END $$;

-- Add CHECK constraint: Non-AI recipes cannot set created_for_profile_id
-- This prevents confusion and ensures created_for_profile_id is only for AI attribution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'non_ai_recipes_no_created_for'
  ) THEN
    ALTER TABLE recipes
    ADD CONSTRAINT non_ai_recipes_no_created_for
    CHECK (
      source_type = 'ai' OR created_for_profile_id IS NULL
    );
  END IF;
END $$;

-- Add index for performance (RLS queries will filter by created_for_profile_id)
CREATE INDEX IF NOT EXISTS idx_recipes_created_for_profile_id
ON recipes(created_for_profile_id)
WHERE created_for_profile_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN recipes.created_for_profile_id IS 
  'For AI recipes in personal spaces: references profiles.id of the user who requested the recipe. Allows RLS to grant access without requiring created_by (which must be NULL for AI recipes). For household AI recipes, this is NULL (household_id provides scope). For user-created recipes, this is always NULL (created_by provides ownership).';
