# Recipe Generator Database Design Brief

**Version:** 1.0  
**Date:** 2025-02-23  
**Status:** Design Phase

---

## 1. System Overview

### 1.1 High-Level Architecture

The Recipe Generator System is an intelligent, self-evolving recipe management platform that seamlessly integrates with the existing Meal Planner and Pantry systems. It supports multiple recipe sources (AI generation, web scraping, user creation, external APIs) while maintaining a single source of truth for recipe data and ensuring pantry-aware intelligence.

### 1.2 Core Relationships

```
┌─────────────────┐
│  Recipe System  │
│  (New Tables)   │
└────────┬────────┘
         │
         ├─── References ───> food_items (canonical)
         │
         ├─── Integrates ───> meal_library (existing, v1)
         │
         ├─── Powers ───> meal_plans (existing)
         │
         └─── Uses ───> household_pantry_items (existing)
```

**Key Integration Points:**
- **Pantry Intelligence**: Recipes reference `food_item_id` for pantry-aware matching
- **Meal Planner**: Recipes can be added to `meal_plans` via existing `meal_id` foreign key
- **Food Items**: All ingredients must reference canonical `food_items` table
- **Spaces**: Recipes respect `household_id` / personal space boundaries via RLS

### 1.3 Data Separation Principles

The system maintains clear separation between:

1. **Recipe Data** (Core recipe entity)
   - Canonical recipe information
   - Ingredients, instructions, metadata
   - Source-agnostic structure

2. **Recipe Intelligence** (Metadata & Learning)
   - Generation jobs and AI context
   - Validation status and quality signals
   - Usage statistics and feedback
   - Duplicate detection and merge tracking

3. **User Interaction Signals** (Behavioral Data)
   - Favourites, repeats, ratings
   - Soft feedback ("worked well", "too complex")
   - Usage frequency and patterns

---

## 2. Core Tables

**Table Overview:**
1. `recipes` - Canonical recipe entity
2. `recipe_versions` - Version history & AI regeneration
3. `recipe_sources` - Source provenance
4. `recipe_generation_jobs` - AI generation pipeline
5. `recipe_feedback` - User feedback & learning
6. `recipe_usage_stats` - Usage analytics
7. `recipe_validation_status` - Quality assurance
8. `recipe_duplicates` - Duplicate detection & merge tracking

### 2.1 `recipes` (Canonical Recipe Entity)

**Purpose:** The primary recipe table storing canonical recipe data. This is the source of truth for all recipe information, regardless of origin (AI, user, scrape, API).

**Key Design Decisions:**
- **JSONB for ingredients**: Flexible structure while maintaining `food_item_id` references
- **Nullable nutrition fields**: No calorie enforcement (ADHD-first principle)
- **Source tracking**: Links to `recipe_sources` for provenance
- **Versioning**: Current active version tracked via `current_version_id`

**Schema:**

```sql
CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Recipe Data
  name text NOT NULL,
  description text, -- Optional description/notes
  meal_type meal_type NOT NULL, -- breakfast, lunch, dinner, snack
  servings int DEFAULT 4,
  
  -- Ingredients (JSONB array)
  -- Structure: [{ food_item_id: uuid, quantity: text, unit: text, optional: boolean, notes: text }]
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Instructions
  instructions text, -- Full recipe instructions
  instructions_structured jsonb, -- Optional: step-by-step structured format
  
  -- Metadata
  categories meal_category[] DEFAULT '{}',
  cuisine cuisine_type,
  difficulty cooking_difficulty DEFAULT 'medium',
  prep_time int, -- minutes
  cook_time int, -- minutes
  total_time int, -- calculated: prep_time + cook_time
  
  -- Nutrition (all nullable - no enforcement)
  calories int,
  protein int, -- grams
  carbs int, -- grams
  fat int, -- grams
  fiber int, -- grams
  sodium int, -- mg
  
  -- Dietary Information
  allergies text[] DEFAULT '{}', -- gluten, dairy, nuts, etc.
  dietary_tags text[] DEFAULT '{}', -- vegetarian, vegan, keto, etc.
  
  -- Media
  image_url text,
  image_urls text[], -- Multiple images support
  
  -- Source & Provenance
  source_id uuid REFERENCES recipe_sources(id) ON DELETE SET NULL,
  source_type text NOT NULL, -- 'ai', 'user', 'scrape', 'api', 'import'
  source_url text, -- Original URL if scraped/imported
  
  -- Versioning
  current_version_id uuid REFERENCES recipe_versions(id) ON DELETE SET NULL,
  version_count int DEFAULT 1,
  
  -- Validation & Quality
  validation_status text DEFAULT 'draft', -- 'draft', 'pending', 'approved', 'deprecated'
  validation_notes text, -- Human or AI validation notes
  quality_score numeric(3,2), -- 0.00 to 1.00, calculated from usage/feedback
  
  -- Ownership & Access
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE, -- null = global/public
  is_public boolean DEFAULT false, -- Public recipes available to all households
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz, -- When recipe was first published/approved
  
  -- Soft Delete
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX idx_recipes_household_id ON recipes(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_created_by ON recipes(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_meal_type ON recipes(meal_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_validation_status ON recipes(validation_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_is_public ON recipes(is_public) WHERE deleted_at IS NULL AND is_public = true;
CREATE INDEX idx_recipes_quality_score ON recipes(quality_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_source_type ON recipes(source_type) WHERE deleted_at IS NULL;

-- GIN index for JSONB ingredients (for pantry matching queries)
CREATE INDEX idx_recipes_ingredients_gin ON recipes USING gin(ingredients);

-- Full-text search index
CREATE INDEX idx_recipes_name_trgm ON recipes USING gin(name gin_trgm_ops);
```

**JSONB Ingredients Structure:**
```json
[
  {
    "food_item_id": "uuid",
    "quantity": "2",
    "unit": "cups",
    "optional": false,
    "notes": "chopped",
    "substitutions": ["uuid-other-food-item-id"]
  },
  {
    "food_item_id": "uuid",
    "quantity": "1",
    "unit": "tbsp",
    "optional": true,
    "notes": "for garnish"
  }
]
```

**Key Constraints:**
- All ingredients MUST reference `food_item_id` (no string-only ingredients)
- `optional` field defaults to `false`
- `substitutions` array contains alternative `food_item_id` values

---

### 2.2 `recipe_versions` (Version History & AI Regeneration)

**Purpose:** Tracks version history for recipes, enabling AI regeneration, user edits, and recipe evolution over time. Supports "undo" functionality and recipe improvement tracking.

**Key Design Decisions:**
- **Immutable versions**: Once created, versions are never modified
- **Current version pointer**: `recipes.current_version_id` points to active version
- **Diff tracking**: Store full recipe data per version (simpler than diff storage)
- **AI regeneration context**: Store prompt/context that generated this version

**Schema:**

```sql
CREATE TABLE recipe_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Version Metadata
  version_number int NOT NULL, -- 1, 2, 3, etc.
  parent_version_id uuid REFERENCES recipe_versions(id) ON DELETE SET NULL, -- For branching
  
  -- Full Recipe Snapshot (at time of version creation)
  -- Mirrors recipes table structure for this version
  name text NOT NULL,
  description text,
  meal_type meal_type NOT NULL,
  servings int,
  ingredients jsonb NOT NULL,
  instructions text,
  instructions_structured jsonb,
  categories meal_category[],
  cuisine cuisine_type,
  difficulty cooking_difficulty,
  prep_time int,
  cook_time int,
  total_time int,
  calories int,
  protein int,
  carbs int,
  fat int,
  allergies text[],
  dietary_tags text[],
  image_url text,
  image_urls text[],
  
  -- Version-Specific Metadata
  change_reason text, -- 'ai_regeneration', 'user_edit', 'improvement', 'correction'
  change_notes text, -- Human-readable notes about what changed
  generated_by_job_id uuid REFERENCES recipe_generation_jobs(id) ON DELETE SET NULL, -- If AI-generated
  
  -- AI Context (if applicable)
  generation_prompt text, -- The prompt used to generate this version
  generation_context jsonb, -- Additional context (pantry state, preferences, etc.)
  
  -- Created By
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Version Comparison
  diff_summary jsonb, -- Optional: summary of changes from parent version
);

-- Indexes
CREATE INDEX idx_recipe_versions_recipe_id ON recipe_versions(recipe_id);
CREATE INDEX idx_recipe_versions_version_number ON recipe_versions(recipe_id, version_number DESC);
CREATE INDEX idx_recipe_versions_parent ON recipe_versions(parent_version_id) WHERE parent_version_id IS NOT NULL;
```

