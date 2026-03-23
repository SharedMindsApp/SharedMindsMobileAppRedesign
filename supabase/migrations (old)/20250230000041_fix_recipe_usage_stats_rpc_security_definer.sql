/*
  # Fix Recipe Usage Stats RPC - SECURITY DEFINER for Analytics
  
  ## Problem
  Recipe usage stats inserts fail with:
  1. 403 Forbidden (42501) errors - RLS blocking inserts
  2. ERROR: INSERT is not allowed in a non-volatile function (0A000) - volatility issue
  
  Root causes:
  - Functions are not SECURITY DEFINER, so they cannot bypass RLS
  - Functions are marked STABLE or missing VOLATILE, but perform INSERT/UPDATE operations
  - PostgreSQL requires functions that modify data to be declared VOLATILE
  
  ## Solution
  Make the analytics RPC functions:
  - SECURITY DEFINER (bypass RLS for analytics operations)
  - VOLATILE (required for INSERT/UPDATE/DELETE operations)
  - SET search_path = public (security best practice)
  
  This is safe because:
  - recipe_usage_stats is analytics-only (not user-owned data)
  - The functions only increment counters (no sensitive data)
  - RLS remains strict for direct client access
  - Functions validate recipe_id exists (no arbitrary inserts)
  
  ## Key Safety
  - Functions are SECURITY DEFINER (bypass RLS for analytics operations)
  - Functions are VOLATILE (required for state-changing operations)
  - RLS policies remain strict (no direct client INSERT/UPDATE allowed)
  - Functions validate recipe_id exists before inserting stats
  - Uses INSERT ... ON CONFLICT for race condition safety
  - Does NOT weaken security on user-owned tables
*/

-- ============================================================================
-- Update get_or_create_usage_stats to be SECURITY DEFINER
-- ============================================================================
-- This function is called by increment_recipe_view and needs to bypass RLS
-- to insert/update analytics data.

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
BEGIN
  -- Validate recipe exists (basic sanity check)
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = p_recipe_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Recipe % does not exist or is deleted', p_recipe_id;
  END IF;

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
    AND (household_id = p_household_id OR (household_id IS NULL AND p_household_id IS NULL))
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
      p_household_id,
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

GRANT EXECUTE ON FUNCTION public.get_or_create_usage_stats(uuid, uuid, text, date) TO authenticated;

-- ============================================================================
-- Update increment_recipe_view to be SECURITY DEFINER
-- ============================================================================
-- This function increments view counts and should bypass RLS for analytics operations.

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
BEGIN
  -- Validate recipe exists (basic sanity check)
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = p_recipe_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Recipe % does not exist or is deleted', p_recipe_id;
  END IF;

  -- Get or create all_time stats (bypasses RLS due to SECURITY DEFINER)
  stats_id := public.get_or_create_usage_stats(p_recipe_id, p_household_id, 'all_time', NULL);
  
  -- Update view count (bypasses RLS due to SECURITY DEFINER)
  UPDATE public.recipe_usage_stats
  SET 
    times_viewed = times_viewed + 1,
    last_viewed = now(),
    updated_at = now()
  WHERE id = stats_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_recipe_view(uuid, uuid) TO authenticated;

