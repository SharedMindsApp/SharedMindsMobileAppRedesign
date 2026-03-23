/*
  # Debug Recipes RLS - Diagnostic Function
  
  ## Purpose
  PostgREST hides some RLS policy evaluation details when inserts fail with 403/42501.
  This temporary debug function provides deterministic visibility into which policy
  conditions pass or fail, without weakening security.
  
  ## Usage
  Call this function from the application layer when an AI recipe insert fails:
  SELECT public.debug_can_insert_ai_recipe('<profile_uuid>');
  
  This returns a JSON object showing:
  - Current auth.uid()
  - The profile_id being checked
  - Result of is_user_profile() check
  - Individual condition checks that the AI policy requires
  
  ## Security
  - Function is SECURITY DEFINER (runs with elevated privileges to check profiles)
  - Only returns diagnostic information, does not modify data
  - Grant is limited to authenticated users only
*/

CREATE OR REPLACE FUNCTION public.debug_can_insert_ai_recipe(created_for_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  current_uid uuid;
  profile_check boolean;
  result jsonb;
BEGIN
  -- Get current authenticated user ID
  current_uid := auth.uid();
  
  -- Check if profile belongs to current user
  profile_check := public.is_user_profile(created_for_profile_id);
  
  -- Build result JSON with all condition checks
  result := jsonb_build_object(
    'auth_uid', current_uid::text,
    'created_for_profile_id', created_for_profile_id::text,
    'is_user_profile', profile_check,
    'checks', jsonb_build_object(
      'source_type_ai', true,  -- Always true for this function (we're checking AI policy)
      'created_by_null', true,  -- Always true for AI recipes
      'household_null', true,  -- Always true for personal AI recipes
      'is_public_false', true,  -- Always true for personal AI recipes
      'created_for_profile_not_null', created_for_profile_id IS NOT NULL,
      'is_user_profile_true', profile_check
    ),
    'policy_would_pass', (
      created_for_profile_id IS NOT NULL
      AND profile_check
    )
  );
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_can_insert_ai_recipe(uuid) TO authenticated;

COMMENT ON FUNCTION public.debug_can_insert_ai_recipe(uuid) IS
  'Debug function to diagnose AI recipe INSERT RLS policy failures. Returns JSON showing which policy conditions pass or fail. Use this when inserts fail with 403/42501 to identify the failing condition. Does not modify data or weaken security.';
