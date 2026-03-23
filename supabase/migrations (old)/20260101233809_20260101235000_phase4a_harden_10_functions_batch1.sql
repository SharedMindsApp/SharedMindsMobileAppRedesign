/*
  # Phase 4A Part 2: Harden 10 Functions (Batch 1) - Set search_path

  ## Purpose
  
  Add `SET search_path = public` to 10 functions to prevent search_path injection attacks.
  This is a security hardening measure that protects against malicious schema manipulation.

  ## Target Functions (10)
  
  ### Trigger Functions (8)
  1. **adjust_strictness_level** - Auto-adjusts strictness levels based on trust score
  2. **auto_add_project_owner** - Adds project owner to project_users on project creation
  3. **check_single_primary_instance** - Ensures only one primary instance per track
  4. **create_track_hierarchy_connection** - Creates mindmesh connections for track hierarchy
  5. **ensure_single_primary_reference** - Ensures only one primary reference per container
  
  ### Helper Functions (5)
  6. **auto_categorize_grocery_item** - Categorizes grocery items using templates
  7. **calculate_item_depth** - Calculates depth in roadmap item hierarchy
  8. **calculate_parent_track_dates** - Calculates parent track dates from children
  9. **cascade_parent_track_dates** - Cascades date calculations up the hierarchy
  10. **can_edit_track** - Checks if a project can edit a track

  ## Security Impact
  
  - Protects against search_path injection attacks
  - No functional changes to any function
  - All functions maintain existing behavior
  - Zero impact on application logic

  ## Migration Type
  
  - ✅ Safe mechanical hardening
  - ✅ No logic changes
  - ✅ No behavior changes
  - ✅ Standard security best practice
*/

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- 1. adjust_strictness_level
ALTER FUNCTION public.adjust_strictness_level()
SET search_path = public;

-- 2. auto_add_project_owner
ALTER FUNCTION public.auto_add_project_owner()
SET search_path = public;

-- 3. check_single_primary_instance
ALTER FUNCTION public.check_single_primary_instance()
SET search_path = public;

-- 4. create_track_hierarchy_connection
ALTER FUNCTION public.create_track_hierarchy_connection()
SET search_path = public;

-- 5. ensure_single_primary_reference
ALTER FUNCTION public.ensure_single_primary_reference()
SET search_path = public;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- 6. auto_categorize_grocery_item
ALTER FUNCTION public.auto_categorize_grocery_item(item_name_input text)
SET search_path = public;

-- 7. calculate_item_depth
ALTER FUNCTION public.calculate_item_depth(input_item_id uuid)
SET search_path = public;

-- 8. calculate_parent_track_dates
ALTER FUNCTION public.calculate_parent_track_dates(parent_id uuid)
SET search_path = public;

-- 9. cascade_parent_track_dates
ALTER FUNCTION public.cascade_parent_track_dates(track_id uuid)
SET search_path = public;

-- 10. can_edit_track
ALTER FUNCTION public.can_edit_track(input_track_id uuid, input_project_id uuid)
SET search_path = public;