**Version Lifecycle:**
1. Recipe created → Version 1 created automatically
2. User edits recipe → New version created, `current_version_id` updated
3. AI regenerates recipe → New version created with `generated_by_job_id`
4. User can revert to previous version → Update `current_version_id` to older version

---

### 2.3 `recipe_sources` (Source Provenance)

**Purpose:** Tracks the origin and provenance of recipes, ensuring trust and safety. Prevents hallucinated ingredients by maintaining source validation.

**Key Design Decisions:**
- **Source-agnostic structure**: Same table for AI, scrape, user, API sources
- **Validation tracking**: Track whether source was validated
- **Metadata storage**: Store source-specific metadata in JSONB

**Schema:**

```sql
CREATE TABLE recipe_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source Type
  source_type text NOT NULL, -- 'ai', 'user', 'scrape', 'api', 'import'
  
  -- Source Identification
  source_name text, -- e.g., "AllRecipes", "User Creation", "OpenAI GPT-4"
  source_url text, -- Original URL if web source
  source_api_key text, -- Encrypted API key if external API (optional)
  
  -- Validation Status
  is_validated boolean DEFAULT false,
  validated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  validated_at timestamptz,
  validation_method text, -- 'human', 'automated', 'ai_confidence'
  
  -- Source Metadata (JSONB for flexibility)
  metadata jsonb DEFAULT '{}'::jsonb,
  -- Examples:
  -- For scrape: { "scraped_at": "2025-02-23", "scraper_version": "1.2", "confidence": 0.95 }
  -- For AI: { "model": "gpt-4", "temperature": 0.7, "max_tokens": 2000 }
  -- For API: { "api_provider": "spoonacular", "api_version": "v1" }
  
  -- Trust & Safety
  trust_score numeric(3,2) DEFAULT 0.5, -- 0.00 to 1.00
  requires_validation boolean DEFAULT false, -- Flag for sources that need human review
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_recipe_sources_type ON recipe_sources(source_type);
CREATE INDEX idx_recipe_sources_validated ON recipe_sources(is_validated) WHERE is_validated = false;
CREATE INDEX idx_recipe_sources_trust_score ON recipe_sources(trust_score DESC);
```

**Source Type Handling:**
- **AI**: `source_name` = model name, `metadata` contains generation parameters
- **Scrape**: `source_url` = original URL, `metadata` contains scraper info
- **User**: `source_name` = "User Creation", `is_validated` = true (user is source of truth)
- **API**: `source_name` = API provider, `metadata` contains API response data
- **Import**: `source_name` = import source, `metadata` contains import batch info

---

### 2.4 `recipe_generation_jobs` (AI Generation Pipeline)

**Purpose:** Tracks AI recipe generation jobs, storing prompts, context, and results. Enables job retry, debugging, and learning from generation patterns.

**Key Design Decisions:**
- **Job-based approach**: Each generation is a job with status tracking
- **Context storage**: Store full context (pantry state, preferences) for reproducibility
- **Result linking**: Link to created `recipe_id` and `recipe_version_id`
- **Error tracking**: Store errors for debugging and improvement

**Schema:**

```sql
CREATE TABLE recipe_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Job Status
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  priority int DEFAULT 5, -- 1 (highest) to 10 (lowest)
  
  -- Generation Request
  prompt text NOT NULL, -- User or system prompt
  prompt_type text, -- 'user_request', 'pantry_based', 'preference_based', 'improvement'
  context jsonb DEFAULT '{}'::jsonb,
  -- Context examples:
  -- { "pantry_items": ["food_item_id1", "food_item_id2"], "meal_type": "dinner", "preferences": {...} }
  -- { "base_recipe_id": "uuid", "improvement_notes": "make it faster" }
  
  -- Generation Parameters
  model_name text, -- 'gpt-4', 'claude-3', etc.
  temperature numeric(3,2),
  max_tokens int,
  generation_params jsonb DEFAULT '{}'::jsonb,
  
  -- Results
  generated_recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  generated_version_id uuid REFERENCES recipe_versions(id) ON DELETE SET NULL,
  raw_response jsonb, -- Full AI response for debugging
  
  -- Quality & Validation
  confidence_score numeric(3,2), -- AI's confidence in generation (0.00 to 1.00)
  requires_review boolean DEFAULT true, -- Flag for human review
  validation_status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  
  -- Error Handling
  error_message text,
  error_details jsonb,
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  
  -- Requestor
  requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz
);

-- Indexes
CREATE INDEX idx_generation_jobs_status ON recipe_generation_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_generation_jobs_requested_by ON recipe_generation_jobs(requested_by);
CREATE INDEX idx_generation_jobs_household_id ON recipe_generation_jobs(household_id);
CREATE INDEX idx_generation_jobs_created_at ON recipe_generation_jobs(created_at DESC);
CREATE INDEX idx_generation_jobs_validation ON recipe_generation_jobs(validation_status) WHERE validation_status = 'pending';
```

**Job Lifecycle:**
1. Job created with `status = 'pending'`
2. Worker picks up job, sets `status = 'processing'`, `started_at = now()`
3. AI generation occurs, result stored in `raw_response`
4. Recipe created, linked via `generated_recipe_id` and `generated_version_id`
5. Job set to `status = 'completed'`, `completed_at = now()`
6. If error: `status = 'failed'`, `error_message` populated, `retry_count++`

---

### 2.5 `recipe_feedback` (User Feedback & Learning)

**Purpose:** Captures soft, optional user feedback on recipes. No pressure metrics - all feedback is optional and positive-focused.

**Key Design Decisions:**
- **Soft feedback only**: No required ratings, no pressure
- **Positive-first**: Focus on what worked, not failures
- **Multiple feedback types**: Ratings, tags, free-form notes
- **Anonymous aggregation**: Feedback aggregated for learning, not individual tracking

**Schema:**

```sql
CREATE TABLE recipe_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- User Context
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  
  -- Optional Rating (1-5, nullable - no pressure)
  rating int CHECK (rating >= 1 AND rating <= 5),
  
  -- Soft Feedback Tags (optional, multiple)
  feedback_tags text[], -- 'worked_well', 'too_complex', 'too_simple', 'loved_it', 'will_make_again'
  
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
CREATE INDEX idx_recipe_feedback_recipe_id ON recipe_feedback(recipe_id);
CREATE INDEX idx_recipe_feedback_user_id ON recipe_feedback(user_id);
CREATE INDEX idx_recipe_feedback_rating ON recipe_feedback(recipe_id, rating) WHERE rating IS NOT NULL;
CREATE INDEX idx_recipe_feedback_tags ON recipe_feedback USING gin(feedback_tags);
```

**Feedback Tags (Predefined Set):**
- `worked_well` - Recipe turned out great
- `too_complex` - Too many steps or ingredients
- `too_simple` - Wanted more complexity
- `loved_it` - User loved this recipe
- `will_make_again` - User plans to make again
- `quick_and_easy` - Appreciated the simplicity
- `needed_help` - Required assistance or looked up techniques
- `family_favorite` - Household favorite

---

### 2.6 `recipe_usage_stats` (Usage Analytics)

**Purpose:** Tracks how recipes are used (added to meal plans, viewed, favorited) for learning and ranking. Aggregated statistics, not individual tracking.

**Key Design Decisions:**
- **Aggregated stats**: Store counts, not individual events
- **Time-based**: Track stats over time periods (daily, weekly, monthly)
- **Privacy-first**: No individual user tracking, only aggregates
- **Computed fields**: Some stats computed via triggers/materialized views

**Schema:**

