/*
  # Add Composable Roadmap Items (Hierarchical Items)

  ## Summary
  Enables "items inside items" by making Roadmap Items composable execution containers.
  Parent items can contain child items, creating a hierarchical structure for better
  organization and execution modeling (e.g., event with tasks, goal with habits).

  ## Key Principles
  - Parent → child relationships within roadmap items
  - Strict validation enforced at service layer (cycles, depth, type compatibility)
  - Timeline shows only top-level items (parent_item_id = null)
  - Child items are execution-only containers
  - Backward compatible with existing roadmap queries

  ## Changes
  1. Extend `roadmap_items` table
     - Add `parent_item_id` (nullable, self-reference)
     - Add `item_depth` (default 0 for top-level items)
     - Add indexes for performance
     - Add helper functions for tree operations

  2. Performance
     - Index on (section_id, parent_item_id) for tree queries
     - Index on parent_item_id for child lookups
     - Index for timeline queries (top-level items only)

  ## Validation (Service Layer)
  - No cycles: item cannot be its own ancestor
  - Same section: parent and child must share section_id (ensures same project)
  - Depth limit: MAX_ITEM_DEPTH enforced (default: 2)
  - Type compatibility: PARENT_CHILD_TYPE_MATRIX enforced

  ## Timeline Constraint
  - Only items with parent_item_id = null appear on Infinite Roadmap
  - Child items visible via drilldown (future UI)

  ## Notes
  - item_depth = 0: top-level item
  - item_depth = 1: first-level child
  - item_depth = 2: second-level child (max by default)
*/

-- Step 1: Add parent_item_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmap_items'
    AND column_name = 'parent_item_id'
  ) THEN
    ALTER TABLE roadmap_items
    ADD COLUMN parent_item_id uuid REFERENCES roadmap_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Add item_depth column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmap_items'
    AND column_name = 'item_depth'
  ) THEN
    ALTER TABLE roadmap_items
    ADD COLUMN item_depth int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roadmap_items_parent_section 
  ON roadmap_items(section_id, parent_item_id);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_parent 
  ON roadmap_items(parent_item_id) 
  WHERE parent_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_roadmap_items_depth 
  ON roadmap_items(item_depth);

-- Step 4: Create index for timeline queries (top-level items only)
CREATE INDEX IF NOT EXISTS idx_roadmap_items_top_level_timeline 
  ON roadmap_items(section_id, start_date, end_date) 
  WHERE parent_item_id IS NULL AND start_date IS NOT NULL;

-- Step 5: Add helpful comments
COMMENT ON COLUMN roadmap_items.parent_item_id IS 
  'Reference to parent roadmap item. NULL for top-level items. Creates hierarchical item structure for better organization (e.g., event containing tasks).';

COMMENT ON COLUMN roadmap_items.item_depth IS 
  'Depth in item hierarchy. 0 = top-level (appears on timeline), 1 = first child level, 2 = second child level (max by default).';

-- Step 6: Create helper function to calculate item depth
CREATE OR REPLACE FUNCTION calculate_item_depth(input_item_id uuid)
RETURNS int AS $$
DECLARE
  current_depth int := 0;
  current_parent uuid;
  max_iterations int := 10;
  iteration_count int := 0;
BEGIN
  -- Start with the given item
  SELECT parent_item_id INTO current_parent
  FROM roadmap_items
  WHERE id = input_item_id;

  -- Traverse up the tree
  WHILE current_parent IS NOT NULL AND iteration_count < max_iterations LOOP
    current_depth := current_depth + 1;
    iteration_count := iteration_count + 1;
    
    SELECT parent_item_id INTO current_parent
    FROM roadmap_items
    WHERE id = current_parent;
  END LOOP;

  RETURN current_depth;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 7: Create helper function to check if item is ancestor
CREATE OR REPLACE FUNCTION is_item_ancestor(potential_ancestor uuid, potential_descendant uuid)
RETURNS boolean AS $$
DECLARE
  current_parent uuid;
  max_iterations int := 10;
  iteration_count int := 0;