-- ============================================================================
-- Update other increment functions to be SECURITY DEFINER (for consistency)
-- ============================================================================
-- These functions also need to bypass RLS for analytics operations.

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
BEGIN
  -- Validate recipe exists
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = p_recipe_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Recipe % does not exist or is deleted', p_recipe_id;
  END IF;

  -- Get or create all_time stats
  stats_id := public.get_or_create_usage_stats(p_recipe_id, p_household_id, 'all_time', NULL);
  
  -- Update added to plan count
  UPDATE public.recipe_usage_stats
  SET 
    times_added_to_plan = times_added_to_plan + 1,
    last_added_to_plan = now(),
    updated_at = now()
  WHERE id = stats_id;
  
  -- Recalculate popularity
  PERFORM public.calculate_recipe_popularity(p_recipe_id, p_household_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_recipe_added_to_plan(uuid, uuid) TO authenticated;

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
BEGIN
  -- Validate recipe exists
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = p_recipe_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Recipe % does not exist or is deleted', p_recipe_id;
  END IF;

  -- Get or create all_time stats
  stats_id := public.get_or_create_usage_stats(p_recipe_id, p_household_id, 'all_time', NULL);
  
  -- Update favorited count
  UPDATE public.recipe_usage_stats
  SET 
    times_favorited = times_favorited + 1,
    last_favorited = now(),
    updated_at = now()
  WHERE id = stats_id;
  
  -- Recalculate popularity
  PERFORM public.calculate_recipe_popularity(p_recipe_id, p_household_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_recipe_favorited(uuid, uuid) TO authenticated;

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
BEGIN
  -- Validate recipe exists
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = p_recipe_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Recipe % does not exist or is deleted', p_recipe_id;
  END IF;

  -- Get or create all_time stats
  stats_id := public.get_or_create_usage_stats(p_recipe_id, p_household_id, 'all_time', NULL);
  
  -- Update made count
  UPDATE public.recipe_usage_stats
  SET 
    times_made = times_made + 1,
    last_made = now(),
    updated_at = now()
  WHERE id = stats_id;
  
  -- Recalculate popularity
  PERFORM public.calculate_recipe_popularity(p_recipe_id, p_household_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_recipe_made(uuid, uuid) TO authenticated;

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON FUNCTION public.get_or_create_usage_stats(uuid, uuid, text, date) IS
  'Gets or creates a recipe_usage_stats record. Uses SECURITY DEFINER + VOLATILE to bypass RLS for analytics operations. VOLATILE is required because the function performs INSERT/UPDATE operations. Validates recipe exists before creating stats. Uses INSERT ... ON CONFLICT for race condition safety. This function is analytics-only and does not depend on user ownership.';

COMMENT ON FUNCTION public.increment_recipe_view(uuid, uuid) IS
  'Increments the view count for a recipe. Uses SECURITY DEFINER + VOLATILE to bypass RLS for analytics operations. VOLATILE is required because the function performs UPDATE operations. Validates recipe exists before updating stats. This function is analytics-only and does not depend on user ownership.';

COMMENT ON FUNCTION public.increment_recipe_added_to_plan(uuid, uuid) IS
  'Increments the added-to-plan count for a recipe. Uses SECURITY DEFINER + VOLATILE to bypass RLS for analytics operations. VOLATILE is required because the function performs UPDATE operations. Validates recipe exists before updating stats. This function is analytics-only and does not depend on user ownership.';

COMMENT ON FUNCTION public.increment_recipe_favorited(uuid, uuid) IS
  'Increments the favorited count for a recipe. Uses SECURITY DEFINER + VOLATILE to bypass RLS for analytics operations. VOLATILE is required because the function performs UPDATE operations. Validates recipe exists before updating stats. This function is analytics-only and does not depend on user ownership.';

COMMENT ON FUNCTION public.increment_recipe_made(uuid, uuid) IS
  'Increments the made count for a recipe. Uses SECURITY DEFINER + VOLATILE to bypass RLS for analytics operations. VOLATILE is required because the function performs UPDATE operations. Validates recipe exists before updating stats. This function is analytics-only and does not depend on user ownership.';

-- ============================================================================
-- VERIFICATION CHECKLIST (Run these in Supabase SQL Editor to verify)
-- ============================================================================

-- 1. Check function security and volatility settings
-- SELECT 
--   proname,
--   prosecdef AS is_security_definer,
--   provolatile AS volatility,
--   proconfig AS search_path_config
-- FROM pg_proc
-- WHERE proname IN (
--   'increment_recipe_view',
--   'get_or_create_usage_stats',
--   'increment_recipe_added_to_plan',
--   'increment_recipe_favorited',
--   'increment_recipe_made'
-- )
-- ORDER BY proname;
--
-- Expected: 
-- - is_security_definer should be true for all functions
-- - volatility should be 'v' (VOLATILE) for all functions

-- 2. Check function privileges
-- SELECT 
--   has_function_privilege('authenticated', 'increment_recipe_view(uuid, uuid)', 'EXECUTE') AS can_increment_view,
--   has_function_privilege('authenticated', 'get_or_create_usage_stats(uuid, uuid, text, date)', 'EXECUTE') AS can_get_or_create;
--
-- Expected: Both should return true

-- 3. Test increment function (replace with actual recipe_id)
-- SELECT public.increment_recipe_view('<recipe_uuid>', NULL);
-- Expected: Should succeed without RLS errors

-- 4. Verify stats were created/updated
-- SELECT 
--   recipe_id,
--   household_id,
--   times_viewed,
--   last_viewed
-- FROM public.recipe_usage_stats
-- WHERE recipe_id = '<recipe_uuid>'
--   AND household_id IS NULL
--   AND period_type = 'all_time';
--
-- Expected: Should return stats record with incremented view count

-- 5. Verify RLS is still strict for direct client access
-- -- This should fail with RLS error (if user doesn't have access to recipe)
-- INSERT INTO public.recipe_usage_stats (recipe_id, household_id, period_type)
-- VALUES ('<recipe_uuid>', NULL, 'all_time');
-- Expected: Should fail with RLS error (proving RLS is still active for direct access)
