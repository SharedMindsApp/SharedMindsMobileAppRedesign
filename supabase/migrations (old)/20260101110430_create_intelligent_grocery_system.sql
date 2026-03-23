/*
  # Intelligent Grocery Planning System

  1. New Tables
    - `household_grocery_templates`
      - Pre-defined grocery items with smart categorization
      - Purchase frequency tracking
      - Common items library

    - `household_pantry_items`
      - Track what's in the pantry
      - Expiration dates
      - Quantity tracking

    - `household_shopping_lists`
      - Multiple lists support (weekly, party, etc.)
      - List templates

    - `household_grocery_list_items`
      - Enhanced grocery items with AI categorization
      - Link to meal plans
      - Recurring item support
      - Price tracking

    - `household_grocery_purchase_history`
      - Track purchase patterns
      - Smart suggestions based on history

  2. Enhancements
    - Auto-categorization engine
    - Meal plan integration
    - Smart quantity suggestions
    - Store layout optimization

  3. Security
    - Enable RLS on all tables
    - Household-based access control
*/

-- Grocery Templates (Common Items Library)
CREATE TABLE IF NOT EXISTS household_grocery_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  category text NOT NULL,
  typical_quantity text,
  keywords text[], -- For auto-matching
  purchase_frequency_days int, -- Average days between purchases
  is_system_template boolean DEFAULT true,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grocery_templates_household ON household_grocery_templates(household_id);
CREATE INDEX IF NOT EXISTS idx_grocery_templates_keywords ON household_grocery_templates USING gin(keywords);

-- Pantry Management
CREATE TABLE IF NOT EXISTS household_pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL,
  quantity text,
  unit text,
  expiration_date date,
  location text, -- fridge, pantry, freezer
  notes text,
  added_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pantry_household ON household_pantry_items(household_id);
CREATE INDEX IF NOT EXISTS idx_pantry_expiration ON household_pantry_items(expiration_date);

-- Shopping Lists (Multiple Lists Support)
CREATE TABLE IF NOT EXISTS household_shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  list_name text NOT NULL,
  list_type text DEFAULT 'regular', -- regular, party, weekly, monthly
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_household ON household_shopping_lists(household_id);

-- Enhanced Grocery List Items
DROP TABLE IF EXISTS household_grocery_list;

