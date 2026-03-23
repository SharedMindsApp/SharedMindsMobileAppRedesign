/*
  # Fix Recipe Usage Stats - Validate household_id Before Writing
  
  ## Problem
  Foreign key violations occur when analytics functions write invalid household_id values:
  - Error: violates foreign key constraint "recipe_usage_stats_household_id_fkey"
  - Key (household_id)=(...) is not present in table "households"
  
  Root cause:
  - Triggers pass space_id as household_id, but space_id may not be a valid households.id
  - Functions don't validate household_id exists before writing
  - Analytics failures can block core user actions (adding meals, viewing recipes)
  
  ## Solution
  Add defensive validation to all analytics functions:
  1. Validate household_id exists in households table before using it
  2. If invalid → set household_id = NULL (analytics still work, just not household-specific)
  3. Never throw exceptions from analytics functions (non-fatal)
  4. Use NULL fallback instead of raising errors
  
  ## Key Safety
  - Analytics must NEVER block core user actions
  - household_id is nullable by design (for global stats)
  - Validation is defensive and silent (no exceptions)
  - SECURITY DEFINER + VOLATILE remain unchanged
  - RLS policies remain strict
*/

-- ============================================================================
-- Helper Function: Validate and Normalize household_id
-- ============================================================================
-- This function validates that a household_id exists in households table.
-- Returns NULL if invalid (analytics still work, just not household-specific).

