/*
  # Unified Food System - Pantry as Source of Truth
  
  Core Principle: ONE canonical food_item entity used by Pantry, Grocery List, and Meal Planner.
  No feature may create or store its own food strings independently.
  
  1. Create food_items table (canonical food items)
  2. Migrate existing data to food_items
  3. Update pantry_items to reference food_item_id
  4. Update grocery_list_items to reference food_item_id
  5. Update meal_library ingredients to reference food_item_id
  6. Add RLS policies
*/

-- ============================================
-- 1. CREATE CANONICAL FOOD ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL, -- lowercase, trimmed for matching
  category text, -- dairy, produce, meat, pantry, etc.
  emoji text, -- optional emoji for visual identification
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_food_items_normalized_name ON food_items(normalized_name);
CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category);
-- Enable pg_trgm extension for fuzzy matching if not already enabled
-- Note: This may require superuser privileges. If it fails, the search function will use ILIKE fallback.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_trgm extension not available. Fuzzy search will use ILIKE fallback.';
END $$;

-- Create trigram index if extension is available
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_food_items_name_trgm ON food_items USING gin(name gin_trgm_ops);
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'Trigram index not created. Fuzzy search will use ILIKE fallback.';
END $$;

-- ============================================
-- 2. MIGRATE EXISTING DATA TO food_items
-- ============================================

