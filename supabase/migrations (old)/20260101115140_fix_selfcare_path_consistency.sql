/*
  # Fix Self-Care Path Consistency

  ## Summary
  Updates any stored UI preferences to ensure the self-care planner tab uses the correct
  path `/planner/selfcare` (without hyphen) to match the frontend route definitions.

  ## Changes
  1. Update any UI preferences that have `/planner/self-care` to `/planner/selfcare`
  2. Ensure consistency between stored preferences and frontend routes

  ## Rationale
  The frontend routes use `/planner/selfcare` but some stored preferences may have
  `/planner/self-care` with a hyphen. This migration ensures consistency.
*/

-- Update any stored planner tab configurations that use the hyphenated path
UPDATE user_ui_preferences
SET custom_overrides = jsonb_set(
  custom_overrides,
  '{planner_settings,tabConfig}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN tab->>'path' = '/planner/self-care'
        THEN jsonb_set(tab, '{path}', '"/planner/selfcare"'::jsonb)
        ELSE tab
      END
    )
    FROM jsonb_array_elements(custom_overrides->'planner_settings'->'tabConfig') AS tab
  ),
  true
)
WHERE custom_overrides->'planner_settings'->'tabConfig' IS NOT NULL
  AND (custom_overrides->'planner_settings'->'tabConfig')::text LIKE '%/planner/self-care%';

-- Update any favourite tabs that use the hyphenated path
UPDATE user_ui_preferences
SET custom_overrides = jsonb_set(
  custom_overrides,
  '{planner_settings,favouriteTabs}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN tab::text = '"/planner/self-care"'
        THEN '"/planner/selfcare"'::jsonb
        ELSE tab
      END
    )
    FROM jsonb_array_elements(custom_overrides->'planner_settings'->'favouriteTabs') AS tab
  ),
  true
)
WHERE custom_overrides->'planner_settings'->'favouriteTabs' IS NOT NULL
  AND (custom_overrides->'planner_settings'->'favouriteTabs')::text LIKE '%/planner/self-care%';
