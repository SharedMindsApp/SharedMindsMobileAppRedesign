/*
  # Debug Meal Schedules RLS - Diagnostic Function
  
  ## Purpose
  PostgREST hides some RLS policy evaluation details when inserts fail with 403/42501.
  This debug function provides deterministic visibility into which policy
  conditions pass or fail, without weakening security.
  
  ## Usage
  Call this function from the application layer when a meal schedule insert fails:
  SELECT public.debug_can_insert_meal_schedule('<profile_uuid>', '<household_uuid>');
  
  This returns a JSON object showing:
  - Current auth.uid()
  - The profile_id and household_id being checked
  - Results of helper function checks
  - Which policy branch (personal vs household) would apply
  - Whether the policy would pass
  
  ## Important Note
  This debug function tests WITH CHECK logic, which is the only expression type
  allowed for INSERT policies in PostgreSQL.
  
  Note: INSERT policies only allow WITH CHECK expressions.
  USING clauses are NOT allowed for INSERT (they're for SELECT/UPDATE/DELETE).
  The WITH CHECK clause validates that the row data meets the policy requirements.
  
  ## Security
  - Function is SECURITY DEFINER (runs with elevated privileges to check profiles/households)
  - Only returns diagnostic information, does not modify data
  - Grant is limited to authenticated users only
*/

CREATE OR REPLACE FUNCTION public.debug_can_insert_meal_schedule(
  created_for_profile_id uuid,
  household_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  current_uid uuid;
  profile_check boolean;
  household_check boolean;
  personal_branch boolean;
  household_branch boolean;
  result jsonb;
BEGIN
  -- Get current authenticated user ID
  current_uid := auth.uid();
  
  -- Check if profile belongs to current user (if provided)
  profile_check := CASE 
    WHEN created_for_profile_id IS NOT NULL 
    THEN public.is_user_profile(created_for_profile_id)
    ELSE false
  END;
  
  -- Check if user is household member (if provided)
  household_check := CASE
    WHEN household_id IS NOT NULL
    THEN public.is_user_household_member(household_id)
    ELSE false
  END;
  
  -- Determine which policy branch would apply
  personal_branch := (household_id IS NULL AND created_for_profile_id IS NOT NULL);
  household_branch := (household_id IS NOT NULL AND created_for_profile_id IS NULL);
  
  -- Build result JSON with all condition checks
  result := jsonb_build_object(
    'auth_uid', current_uid::text,
    'household_id', household_id::text,
    'created_for_profile_id', created_for_profile_id::text,
    'checks', jsonb_build_object(
      'profile_ok', profile_check,
      'household_ok', household_check,
      'personal_branch', personal_branch,
      'household_branch', household_branch,
      'household_id_null', household_id IS NULL,
      'profile_id_not_null', created_for_profile_id IS NOT NULL,
      'household_id_not_null', household_id IS NOT NULL,
      'profile_id_null', created_for_profile_id IS NULL
    ),
    'policy_would_pass', (
      (personal_branch AND profile_check)
      OR
      (household_branch AND household_check)
    )
  );
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_can_insert_meal_schedule(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.debug_can_insert_meal_schedule(uuid, uuid) IS
  'Debug function to diagnose meal schedule INSERT RLS policy failures. Returns JSON showing which policy conditions pass or fail and which policy branch (personal vs household) would apply. Use this when inserts fail with 403/42501 to identify the failing condition. Does not modify data or weaken security.';

-- ============================================================================
-- VERIFICATION CHECKLIST (Run these in Supabase SQL Editor to verify policies)
-- ============================================================================

-- 1. List all policies on meal_schedules table
-- SELECT 
--   policyname,
--   cmd,
--   roles,
--   qual,
--   with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename = 'meal_schedules'
-- ORDER BY policyname;
--
-- Expected policies:
-- - "Users can create personal meal schedules" (INSERT)
-- - "Users can create household meal schedules" (INSERT)
-- - "Users can read meal schedules" (SELECT)
-- - "Users can update meal schedules" (UPDATE)
-- - "Users can delete meal schedules" (DELETE)

-- 2. Test helper function: Profile ownership
-- SELECT public.is_user_profile('<profile_uuid>');
-- Expected: Returns true if profile belongs to current authenticated user

-- 3. Test helper function: Household membership
-- SELECT public.is_user_household_member('<household_uuid>');
-- Expected: Returns true if current user is active member of household

-- 4. Debug meal schedule insert (personal)
-- SELECT public.debug_can_insert_meal_schedule('<profile_uuid>', NULL);
-- Expected: Returns JSON with policy_would_pass = true if all conditions pass

-- 5. Debug meal schedule insert (household)
-- SELECT public.debug_can_insert_meal_schedule(NULL, '<household_uuid>');
-- Expected: Returns JSON with policy_would_pass = true if all conditions pass

-- 6. Check current authenticated user
-- SELECT auth.uid();

-- 7. Verify profile ownership
-- SELECT id, user_id 
-- FROM public.profiles 
-- WHERE id = '<profile_uuid>' 
--   AND user_id = auth.uid();

-- 8. Verify household membership
-- SELECT household_id, auth_user_id, status
-- FROM public.household_members
-- WHERE household_id = '<household_uuid>'
--   AND auth_user_id = auth.uid()
--   AND status = 'active';