```sql
CREATE TABLE recipe_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Usage Counts (aggregated)
  times_added_to_plan int DEFAULT 0, -- How many times added to meal_plans
  times_viewed int DEFAULT 0, -- Recipe detail views
  times_favorited int DEFAULT 0, -- Added to meal_favourites
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
  period_type text, -- 'daily', 'weekly', 'monthly', 'all_time'
  
  -- Computed Metrics
  popularity_score numeric(10,2) DEFAULT 0, -- Calculated: weighted combination of usage metrics
  trend_direction text, -- 'up', 'down', 'stable' (computed from period comparison)
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraint: one stat record per recipe per household per period
  UNIQUE(recipe_id, household_id, period_start, period_type)
);

-- Indexes
CREATE INDEX idx_usage_stats_recipe_id ON recipe_usage_stats(recipe_id);
CREATE INDEX idx_usage_stats_household_id ON recipe_usage_stats(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_usage_stats_popularity ON recipe_usage_stats(popularity_score DESC);
CREATE INDEX idx_usage_stats_period ON recipe_usage_stats(period_start DESC, period_type);
```

**Popularity Score Calculation:**
```sql
-- Example calculation (can be adjusted):
popularity_score = (
  times_added_to_plan * 3.0 +
  times_favorited * 5.0 +
  times_made * 10.0 +
  times_viewed * 0.5 +
  times_shared * 2.0
) / (1 + days_since_creation)
```

**Stats Update Strategy:**
- **Real-time triggers**: Update stats on `meal_plans` INSERT/UPDATE
- **Batch aggregation**: Daily job to compute period-based stats
- **Materialized views**: For complex queries (e.g., "trending recipes this week")

---

### 2.7 `recipe_validation_status` (Quality Assurance)

**Purpose:** Tracks validation and quality checks for recipes, especially AI-generated ones. Ensures no hallucinated ingredients and recipe accuracy.

**Key Design Decisions:**
- **Multi-stage validation**: Draft → Pending → Approved workflow
- **Automated + Human**: Both automated checks and human review
- **Validation rules**: Store validation rules and results
- **Non-blocking**: Validation doesn't block recipe usage, just flags quality

**Schema:**

```sql
CREATE TABLE recipe_validation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Validation Status
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'pending', 'approved', 'needs_review', 'deprecated'
  
  -- Validation Checks
  ingredient_validation jsonb DEFAULT '{}'::jsonb,
  -- Structure: { "all_ingredients_mapped": true, "unknown_ingredients": [], "warnings": [] }
  
  instruction_validation jsonb DEFAULT '{}'::jsonb,
  -- Structure: { "has_instructions": true, "step_count": 5, "completeness_score": 0.95 }
  
  nutrition_validation jsonb DEFAULT '{}'::jsonb,
  -- Structure: { "has_nutrition": false, "estimated": true, "source": "ai_estimate" }
  
  source_validation jsonb DEFAULT '{}'::jsonb,
  -- Structure: { "source_verified": true, "url_accessible": true, "trust_score": 0.8 }
  
  -- Overall Quality Score
  quality_score numeric(3,2), -- 0.00 to 1.00, computed from validation checks
  
  -- Validation Metadata
  validated_by uuid REFERENCES profiles(id) ON DELETE SET NULL, -- Human validator
  validated_at timestamptz,
  validation_method text, -- 'automated', 'human', 'hybrid'
  validation_notes text, -- Human notes about validation
  
  -- Automated Validation Results
  automated_checks jsonb DEFAULT '{}'::jsonb,
  -- Structure: { "check_name": "ingredient_mapping", "passed": true, "details": {...} }
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One validation record per recipe
  UNIQUE(recipe_id)
);

-- Indexes
CREATE INDEX idx_validation_status ON recipe_validation_status(status);
CREATE INDEX idx_validation_quality ON recipe_validation_status(quality_score DESC) WHERE status = 'approved';
CREATE INDEX idx_validation_needs_review ON recipe_validation_status(recipe_id) WHERE status = 'needs_review';
```

**Validation Workflow:**
1. **Draft**: New recipe created, automated checks run
2. **Pending**: Recipe passes automated checks, queued for human review (if needed)
3. **Approved**: Recipe validated and ready for use
4. **Needs Review**: Automated checks flagged issues, human review required
5. **Deprecated**: Recipe found to be inaccurate or unsafe

**Automated Validation Checks:**
- All ingredients have valid `food_item_id` references
- No unknown/unmapped ingredients
- Instructions are non-empty and reasonable length
- Nutrition data is within reasonable ranges (if provided)
- Source URL is accessible (if web source)
- No obvious hallucinations (ingredient quantities, cooking times)

---

## 3. Ingredient & Pantry Mapping Strategy

### 3.1 Food Item Reference Requirement

**Core Principle:** All recipe ingredients MUST reference `food_item_id` from the canonical `food_items` table. No string-only ingredients allowed.

**Rationale:**
- Enables pantry-aware matching ("What can I make?")
- Prevents ingredient duplication and inconsistency
- Supports substitution logic
- Enables accurate grocery list generation

### 3.2 Ingredient JSONB Structure

```json
{
  "food_item_id": "uuid-required",
  "quantity": "2",                    // Natural language or numeric
  "unit": "cups",                     // Standard unit
  "optional": false,                  // Default: false
  "notes": "chopped, fresh",          // Preparation notes
  "substitutions": [                  // Alternative food_item_ids
    "uuid-alternative-1",
    "uuid-alternative-2"
  ],
  "pantry_equivalent": "uuid"         // If ingredient maps to pantry item
}
```

### 3.3 Handling Optional Ingredients

**Design:**
- `optional: true` ingredients are excluded from "can I make this?" calculations
- Still shown in recipe, but marked visually as optional
- Pantry matching ignores optional ingredients when checking availability

**Example:**
```json
[
  {
    "food_item_id": "chicken-uuid",
    "quantity": "500",
    "unit": "g",
    "optional": false
  },
  {
    "food_item_id": "parsley-uuid",
    "quantity": "2",
    "unit": "tbsp",
    "optional": true,
    "notes": "for garnish"
  }
]
```

### 3.4 Substitution Logic

**Substitution Array:**
- Contains alternative `food_item_id` values that can replace the primary ingredient
- Used for pantry matching: if primary ingredient unavailable, check substitutions
- User can manually select substitutions when adding to meal plan

**Example:**
```json
{
  "food_item_id": "milk-uuid",
  "quantity": "1",
  "unit": "cup",
  "substitutions": [
    "almond-milk-uuid",
    "oat-milk-uuid",
    "soy-milk-uuid"
  ]
}
```

### 3.5 Pantry-Friendly Equivalents

**Pantry Mapping:**
- Some recipe ingredients map to pantry items (e.g., "fresh tomatoes" → "canned tomatoes")
- `pantry_equivalent` field stores the pantry-friendly `food_item_id`
- Used when checking "What can I make?" - if pantry has equivalent, recipe is available

**Example:**
```json
{
  "food_item_id": "fresh-tomatoes-uuid",
  "quantity": "4",
  "unit": "medium",
  "pantry_equivalent": "canned-tomatoes-uuid"
}
```

### 3.6 Avoiding Fragile String Matching

**Problem:** String matching ("tomato" vs "tomatoes" vs "fresh tomatoes") is fragile and error-prone.

**Solution:**
1. **Canonical Food Items**: All ingredients reference `food_items.id`
2. **Normalized Names**: `food_items.normalized_name` for matching
3. **Fuzzy Matching**: Use `pg_trgm` extension for ingredient name resolution during import
4. **AI-Assisted Mapping**: During scraping/AI generation, use AI to map ingredient names to `food_item_id`
5. **User Confirmation**: When mapping fails, prompt user to select correct `food_item_id`

**Ingestion Flow:**
```
Raw Ingredient String → Fuzzy Match → food_items.normalized_name → food_item_id
                                                      ↓
                                            If no match: Create new food_item
                                                      ↓
                                            User confirmation (optional)
```

---

## 4. AI Generation & Ingestion Flow

### 4.1 AI Generation Pipeline