CREATE TABLE household_grocery_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  shopping_list_id uuid REFERENCES household_shopping_lists(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity text,
  unit text,
  category text NOT NULL,
  auto_categorized boolean DEFAULT false,
  checked boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  recurrence_days int, -- Auto-add every X days
  last_purchased_date timestamptz,
  estimated_price numeric(10, 2),
  notes text,
  source text, -- manual, meal_plan, pantry, recurring
  meal_plan_id uuid, -- Link to meal planner
  added_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  added_by_name text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grocery_items_household ON household_grocery_list_items(household_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_list ON household_grocery_list_items(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_checked ON household_grocery_list_items(checked);
CREATE INDEX IF NOT EXISTS idx_grocery_items_recurring ON household_grocery_list_items(is_recurring);

-- Purchase History for Smart Suggestions
CREATE TABLE IF NOT EXISTS household_grocery_purchase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL,
  quantity text,
  price numeric(10, 2),
  purchased_date timestamptz DEFAULT now(),
  purchased_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  store_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_history_household ON household_grocery_purchase_history(household_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_item ON household_grocery_purchase_history(item_name);
CREATE INDEX IF NOT EXISTS idx_purchase_history_date ON household_grocery_purchase_history(purchased_date);

-- Store Layout Customization
CREATE TABLE IF NOT EXISTS household_store_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  category_order jsonb NOT NULL DEFAULT '[]', -- Array of categories in store order
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_layouts_household ON household_store_layouts(household_id);

-- Seed System Templates (Common Grocery Items)
INSERT INTO household_grocery_templates (item_name, category, typical_quantity, keywords, purchase_frequency_days, is_system_template, household_id)
VALUES
  -- Produce
  ('Bananas', 'produce', '1 bunch', ARRAY['banana', 'fruit'], 7, true, null),
  ('Apples', 'produce', '1 bag', ARRAY['apple', 'fruit'], 7, true, null),
  ('Lettuce', 'produce', '1 head', ARRAY['lettuce', 'salad', 'greens'], 7, true, null),
  ('Tomatoes', 'produce', '1 lb', ARRAY['tomato', 'vegetable'], 7, true, null),
  ('Carrots', 'produce', '1 bag', ARRAY['carrot', 'vegetable'], 14, true, null),
  ('Onions', 'produce', '1 bag', ARRAY['onion'], 14, true, null),
  ('Potatoes', 'produce', '5 lbs', ARRAY['potato', 'spud'], 14, true, null),
  ('Broccoli', 'produce', '1 bunch', ARRAY['broccoli', 'vegetable'], 7, true, null),
  ('Spinach', 'produce', '1 bunch', ARRAY['spinach', 'greens'], 7, true, null),
  ('Bell Peppers', 'produce', '3 pack', ARRAY['pepper', 'bell pepper', 'vegetable'], 7, true, null),

  -- Dairy
  ('Milk', 'dairy', '1 gallon', ARRAY['milk', 'dairy'], 7, true, null),
  ('Eggs', 'dairy', '1 dozen', ARRAY['egg', 'eggs'], 7, true, null),
  ('Butter', 'dairy', '1 lb', ARRAY['butter'], 14, true, null),
  ('Cheese', 'dairy', '1 block', ARRAY['cheese', 'cheddar'], 14, true, null),
  ('Yogurt', 'dairy', '4 pack', ARRAY['yogurt'], 7, true, null),
  ('Sour Cream', 'dairy', '1 container', ARRAY['sour cream'], 14, true, null),
  ('Cream Cheese', 'dairy', '1 pack', ARRAY['cream cheese'], 14, true, null),

  -- Meat & Seafood
  ('Chicken Breast', 'meat', '2 lbs', ARRAY['chicken', 'breast', 'meat'], 7, true, null),
  ('Ground Beef', 'meat', '1 lb', ARRAY['beef', 'ground beef', 'meat'], 7, true, null),
  ('Salmon', 'meat', '1 lb', ARRAY['salmon', 'fish'], 7, true, null),
  ('Bacon', 'meat', '1 pack', ARRAY['bacon', 'pork'], 14, true, null),

  -- Bakery
  ('Bread', 'bakery', '1 loaf', ARRAY['bread', 'loaf'], 7, true, null),
  ('Bagels', 'bakery', '6 pack', ARRAY['bagel'], 7, true, null),
  ('Tortillas', 'bakery', '1 pack', ARRAY['tortilla', 'wrap'], 14, true, null),

  -- Pantry
  ('Rice', 'pantry', '2 lbs', ARRAY['rice'], 30, true, null),
  ('Pasta', 'pantry', '1 box', ARRAY['pasta', 'noodle'], 30, true, null),
  ('Canned Beans', 'pantry', '4 cans', ARRAY['beans', 'canned'], 30, true, null),
  ('Canned Tomatoes', 'pantry', '2 cans', ARRAY['tomato', 'canned'], 30, true, null),
  ('Olive Oil', 'pantry', '1 bottle', ARRAY['oil', 'olive oil'], 60, true, null),
  ('Salt', 'pantry', '1 container', ARRAY['salt'], 90, true, null),
  ('Pepper', 'pantry', '1 container', ARRAY['pepper', 'black pepper'], 90, true, null),
  ('Sugar', 'pantry', '1 bag', ARRAY['sugar'], 60, true, null),
  ('Flour', 'pantry', '5 lbs', ARRAY['flour'], 60, true, null),

  -- Frozen
  ('Frozen Vegetables', 'frozen', '1 bag', ARRAY['frozen', 'vegetable'], 14, true, null),
  ('Ice Cream', 'frozen', '1 container', ARRAY['ice cream', 'dessert'], 14, true, null),
  ('Frozen Pizza', 'frozen', '1 box', ARRAY['pizza', 'frozen'], 14, true, null),

  -- Beverages
  ('Orange Juice', 'beverages', '1 carton', ARRAY['juice', 'orange juice'], 7, true, null),
  ('Coffee', 'beverages', '1 bag', ARRAY['coffee'], 30, true, null),
  ('Tea', 'beverages', '1 box', ARRAY['tea'], 30, true, null),
  ('Soda', 'beverages', '12 pack', ARRAY['soda', 'pop'], 14, true, null),
  ('Water', 'beverages', '24 pack', ARRAY['water', 'bottled water'], 14, true, null),

  -- Snacks
  ('Chips', 'snacks', '1 bag', ARRAY['chips', 'potato chips'], 7, true, null),
  ('Crackers', 'snacks', '1 box', ARRAY['crackers'], 14, true, null),
  ('Cookies', 'snacks', '1 pack', ARRAY['cookies'], 14, true, null),
  ('Granola Bars', 'snacks', '1 box', ARRAY['granola', 'bars'], 14, true, null),

  -- Household
  ('Paper Towels', 'household', '4 pack', ARRAY['paper towels'], 30, true, null),
  ('Toilet Paper', 'household', '12 pack', ARRAY['toilet paper', 'tp'], 30, true, null),
  ('Dish Soap', 'household', '1 bottle', ARRAY['dish soap', 'soap'], 30, true, null),
  ('Laundry Detergent', 'household', '1 bottle', ARRAY['detergent', 'laundry'], 60, true, null),
  ('Trash Bags', 'household', '1 box', ARRAY['trash bags', 'garbage bags'], 30, true, null)
ON CONFLICT DO NOTHING;

-- Function to auto-categorize items
CREATE OR REPLACE FUNCTION auto_categorize_grocery_item(item_name_input text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  matched_category text;
BEGIN
  -- Try to match against templates using keywords
  SELECT category INTO matched_category
  FROM household_grocery_templates
  WHERE is_system_template = true
    AND (
      LOWER(item_name) = LOWER(item_name_input)
      OR item_name_input ILIKE '%' || item_name || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(keywords) k
        WHERE LOWER(item_name_input) LIKE '%' || LOWER(k) || '%'
      )
    )
  LIMIT 1;

  IF matched_category IS NOT NULL THEN
    RETURN matched_category;
  END IF;

  -- Default to 'other' if no match
  RETURN 'other';
END;
$$;

-- Function to get smart suggestions based on purchase history
CREATE OR REPLACE FUNCTION get_smart_grocery_suggestions(household_id_input uuid, limit_count int DEFAULT 10)
RETURNS TABLE(
  item_name text,
  category text,
  typical_quantity text,
  days_since_last_purchase int,
  purchase_frequency int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.item_name,
    h.category,
    h.quantity as typical_quantity,
    EXTRACT(DAY FROM now() - MAX(h.purchased_date))::int as days_since_last_purchase,
    COALESCE(
      AVG(EXTRACT(DAY FROM h.purchased_date - LAG(h.purchased_date) OVER (PARTITION BY h.item_name ORDER BY h.purchased_date)))::int,
      14
    ) as purchase_frequency
  FROM household_grocery_purchase_history h
  WHERE h.household_id = household_id_input
  GROUP BY h.item_name, h.category, h.quantity
  HAVING EXTRACT(DAY FROM now() - MAX(h.purchased_date))::int >=
    COALESCE(
      AVG(EXTRACT(DAY FROM h.purchased_date - LAG(h.purchased_date) OVER (PARTITION BY h.item_name ORDER BY h.purchased_date)))::int,
      14
    )
  ORDER BY days_since_last_purchase DESC
  LIMIT limit_count;
END;
$$;

-- Enable RLS
ALTER TABLE household_grocery_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_grocery_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_grocery_purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_store_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Templates
CREATE POLICY "Anyone can view system templates"
  ON household_grocery_templates FOR SELECT
  TO authenticated
  USING (is_system_template = true OR household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Household members can manage custom templates"
  ON household_grocery_templates FOR ALL
  TO authenticated
  USING (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

-- RLS Policies for Pantry
CREATE POLICY "Household members can view pantry"
  ON household_pantry_items FOR SELECT
  TO authenticated
  USING (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Household members can manage pantry"
  ON household_pantry_items FOR ALL
  TO authenticated
  USING (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

-- RLS Policies for Shopping Lists
CREATE POLICY "Household members can view shopping lists"
  ON household_shopping_lists FOR SELECT
  TO authenticated
  USING (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Household members can manage shopping lists"
  ON household_shopping_lists FOR ALL
  TO authenticated
  USING (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

-- RLS Policies for List Items
CREATE POLICY "Household members can view list items"
  ON household_grocery_list_items FOR SELECT
  TO authenticated
  USING (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Household members can manage list items"
  ON household_grocery_list_items FOR ALL
  TO authenticated
  USING (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

-- RLS Policies for Purchase History
CREATE POLICY "Household members can view purchase history"
  ON household_grocery_purchase_history FOR SELECT
  TO authenticated
  USING (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Household members can add purchase history"
  ON household_grocery_purchase_history FOR INSERT
  TO authenticated
  WITH CHECK (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

-- RLS Policies for Store Layouts
CREATE POLICY "Household members can view store layouts"
  ON household_store_layouts FOR SELECT
  TO authenticated
  USING (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Household members can manage store layouts"
  ON household_store_layouts FOR ALL
  TO authenticated
  USING (household_id IN (
    SELECT household_id FROM household_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  ));