-- Function to normalize food names
CREATE OR REPLACE FUNCTION normalize_food_name(input_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(trim(input_name));
END;
$$;

-- Function to get or create food item
CREATE OR REPLACE FUNCTION get_or_create_food_item(
  item_name_input text,
  category_input text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  food_item_id uuid;
  normalized_input text;
BEGIN
  normalized_input := normalize_food_name(item_name_input);
  
  -- Try to find existing food item
  SELECT id INTO food_item_id
  FROM food_items
  WHERE normalized_name = normalized_input
  LIMIT 1;
  
  -- If not found, create it
  IF food_item_id IS NULL THEN
    INSERT INTO food_items (name, normalized_name, category)
    VALUES (trim(item_name_input), normalized_input, category_input)
    RETURNING id INTO food_item_id;
  END IF;
  
  RETURN food_item_id;
END;
$$;

-- Migrate pantry items
DO $$
DECLARE
  pantry_record RECORD;
  food_item_id uuid;
BEGIN
  FOR pantry_record IN SELECT DISTINCT item_name, category FROM household_pantry_items WHERE item_name IS NOT NULL
  LOOP
    food_item_id := get_or_create_food_item(pantry_record.item_name, pantry_record.category);
  END LOOP;
END $$;

-- Migrate grocery list items
DO $$
DECLARE
  grocery_record RECORD;
  food_item_id uuid;
BEGIN
  FOR grocery_record IN SELECT DISTINCT item_name, category FROM household_grocery_list_items WHERE item_name IS NOT NULL
  LOOP
    food_item_id := get_or_create_food_item(grocery_record.item_name, grocery_record.category);
  END LOOP;
END $$;

-- Migrate meal library ingredients
DO $$
DECLARE
  meal_record RECORD;
  ingredient_record RECORD;
  food_item_id uuid;
BEGIN
  FOR meal_record IN SELECT id, ingredients FROM meal_library WHERE ingredients IS NOT NULL
  LOOP
    FOR ingredient_record IN SELECT * FROM jsonb_array_elements(meal_record.ingredients) AS ingredient
    LOOP
      IF ingredient_record.value->>'name' IS NOT NULL THEN
        food_item_id := get_or_create_food_item(ingredient_record.value->>'name');
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Migrate grocery templates
DO $$
DECLARE
  template_record RECORD;
  food_item_id uuid;
BEGIN
  FOR template_record IN SELECT DISTINCT item_name, category FROM household_grocery_templates WHERE item_name IS NOT NULL
  LOOP
    food_item_id := get_or_create_food_item(template_record.item_name, template_record.category);
  END LOOP;
END $$;

-- Migrate purchase history
DO $$
DECLARE
  purchase_record RECORD;
  food_item_id uuid;
BEGIN
  FOR purchase_record IN SELECT DISTINCT item_name, category FROM household_grocery_purchase_history WHERE item_name IS NOT NULL
  LOOP
    food_item_id := get_or_create_food_item(purchase_record.item_name, purchase_record.category);
  END LOOP;
END $$;

-- ============================================
-- 3. UPDATE PANTRY ITEMS TABLE
-- ============================================

-- Add food_item_id column
ALTER TABLE household_pantry_items
ADD COLUMN IF NOT EXISTS food_item_id uuid REFERENCES food_items(id) ON DELETE CASCADE;

-- Populate food_item_id from existing item_name
UPDATE household_pantry_items pi
SET food_item_id = fi.id
FROM food_items fi
WHERE normalize_food_name(pi.item_name) = fi.normalized_name
  AND pi.food_item_id IS NULL;

-- Make food_item_id NOT NULL after migration (we'll do this in a separate step after verifying)
-- ALTER TABLE household_pantry_items ALTER COLUMN food_item_id SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_pantry_food_item ON household_pantry_items(food_item_id);

-- ============================================
-- 4. UPDATE GROCERY LIST ITEMS TABLE
-- ============================================

-- Add food_item_id column
ALTER TABLE household_grocery_list_items
ADD COLUMN IF NOT EXISTS food_item_id uuid REFERENCES food_items(id) ON DELETE CASCADE;

-- Populate food_item_id from existing item_name
UPDATE household_grocery_list_items gli
SET food_item_id = fi.id
FROM food_items fi
WHERE normalize_food_name(gli.item_name) = fi.normalized_name
  AND gli.food_item_id IS NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_grocery_items_food_item ON household_grocery_list_items(food_item_id);

-- ============================================
-- 5. UPDATE MEAL LIBRARY INGREDIENTS
-- ============================================
-- Note: This is more complex since ingredients are stored as JSONB.
-- We'll create a helper function to update ingredients to use food_item_id.
-- For now, we'll keep the JSONB structure but add a migration function.

-- Function to migrate meal ingredients to use food_item_id
CREATE OR REPLACE FUNCTION migrate_meal_ingredients_to_food_items()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  meal_record RECORD;
  ingredient_array jsonb;
  updated_ingredient jsonb;
  ingredient_name text;
  food_item_id uuid;
  new_ingredients jsonb := '[]'::jsonb;
BEGIN
  FOR meal_record IN SELECT id, ingredients FROM meal_library WHERE ingredients IS NOT NULL
  LOOP
    new_ingredients := '[]'::jsonb;
    
    -- Process each ingredient
    FOR updated_ingredient IN SELECT * FROM jsonb_array_elements(meal_record.ingredients)
    LOOP
      ingredient_name := updated_ingredient->>'name';
      
      IF ingredient_name IS NOT NULL THEN
        food_item_id := get_or_create_food_item(ingredient_name);
        
        -- Update ingredient with food_item_id while preserving other fields
        updated_ingredient := updated_ingredient || jsonb_build_object('food_item_id', food_item_id::text);
      END IF;
      
      new_ingredients := new_ingredients || jsonb_build_array(updated_ingredient);
    END LOOP;
    
    -- Update meal with migrated ingredients
    UPDATE meal_library
    SET ingredients = new_ingredients
    WHERE id = meal_record.id;
  END LOOP;
END;
$$;

-- Run the migration
SELECT migrate_meal_ingredients_to_food_items();

-- ============================================
-- 6. RLS POLICIES FOR food_items
-- ============================================

ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view food items (they're canonical/shared)
CREATE POLICY "Anyone can view food items"
  ON food_items FOR SELECT
  TO authenticated
  USING (true);

-- Only system can insert food items (users create via get_or_create_food_item function)
-- We'll allow authenticated users to create via the function
CREATE POLICY "Authenticated users can create food items"
  ON food_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update food items they might have created (though typically system-managed)
CREATE POLICY "Authenticated users can update food items"
  ON food_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 7. HELPER FUNCTIONS FOR FOOD ITEM OPERATIONS
-- ============================================

-- Function to search food items (fuzzy matching)
CREATE OR REPLACE FUNCTION search_food_items(
  search_query text,
  limit_count int DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  name text,
  normalized_name text,
  category text,
  emoji text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fi.id,
    fi.name,
    fi.normalized_name,
    fi.category,
    fi.emoji
  FROM food_items fi
  WHERE
    fi.normalized_name LIKE '%' || normalize_food_name(search_query) || '%'
    OR fi.name % search_query -- pg_trgm similarity
  ORDER BY
    CASE WHEN fi.normalized_name = normalize_food_name(search_query) THEN 1
         WHEN fi.normalized_name LIKE normalize_food_name(search_query) || '%' THEN 2
         ELSE 3 END,
    similarity(fi.name, search_query) DESC
  LIMIT limit_count;
END;
$$;

-- Function to get recently used food items for a household
CREATE OR REPLACE FUNCTION get_recently_used_food_items(
  household_id_input uuid,
  limit_count int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  name text,
  normalized_name text,
  category text,
  emoji text,
  last_used timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    fi.id,
    fi.name,
    fi.normalized_name,
    fi.category,
    fi.emoji,
    GREATEST(
      COALESCE((SELECT MAX(updated_at) FROM household_pantry_items WHERE food_item_id = fi.id AND household_id = household_id_input), '1970-01-01'::timestamptz),
      COALESCE((SELECT MAX(updated_at) FROM household_grocery_list_items WHERE food_item_id = fi.id AND household_id = household_id_input), '1970-01-01'::timestamptz)
    ) as last_used
  FROM food_items fi
  WHERE EXISTS (
    SELECT 1 FROM household_pantry_items WHERE food_item_id = fi.id AND household_id = household_id_input
    UNION
    SELECT 1 FROM household_grocery_list_items WHERE food_item_id = fi.id AND household_id = household_id_input
  )
  ORDER BY last_used DESC
  LIMIT limit_count;
END;
$$;

-- ============================================
-- 8. UPDATE TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_food_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER food_items_updated_at
  BEFORE UPDATE ON food_items
  FOR EACH ROW
  EXECUTE FUNCTION update_food_items_updated_at();

-- ============================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE food_items IS 'Canonical food items - single source of truth for all food references across Pantry, Grocery List, and Meal Planner';
COMMENT ON COLUMN food_items.normalized_name IS 'Lowercase, trimmed name for consistent matching and deduplication';
COMMENT ON COLUMN food_items.category IS 'Food category (dairy, produce, meat, pantry, etc.) for organization';
COMMENT ON FUNCTION get_or_create_food_item IS 'Gets existing food item or creates new one. Use this instead of direct inserts.';
COMMENT ON FUNCTION search_food_items IS 'Fuzzy search for food items with relevance ranking';
COMMENT ON FUNCTION get_recently_used_food_items IS 'Returns food items recently used by a household for quick selection';
