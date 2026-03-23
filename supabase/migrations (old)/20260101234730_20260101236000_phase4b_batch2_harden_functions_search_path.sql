/*
  # Phase 4B Batch 2: Harden 10 Functions - Set search_path

  ## Purpose
  
  Add `SET search_path = public` to 10 specific functions to prevent search_path injection attacks.
  This is a security hardening measure that protects against malicious schema manipulation.

  ## Target Functions (10)
  
  ### Permission/Authorization Functions (7)
  1. **user_has_project_permission(uuid, uuid, project_user_role)** - Core permission checker (SECURITY DEFINER, VOLATILE)
  2. **user_can_edit_project(uuid, uuid)** - Checks project edit permission (SECURITY DEFINER, VOLATILE)
  3. **user_can_view_project(uuid, uuid)** - Checks project view permission (SECURITY DEFINER, VOLATILE)
  4. **user_is_project_owner(uuid, uuid)** - Checks project ownership (SECURITY DEFINER, VOLATILE)
  5. **user_can_access_space(uuid, uuid)** - Checks space access permission (SECURITY DEFINER, STABLE)
  6. **user_in_household(uuid, uuid)** - Checks household membership (SECURITY DEFINER, VOLATILE)
  7. **user_is_household_member(uuid, uuid)** - Checks active household membership (SECURITY DEFINER, VOLATILE)
  
  ### Household Helper Functions (2)
  8. **get_user_household_ids(uuid)** - Returns user's household IDs (SECURITY DEFINER, VOLATILE)
  9. **is_household_member_by_profile(uuid, uuid)** - Checks household membership by profile (SECURITY DEFINER, VOLATILE)
  
  ### Utility Functions (1)
  10. **update_updated_at_column()** - Updates timestamp trigger (SECURITY INVOKER, VOLATILE, TRIGGER)

  ## Changes Applied
  
  For each function:
  - Added `SET search_path = public` to function configuration
  - Preserved SECURITY DEFINER status (9 functions)
  - Preserved SECURITY INVOKER status (1 function)
  - Preserved volatility (STABLE vs VOLATILE)
  - Preserved language (plpgsql)
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
-- PERMISSION / AUTHORIZATION FUNCTIONS
-- ============================================================================

-- 1. user_has_project_permission - Core permission checker
CREATE OR REPLACE FUNCTION public.user_has_project_permission(p_user_id uuid, p_project_id uuid, p_required_role project_user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
user_role project_user_role;
BEGIN
-- Get user's role for this project
SELECT role INTO user_role
FROM project_users
WHERE user_id = p_user_id
AND master_project_id = p_project_id
AND archived_at IS NULL;

-- If user not found, no permission
IF user_role IS NULL THEN
RETURN false;
END IF;

-- Owner has all permissions
IF user_role = 'owner' THEN
RETURN true;
END IF;

-- Editor can do editor and viewer actions
IF user_role = 'editor' AND p_required_role IN ('editor', 'viewer') THEN
RETURN true;
END IF;

-- Viewer can only do viewer actions
IF user_role = 'viewer' AND p_required_role = 'viewer' THEN
RETURN true;
END IF;

RETURN false;
END;
$function$;

-- 2. user_can_edit_project - Checks project edit permission
CREATE OR REPLACE FUNCTION public.user_can_edit_project(p_user_id uuid, p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
RETURN user_has_project_permission(p_user_id, p_project_id, 'editor');
END;
$function$;

-- 3. user_can_view_project - Checks project view permission
CREATE OR REPLACE FUNCTION public.user_can_view_project(p_user_id uuid, p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
RETURN user_has_project_permission(p_user_id, p_project_id, 'viewer');
END;
$function$;

-- 4. user_is_project_owner - Checks project ownership
CREATE OR REPLACE FUNCTION public.user_is_project_owner(p_user_id uuid, p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
RETURN user_has_project_permission(p_user_id, p_project_id, 'owner');
END;
$function$;

-- 5. user_can_access_space - Checks space access permission (STABLE)
CREATE OR REPLACE FUNCTION public.user_can_access_space(p_auth_user_id uuid, p_space_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
v_profile_id uuid;
v_space_type text;
v_owner_id uuid;
v_is_member boolean;
BEGIN
-- If space_id is null, deny access
IF p_space_id IS NULL THEN
RETURN false;
END IF;

-- If user_id is null, deny access
IF p_auth_user_id IS NULL THEN
RETURN false;
END IF;

-- MAP auth.uid() to profile.id
SELECT id INTO v_profile_id
FROM profiles
WHERE user_id = p_auth_user_id;

-- If no profile found, deny access
IF v_profile_id IS NULL THEN
RETURN false;
END IF;

-- Get space info
SELECT space_type, owner_id INTO v_space_type, v_owner_id
FROM spaces
WHERE id = p_space_id;

-- If space doesn't exist, deny access
IF v_space_type IS NULL THEN
RETURN false;
END IF;

-- Personal space: check ownership
IF v_space_type = 'personal' THEN
-- If owner_id is set, check if it matches the profile_id
IF v_owner_id IS NOT NULL THEN
RETURN v_owner_id = v_profile_id;
END IF;

-- Fallback: check space_members for owner role (using profile_id)
SELECT EXISTS (
SELECT 1 FROM space_members
WHERE space_id = p_space_id
AND user_id = v_profile_id
AND role = 'owner'
AND status = 'active'
) INTO v_is_member;

RETURN v_is_member;
END IF;

-- Shared space: check membership (using profile_id)
SELECT EXISTS (
SELECT 1 FROM space_members
WHERE space_id = p_space_id
AND user_id = v_profile_id
AND status = 'active'
) INTO v_is_member;

RETURN v_is_member;
END;
$function$;

-- 6. user_in_household - Checks household membership
CREATE OR REPLACE FUNCTION public.user_in_household(p_user_id uuid, p_household_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
RETURN EXISTS (
SELECT 1 FROM members
WHERE user_id = p_user_id AND household_id = p_household_id
);
END;
$function$;

-- 7. user_is_household_member - Checks active household membership
CREATE OR REPLACE FUNCTION public.user_is_household_member(p_user_id uuid, p_household_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
RETURN EXISTS (
SELECT 1 FROM members
WHERE user_id = p_user_id 
AND household_id = p_household_id
AND status = 'active'
);
END;
$function$;

-- ============================================================================
-- HOUSEHOLD HELPER FUNCTIONS
-- ============================================================================

-- 8. get_user_household_ids - Returns user's household IDs
CREATE OR REPLACE FUNCTION public.get_user_household_ids(p_user_id uuid)
RETURNS TABLE(household_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
RETURN QUERY
SELECT m.household_id
FROM members m
WHERE m.user_id = p_user_id;
END;
$function$;

-- 9. is_household_member_by_profile - Checks household membership by profile
CREATE OR REPLACE FUNCTION public.is_household_member_by_profile(p_household_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
RETURN EXISTS (
SELECT 1
FROM household_members
WHERE household_id = p_household_id
AND profile_id = p_profile_id
);
END;
$function$;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- 10. update_updated_at_column - Updates timestamp trigger (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

-- ============================================================================
-- VERIFICATION CHECKLIST (for audit purposes)
-- ============================================================================

/*
  VERIFICATION COMPLETED:
  
  Function 1: user_has_project_permission(uuid, uuid, project_user_role)
    ✓ Signature: UNCHANGED (p_user_id uuid, p_project_id uuid, p_required_role project_user_role)
    ✓ Return Type: UNCHANGED (boolean)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY DEFINER)
    ✓ Volatility: UNCHANGED (VOLATILE - default)
    ✓ Body: UNCHANGED (identical logic, zero modifications)
    ✓ Only Change: Added SET search_path = public
  
  Function 2: user_can_edit_project(uuid, uuid)
    ✓ Signature: UNCHANGED (p_user_id uuid, p_project_id uuid)
    ✓ Return Type: UNCHANGED (boolean)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY DEFINER)
    ✓ Volatility: UNCHANGED (VOLATILE)
    ✓ Body: UNCHANGED (identical logic, zero modifications)
    ✓ Only Change: Added SET search_path = public
  
  Function 3: user_can_view_project(uuid, uuid)
    ✓ Signature: UNCHANGED (p_user_id uuid, p_project_id uuid)
    ✓ Return Type: UNCHANGED (boolean)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY DEFINER)
    ✓ Volatility: UNCHANGED (VOLATILE)
    ✓ Body: UNCHANGED (identical logic, zero modifications)
    ✓ Only Change: Added SET search_path = public
  
  Function 4: user_is_project_owner(uuid, uuid)
    ✓ Signature: UNCHANGED (p_user_id uuid, p_project_id uuid)
    ✓ Return Type: UNCHANGED (boolean)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY DEFINER)
    ✓ Volatility: UNCHANGED (VOLATILE)
    ✓ Body: UNCHANGED (identical logic, zero modifications)
    ✓ Only Change: Added SET search_path = public
  
  Function 5: user_can_access_space(uuid, uuid)
    ✓ Signature: UNCHANGED (p_auth_user_id uuid, p_space_id uuid)
    ✓ Return Type: UNCHANGED (boolean)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY DEFINER)
    ✓ Volatility: UNCHANGED (STABLE)
    ✓ Body: UNCHANGED (identical logic, zero modifications)
    ✓ Only Change: Added SET search_path = public
  
  Function 6: user_in_household(uuid, uuid)
    ✓ Signature: UNCHANGED (p_user_id uuid, p_household_id uuid)
    ✓ Return Type: UNCHANGED (boolean)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY DEFINER)
    ✓ Volatility: UNCHANGED (VOLATILE)
    ✓ Body: UNCHANGED (identical logic, zero modifications)
    ✓ Only Change: Added SET search_path = public
  
  Function 7: user_is_household_member(uuid, uuid)
    ✓ Signature: UNCHANGED (p_user_id uuid, p_household_id uuid)
    ✓ Return Type: UNCHANGED (boolean)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY DEFINER)
    ✓ Volatility: UNCHANGED (VOLATILE)
    ✓ Body: UNCHANGED (identical logic, zero modifications)
    ✓ Only Change: Added SET search_path = public
  
  Function 8: get_user_household_ids(uuid)
    ✓ Signature: UNCHANGED (p_user_id uuid)
    ✓ Return Type: UNCHANGED (TABLE(household_id uuid))
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY DEFINER)
    ✓ Volatility: UNCHANGED (VOLATILE)
    ✓ Body: UNCHANGED (identical logic, zero modifications)
    ✓ Only Change: Added SET search_path = public
  
  Function 9: is_household_member_by_profile(uuid, uuid)
    ✓ Signature: UNCHANGED (p_household_id uuid, p_profile_id uuid)
    ✓ Return Type: UNCHANGED (boolean)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY DEFINER)
    ✓ Volatility: UNCHANGED (VOLATILE)
    ✓ Body: UNCHANGED (identical logic, zero modifications)
    ✓ Only Change: Added SET search_path = public
  
  Function 10: update_updated_at_column()
    ✓ Signature: UNCHANGED (no parameters)
    ✓ Return Type: UNCHANGED (trigger)
    ✓ Language: UNCHANGED (plpgsql)
    ✓ Security: UNCHANGED (SECURITY INVOKER - default)
    ✓ Volatility: UNCHANGED (VOLATILE)
    ✓ Body: UNCHANGED (identical logic, zero modifications)
    ✓ Only Change: Added SET search_path = public
  
  GLOBAL VERIFICATION:
    ✓ No RLS policies changed
    ✓ No tables modified
    ✓ No views modified
    ✓ No triggers changed
    ✓ No enums modified
    ✓ Only the 10 specified functions were modified
    ✓ All modifications were limited to adding SET search_path = public
    ✓ Zero logic changes across all functions
    ✓ Zero refactoring performed
    ✓ Migration is mechanical and safe
*/