BEGIN
  -- If they're the same, return true (item is its own ancestor)
  IF potential_ancestor = potential_descendant THEN
    RETURN true;
  END IF;

  -- Start with the potential descendant's parent
  SELECT parent_item_id INTO current_parent
  FROM roadmap_items
  WHERE id = potential_descendant;

  -- Traverse up the tree
  WHILE current_parent IS NOT NULL AND iteration_count < max_iterations LOOP
    IF current_parent = potential_ancestor THEN
      RETURN true;
    END IF;
    
    iteration_count := iteration_count + 1;
    
    SELECT parent_item_id INTO current_parent
    FROM roadmap_items
    WHERE id = current_parent;
  END LOOP;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 8: Create helper function to get all children (recursive)
CREATE OR REPLACE FUNCTION get_all_child_items(input_parent_id uuid)
RETURNS TABLE (
  item_id uuid,
  depth int
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE item_tree AS (
    -- Base case: direct children
    SELECT 
      id as item_id,
      1 as depth
    FROM roadmap_items
    WHERE parent_item_id = input_parent_id
    
    UNION ALL
    
    -- Recursive case: children of children
    SELECT 
      ri.id as item_id,
      it.depth + 1 as depth
    FROM roadmap_items ri
    INNER JOIN item_tree it ON ri.parent_item_id = it.item_id
    WHERE it.depth < 10  -- Safety limit
  )
  SELECT * FROM item_tree;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 9: Create helper function to get item path (breadcrumb)
CREATE OR REPLACE FUNCTION get_item_path(input_item_id uuid)
RETURNS TABLE (
  path_item_id uuid,
  title text,
  item_type text,
  depth int
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE item_path AS (
    -- Base case: the item itself
    SELECT 
      ri.id as path_item_id,
      ri.title,
      ri.type::text as item_type,
      0 as depth,
      ri.parent_item_id
    FROM roadmap_items ri
    WHERE ri.id = input_item_id
    
    UNION ALL
    
    -- Recursive case: parent items
    SELECT 
      ri.id as path_item_id,
      ri.title,
      ri.type::text as item_type,
      ip.depth + 1 as depth,
      ri.parent_item_id
    FROM roadmap_items ri
    INNER JOIN item_path ip ON ri.id = ip.parent_item_id
    WHERE ip.depth < 10  -- Safety limit
  )
  SELECT 
    ip.path_item_id,
    ip.title,
    ip.item_type,
    ip.depth
  FROM item_path ip
  ORDER BY ip.depth DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 10: Create helper function to get root item
CREATE OR REPLACE FUNCTION get_root_item_id(input_item_id uuid)
RETURNS uuid AS $$
DECLARE
  current_id uuid := input_item_id;
  current_parent uuid;
  max_iterations int := 10;
  iteration_count int := 0;
BEGIN
  -- Traverse up to root
  LOOP
    SELECT parent_item_id INTO current_parent
    FROM roadmap_items
    WHERE id = current_id;
    
    EXIT WHEN current_parent IS NULL OR iteration_count >= max_iterations;
    
    current_id := current_parent;
    iteration_count := iteration_count + 1;
  END LOOP;

  RETURN current_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 11: Create helper function to check if same section (project validation)
CREATE OR REPLACE FUNCTION items_same_section(item_id_1 uuid, item_id_2 uuid)
RETURNS boolean AS $$
DECLARE
  section_1 uuid;
  section_2 uuid;
BEGIN
  SELECT section_id INTO section_1 FROM roadmap_items WHERE id = item_id_1;
  SELECT section_id INTO section_2 FROM roadmap_items WHERE id = item_id_2;
  
  RETURN section_1 IS NOT NULL AND section_1 = section_2;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 12: Add comments for helper functions
COMMENT ON FUNCTION calculate_item_depth(uuid) IS 
  'Calculate the depth of an item in the hierarchy by traversing up to root. Returns 0 for top-level items.';

COMMENT ON FUNCTION is_item_ancestor(uuid, uuid) IS 
  'Check if first item is an ancestor of second item. Used to prevent cycles when attaching items.';

COMMENT ON FUNCTION get_all_child_items(uuid) IS 
  'Get all descendant items recursively for a given parent item. Returns (item_id, depth) tuples.';

COMMENT ON FUNCTION get_item_path(uuid) IS 
  'Get the path from root to item (breadcrumb trail) for display. Returns items ordered from root to target.';

COMMENT ON FUNCTION get_root_item_id(uuid) IS 
  'Get the top-level (root) item for any item in the hierarchy. Returns the item itself if it has no parent.';

COMMENT ON FUNCTION items_same_section(uuid, uuid) IS 
  'Check if two items belong to the same section (and thus same project). Used for validation before attaching.';