CREATE OR REPLACE FUNCTION public.validate_household_id(p_household_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- If NULL, return NULL (valid - global stats)
  IF p_household_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Validate household_id exists in households table
  IF EXISTS (SELECT 1 FROM public.households WHERE id = p_household_id) THEN
    RETURN p_household_id;
  END IF;
  
  -- Invalid household_id → return NULL (silent fallback)
  -- Analytics will still work, just not household-specific
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.validate_household_id(uuid) IS
  'Validates that household_id exists in households table. Returns NULL if invalid (defensive fallback for analytics). This ensures recipe_usage_stats.household_id only contains valid households.id or NULL. Analytics failures must never block core user actions.';

-- ============================================================================
-- Update get_or_create_usage_stats to validate household_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_usage_stats(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL,
  p_period_type text DEFAULT 'all_time',
  p_period_start date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  stats_id uuid;
  period_start_date date;
  validated_household_id uuid;
BEGIN
  -- Validate recipe exists (basic sanity check)
  -- Use silent return instead of exception to avoid blocking analytics
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = p_recipe_id AND deleted_at IS NULL) THEN
    -- Recipe doesn't exist - return NULL instead of raising exception
    -- Analytics failures must not block core actions
    RETURN NULL;
  END IF;

  -- Validate and normalize household_id
  validated_household_id := public.validate_household_id(p_household_id);

  -- Determine period_start
  IF p_period_start IS NOT NULL THEN
    period_start_date := p_period_start;
  ELSIF p_period_type = 'daily' THEN
    period_start_date := CURRENT_DATE;
  ELSIF p_period_type = 'weekly' THEN
    period_start_date := DATE_TRUNC('week', CURRENT_DATE)::date;
  ELSIF p_period_type = 'monthly' THEN
    period_start_date := DATE_TRUNC('month', CURRENT_DATE)::date;
  ELSE
    period_start_date := NULL; -- all_time
  END IF;

  -- Try to get existing stats (bypasses RLS due to SECURITY DEFINER)
  SELECT id INTO stats_id
  FROM public.recipe_usage_stats
  WHERE recipe_id = p_recipe_id
    AND (household_id = validated_household_id OR (household_id IS NULL AND validated_household_id IS NULL))
    AND period_type = p_period_type
    AND (period_start = period_start_date OR (period_start IS NULL AND period_start_date IS NULL))
  LIMIT 1;

  -- Create if doesn't exist (bypasses RLS due to SECURITY DEFINER)
  -- Use INSERT ... ON CONFLICT for race condition safety
  IF stats_id IS NULL THEN
    INSERT INTO public.recipe_usage_stats (
      recipe_id,
      household_id,
      period_type,
      period_start
    )
    VALUES (
      p_recipe_id,
      validated_household_id, -- Use validated household_id (may be NULL if invalid)
      p_period_type,
      period_start_date
    )
    ON CONFLICT (recipe_id, household_id, period_start, period_type)
    DO UPDATE SET
      updated_at = now()
    RETURNING id INTO stats_id;
  END IF;

  RETURN stats_id;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_usage_stats(uuid, uuid, text, date) IS
  'Gets or creates a recipe_usage_stats record. Uses SECURITY DEFINER + VOLATILE to bypass RLS for analytics operations. Validates household_id exists in households before writing (sets to NULL if invalid). Never throws exceptions - analytics failures must not block core user actions. Uses INSERT ... ON CONFLICT for race condition safety.';

-- ============================================================================
-- Update increment_recipe_view to validate household_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_recipe_view(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  stats_id uuid;
  validated_household_id uuid;
BEGIN
  -- Validate recipe exists (silent return if not found)
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = p_recipe_id AND deleted_at IS NULL) THEN
    -- Recipe doesn't exist - silently return (analytics failures must not block core actions)
    RETURN;
  END IF;

  -- Validate and normalize household_id
  validated_household_id := public.validate_household_id(p_household_id);

  -- Get or create all_time stats (bypasses RLS due to SECURITY DEFINER)
  stats_id := public.get_or_create_usage_stats(p_recipe_id, validated_household_id, 'all_time', NULL);
  
  -- Update view count if stats_id was created/found
  IF stats_id IS NOT NULL THEN
    UPDATE public.recipe_usage_stats
    SET 
      times_viewed = times_viewed + 1,
      last_viewed = now(),
      updated_at = now()
    WHERE id = stats_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.increment_recipe_view(uuid, uuid) IS
  'Increments the view count for a recipe. Uses SECURITY DEFINER + VOLATILE to bypass RLS for analytics operations. Validates household_id exists in households before writing (sets to NULL if invalid). Never throws exceptions - analytics failures must not block core user actions.';

-- ============================================================================
-- Update increment_recipe_added_to_plan to validate household_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_recipe_added_to_plan(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  stats_id uuid;
  validated_household_id uuid;
BEGIN
  -- Validate recipe exists (silent return if not found)
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = p_recipe_id AND deleted_at IS NULL) THEN
    -- Recipe doesn't exist - silently return (analytics failures must not block core actions)
    RETURN;
  END IF;

  -- Validate and normalize household_id
  validated_household_id := public.validate_household_id(p_household_id);

  -- Get or create all_time stats
  stats_id := public.get_or_create_usage_stats(p_recipe_id, validated_household_id, 'all_time', NULL);
  
  -- Update added to plan count if stats_id was created/found
  IF stats_id IS NOT NULL THEN
    UPDATE public.recipe_usage_stats
    SET 
      times_added_to_plan = times_added_to_plan + 1,
      last_added_to_plan = now(),
      updated_at = now()
    WHERE id = stats_id;
    
    -- Recalculate popularity (silent failure if function doesn't exist)
    BEGIN
      PERFORM public.calculate_recipe_popularity(p_recipe_id, validated_household_id);
    EXCEPTION
      WHEN OTHERS THEN
        -- Silently ignore popularity calculation errors (analytics must not block core actions)
        NULL;
    END;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.increment_recipe_added_to_plan(uuid, uuid) IS
  'Increments the added-to-plan count for a recipe. Uses SECURITY DEFINER + VOLATILE to bypass RLS for analytics operations. Validates household_id exists in households before writing (sets to NULL if invalid). Never throws exceptions - analytics failures must not block core user actions.';

-- ============================================================================
-- Update increment_recipe_favorited to validate household_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_recipe_favorited(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  stats_id uuid;
  validated_household_id uuid;
BEGIN
  -- Validate recipe exists (silent return if not found)
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = p_recipe_id AND deleted_at IS NULL) THEN
    -- Recipe doesn't exist - silently return (analytics failures must not block core actions)
    RETURN;
  END IF;

  -- Validate and normalize household_id
  validated_household_id := public.validate_household_id(p_household_id);

  -- Get or create all_time stats
  stats_id := public.get_or_create_usage_stats(p_recipe_id, validated_household_id, 'all_time', NULL);
  
  -- Update favorited count if stats_id was created/found
  IF stats_id IS NOT NULL THEN
    UPDATE public.recipe_usage_stats
    SET 
      times_favorited = times_favorited + 1,
      last_favorited = now(),
      updated_at = now()
    WHERE id = stats_id;
    
    -- Recalculate popularity (silent failure if function doesn't exist)
    BEGIN
      PERFORM public.calculate_recipe_popularity(p_recipe_id, validated_household_id);
    EXCEPTION
      WHEN OTHERS THEN
        -- Silently ignore popularity calculation errors (analytics must not block core actions)
        NULL;
    END;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.increment_recipe_favorited(uuid, uuid) IS
  'Increments the favorited count for a recipe. Uses SECURITY DEFINER + VOLATILE to bypass RLS for analytics operations. Validates household_id exists in households before writing (sets to NULL if invalid). Never throws exceptions - analytics failures must not block core user actions.';

-- ============================================================================
-- Update increment_recipe_made to validate household_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_recipe_made(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  stats_id uuid;
  validated_household_id uuid;
BEGIN
  -- Validate recipe exists (silent return if not found)
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = p_recipe_id AND deleted_at IS NULL) THEN
    -- Recipe doesn't exist - silently return (analytics failures must not block core actions)
    RETURN;
  END IF;

  -- Validate and normalize household_id
  validated_household_id := public.validate_household_id(p_household_id);

  -- Get or create all_time stats
  stats_id := public.get_or_create_usage_stats(p_recipe_id, validated_household_id, 'all_time', NULL);
  
  -- Update made count if stats_id was created/found
  IF stats_id IS NOT NULL THEN
    UPDATE public.recipe_usage_stats
    SET 
      times_made = times_made + 1,
      last_made = now(),
      updated_at = now()
    WHERE id = stats_id;
    
    -- Recalculate popularity (silent failure if function doesn't exist)
    BEGIN
      PERFORM public.calculate_recipe_popularity(p_recipe_id, validated_household_id);
    EXCEPTION
      WHEN OTHERS THEN
        -- Silently ignore popularity calculation errors (analytics must not block core actions)
        NULL;
    END;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.increment_recipe_made(uuid, uuid) IS
  'Increments the made count for a recipe. Uses SECURITY DEFINER + VOLATILE to bypass RLS for analytics operations. Validates household_id exists in households before writing (sets to NULL if invalid). Never throws exceptions - analytics failures must not block core user actions.';

-- ============================================================================
-- Update triggers to validate household_id before calling analytics
-- ============================================================================
-- The triggers in 20250227000001_add_recipe_support_to_meal_planner.sql
-- pass space_id as household_id, but space_id may not be a valid households.id.
-- The functions now validate this internally, but we can also add defensive
-- validation in the triggers for extra safety.

CREATE OR REPLACE FUNCTION track_recipe_added_to_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  validated_household_id uuid;
BEGIN
  -- Only track if recipe_id is set
  IF NEW.recipe_id IS NOT NULL THEN
    -- Validate space_id is a valid household_id before passing to analytics
    -- If invalid, pass NULL (analytics will still work, just not household-specific)
    IF NEW.space_id IS NOT NULL THEN
      -- Check if space_id exists in households table
      SELECT id INTO validated_household_id
      FROM public.households
      WHERE id = NEW.space_id;
      
      -- If not found, validated_household_id will be NULL (valid for global stats)
    END IF;
    
    -- Call analytics function with validated household_id (may be NULL)
    -- Analytics function will also validate internally, but this adds extra safety
    PERFORM public.increment_recipe_added_to_plan(NEW.recipe_id, validated_household_id);
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION track_recipe_added_to_plan() IS
  'Trigger function to track when a recipe is added to a meal plan. Validates space_id is a valid household_id before passing to analytics. If invalid, passes NULL (analytics still work, just not household-specific). Analytics failures must never block meal plan inserts.';

CREATE OR REPLACE FUNCTION track_recipe_favorited()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  validated_household_id uuid;
BEGIN
  -- Only track if recipe_id is set
  IF NEW.recipe_id IS NOT NULL THEN
    -- Validate space_id is a valid household_id before passing to analytics
    -- If invalid, pass NULL (analytics will still work, just not household-specific)
    IF NEW.space_id IS NOT NULL THEN
      -- Check if space_id exists in households table
      SELECT id INTO validated_household_id
      FROM public.households
      WHERE id = NEW.space_id;
      
      -- If not found, validated_household_id will be NULL (valid for global stats)
    END IF;
    
    -- Call analytics function with validated household_id (may be NULL)
    -- Analytics function will also validate internally, but this adds extra safety
    PERFORM public.increment_recipe_favorited(NEW.recipe_id, validated_household_id);
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION track_recipe_favorited() IS
  'Trigger function to track when a recipe is favorited. Validates space_id is a valid household_id before passing to analytics. If invalid, passes NULL (analytics still work, just not household-specific). Analytics failures must never block favorite inserts.';

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON TABLE public.recipe_usage_stats IS
  'Analytics table for recipe usage statistics. household_id is nullable by design - NULL means global stats, valid households.id means household-specific stats. Invalid household_id values are automatically normalized to NULL to prevent foreign key violations. Analytics failures must never block core user actions.';
