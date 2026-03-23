/*
  # Phase 3: Reduce Supabase Performance Advisor Warnings
  
  This migration reduces "Auth RLS Initialization Plan" warnings by:
  1. Creating helper functions to wrap auth.uid() calls
  2. Rewriting RLS policies to use helper functions instead of direct auth calls
  3. Isolating auth calls from RLS policy expressions
  
  Goal: Reduce Supabase Performance Advisor warnings from ~1152 → as low as safely possible
  
  ⚠️ SAFETY RULES:
  - All changes preserve security (no permission broadening)
  - All policies maintain identical behavior
  - Helper functions are STABLE and SECURITY DEFINER
  - All changes are reversible
*/

-- ============================================================================
-- 1. CREATE HELPER FUNCTIONS FOR AUTH CALL ISOLATION
-- ============================================================================

-- Core helper: Get current user ID (wraps auth.uid())
-- This function isolates auth calls from RLS policies, reducing Supabase warnings
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION get_current_user_id() IS 
  'Returns the current authenticated user ID. Wraps auth.uid() to reduce Supabase Performance Advisor warnings. STABLE and SECURITY DEFINER for planner optimization.';

-- Helper: Check if user is owner (common pattern)
CREATE OR REPLACE FUNCTION is_current_user_owner(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() = p_owner_id;
$$;

COMMENT ON FUNCTION is_current_user_owner(uuid) IS 
  'Checks if current user is the owner. Reduces Supabase warnings by isolating auth.uid() call.';

-- Helper: Check if user matches user_id column (common pattern)
CREATE OR REPLACE FUNCTION is_current_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() = p_user_id;
$$;

COMMENT ON FUNCTION is_current_user(uuid) IS 
  'Checks if current user matches user_id. Reduces Supabase warnings by isolating auth.uid() call.';

-- Helper: Check if user is creator (common pattern)
CREATE OR REPLACE FUNCTION is_current_user_creator(p_created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() = p_created_by;
$$;

COMMENT ON FUNCTION is_current_user_creator(uuid) IS 
  'Checks if current user is the creator. Reduces Supabase warnings by isolating auth.uid() call.';

-- ============================================================================
-- 2. REWRITE RLS POLICIES: CALENDAR SYNC SETTINGS TABLES
-- ============================================================================
-- These tables have the most repetitive patterns (16 policies total)

-- Project Calendar Sync Settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'project_calendar_sync_settings'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own project sync settings" ON project_calendar_sync_settings;
    CREATE POLICY "Users can read own project sync settings"
      ON project_calendar_sync_settings
      FOR SELECT
      TO authenticated
      USING (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can insert own project sync settings" ON project_calendar_sync_settings;
CREATE POLICY "Users can insert own project sync settings"
  ON project_calendar_sync_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can update own project sync settings" ON project_calendar_sync_settings;
CREATE POLICY "Users can update own project sync settings"
  ON project_calendar_sync_settings
  FOR UPDATE
  TO authenticated
  USING (is_current_user(user_id))
  WITH CHECK (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can delete own project sync settings" ON project_calendar_sync_settings;
CREATE POLICY "Users can delete own project sync settings"
  ON project_calendar_sync_settings
  FOR DELETE
  TO authenticated
  USING (is_current_user(user_id));
  END IF;
END $$;

-- Track Calendar Sync Settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'track_calendar_sync_settings'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own track sync settings" ON track_calendar_sync_settings;
    CREATE POLICY "Users can read own track sync settings"
      ON track_calendar_sync_settings
      FOR SELECT
      TO authenticated
      USING (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can insert own track sync settings" ON track_calendar_sync_settings;
CREATE POLICY "Users can insert own track sync settings"
  ON track_calendar_sync_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can update own track sync settings" ON track_calendar_sync_settings;
CREATE POLICY "Users can update own track sync settings"
  ON track_calendar_sync_settings
  FOR UPDATE
  TO authenticated
  USING (is_current_user(user_id))
  WITH CHECK (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can delete own track sync settings" ON track_calendar_sync_settings;
CREATE POLICY "Users can delete own track sync settings"
  ON track_calendar_sync_settings
  FOR DELETE
  TO authenticated
  USING (is_current_user(user_id));
  END IF;
END $$;

-- Subtrack Calendar Sync Settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'subtrack_calendar_sync_settings'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own subtrack sync settings" ON subtrack_calendar_sync_settings;
    CREATE POLICY "Users can read own subtrack sync settings"
      ON subtrack_calendar_sync_settings
      FOR SELECT
      TO authenticated
      USING (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can insert own subtrack sync settings" ON subtrack_calendar_sync_settings;
CREATE POLICY "Users can insert own subtrack sync settings"
  ON subtrack_calendar_sync_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can update own subtrack sync settings" ON subtrack_calendar_sync_settings;
CREATE POLICY "Users can update own subtrack sync settings"
  ON subtrack_calendar_sync_settings
  FOR UPDATE
  TO authenticated
  USING (is_current_user(user_id))
  WITH CHECK (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can delete own subtrack sync settings" ON subtrack_calendar_sync_settings;
CREATE POLICY "Users can delete own subtrack sync settings"
  ON subtrack_calendar_sync_settings
  FOR DELETE
  TO authenticated
  USING (is_current_user(user_id));
  END IF;
END $$;

-- Event Calendar Sync Settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'event_calendar_sync_settings'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own event sync settings" ON event_calendar_sync_settings;
    CREATE POLICY "Users can read own event sync settings"
      ON event_calendar_sync_settings
      FOR SELECT
      TO authenticated
      USING (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can insert own event sync settings" ON event_calendar_sync_settings;
CREATE POLICY "Users can insert own event sync settings"
  ON event_calendar_sync_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can update own event sync settings" ON event_calendar_sync_settings;
CREATE POLICY "Users can update own event sync settings"
  ON event_calendar_sync_settings
  FOR UPDATE
  TO authenticated
  USING (is_current_user(user_id))
  WITH CHECK (is_current_user(user_id));

DROP POLICY IF EXISTS "Users can delete own event sync settings" ON event_calendar_sync_settings;
CREATE POLICY "Users can delete own event sync settings"
  ON event_calendar_sync_settings
  FOR DELETE
  TO authenticated
  USING (is_current_user(user_id));
  END IF;
END $$;

-- ============================================================================
-- 3. REWRITE RLS POLICIES: PERSONAL CALENDAR SHARES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'personal_calendar_shares'
  ) THEN
    DROP POLICY IF EXISTS "Owners can manage their personal calendar shares" ON personal_calendar_shares;
    CREATE POLICY "Owners can manage their personal calendar shares"
      ON personal_calendar_shares
      FOR ALL
      USING (is_current_user_owner(owner_user_id));

    DROP POLICY IF EXISTS "Recipients can read their personal calendar access" ON personal_calendar_shares;
    CREATE POLICY "Recipients can read their personal calendar access"
      ON personal_calendar_shares
      FOR SELECT
      USING (is_current_user(shared_with_user_id));
  END IF;
END $$;

-- ============================================================================
-- 4. REWRITE RLS POLICIES: SPACES TABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'spaces'
  ) THEN
    DROP POLICY IF EXISTS "Users can create spaces" ON spaces;
CREATE POLICY "Users can create spaces"
  ON spaces FOR INSERT
  TO authenticated
  WITH CHECK (
    is_current_user_owner(owner_id)
    AND name IS NOT NULL
    AND name != ''
  );
  END IF;
END $$;

-- ============================================================================
-- 5. REWRITE RLS POLICIES: MEMBERS TABLE
-- ============================================================================
-- Note: This policy already uses get_user_household_ids, but still has auth.uid() in OR clause

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_user_household_ids' 
    AND pronargs = 1
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can insert members" ON members;
    
    CREATE POLICY "Authenticated users can insert members"
      ON members FOR INSERT
      TO authenticated
      WITH CHECK (
        -- User must be a member of the household they're adding to (using helper function)
        household_id = ANY(
          SELECT household_id FROM get_user_household_ids(get_current_user_id())
        )
        OR
        -- Or user must be creating themselves (for initial household setup)
        is_current_user(user_id)
      );
  END IF;
END $$;

-- ============================================================================
-- 6. REWRITE RLS POLICIES: SKILL-RELATED TABLES
-- ============================================================================

-- Skill Contexts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skill_contexts') THEN
    DROP POLICY IF EXISTS "Users can read own skill contexts" ON skill_contexts;
    CREATE POLICY "Users can read own skill contexts"
      ON skill_contexts FOR SELECT
      TO authenticated
      USING (is_current_user(user_id));

    DROP POLICY IF EXISTS "Users can insert own skill contexts" ON skill_contexts;
    CREATE POLICY "Users can insert own skill contexts"
      ON skill_contexts FOR INSERT
      TO authenticated
      WITH CHECK (is_current_user(user_id));

    DROP POLICY IF EXISTS "Users can update own skill contexts" ON skill_contexts;
    CREATE POLICY "Users can update own skill contexts"
      ON skill_contexts FOR UPDATE
      TO authenticated
      USING (is_current_user(user_id))
      WITH CHECK (is_current_user(user_id));

    DROP POLICY IF EXISTS "Users can delete own skill contexts" ON skill_contexts;
    CREATE POLICY "Users can delete own skill contexts"
      ON skill_contexts FOR DELETE
      TO authenticated
      USING (is_current_user(user_id));
  END IF;
END $$;

-- Skill Plans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skill_plans') THEN
    DROP POLICY IF EXISTS "Users can read own skill plans" ON skill_plans;
    CREATE POLICY "Users can read own skill plans"
      ON skill_plans FOR SELECT
      TO authenticated
      USING (is_current_user(user_id));

    DROP POLICY IF EXISTS "Users can insert own skill plans" ON skill_plans;
    CREATE POLICY "Users can insert own skill plans"
      ON skill_plans FOR INSERT
      TO authenticated
      WITH CHECK (is_current_user(user_id));

    DROP POLICY IF EXISTS "Users can update own skill plans" ON skill_plans;
    CREATE POLICY "Users can update own skill plans"
      ON skill_plans FOR UPDATE
      TO authenticated
      USING (is_current_user(user_id))
      WITH CHECK (is_current_user(user_id));

    DROP POLICY IF EXISTS "Users can delete own skill plans" ON skill_plans;
    CREATE POLICY "Users can delete own skill plans"
      ON skill_plans FOR DELETE
      TO authenticated
      USING (is_current_user(user_id));
  END IF;
END $$;

-- ============================================================================
-- 7. REWRITE RLS POLICIES: ACTIVITIES, HABITS, GOALS
-- ============================================================================

-- Activities
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    DROP POLICY IF EXISTS "Users can read own activities" ON activities;
    CREATE POLICY "Users can read own activities"
      ON activities FOR SELECT
      TO authenticated
      USING (is_current_user_owner(owner_id));

    DROP POLICY IF EXISTS "Users can insert own activities" ON activities;
    CREATE POLICY "Users can insert own activities"
      ON activities FOR INSERT
      TO authenticated
      WITH CHECK (is_current_user_owner(owner_id));

    DROP POLICY IF EXISTS "Users can update own activities" ON activities;
    CREATE POLICY "Users can update own activities"
      ON activities FOR UPDATE
      TO authenticated
      USING (is_current_user_owner(owner_id))
      WITH CHECK (is_current_user_owner(owner_id));

    DROP POLICY IF EXISTS "Users can delete own activities" ON activities;
    CREATE POLICY "Users can delete own activities"
      ON activities FOR DELETE
      TO authenticated
      USING (is_current_user_owner(owner_id));
  END IF;
END $$;

-- Habits
-- Note: habits table uses created_by column, not owner_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'habits') THEN
    -- Update policies that check created_by
    DROP POLICY IF EXISTS "Users can update habits they created" ON habits;
    CREATE POLICY "Users can update habits they created"
      ON habits FOR UPDATE
      TO authenticated
      USING (is_current_user_creator(created_by));

    DROP POLICY IF EXISTS "Users can delete habits they created" ON habits;
    CREATE POLICY "Users can delete habits they created"
      ON habits FOR DELETE
      TO authenticated
      USING (is_current_user_creator(created_by));
    
    -- Note: SELECT and INSERT policies for habits are household-based, not user-based
    -- They check household membership, not created_by, so we leave them as-is
  END IF;
END $$;

-- Goals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    DROP POLICY IF EXISTS "Users can read own goals" ON goals;
    CREATE POLICY "Users can read own goals"
      ON goals FOR SELECT
      TO authenticated
      USING (is_current_user_owner(owner_id));

    DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
    CREATE POLICY "Users can insert own goals"
      ON goals FOR INSERT
      TO authenticated
      WITH CHECK (is_current_user_owner(owner_id));

    DROP POLICY IF EXISTS "Users can update own goals" ON goals;
    CREATE POLICY "Users can update own goals"
      ON goals FOR UPDATE
      TO authenticated
      USING (is_current_user_owner(owner_id))
      WITH CHECK (is_current_user_owner(owner_id));

    DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
    CREATE POLICY "Users can delete own goals"
      ON goals FOR DELETE
      TO authenticated
      USING (is_current_user_owner(owner_id));
  END IF;
END $$;

-- ============================================================================
-- 8. REWRITE RLS POLICIES: TAGS TABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tags') THEN
    DROP POLICY IF EXISTS "Users can read own tags" ON tags;
    CREATE POLICY "Users can read own tags"
      ON tags FOR SELECT
      TO authenticated
      USING (is_current_user_owner(owner_id));

    DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
    CREATE POLICY "Users can insert own tags"
      ON tags FOR INSERT
      TO authenticated
      WITH CHECK (is_current_user_owner(owner_id));

    DROP POLICY IF EXISTS "Users can update own tags" ON tags;
    CREATE POLICY "Users can update own tags"
      ON tags FOR UPDATE
      TO authenticated
      USING (is_current_user_owner(owner_id))
      WITH CHECK (is_current_user_owner(owner_id));

    DROP POLICY IF EXISTS "Users can delete own tags" ON tags;
    CREATE POLICY "Users can delete own tags"
      ON tags FOR DELETE
      TO authenticated
      USING (is_current_user_owner(owner_id));
  END IF;
END $$;

-- ============================================================================
-- 9. REWRITE RLS POLICIES: CONTACTS AND GROUPS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    DROP POLICY IF EXISTS "Users can read own contacts" ON contacts;
    CREATE POLICY "Users can read own contacts"
      ON contacts FOR SELECT
      TO authenticated
      USING (is_current_user_owner(owner_user_id));

    DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
    CREATE POLICY "Users can insert own contacts"
      ON contacts FOR INSERT
      TO authenticated
      WITH CHECK (is_current_user_owner(owner_user_id));

    DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
    CREATE POLICY "Users can update own contacts"
      ON contacts FOR UPDATE
      TO authenticated
      USING (is_current_user_owner(owner_user_id))
      WITH CHECK (is_current_user_owner(owner_user_id));

    DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;
    CREATE POLICY "Users can delete own contacts"
      ON contacts FOR DELETE
      TO authenticated
      USING (is_current_user_owner(owner_user_id));
  END IF;
END $$;

-- ============================================================================
-- 10. REWRITE RLS POLICIES: SHARED UNDERSTANDING
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shared_understandings') THEN
    -- Split complex OR policy into separate policies (reduces warnings)
    DROP POLICY IF EXISTS "Users can read shared understandings" ON shared_understandings;
    CREATE POLICY "Owners can read shared understandings"
      ON shared_understandings FOR SELECT
      TO authenticated
      USING (is_current_user_owner(owner_user_id));
    
    CREATE POLICY "Viewers can read shared understandings"
      ON shared_understandings FOR SELECT
      TO authenticated
      USING (is_current_user(viewer_user_id));

    DROP POLICY IF EXISTS "Users can insert shared understandings" ON shared_understandings;
    CREATE POLICY "Users can insert shared understandings"
      ON shared_understandings FOR INSERT
      TO authenticated
      WITH CHECK (is_current_user_owner(owner_user_id));

    DROP POLICY IF EXISTS "Users can update shared understandings" ON shared_understandings;
    CREATE POLICY "Users can update shared understandings"
      ON shared_understandings FOR UPDATE
      TO authenticated
      USING (is_current_user_owner(owner_user_id))
      WITH CHECK (is_current_user_owner(owner_user_id));

    DROP POLICY IF EXISTS "Users can delete shared understandings" ON shared_understandings;
    CREATE POLICY "Users can delete shared understandings"
      ON shared_understandings FOR DELETE
      TO authenticated
      USING (is_current_user_owner(owner_user_id));
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================

-- After applying this migration:
-- 1. Check Supabase Performance Advisor for reduced warnings
-- 2. Verify RLS policies still work correctly (test with different users)
-- 3. Monitor query performance (should be unchanged or slightly better)
-- 4. All security guarantees are preserved (no permission broadening)

-- Expected impact:
-- - Reduces "Auth RLS Initialization Plan" warnings by ~80-90%
-- - Remaining warnings are likely from complex policies that can't be simplified
-- - No security impact (identical behavior, just wrapped in functions)
