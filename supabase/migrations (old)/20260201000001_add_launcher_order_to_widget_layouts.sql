-- Add launcher_order column to separate launcher ordering from canvas position
-- IMPORTANT: position_x / position_y are canvas coordinates only.
-- Launcher ordering MUST use launcher_order.
-- Never mix these systems.

ALTER TABLE fridge_widget_layouts
ADD COLUMN IF NOT EXISTS launcher_order integer;

-- Backfill launcher_order for existing layouts based on updated_at
-- This ensures existing users have a valid order without breaking anything
UPDATE fridge_widget_layouts
SET launcher_order = sub.rn - 1
FROM (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY member_id
           ORDER BY updated_at
         ) AS rn
  FROM fridge_widget_layouts
  WHERE launcher_order IS NULL
) sub
WHERE fridge_widget_layouts.id = sub.id;

-- Create index for efficient launcher ordering queries
CREATE INDEX IF NOT EXISTS fridge_widget_layouts_member_launcher_order_idx
ON fridge_widget_layouts (member_id, launcher_order)
WHERE launcher_order IS NOT NULL;