**Flow:**
1. **User Request** → Create `recipe_generation_jobs` record with `status = 'pending'`
2. **Job Processing** → Worker picks up job, sets `status = 'processing'`
3. **Context Building** → Gather pantry items, preferences, meal type, dietary restrictions
4. **AI Call** → Send prompt + context to AI model, receive recipe JSON
5. **Ingredient Mapping** → Map AI ingredient strings to `food_item_id` (fuzzy match + AI assistance)
6. **Recipe Creation** → Create `recipes` record, `recipe_versions` record, link to job
7. **Validation** → Run automated validation checks, create `recipe_validation_status`
8. **Job Completion** → Update job `status = 'completed'`, link `generated_recipe_id`

**Error Handling:**
- If ingredient mapping fails → Flag recipe as `validation_status = 'needs_review'`
- If AI returns invalid JSON → Retry job (up to `max_retries`)
- If AI hallucinates ingredients → Automated check flags, human review required

### 4.2 Scraped Recipe Ingestion

**Flow:**
1. **URL Submission** → User or system submits recipe URL
2. **Scraping** → Extract recipe data (name, ingredients, instructions, etc.)
3. **Source Creation** → Create `recipe_sources` record with `source_type = 'scrape'`
4. **Ingredient Normalization** → Map scraped ingredient strings to `food_item_id`
5. **Recipe Creation** → Create `recipes` record with `source_id` pointing to scrape source
6. **Validation** → Verify source URL accessible, check for obvious errors
7. **Approval** → Recipe set to `validation_status = 'approved'` (if automated checks pass)

**LLM-Assisted Ingestion:**
- Use LLM to parse unstructured recipe text
- Extract structured data (ingredients, instructions, nutrition)
- Map ingredient names to `food_item_id` using LLM + fuzzy matching
- Handle variations in format (imperial vs metric, different units)

### 4.3 User-Created Recipes

**Flow:**
1. **User Input** → User provides recipe name, ingredients, instructions via UI
2. **Ingredient Selection** → User selects ingredients from `food_items` (no free text)
3. **Recipe Creation** → Create `recipes` record with `source_type = 'user'`
4. **Auto-Validation** → User-created recipes auto-approved (`validation_status = 'approved'`)
5. **Source Creation** → Create `recipe_sources` record with `source_name = 'User Creation'`

**User Trust:**
- User-created recipes are trusted (user is source of truth)
- No validation required (user knows what they're creating)
- Can be marked `is_public = true` to share with other households

### 4.4 Draft vs Approved Workflow

**Draft State:**
- New recipes start as `validation_status = 'draft'`
- Drafts are visible to creator/household only
- Can be edited, regenerated, or deleted freely

**Approval Process:**
- Automated validation checks run on draft
- If checks pass → `validation_status = 'approved'` (auto-approval)
- If checks fail → `validation_status = 'needs_review'` (human review)
- Approved recipes are visible to household (or public if `is_public = true`)

**Approved State:**
- Recipes can be used in meal plans
- Visible in recipe library searches
- Can still be edited (creates new version)

### 4.5 Hallucination Mitigation

**Strategies:**
1. **Ingredient Validation**: All ingredients must map to `food_item_id` - if mapping fails, flag for review
2. **Quantity Sanity Checks**: Flag unrealistic quantities (e.g., "100 cups of flour")
3. **Instruction Completeness**: Check that instructions are non-empty and reasonable length
4. **Source Verification**: For scraped recipes, verify source URL is accessible
5. **Human Review Queue**: Recipes with validation issues go to human review queue
6. **Confidence Scores**: AI generation jobs store `confidence_score` - low confidence triggers review
7. **User Feedback**: Users can report issues via `recipe_feedback` - flags recipe for re-validation

**Validation Rules:**
- ✅ All ingredients have valid `food_item_id`
- ✅ No unknown/unmapped ingredients
- ✅ Quantities are within reasonable ranges
- ✅ Instructions are complete and non-empty
- ✅ Cooking times are reasonable for meal type
- ✅ Source URL accessible (if web source)

---

## 5. Evolution & Learning Model (Non-ML)

### 5.1 Usage-Based Ranking

**Popularity Score Calculation:**
```sql
popularity_score = (
  times_added_to_plan * 3.0 +
  times_favorited * 5.0 +
  times_made * 10.0 +
  times_viewed * 0.5 +
  times_shared * 2.0
) / (1 + days_since_creation)
```

**Ranking Factors:**
- **Frequency**: How often recipe is added to meal plans
- **Favorites**: How many users favorited it
- **Completion**: How many times it was actually made
- **Recency**: Recent usage weighted higher
- **Household Context**: Recipes popular in user's household ranked higher

### 5.2 Feedback Integration

**Soft Feedback Influence:**
- `feedback_tags` like `loved_it`, `will_make_again` increase popularity score
- `feedback_tags` like `too_complex` decrease score for users who prefer simple recipes
- Ratings (if provided) influence ranking, but no pressure to rate

**Personalization:**
- Track user's preferred difficulty level, cuisine types, meal types
- Rank recipes higher if they match user's historical preferences
- Learn from `feedback_tags` to suggest similar recipes

### 5.3 Ingredient Availability Learning

**Pantry-Aware Suggestions:**
- Track which recipes users make when they have specific pantry items
- Suggest recipes based on current pantry state
- Learn ingredient combinations that work well together

**Substitution Learning:**
- Track which substitutions users make when adding recipes to meal plans
- Learn common substitution patterns (e.g., "almond milk" often replaces "milk")
- Improve substitution suggestions over time

### 5.4 Recipe Improvement Signals

**Improvement Triggers:**
1. **Low Usage**: Recipe rarely added to meal plans → Flag for improvement
2. **Negative Feedback**: Multiple `too_complex` or low ratings → Suggest simplification
3. **Ingredient Issues**: Users frequently substitute same ingredient → Update recipe
4. **Time Mismatch**: Users report prep time inaccurate → Update `prep_time` / `cook_time`

**Improvement Workflow:**
1. System flags recipe for improvement based on signals
2. Create `recipe_generation_jobs` with `prompt_type = 'improvement'`
3. AI regenerates recipe with improvements
4. New version created, user can choose to adopt or keep original

### 5.5 Recipe Merging & Deprecation

**Merging:**
- If multiple similar recipes exist (same name, similar ingredients), suggest merge
- User can merge recipes, keeping best version
- Deprecated recipes marked `validation_status = 'deprecated'`, hidden from searches

**Deprecation Reasons:**
- Recipe found to be inaccurate
- Merged into better version
- Source no longer accessible and recipe unverified
- User-reported issues that can't be resolved

---

### 5.6 Duplicate Detection & Handling

**Purpose:** Prevent duplicate recipes from cluttering the system, especially when recipes are generated from multiple sources (AI, scraping, user creation, imports). Provides intelligent duplicate detection and user-friendly merge workflows.

**Key Design Decisions:**
- **Multi-factor similarity**: Use name, ingredients, and instructions for duplicate detection
- **Fuzzy matching**: Account for variations in naming, ingredient quantities, and formatting
- **User control**: Always require user confirmation before merging (no auto-merge)
- **Preserve data**: Merged recipes retain history and can be unmerged
- **Source preservation**: Track which recipe was the "primary" and which were merged

#### 5.6.1 Duplicate Detection Table

**Schema:**

```sql
CREATE TABLE recipe_duplicates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Duplicate Relationship
  primary_recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  duplicate_recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Detection Metadata
  similarity_score numeric(5,4) NOT NULL, -- 0.0000 to 1.0000
  detection_method text NOT NULL, -- 'name_match', 'ingredient_match', 'combined', 'user_reported', 'ai_detected'
  detection_confidence text NOT NULL, -- 'high', 'medium', 'low'
  
  -- Similarity Breakdown (JSONB for detailed analysis)
  similarity_details jsonb DEFAULT '{}'::jsonb,
  -- Structure:
  -- {
  --   "name_similarity": 0.95,
  --   "ingredient_similarity": 0.88,
  --   "instruction_similarity": 0.72,
  --   "matching_ingredients": ["food_item_id1", "food_item_id2"],
  --   "name_variations": ["Chicken Curry", "Curry Chicken"]
  -- }
  
  -- Status
  status text NOT NULL DEFAULT 'detected', -- 'detected', 'pending_review', 'confirmed', 'merged', 'rejected', 'false_positive'
  
  -- Merge Decision
  merge_action text, -- 'merge', 'keep_separate', 'pending'
  merged_into_recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL, -- If merged, which recipe it merged into
  merged_at timestamptz,
  merged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- User Review
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  
  -- Timestamps
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CHECK (primary_recipe_id != duplicate_recipe_id),
  UNIQUE(primary_recipe_id, duplicate_recipe_id)
);

-- Indexes
CREATE INDEX idx_recipe_duplicates_primary ON recipe_duplicates(primary_recipe_id);
CREATE INDEX idx_recipe_duplicates_duplicate ON recipe_duplicates(duplicate_recipe_id);
CREATE INDEX idx_recipe_duplicates_status ON recipe_duplicates(status) WHERE status IN ('detected', 'pending_review');
CREATE INDEX idx_recipe_duplicates_similarity ON recipe_duplicates(similarity_score DESC) WHERE status = 'detected';
CREATE INDEX idx_recipe_duplicates_merged_into ON recipe_duplicates(merged_into_recipe_id) WHERE merged_into_recipe_id IS NOT NULL;
```

#### 5.6.2 Duplicate Detection Strategies

**Strategy 1: Name-Based Similarity**

**Algorithm:**
1. Normalize recipe names (lowercase, remove punctuation, trim)
2. Use trigram similarity (`pg_trgm`) to compute name similarity
3. Threshold: `similarity >= 0.85` → potential duplicate

**Example:**
- "Chicken Curry" vs "Curry Chicken" → `similarity = 0.92` ✅
- "Spaghetti Carbonara" vs "Carbonara Pasta" → `similarity = 0.78` ⚠️ (needs ingredient check)

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION calculate_name_similarity(name1 text, name2 text)
RETURNS numeric(5,4)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT similarity(lower(trim(name1)), lower(trim(name2)));
$$;
```

**Strategy 2: Ingredient-Based Similarity**

**Algorithm:**
1. Extract `food_item_id` sets from both recipes' ingredients (excluding optional)
2. Calculate Jaccard similarity: `intersection_size / union_size`
3. Threshold: `similarity >= 0.80` → potential duplicate

**Example:**
- Recipe A: [chicken, onion, garlic, tomatoes]
- Recipe B: [chicken, onion, garlic, tomatoes, salt]
- Intersection: 4, Union: 5 → `similarity = 0.80` ✅

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION calculate_ingredient_similarity(
  ingredients1 jsonb,
  ingredients2 jsonb
)
RETURNS numeric(5,4)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  set1 uuid[];
  set2 uuid[];
  intersection_count int;
  union_count int;
BEGIN
  -- Extract food_item_id sets (excluding optional ingredients)
  SELECT array_agg(DISTINCT (ing->>'food_item_id')::uuid)
  INTO set1
  FROM jsonb_array_elements(ingredients1) AS ing
  WHERE (ing->>'optional')::boolean = false
    AND ing->>'food_item_id' IS NOT NULL;
  
  SELECT array_agg(DISTINCT (ing->>'food_item_id')::uuid)
  INTO set2
  FROM jsonb_array_elements(ingredients2) AS ing
  WHERE (ing->>'optional')::boolean = false
    AND ing->>'food_item_id' IS NOT NULL;
  
  -- Calculate Jaccard similarity
  SELECT 
    COUNT(*) FILTER (WHERE id = ANY(set2)) as intersection,
    (SELECT COUNT(*) FROM unnest(set1) UNION SELECT COUNT(*) FROM unnest(set2)) as union_size
  INTO intersection_count, union_count
  FROM unnest(set1) AS id;
  
  IF union_count = 0 THEN
    RETURN 0.0;
  END IF;
  
  RETURN intersection_count::numeric / union_count::numeric;
END;
$$;
```

**Strategy 3: Combined Similarity (Name + Ingredients)**

**Algorithm:**
1. Calculate name similarity (`name_sim`)
2. Calculate ingredient similarity (`ingredient_sim`)
3. Combined score: `(name_sim * 0.4) + (ingredient_sim * 0.6)`
4. Threshold: `combined >= 0.75` → potential duplicate

**Rationale:**
- Name similarity weighted 40% (names can vary)
- Ingredient similarity weighted 60% (more reliable indicator)
- Combined approach catches cases where one metric alone might miss

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION calculate_combined_similarity(
  name1 text,
  name2 text,
  ingredients1 jsonb,
  ingredients2 jsonb
)
RETURNS numeric(5,4)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    calculate_name_similarity(name1, name2) * 0.4 +
    calculate_ingredient_similarity(ingredients1, ingredients2) * 0.6
  );
