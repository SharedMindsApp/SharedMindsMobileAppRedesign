/*
  # Phase 3B.1: Critical RLS Gap Fix

  ## Changes

  ### 1. Fix Confirmed Policy Bug in meal_votes
  - **Issue**: Table has UPDATE and DELETE policies but missing SELECT policy
  - **Impact**: Users cannot read rows they are allowed to modify (logic error)
  - **Fix**: Add SELECT policy for users to read their own votes
  - **Ownership**: Direct ownership via profile_id = auth.uid()

  ### 2. Document Intent for regulation_active_signals
  - **Status**: RLS enabled with SELECT and UPDATE policies
  - **Intent**: INSERT and DELETE are intentionally omitted
  - **Reason**: Rows are managed via SECURITY DEFINER functions and internal workflows
  - **Action**: Add table comment to document design intent

  ## Scope
  - ✅ Fixes a confirmed access bug
  - ✅ No refactoring or cleanup
  - ✅ No behavior changes to other tables
  - ✅ Minimal, targeted change
*/

-- ============================================================================
-- 1. Add missing SELECT policy to meal_votes
-- ============================================================================

CREATE POLICY "Users can read their own meal votes"
ON public.meal_votes
FOR SELECT
USING (profile_id = auth.uid());

-- ============================================================================
-- 2. Document design intent for regulation_active_signals
-- ============================================================================

COMMENT ON TABLE public.regulation_active_signals IS
'User-visible table with restricted write access. INSERT and DELETE are intentionally omitted; rows are managed via SECURITY DEFINER functions and internal regulation workflows. Current policies: SELECT (users can read their own signals), UPDATE (users can modify signal state). Write operations occur through service layer only.';