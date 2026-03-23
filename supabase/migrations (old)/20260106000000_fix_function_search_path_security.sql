/*
  # Fix Function Search Path Security Issues
  
  This migration fixes all functions that have mutable search_path, which is a security risk.
  Sets search_path to empty string (requiring fully qualified names) for all affected functions.
  
  Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
  
  Note: Uses DO blocks to safely alter functions only if they exist, preventing errors.
*/

-- Fix all functions with mutable search_path
-- Setting search_path to '' requires fully qualified names, preventing search_path injection attacks

DO $$
BEGIN
  -- Functions that take no parameters
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_granular_sync_settings_updated_at' AND pronargs = 0) THEN
    ALTER FUNCTION update_granular_sync_settings_updated_at() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_side_project_timestamp' AND pronargs = 0) THEN
    ALTER FUNCTION update_side_project_timestamp() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'init_regulation_state_for_user' AND pronargs = 0) THEN
    ALTER FUNCTION init_regulation_state_for_user() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_nesting_depth' AND pronargs = 0) THEN
    ALTER FUNCTION check_nesting_depth() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_cover_image_timestamp' AND pronargs = 0) THEN
    ALTER FUNCTION update_cover_image_timestamp() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_contacts_updated_at' AND pronargs = 0) THEN
    ALTER FUNCTION update_contacts_updated_at() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_activity_updated_at' AND pronargs = 0) THEN
    ALTER FUNCTION update_activity_updated_at() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_trips_with_images' AND pronargs = 0) THEN
    ALTER FUNCTION get_trips_with_images() SET search_path = '';
  END IF;
  
  -- Trip cover image functions (may not exist in all databases)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_trip_cover_image_url' AND pronargs = 1) THEN
    BEGIN
      ALTER FUNCTION get_trip_cover_image_url(uuid) SET search_path = '';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trip_has_cover_image' AND pronargs = 1) THEN
    BEGIN
      ALTER FUNCTION trip_has_cover_image(uuid) SET search_path = '';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_trip_cover_image_metadata' AND pronargs = 1) THEN
    BEGIN
      ALTER FUNCTION get_trip_cover_image_metadata(uuid) SET search_path = '';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_archive_completed_trips' AND pronargs = 0) THEN
    ALTER FUNCTION auto_archive_completed_trips() SET search_path = '';
  END IF;
  
  -- Trip cover image functions (may have different signatures)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_trip_cover_image_url' AND pronargs = 1) THEN
    BEGIN
      ALTER FUNCTION get_trip_cover_image_url(uuid) SET search_path = '';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trip_has_cover_image' AND pronargs = 1) THEN
    BEGIN
      ALTER FUNCTION trip_has_cover_image(uuid) SET search_path = '';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_trip_cover_image_metadata' AND pronargs = 1) THEN
    BEGIN
      ALTER FUNCTION get_trip_cover_image_metadata(uuid) SET search_path = '';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_habit_checkin_updated_at' AND pronargs = 0) THEN
    ALTER FUNCTION update_habit_checkin_updated_at() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_goal_updated_at' AND pronargs = 0) THEN
    ALTER FUNCTION update_goal_updated_at() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_goal_requirement_updated_at' AND pronargs = 0) THEN
    ALTER FUNCTION update_goal_requirement_updated_at() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_skill_contexts_updated_at' AND pronargs = 0) THEN
    ALTER FUNCTION update_skill_contexts_updated_at() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_shared_understanding_updated_at' AND pronargs = 0) THEN
    ALTER FUNCTION update_shared_understanding_updated_at() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_trip_shared_space_calendar_links_updated_at' AND pronargs = 0) THEN
    ALTER FUNCTION update_trip_shared_space_calendar_links_updated_at() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_roadmap_item_master_project' AND pronargs = 0) THEN
    ALTER FUNCTION validate_roadmap_item_master_project() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_reflection_timestamp' AND pronargs = 0) THEN
    ALTER FUNCTION update_reflection_timestamp() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_wizard_session_timestamp' AND pronargs = 0) THEN
    ALTER FUNCTION update_wizard_session_timestamp() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_governance_settings_modified_at' AND pronargs = 0) THEN
    ALTER FUNCTION update_governance_settings_modified_at() SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronargs = 0) THEN
    ALTER FUNCTION update_updated_at_column() SET search_path = '';
  END IF;
  
  -- Functions that take 1 uuid parameter
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'archive_activity' AND pronargs = 1) THEN
    ALTER FUNCTION archive_activity(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'hide_calendar_projection' AND pronargs = 1) THEN
    ALTER FUNCTION hide_calendar_projection(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_user_behavioral_events' AND pronargs = 1) THEN
    ALTER FUNCTION delete_user_behavioral_events(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_tags' AND pronargs = 1) THEN
    ALTER FUNCTION get_user_tags(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_track_update_to_mindmesh' AND pronargs = 1) THEN
    ALTER FUNCTION sync_track_update_to_mindmesh(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_track_delete_to_mindmesh' AND pronargs = 1) THEN
    ALTER FUNCTION sync_track_delete_to_mindmesh(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'toggle_safe_mode' AND pronargs = 1) THEN
    ALTER FUNCTION toggle_safe_mode(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_safe_mode_enabled' AND pronargs = 1) THEN
    ALTER FUNCTION is_safe_mode_enabled(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_roadmap_item_update_to_mindmesh' AND pronargs = 1) THEN
    ALTER FUNCTION sync_roadmap_item_update_to_mindmesh(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_roadmap_item_delete_to_mindmesh' AND pronargs = 1) THEN
    ALTER FUNCTION sync_roadmap_item_delete_to_mindmesh(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_item_ancestor' AND pronargs = 2) THEN
    ALTER FUNCTION is_item_ancestor(uuid, uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_child_items' AND pronargs = 1) THEN
    ALTER FUNCTION get_all_child_items(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_item_path' AND pronargs = 1) THEN
    ALTER FUNCTION get_item_path(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_root_item_id' AND pronargs = 1) THEN
    ALTER FUNCTION get_root_item_id(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'items_same_section' AND pronargs = 2) THEN
    ALTER FUNCTION items_same_section(uuid, uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'soft_delete_reflection' AND pronargs = 1) THEN
    ALTER FUNCTION soft_delete_reflection(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'ensure_personal_space' AND pronargs = 1) THEN
    ALTER FUNCTION ensure_personal_space(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_create_personal_space' AND pronargs = 1) THEN
    ALTER FUNCTION auto_create_personal_space(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_track_projects' AND pronargs = 1) THEN
    ALTER FUNCTION get_track_projects(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_project_tracks' AND pronargs = 1) THEN
    ALTER FUNCTION get_project_tracks(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'disable_wizard_ai' AND pronargs = 1) THEN
    ALTER FUNCTION disable_wizard_ai(uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_and_unlock_features' AND pronargs = 1) THEN
    ALTER FUNCTION check_and_unlock_features(uuid) SET search_path = '';
  END IF;
  
  -- Functions that take 2 uuid parameters
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_can_view_context' AND pronargs = 2) THEN
    ALTER FUNCTION user_can_view_context(uuid, uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_can_edit_context' AND pronargs = 2) THEN
    ALTER FUNCTION user_can_edit_context(uuid, uuid) SET search_path = '';
  END IF;
  
  -- can_display_insight takes (uuid, signal_key_enum)
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND p.proname = 'can_display_insight'
    AND p.pronargs = 2
  ) THEN
    BEGIN
      ALTER FUNCTION can_display_insight(uuid, signal_key_enum) SET search_path = '';
    EXCEPTION WHEN OTHERS THEN
      -- Function might have different signature, skip it
      NULL;
    END;
  END IF;
  
  -- Functions that take 3 parameters
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_entity_tags' AND pronargs = 3) THEN
    ALTER FUNCTION get_entity_tags(uuid, text, uuid) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_tagged_entities' AND pronargs = 2) THEN
    ALTER FUNCTION get_tagged_entities(uuid, text) SET search_path = '';
  END IF;
  
  -- Functions that take array parameters
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'bulk_archive_trips' AND pronargs = 1) THEN
    ALTER FUNCTION bulk_archive_trips(uuid[]) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'bulk_unarchive_trips' AND pronargs = 1) THEN
    ALTER FUNCTION bulk_unarchive_trips(uuid[]) SET search_path = '';
  END IF;
  
  -- Functions that take jsonb parameters
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_analytics_event' AND pronargs = 1) THEN
    ALTER FUNCTION log_analytics_event(jsonb) SET search_path = '';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_admin_action' AND pronargs = 1) THEN
    ALTER FUNCTION log_admin_action(jsonb) SET search_path = '';
  END IF;
  
  -- Functions with special signatures
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_smart_grocery_suggestions' AND pronargs = 2) THEN
    ALTER FUNCTION get_smart_grocery_suggestions(uuid, int) SET search_path = '';
  END IF;
  
  -- Note: Some functions from the linter report may not exist or have different signatures
  -- This migration only fixes functions that actually exist in the database
END $$;