$$;
```

**Strategy 4: Instruction Similarity (Optional, for High Confidence)**

**Algorithm:**
1. Normalize instructions (lowercase, remove whitespace)
2. Use trigram similarity on instruction text
3. Only used when name + ingredient similarity is borderline (0.70-0.85)
4. If instruction similarity > 0.80, boost confidence to "high"

**Use Case:**
- "Chicken Curry" vs "Curry Chicken" with same ingredients
- Instruction similarity confirms it's the same recipe

#### 5.6.3 Duplicate Detection Workflow

**Trigger Points:**

1. **On Recipe Creation** (Real-time)
   - When new recipe is created, check against existing recipes
   - Compare with recipes in same household + public recipes
   - If similarity >= threshold, create `recipe_duplicates` record with `status = 'detected'`

2. **Batch Detection** (Scheduled)
   - Daily job to detect duplicates across all recipes
   - Compare recipes that haven't been checked recently
   - Useful for catching duplicates from imports or bulk operations

3. **User-Reported** (Manual)
   - User can report potential duplicate
   - Creates `recipe_duplicates` record with `detection_method = 'user_reported'`
   - Requires review

**Detection Function:**
```sql
CREATE OR REPLACE FUNCTION detect_recipe_duplicates(
  new_recipe_id uuid,
  check_household_id uuid DEFAULT NULL,
  similarity_threshold numeric DEFAULT 0.75
)
RETURNS TABLE(
  duplicate_id uuid,
  similarity_score numeric(5,4),
  detection_method text
)
LANGUAGE plpgsql
AS $$
DECLARE
  new_recipe recipes%ROWTYPE;
  candidate recipes%ROWTYPE;
  name_sim numeric(5,4);
  ingredient_sim numeric(5,4);
  combined_sim numeric(5,4);
BEGIN
  -- Get new recipe data
  SELECT * INTO new_recipe FROM recipes WHERE id = new_recipe_id;
  
  -- Find candidate duplicates
  FOR candidate IN
    SELECT r.*
    FROM recipes r
    WHERE r.id != new_recipe_id
      AND r.deleted_at IS NULL
      AND r.validation_status != 'deprecated'
      AND (
        -- Check household recipes
        (check_household_id IS NOT NULL AND r.household_id = check_household_id)
        OR
        -- Check public recipes
        (r.is_public = true AND r.household_id IS NULL)
      )
  LOOP
    -- Calculate similarities
    name_sim := calculate_name_similarity(new_recipe.name, candidate.name);
    ingredient_sim := calculate_ingredient_similarity(new_recipe.ingredients, candidate.ingredients);
    combined_sim := (name_sim * 0.4) + (ingredient_sim * 0.6);
    
    -- If above threshold, record as potential duplicate
    IF combined_sim >= similarity_threshold THEN
      -- Determine detection method
      DECLARE
        method text;
        confidence text;
      BEGIN
        IF name_sim >= 0.90 AND ingredient_sim >= 0.85 THEN
          method := 'combined';
          confidence := 'high';
        ELSIF name_sim >= 0.85 THEN
          method := 'name_match';
          confidence := 'medium';
        ELSIF ingredient_sim >= 0.80 THEN
          method := 'ingredient_match';
          confidence := 'medium';
        ELSE
          method := 'combined';
          confidence := 'low';
        END IF;
        
        -- Insert duplicate record (if not already exists)
        INSERT INTO recipe_duplicates (
          primary_recipe_id,
          duplicate_recipe_id,
          similarity_score,
          detection_method,
          detection_confidence,
          similarity_details,
          status
        )
        VALUES (
          new_recipe_id,
          candidate.id,
          combined_sim,
          method,
          confidence,
          jsonb_build_object(
            'name_similarity', name_sim,
            'ingredient_similarity', ingredient_sim,
            'matching_ingredients', (
              SELECT array_agg(DISTINCT (ing->>'food_item_id')::uuid)
              FROM jsonb_array_elements(new_recipe.ingredients) AS ing
              WHERE (ing->>'food_item_id')::uuid IN (
                SELECT (ing2->>'food_item_id')::uuid
                FROM jsonb_array_elements(candidate.ingredients) AS ing2
                WHERE (ing2->>'optional')::boolean = false
              )
            )
          ),
          'detected'
        )
        ON CONFLICT (primary_recipe_id, duplicate_recipe_id) DO NOTHING;
        
        -- Return result
        duplicate_id := candidate.id;
        similarity_score := combined_sim;
        detection_method := method;
        RETURN NEXT;
      END;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;
