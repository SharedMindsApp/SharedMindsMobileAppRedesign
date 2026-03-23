/*
  # Remove Duplicate Mobile Apps and Add Unique Constraint

  1. Issue
    - mobile_app_layout table has duplicate entries for the same app on the same position
    - This happened due to race conditions during initialization
    - Each app appears twice on the home screen

  2. Changes
    - Delete duplicate entries, keeping only the oldest (smallest id)
    - Add unique constraint to prevent future duplicates
    - Constraint ensures (profile_id, app_type, widget_id, page, position) is unique

  3. Security
    - No security changes, just data cleanup
*/

-- Delete duplicates, keeping only the row with the smallest id
DELETE FROM mobile_app_layout a
USING mobile_app_layout b
WHERE a.id > b.id
  AND a.profile_id = b.profile_id
  AND a.app_type = b.app_type
  AND a.page = b.page
  AND a.position = b.position
  AND (a.widget_id = b.widget_id OR (a.widget_id IS NULL AND b.widget_id IS NULL));

-- Add unique constraint to prevent future duplicates
-- We need to handle NULL widget_id values, so we'll use a partial unique index
DROP INDEX IF EXISTS mobile_app_layout_unique_position;

CREATE UNIQUE INDEX mobile_app_layout_unique_position_with_widget
  ON mobile_app_layout (profile_id, app_type, page, position, widget_id)
  WHERE widget_id IS NOT NULL;

CREATE UNIQUE INDEX mobile_app_layout_unique_position_no_widget
  ON mobile_app_layout (profile_id, app_type, page, position)
  WHERE widget_id IS NULL;
