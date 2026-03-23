/*
  # Phase 4A Part 2: Harden 10 Functions (Batch 1) - Set search_path

  ## Purpose
  
  Add `SET search_path = public` to 10 specific functions to prevent search_path injection attacks.
  This is a security hardening measure that protects against malicious schema manipulation.

  ## Target Functions (10)
  
  ### Authorization/Permission Functions (6)
  1. **is_admin()** - Checks if current user is admin (SECURITY DEFINER)
  2. **is_project_member(uuid, uuid)** - Checks project membership (SECURITY DEFINER)
  3. **is_project_owner_check(uuid, uuid)** - Checks project ownership (SECURITY DEFINER)
  4. **user_owns_track_project(uuid)** - Checks track ownership via project (SECURITY DEFINER)
  5. **user_household_ids(uuid)** - Returns user's household IDs (SECURITY DEFINER, STABLE, SQL)
  6. **has_consent(uuid, consent_key_enum)** - Checks user consent (SECURITY DEFINER, STABLE)
  
  ### Trip Access Functions (2)
  7. **user_can_access_trip(uuid, uuid)** - Checks trip access permission (SECURITY DEFINER)
  8. **user_can_edit_trip(uuid, uuid)** - Checks trip edit permission (SECURITY DEFINER)
  
  ### Utility Functions (2)
  9. **seed_track_templates()** - Seeds track templates (SECURITY INVOKER)
  10. **log_consent_change()** - Logs consent changes (SECURITY DEFINER, TRIGGER)

  ## Changes Applied
  
  For each function:
  - Added `SET search_path = public` to function configuration
  - Preserved SECURITY DEFINER status (9 functions)
  - Preserved SECURITY INVOKER status (1 function)
  - Preserved volatility (STABLE vs VOLATILE)
  - Preserved language (plpgsql vs sql)
  - Preserved all parameters, return types, and function body

  ## Security Impact
  
  - Protects against search_path injection attacks
  - Maintains SECURITY DEFINER elevation where needed
  - No functional changes to any function
  - All functions maintain existing behavior
  - Zero impact on application logic

  ## Migration Type
  
  - ✅ Safe mechanical hardening
  - ✅ No logic changes
  - ✅ No behavior changes
  - ✅ Standard security best practice
  - ✅ Preserves SECURITY DEFINER where present
*/

-- ============================================================================
-- AUTHORIZATION / PERMISSION FUNCTIONS
-- ============================================================================

-- 1. is_admin - SECURITY DEFINER, VOLATILE
ALTER FUNCTION public.is_admin()
SET search_path = public;

-- 2. is_project_member - SECURITY DEFINER, VOLATILE
ALTER FUNCTION public.is_project_member(p_user_id uuid, p_project_id uuid)
SET search_path = public;

-- 3. is_project_owner_check - SECURITY DEFINER, VOLATILE
ALTER FUNCTION public.is_project_owner_check(p_user_id uuid, p_project_id uuid)
SET search_path = public;

-- 4. user_owns_track_project - SECURITY DEFINER, VOLATILE
ALTER FUNCTION public.user_owns_track_project(track_id uuid)
SET search_path = public;

-- 5. user_household_ids - SECURITY DEFINER, STABLE, SQL
ALTER FUNCTION public.user_household_ids(user_id uuid)
SET search_path = public;

-- 6. has_consent - SECURITY DEFINER, STABLE
ALTER FUNCTION public.has_consent(p_user_id uuid, p_consent_key consent_key_enum)
SET search_path = public;

-- ============================================================================
-- TRIP ACCESS FUNCTIONS
-- ============================================================================

-- 7. user_can_access_trip - SECURITY DEFINER, VOLATILE
ALTER FUNCTION public.user_can_access_trip(trip_id_param uuid, user_id_param uuid)
SET search_path = public;

-- 8. user_can_edit_trip - SECURITY DEFINER, VOLATILE
ALTER FUNCTION public.user_can_edit_trip(trip_id_param uuid, user_id_param uuid)
SET search_path = public;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- 9. seed_track_templates - SECURITY INVOKER, VOLATILE
ALTER FUNCTION public.seed_track_templates()
SET search_path = public;

-- 10. log_consent_change - SECURITY DEFINER, VOLATILE, TRIGGER
ALTER FUNCTION public.log_consent_change()
SET search_path = public;