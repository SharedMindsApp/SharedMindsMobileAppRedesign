-- ============================================================================
-- Allow Profile Viewing for Calendar Shares
-- 
-- Updates RLS policy to allow users to view profiles of users they share
-- calendars with (for calendar sharing feature).
-- ============================================================================

-- Drop the existing policy and recreate with calendar share support
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON profiles;

-- Updated policy that allows viewing profiles:
-- 1. Own profile
-- 2. Admin can view all (using is_admin() function)
-- 3. Profiles of users with active calendar shares (for calendar sharing feature)
CREATE POLICY "Users can view own profile or admin can view all or calendar share"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- User can view their own profile
    auth.uid() = user_id
    -- OR user is admin (can view all) - use is_admin() function to avoid recursion
    OR is_admin()
    -- OR there's an active calendar share relationship
    -- (user can view profile if they share a calendar with that user)
    OR EXISTS (
      SELECT 1 FROM calendar_shares cs
      WHERE cs.status = 'active'
      AND (
        -- User is viewing owner's profile (user is viewer)
        (cs.owner_user_id = profiles.user_id AND cs.viewer_user_id = auth.uid())
        OR
        -- User is viewing viewer's profile (user is owner)
        (cs.viewer_user_id = profiles.user_id AND cs.owner_user_id = auth.uid())
      )
    )
  );
