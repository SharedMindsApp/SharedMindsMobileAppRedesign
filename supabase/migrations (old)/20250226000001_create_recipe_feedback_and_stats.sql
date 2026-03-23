/*
  # Recipe Generator System - Phase 6: Learning & Analytics
  
  1. Creates recipe_feedback table:
     - User feedback with optional ratings, tags, and notes
     - Soft, optional feedback (no pressure)
     - Positive-first design
  
  2. Creates recipe_usage_stats table:
     - Tracks usage metrics (views, favorites, added to plans)
     - Aggregated statistics for popularity calculation
     - Time-based tracking for trends
  
  3. Sets up RLS policies
  
  4. Security
    - RLS enabled on all tables
    - Users can view aggregate stats, only edit their own feedback
*/

-- ============================================
-- 1. CREATE RECIPE FEEDBACK TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recipe_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- User Context
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  
  -- Optional Rating (1-5, nullable - no pressure)
  rating int CHECK (rating >= 1 AND rating <= 5),
  
  -- Soft Feedback Tags (optional, multiple)
  feedback_tags text[], -- 'worked_well', 'too_complex', 'too_simple', 'loved_it', 'will_make_again', 'quick_and_easy', 'needed_help', 'family_favorite'
  
  -- Free-form Notes (optional)
  notes text,
  
  -- Context (when feedback was given)
  made_on_date date, -- When user actually made the recipe
  made_with_modifications boolean DEFAULT false,
  modifications_notes text, -- What they changed
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One feedback per user per recipe (can update)
  UNIQUE(recipe_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_feedback_recipe_id ON recipe_feedback(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_feedback_user_id ON recipe_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_feedback_rating ON recipe_feedback(recipe_id, rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipe_feedback_tags ON recipe_feedback USING gin(feedback_tags);

-- ============================================
-- 2. CREATE RECIPE USAGE STATS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recipe_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Usage Counts (aggregated)
  times_added_to_plan int DEFAULT 0, -- How many times added to meal_plans
  times_viewed int DEFAULT 0, -- Recipe detail views
  times_favorited int DEFAULT 0, -- Added to meal_favourites (when Phase 7 adds recipe_id support)
  times_made int DEFAULT 0, -- Explicitly marked as "made" (from feedback)
  times_shared int DEFAULT 0, -- Shared with other households/users
  
  -- Time-based Tracking
  last_added_to_plan timestamptz,
  last_viewed timestamptz,
  last_favorited timestamptz,
  last_made timestamptz,
  
  -- Household-specific Stats (optional, for personalization)
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  
  -- Period Tracking (for trend analysis)
  period_start date, -- Start of period (e.g., week start, month start)
  period_type text DEFAULT 'all_time' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  
  -- Computed Metrics
  popularity_score numeric(10,2) DEFAULT 0, -- Calculated: weighted combination of usage metrics
  trend_direction text CHECK (trend_direction IN ('up', 'down', 'stable')), -- Computed from period comparison
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraint: one stat record per recipe per household per period
  UNIQUE(recipe_id, household_id, period_start, period_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_stats_recipe_id ON recipe_usage_stats(recipe_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_household_id ON recipe_usage_stats(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_stats_popularity ON recipe_usage_stats(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_usage_stats_period ON recipe_usage_stats(period_start DESC, period_type);

-- ============================================
-- 3. ENABLE RLS
-- ============================================

ALTER TABLE recipe_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_usage_stats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Recipe Feedback Policies
CREATE POLICY "Users can view feedback for accessible recipes"
  ON recipe_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_feedback.recipe_id
      AND r.deleted_at IS NULL
      AND (
        (r.is_public = true AND r.household_id IS NULL)
        OR (r.household_id IS NOT NULL AND is_user_personal_space(r.household_id))
        OR (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
        OR (r.created_by = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create their own feedback"
  ON recipe_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_feedback.recipe_id
      AND r.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can update their own feedback"
  ON recipe_feedback FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own feedback"
  ON recipe_feedback FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Recipe Usage Stats Policies (mostly read-only, updates via triggers/app logic)
CREATE POLICY "Users can view usage stats for accessible recipes"
  ON recipe_usage_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_usage_stats.recipe_id
      AND r.deleted_at IS NULL
      AND (
        (r.is_public = true AND r.household_id IS NULL)
        OR (r.household_id IS NOT NULL AND is_user_personal_space(r.household_id))
        OR (r.household_id IS NOT NULL AND is_user_household_member(r.household_id))
        OR (r.created_by = auth.uid())
      )
    )
  );

CREATE POLICY "System can insert usage stats"
  ON recipe_usage_stats FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Updates happen via triggers/app logic

CREATE POLICY "System can update usage stats"
  ON recipe_usage_stats FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true); -- Updates happen via triggers/app logic

-- ============================================
-- 5. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_recipe_feedback_updated_at
  BEFORE UPDATE ON recipe_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_usage_stats_updated_at
  BEFORE UPDATE ON recipe_usage_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. HELPER FUNCTION: GET OR CREATE USAGE STATS
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_usage_stats(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL,
  p_period_type text DEFAULT 'all_time',
  p_period_start date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  stats_id uuid;
  period_start_date date;
BEGIN
  -- Determine period_start
  IF p_period_start IS NOT NULL THEN
    period_start_date := p_period_start;
  ELSIF p_period_type = 'daily' THEN
    period_start_date := CURRENT_DATE;
  ELSIF p_period_type = 'weekly' THEN
    period_start_date := DATE_TRUNC('week', CURRENT_DATE)::date;
  ELSIF p_period_type = 'monthly' THEN
    period_start_date := DATE_TRUNC('month', CURRENT_DATE)::date;
  ELSE
    period_start_date := NULL; -- all_time
  END IF;

  -- Try to get existing stats
  SELECT id INTO stats_id
  FROM recipe_usage_stats
  WHERE recipe_id = p_recipe_id
    AND (household_id = p_household_id OR (household_id IS NULL AND p_household_id IS NULL))
    AND period_type = p_period_type
    AND (period_start = period_start_date OR (period_start IS NULL AND period_start_date IS NULL));

  -- Create if doesn't exist
  IF stats_id IS NULL THEN
    INSERT INTO recipe_usage_stats (
      recipe_id,
      household_id,
      period_type,
      period_start
    )
    VALUES (
      p_recipe_id,
      p_household_id,
      p_period_type,
      period_start_date
    )
    RETURNING id INTO stats_id;
  END IF;

  RETURN stats_id;
END;
$$;

-- ============================================
-- 7. STATS UPDATE FUNCTIONS
-- ============================================

-- Function to increment recipe view count
CREATE OR REPLACE FUNCTION increment_recipe_view(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  stats_id uuid;
BEGIN
  -- Get or create all_time stats
  stats_id := get_or_create_usage_stats(p_recipe_id, p_household_id, 'all_time', NULL);
  
  -- Update view count
  UPDATE recipe_usage_stats
  SET 
    times_viewed = times_viewed + 1,
    last_viewed = now(),
    updated_at = now()
  WHERE id = stats_id;
END;
$$;

-- Function to increment recipe added to plan count
-- Note: This will work fully when meal_plans.recipe_id is added in Phase 7
-- For now, this can be called manually from application code when recipes are added
CREATE OR REPLACE FUNCTION increment_recipe_added_to_plan(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  stats_id uuid;
BEGIN
  -- Get or create all_time stats
  stats_id := get_or_create_usage_stats(p_recipe_id, p_household_id, 'all_time', NULL);
  
  -- Update added to plan count
  UPDATE recipe_usage_stats
  SET 
    times_added_to_plan = times_added_to_plan + 1,
    last_added_to_plan = now(),
    updated_at = now()
  WHERE id = stats_id;
  
  -- Recalculate popularity
  PERFORM calculate_recipe_popularity(p_recipe_id, p_household_id);
END;
$$;

-- Function to increment recipe favorited count
-- Note: This will work fully when meal_favourites.recipe_id is added in Phase 7
CREATE OR REPLACE FUNCTION increment_recipe_favorited(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  stats_id uuid;
BEGIN
  -- Get or create all_time stats
  stats_id := get_or_create_usage_stats(p_recipe_id, p_household_id, 'all_time', NULL);
  
  -- Update favorited count
  UPDATE recipe_usage_stats
  SET 
    times_favorited = times_favorited + 1,
    last_favorited = now(),
    updated_at = now()
  WHERE id = stats_id;
  
  -- Recalculate popularity
  PERFORM calculate_recipe_popularity(p_recipe_id, p_household_id);
END;
$$;

-- Function to increment recipe made count (from feedback)
CREATE OR REPLACE FUNCTION increment_recipe_made(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  stats_id uuid;
BEGIN
  -- Get or create all_time stats
  stats_id := get_or_create_usage_stats(p_recipe_id, p_household_id, 'all_time', NULL);
  
  -- Update made count
  UPDATE recipe_usage_stats
  SET 
    times_made = times_made + 1,
    last_made = now(),
    updated_at = now()
  WHERE id = stats_id;
  
  -- Recalculate popularity
  PERFORM calculate_recipe_popularity(p_recipe_id, p_household_id);
END;
$$;

-- ============================================
-- 8. POPULARITY SCORE CALCULATION
-- ============================================

-- Function to calculate popularity score for a recipe
-- Formula: weighted usage metrics / (1 + days_since_creation) with recency weighting
CREATE OR REPLACE FUNCTION calculate_recipe_popularity(
  p_recipe_id uuid,
  p_household_id uuid DEFAULT NULL
)
RETURNS numeric(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  recipe_created_at timestamptz;
  days_since_creation numeric;
  usage_stats recipe_usage_stats%ROWTYPE;
  popularity numeric(10,2);
  base_score numeric(10,2);
  recency_factor numeric(5,2);
  avg_rating numeric(3,2);
  rating_count int;
  feedback_boost numeric(5,2);
BEGIN
  -- Get recipe creation date
  SELECT created_at INTO recipe_created_at
  FROM recipes
  WHERE id = p_recipe_id;
  
  IF recipe_created_at IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate days since creation
  days_since_creation := EXTRACT(EPOCH FROM (now() - recipe_created_at)) / 86400.0;
  
  -- Get usage stats
  SELECT * INTO usage_stats
  FROM recipe_usage_stats
  WHERE recipe_id = p_recipe_id
    AND (household_id = p_household_id OR (household_id IS NULL AND p_household_id IS NULL))
    AND period_type = 'all_time'
    AND period_start IS NULL;
  
  IF usage_stats.id IS NULL THEN
    -- Create stats if doesn't exist
    PERFORM get_or_create_usage_stats(p_recipe_id, p_household_id, 'all_time', NULL);
    
    -- Try again
    SELECT * INTO usage_stats
    FROM recipe_usage_stats
    WHERE recipe_id = p_recipe_id
      AND (household_id = p_household_id OR (household_id IS NULL AND p_household_id IS NULL))
      AND period_type = 'all_time'
      AND period_start IS NULL;
  END IF;
  
  -- Get average rating from feedback (if available)
  SELECT AVG(rating::numeric), COUNT(*)
  INTO avg_rating, rating_count
  FROM recipe_feedback
  WHERE recipe_id = p_recipe_id
    AND rating IS NOT NULL;
  
  -- Feedback boost: average rating (1-5) * 2, weighted by number of ratings
  -- More ratings = more reliable, so weight by min(rating_count, 10) / 10
  IF avg_rating IS NOT NULL AND rating_count > 0 THEN
    feedback_boost := avg_rating * 2.0 * LEAST(rating_count::numeric / 10.0, 1.0);
  ELSE
    feedback_boost := 0;
  END IF;
  
  -- Calculate base score with weights
  -- Weights: added_to_plan=3, favorited=5, made=10, viewed=0.5, shared=2, feedback=variable
  base_score := 
    (COALESCE(usage_stats.times_added_to_plan, 0) * 3.0) +
    (COALESCE(usage_stats.times_favorited, 0) * 5.0) +
    (COALESCE(usage_stats.times_made, 0) * 10.0) +
    (COALESCE(usage_stats.times_viewed, 0) * 0.5) +
    (COALESCE(usage_stats.times_shared, 0) * 2.0) +
    feedback_boost;
  
  -- Recency factor: newer recipes get slight boost (decay over time)
  -- Formula: 1.0 for 0-7 days, 0.8 for 8-30 days, 0.6 for 31-90 days, 0.4 for 90+ days
  IF days_since_creation <= 7 THEN
    recency_factor := 1.0;
  ELSIF days_since_creation <= 30 THEN
    recency_factor := 0.8;
  ELSIF days_since_creation <= 90 THEN
    recency_factor := 0.6;
  ELSE
    recency_factor := 0.4;
  END IF;
  
  -- Calculate popularity: base_score * recency_factor / (1 + days_since_creation^0.5)
  -- The square root of days prevents very old recipes from being completely deprecated
  popularity := (base_score * recency_factor) / (1 + POWER(days_since_creation, 0.5));
  
  -- Update popularity score in stats
  UPDATE recipe_usage_stats
  SET 
    popularity_score = popularity,
    updated_at = now()
  WHERE id = usage_stats.id;
  
  RETURN popularity;
END;
$$;

-- Trigger to update popularity when feedback is created (if made)
CREATE OR REPLACE FUNCTION update_stats_on_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If feedback indicates recipe was made, increment times_made
  IF NEW.made_on_date IS NOT NULL OR NEW.made_with_modifications = true THEN
    PERFORM increment_recipe_made(NEW.recipe_id, NEW.household_id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_stats_on_feedback_insert
  AFTER INSERT ON recipe_feedback
  FOR EACH ROW
  WHEN (NEW.made_on_date IS NOT NULL OR NEW.made_with_modifications = true)
  EXECUTE FUNCTION update_stats_on_feedback();