```

#### 5.6.4 Duplicate Review & Merge Workflow

**User-Facing Flow:**

1. **Detection Notification**
   - User sees notification: "We found a similar recipe: [Recipe Name]"
   - Shows similarity score and matching factors
   - Options: "Review", "Dismiss", "Mark as Different"

2. **Review Interface**
   - Side-by-side comparison of recipes
   - Highlights matching ingredients
   - Shows differences (ingredients, instructions, metadata)
   - User can choose:
     - **Merge**: Combine into one recipe (choose which is primary)
     - **Keep Separate**: Mark as "not a duplicate"
     - **Defer**: Review later

3. **Merge Action**
   - User selects which recipe to keep as primary
   - System merges:
     - Usage stats aggregated
     - Feedback aggregated
     - Favorites transferred
     - Meal plans updated to reference primary recipe
   - Duplicate recipe marked `validation_status = 'deprecated'`
   - `recipe_duplicates` record updated with `status = 'merged'`

**Merge Function:**
```sql
CREATE OR REPLACE FUNCTION merge_recipe_duplicates(
  primary_recipe_id uuid,
  duplicate_recipe_id uuid,
  merged_by_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update duplicate record
  UPDATE recipe_duplicates
  SET 
    status = 'merged',
    merge_action = 'merge',
    merged_into_recipe_id = primary_recipe_id,
    merged_at = now(),
    merged_by = merged_by_user_id
  WHERE (primary_recipe_id = primary_recipe_id AND duplicate_recipe_id = duplicate_recipe_id)
     OR (primary_recipe_id = duplicate_recipe_id AND duplicate_recipe_id = primary_recipe_id);
  
  -- Aggregate usage stats
  UPDATE recipe_usage_stats
  SET recipe_id = primary_recipe_id
  WHERE recipe_id = duplicate_recipe_id;
  
  -- Transfer favorites
  UPDATE meal_favourites
  SET meal_id = primary_recipe_id
  WHERE meal_id = duplicate_recipe_id;
  
  -- Update meal plans
  UPDATE meal_plans
  SET meal_id = primary_recipe_id
  WHERE meal_id = duplicate_recipe_id;
  
  -- Aggregate feedback (keep both, but mark duplicate as merged)
  UPDATE recipe_feedback
  SET notes = COALESCE(notes, '') || ' [Merged from recipe: ' || duplicate_recipe_id || ']'
  WHERE recipe_id = duplicate_recipe_id;
  
  -- Deprecate duplicate recipe
  UPDATE recipes
  SET 
    validation_status = 'deprecated',
    deleted_at = now()
  WHERE id = duplicate_recipe_id;
  
  -- Update primary recipe quality score (may improve with aggregated stats)
  -- This is handled by a separate function that recalculates quality scores
END;
$$;
```

#### 5.6.5 False Positive Handling

**User Can Reject:**
- User marks duplicate as "not a duplicate"
- Updates `recipe_duplicates.status = 'rejected'`
- System learns: future detections between these recipes are suppressed

**Learning:**
- Track rejected duplicates to improve detection thresholds
- If user consistently rejects certain similarity patterns, adjust thresholds
- Store rejection reason for pattern analysis

#### 5.6.6 Integration with Recipe Creation

**On Recipe Insert Trigger:**
```sql
CREATE OR REPLACE FUNCTION check_duplicates_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  duplicate_count int;
BEGIN
  -- Run duplicate detection
  PERFORM detect_recipe_duplicates(
    NEW.id,
    NEW.household_id,
    0.75 -- similarity threshold
  );
  
  -- Count detected duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM recipe_duplicates
  WHERE (primary_recipe_id = NEW.id OR duplicate_recipe_id = NEW.id)
    AND status = 'detected';
  
  -- If duplicates found, flag recipe for review (optional)
  IF duplicate_count > 0 THEN
    -- Could set a flag or send notification
    -- For now, just log it
    RAISE NOTICE 'Found % potential duplicates for recipe %', duplicate_count, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_duplicates_on_recipe_insert
  AFTER INSERT ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicates_on_insert();
```

#### 5.6.7 Duplicate Detection Queries

**Find Potential Duplicates for Recipe:**
```sql
SELECT 
  rd.*,
  r.name as duplicate_name,
  r.image_url as duplicate_image,
  r.meal_type as duplicate_meal_type
FROM recipe_duplicates rd
JOIN recipes r ON r.id = rd.duplicate_recipe_id
WHERE rd.primary_recipe_id = $1
  AND rd.status = 'detected'
ORDER BY rd.similarity_score DESC;
```

**Find All Unresolved Duplicates:**
```sql
SELECT 
  rd.*,
  r1.name as primary_name,
  r2.name as duplicate_name
FROM recipe_duplicates rd
JOIN recipes r1 ON r1.id = rd.primary_recipe_id
JOIN recipes r2 ON r2.id = rd.duplicate_recipe_id
WHERE rd.status IN ('detected', 'pending_review')
ORDER BY rd.similarity_score DESC, rd.detected_at DESC;
```

**Get Duplicate Statistics:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'detected') as pending_detections,
  COUNT(*) FILTER (WHERE status = 'merged') as merged_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  AVG(similarity_score) FILTER (WHERE status = 'merged') as avg_merged_similarity,
  AVG(similarity_score) FILTER (WHERE status = 'rejected') as avg_rejected_similarity
FROM recipe_duplicates;
```

#### 5.6.8 Duplicate Prevention in AI Generation

**Pre-Generation Check:**
- Before generating recipe, check if similar recipe already exists
- If similarity >= 0.80, suggest existing recipe instead
- User can still request generation if they want variation

**Post-Generation Check:**
- After AI generates recipe, immediately run duplicate detection
- If duplicate found, show user: "Similar recipe exists: [Recipe Name]. Use existing or keep new?"

---

## 6. RLS & Access Model

### 6.1 Recipe Visibility Rules

**Public Recipes:**
- `is_public = true` AND `household_id IS NULL` → Visible to all authenticated users
- Used for global recipe library

**Household Recipes:**
- `household_id = <household_id>` AND `is_public = false` → Visible to household members only
- Personal space recipes: `household_id = <personal_space_id>`

**User-Created Recipes:**
- `created_by = <user_id>` → User can view/edit/delete their own recipes
- Can be shared to household or made public

### 6.2 RLS Policies

**SELECT Policy (View Recipes):**
```sql
CREATE POLICY "Users can view accessible recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    -- Public recipes
    (is_public = true AND household_id IS NULL)
    OR
    -- Recipes in user's personal space
    (household_id IS NOT NULL AND is_user_personal_space(household_id))
    OR
    -- Recipes in user's shared households
    (household_id IS NOT NULL AND is_user_household_member(household_id))
    OR
    -- User's own recipes (regardless of household)
    (created_by = auth.uid())
  )
  AND deleted_at IS NULL;
```

**INSERT Policy (Create Recipes):**
```sql
CREATE POLICY "Users can create recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Can create in personal space
    (household_id IS NOT NULL AND is_user_personal_space(household_id))
    OR
    -- Can create in shared households they're members of
    (household_id IS NOT NULL AND is_user_household_member(household_id))
    OR
    -- Can create public recipes (if allowed by app logic)
    (is_public = true AND household_id IS NULL)
  )
  AND created_by = auth.uid();
```

**UPDATE Policy (Edit Recipes):**
```sql
CREATE POLICY "Users can update their own recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  );
```

**DELETE Policy (Soft Delete):**
```sql
CREATE POLICY "Users can delete their own recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    (household_id IS NOT NULL AND is_user_household_member(household_id))
  );
```

### 6.3 AI-Generated Recipe Ownership

**Ownership Model:**
- AI-generated recipes are owned by the requesting user (`created_by = requested_by`)
- Stored in user's household (`household_id = requested_household_id`)
- Can be made public by user (`is_public = true`)
- User can edit, delete, or regenerate AI recipes

**Source Attribution:**
- `recipe_sources.source_name` = AI model name (e.g., "OpenAI GPT-4")
- `recipe_generation_jobs.requested_by` tracks who requested generation
- Recipe shows "Generated by AI" badge, but user owns it

### 6.4 Shared Household Access

**Household Members:**
- All members of a household can view household recipes
- All members can create recipes for the household
- Only recipe creator can edit/delete (unless household admin)

**Personal Space:**
- Recipes in personal space visible only to user
- User can share personal recipes to household (creates copy or link)

---

## 7. Performance & Mobile Considerations

### 7.1 Query Patterns

**"What Can I Make?" Query:**
```sql
-- Find recipes where all required ingredients are in pantry
SELECT r.*
FROM recipes r
WHERE r.deleted_at IS NULL
  AND r.validation_status = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(r.ingredients) AS ingredient
    WHERE (ingredient->>'optional')::boolean = false
      AND ingredient->>'food_item_id' NOT IN (
        SELECT food_item_id
        FROM household_pantry_items
        WHERE household_id = $1
          AND status = 'have'
      )
      AND COALESCE(ingredient->>'pantry_equivalent', '') NOT IN (
        SELECT food_item_id::text
        FROM household_pantry_items
        WHERE household_id = $1
          AND status = 'have'
      )
  )
ORDER BY r.popularity_score DESC
LIMIT 20;
```

**Optimization:**
- GIN index on `ingredients` JSONB for fast ingredient queries
- Materialized view for pantry-item-to-recipe mapping (refreshed daily)
- Cache pantry state in application layer

**Pantry-Aware Filtering:**
- Pre-compute pantry item set for user's household
- Use GIN index to quickly find recipes with matching ingredients
- Filter by `optional = false` to exclude optional ingredients

### 7.2 Meal Planner Insertion

**Query:**
```sql
-- Get recipe for meal plan insertion
SELECT r.*, rv.*
FROM recipes r
LEFT JOIN recipe_versions rv ON r.current_version_id = rv.id
WHERE r.id = $1
  AND r.deleted_at IS NULL
  AND r.validation_status = 'approved';
```

**Optimization:**
- Single query with JOIN to get current version
- Index on `current_version_id` for fast version lookup
- Cache recipe data in application layer for frequently accessed recipes

### 7.3 Indexing Strategy

**Critical Indexes:**
1. `idx_recipes_household_id` - Fast household filtering
2. `idx_recipes_ingredients_gin` - Fast ingredient matching
3. `idx_recipes_validation_status` - Filter approved recipes
4. `idx_recipes_quality_score` - Ranking/sorting
5. `idx_recipe_versions_recipe_id` - Version history lookup
6. `idx_usage_stats_recipe_id` - Usage analytics
7. `idx_usage_stats_popularity` - Popularity ranking

**Composite Indexes:**
- `(household_id, validation_status, deleted_at)` - Common filter combination
- `(meal_type, validation_status, quality_score)` - Recipe library browsing

### 7.4 Avoiding N+1 Queries

**Problem:** Loading recipes with ingredients requires multiple queries.

**Solution:**
1. **Single Query with JSONB**: Ingredients stored in JSONB, no JOIN needed
2. **Batch Food Item Lookup**: Load all `food_item_id` values, batch fetch from `food_items`
3. **Materialized Views**: Pre-compute recipe summaries with joined food item names
4. **Application Caching**: Cache food item names in application layer

**Example Batch Query:**
```sql
-- Get all food items for recipe ingredients in one query
SELECT fi.*
FROM food_items fi
WHERE fi.id = ANY(
  SELECT DISTINCT (ingredient->>'food_item_id')::uuid
  FROM recipes r,
  jsonb_array_elements(r.ingredients) AS ingredient
  WHERE r.id = ANY($1::uuid[])
    AND ingredient->>'food_item_id' IS NOT NULL
);
```

### 7.5 JSONB Tradeoffs

**Advantages:**
- Flexible schema (ingredients can have varying fields)
- Single query retrieves all ingredient data
- Easy to add new fields (notes, substitutions) without migration
- Good for mobile (less data transfer)

**Disadvantages:**
- Harder to query individual ingredients (requires JSONB functions)
- No foreign key constraints on `food_item_id` within JSONB
- Validation must be done in application layer or triggers

**Mitigation:**
- Use triggers to validate `food_item_id` references on INSERT/UPDATE
- Use GIN indexes for fast ingredient queries
- Application layer validates ingredient structure

**Trigger Example:**
```sql
CREATE OR REPLACE FUNCTION validate_recipe_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate all ingredients have food_item_id
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.ingredients) AS ingredient
    WHERE ingredient->>'food_item_id' IS NULL
  ) THEN
    RAISE EXCEPTION 'All ingredients must have food_item_id';
  END IF;
  
  -- Validate food_item_id references exist
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.ingredients) AS ingredient
    WHERE NOT EXISTS (
      SELECT 1 FROM food_items WHERE id = (ingredient->>'food_item_id')::uuid
    )
  ) THEN
    RAISE EXCEPTION 'Invalid food_item_id reference';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_recipe_ingredients_trigger
  BEFORE INSERT OR UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION validate_recipe_ingredients();
```

### 7.6 Mobile Optimization

**Data Transfer:**
- Return only necessary fields (exclude `raw_response`, large JSONB)
- Use field selection in Supabase queries
- Paginate recipe lists (limit 20 per page)

**Caching Strategy:**
- Cache food item names in mobile app
- Cache popular recipes locally
- Pre-fetch pantry state for "What can I make?" queries

**Offline Support:**
- Store favorite recipes locally
- Queue recipe creation/feedback for sync when online

---

## 8. Migration & Compatibility Strategy

### 8.1 Integration with Existing `meal_library`

**Coexistence Strategy:**
- `meal_library` remains as **v1 system** (legacy, read-only for existing data)
- `recipes` table is **v2 system** (new, full-featured)
- Both systems can coexist during migration period

**Migration Path:**
1. **Phase 1: Coexistence** (Current)
   - `meal_library` continues to work
   - New recipes go to `recipes` table
   - `meal_plans.meal_id` can reference either table (via polymorphic approach or separate columns)

2. **Phase 2: Gradual Migration** (Future)
   - Migrate popular `meal_library` recipes to `recipes` table
   - Create `recipe_sources` records with `source_type = 'import'`, `source_name = 'Legacy Meal Library'`
   - Map `meal_library.ingredients` JSONB to `recipes.ingredients` with `food_item_id` references

3. **Phase 3: Deprecation** (Future)
   - Mark `meal_library` as read-only
   - Redirect all new recipe creation to `recipes` table
   - Eventually deprecate `meal_library` (long-term)

**Polymorphic Reference:**
```sql
-- Option 1: Separate columns
ALTER TABLE meal_plans
ADD COLUMN recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL;

-- meal_plans.meal_id references meal_library (v1)
-- meal_plans.recipe_id references recipes (v2)

-- Option 2: Polymorphic approach (more complex)
ALTER TABLE meal_plans
ADD COLUMN recipe_source_type text, -- 'meal_library' or 'recipes'
ADD COLUMN recipe_source_id uuid;
```

### 8.2 Zero-Downtime Migration

**Strategy:**
1. **Create new tables** alongside existing ones (no breaking changes)
2. **Dual-write**: Write to both `meal_library` and `recipes` during transition (optional)
3. **Gradual cutover**: Switch reads from `meal_library` to `recipes` incrementally
4. **Data validation**: Verify migrated data matches original
5. **Rollback plan**: Keep `meal_library` until migration verified

**Migration Script Structure:**
```sql
-- 1. Create new tables (already done in design)
-- 2. Migrate data in batches
DO $$
DECLARE
  batch_size int := 100;
  migrated_count int := 0;
BEGIN
  LOOP
    -- Migrate batch of meal_library records
    INSERT INTO recipes (...)
    SELECT ... FROM meal_library
    WHERE id NOT IN (SELECT meal_id FROM migration_map)
    LIMIT batch_size;
    
    EXIT WHEN NOT FOUND;
    migrated_count := migrated_count + batch_size;
  END LOOP;
END $$;
```

### 8.3 Backward Compatibility

**API Compatibility:**
- Existing `getMealLibrary()` function continues to work (queries `meal_library`)
- New `getRecipes()` function queries `recipes` table
- Application layer can call both during transition

**Data Compatibility:**
- `meal_plans.meal_id` continues to reference `meal_library.id`
- New `meal_plans.recipe_id` references `recipes.id`
- Application handles both cases

**Feature Flags:**
- Use feature flags to control which system is active
- Gradual rollout: 10% → 50% → 100% of users on v2 system

---

## 9. Explicit Non-Goals

### 9.1 No Calorie Enforcement Engine

**What We Don't Build:**
- ❌ Calorie tracking or targets
- ❌ Macro counting (protein, carbs, fat targets)
- ❌ Daily calorie limits or warnings
- ❌ "You've exceeded your calorie goal" alerts

**What We Do:**
- ✅ Nutrition data is optional and informational only
- ✅ No pressure to track or meet targets
- ✅ Nutrition shown only if user explicitly requests it

### 9.2 No Macro Targets

**What We Don't Build:**
- ❌ Protein/carb/fat goal tracking
- ❌ Macro-based recipe filtering
- ❌ "This recipe fits your macros" suggestions

**What We Do:**
- ✅ Nutrition data available if provided by source
- ✅ Dietary tags (vegetarian, vegan, keto) for filtering
- ✅ No enforcement or pressure

### 9.3 No Auto-Planning

**What We Don't Build:**
- ❌ Automatic meal plan generation
- ❌ "We've planned your week" features
- ❌ AI that adds meals to plan without user consent

**What We Do:**
- ✅ Recipe suggestions based on pantry
- ✅ "What can I make?" queries
- ✅ User explicitly adds recipes to meal plan

### 9.4 No Nudging or Pressure Mechanics

**What We Don't Build:**
- ❌ "You haven't planned meals this week" warnings
- ❌ Streaks or gamification
- ❌ Red states or error messages for empty meal plans
- ❌ "You should cook this" recommendations

**What We Do:**
- ✅ Optional, calm recipe suggestions
- ✅ Neutral empty states
- ✅ No guilt language
- ✅ Support tool, not discipline tool

### 9.5 No Heavy ML Infrastructure

**What We Don't Build:**
- ❌ Custom ML models for recipe generation
- ❌ Training data pipelines
- ❌ Model versioning and A/B testing infrastructure

**What We Do:**
- ✅ Use existing LLM APIs (OpenAI, Anthropic, etc.)
- ✅ Simple popularity scoring (non-ML)
- ✅ Rule-based learning (usage patterns, feedback aggregation)

---

## 10. Implementation Phases

### Phase 1: Core Tables (MVP)
- ✅ Create `recipes` table
- ✅ Create `recipe_sources` table
- ✅ Create `recipe_versions` table
- ✅ Basic RLS policies
- ✅ Ingredient validation triggers

### Phase 2: AI Generation
- ✅ Create `recipe_generation_jobs` table
- ✅ Implement job processing pipeline
- ✅ AI integration (OpenAI/Anthropic)
- ✅ Ingredient mapping logic

### Phase 3: Validation & Quality
- ✅ Create `recipe_validation_status` table
- ✅ Automated validation checks
- ✅ Human review queue

### Phase 4: Learning & Feedback
- ✅ Create `recipe_feedback` table
- ✅ Create `recipe_usage_stats` table
- ✅ Popularity scoring
- ✅ Feedback aggregation

### Phase 5: Duplicate Detection
- ✅ Create `recipe_duplicates` table
- ✅ Implement similarity calculation functions
- ✅ Real-time duplicate detection on recipe creation
- ✅ Batch duplicate detection job
- ✅ User-facing duplicate review interface
- ✅ Recipe merge functionality

### Phase 6: Advanced Features
- ✅ Recipe merging workflows
- ✅ Substitution learning
- ✅ Pantry-aware improvements
- ✅ Migration from `meal_library`

---

## 11. Success Criteria

### Technical Success
- ✅ All recipes reference `food_item_id` (no string-only ingredients)
- ✅ Pantry-aware matching works accurately
- ✅ AI generation produces valid recipes with mapped ingredients
- ✅ Zero-downtime migration from `meal_library`
- ✅ Mobile queries perform < 200ms for "What can I make?"

### Product Success
- ✅ Users can create, edit, and share recipes easily
- ✅ AI-generated recipes are accurate and useful
- ✅ Recipe suggestions are relevant (pantry-aware, preference-based)
- ✅ No pressure or guilt mechanics
- ✅ System learns and improves from usage

### ADHD-First Success
- ✅ Optional interactions (no required fields)
- ✅ Calm, neutral UI (no red states, warnings)
- ✅ No calorie/macro enforcement
- ✅ Support tool, not discipline tool

---

## Appendix A: Example Queries

### A.1 Get Recipes User Can Make (Pantry-Aware)

```sql
WITH user_pantry AS (
  SELECT food_item_id
  FROM household_pantry_items
  WHERE household_id = $1
    AND status = 'have'
)
SELECT 
  r.id,
  r.name,
  r.meal_type,
  r.prep_time,
  r.cook_time,
  r.image_url,
  COUNT(DISTINCT ingredient->>'food_item_id') FILTER (
    WHERE (ingredient->>'optional')::boolean = false
      AND (ingredient->>'food_item_id')::uuid IN (SELECT food_item_id FROM user_pantry)
  ) as available_ingredients,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(r.ingredients) AS ing
    WHERE (ing->>'optional')::boolean = false
  ) as required_ingredients
FROM recipes r
WHERE r.deleted_at IS NULL
  AND r.validation_status = 'approved'
  AND (
    r.household_id = $1
    OR r.is_public = true
  )
GROUP BY r.id
HAVING available_ingredients = required_ingredients
ORDER BY r.quality_score DESC NULLS LAST
LIMIT 20;
```

### A.2 Get Recipe with Current Version

```sql
SELECT 
  r.*,
  rv.*,
  rs.source_name,
  rs.source_type
FROM recipes r
LEFT JOIN recipe_versions rv ON r.current_version_id = rv.id
LEFT JOIN recipe_sources rs ON r.source_id = rs.id
WHERE r.id = $1
  AND r.deleted_at IS NULL;
```

### A.3 Get Popular Recipes for Household

```sql
SELECT 
  r.*,
  COALESCE(us.popularity_score, 0) as popularity
FROM recipes r
LEFT JOIN recipe_usage_stats us ON r.id = us.recipe_id AND us.household_id = $1
WHERE r.deleted_at IS NULL
  AND r.validation_status = 'approved'
  AND (
    r.household_id = $1
    OR r.is_public = true
  )
ORDER BY popularity DESC, r.quality_score DESC NULLS LAST
LIMIT 20;
```

---

## Appendix B: Data Dictionary

### B.1 Enums

**meal_type:**
- `breakfast`
- `lunch`
- `dinner`
- `snack`

**meal_category:**
- `home_cooked`
- `healthy`
- `vegetarian`
- `vegan`
- `gluten_free`
- `high_protein`
- `budget_friendly`
- `takeaway`

**cuisine_type:**
- `italian`
- `indian`
- `chinese`
- `thai`
- `british`
- `american`
- `mexican`
- `mediterranean`
- `japanese`
- `french`
- `greek`
- `korean`

**cooking_difficulty:**
- `easy`
- `medium`
- `hard`

**validation_status:**
- `draft`
- `pending`
- `approved`
- `needs_review`
- `deprecated`

**source_type:**
- `ai`
- `user`
- `scrape`
- `api`
- `import`

**job_status:**
- `pending`
- `processing`
- `completed`
- `failed`
- `cancelled`

---

**End of Document**
