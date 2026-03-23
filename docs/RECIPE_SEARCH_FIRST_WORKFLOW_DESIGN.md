# Global Search-First Recipe Workflow Design

**Version:** 1.0  
**Date:** 2025-02-23  
**Status:** Design Phase  
**Related Documents:** `RECIPE_GENERATOR_DATABASE_DESIGN.md`, `RECIPE_GENERATOR_IMPLEMENTATION_PLAN.md`

---

## Executive Summary

This document defines the architecture for a search-first recipe system where all recipe discovery begins with searching a global public database. AI generation occurs only when search fails to find suitable results. The system maintains a global public recipe database while allowing users to create private recipes as a secondary, non-default option. All actions are logged and auditable for analytics and learning.

**Core Principle:** Search before creation. Global truth, local flexibility.

---

## Table of Contents

1. [Workflow Diagrams](#1-workflow-diagrams)
2. [Database Design](#2-database-design)
3. [RLS Strategy](#3-rls-strategy)
4. [Service Layer Architecture](#4-service-layer-architecture)
5. [UX Implications](#5-ux-implications)
6. [Logging & Audit System](#6-logging--audit-system)
7. [Design Principles](#7-design-principles)

---

## 1. Workflow Diagrams

### 1.1 Primary Workflow: Search → Results → Select

**Flow:**
```
User Action: "I want to make chicken curry"
    ↓
[RecipeSearchService.search()]
    ↓
Query global public recipes (similarity search)
    ↓
Results Found? → YES
    ↓
[RecipeResolutionService.resolve()]
    ↓
Display results to user
    ↓
User selects recipe
    ↓
[RecipeAuditService.log()]
    - Log: search_query, results_count, selected_recipe_id, action='search_hit'
    ↓
Recipe added to meal plan / viewed
    ↓
[RecipeAuditService.log()]
    - Log: recipe_id, action='viewed' or 'added_to_plan'
```

**Key Points:**
- Search always queries global public database
- Similarity search (not exact match) to catch variations
- Results are ranked by relevance/quality
- User selection is logged for learning

### 1.2 Secondary Workflow: Search → Miss → AI Generate → Save → Select

**Flow:**
```
User Action: "I want to make chicken curry"
    ↓
[RecipeSearchService.search()]
    ↓
Query global public recipes (similarity search)
    ↓
Results Found? → NO (or results below similarity threshold)
    ↓
[RecipeAuditService.log()]
    - Log: search_query, results_count=0, action='search_miss'
    ↓
[AIRecipeGenerationService.generate()]
    - Build prompt from search query
    - Include pantry context (optional)
    - Include dietary preferences (optional)
    - Call AI API
    ↓
[RecipeIngredientMapper.map()]
    - Map AI ingredient strings to food_item_id
    - Flag unmapped ingredients for review
    ↓
[RecipeService.create()]
    - Create recipe with:
      * source_type = 'ai'
      * is_public = true
      * household_id = null
      * validation_status = 'pending'
    ↓
[RecipeAuditService.log()]
    - Log: recipe_id, action='ai_generated', prompt, metadata
    ↓
[DuplicateDetectionService.check()]
    - Check for duplicates
    - If duplicate found, merge or flag
    ↓
Display generated recipe to user
    ↓
User selects recipe
    ↓
[RecipeAuditService.log()]
    - Log: recipe_id, action='selected_after_generation'
    ↓
Recipe added to meal plan
```

**Key Points:**
- AI generation only occurs after search miss
- Generated recipes are always public and global
- Validation happens post-generation
- Duplicate detection prevents duplicates
- Full audit trail of generation process

### 1.3 Tertiary Workflow: Search → Results → Fork → Private Recipe

**Flow:**
```
User Action: "I want to make chicken curry"
    ↓
[RecipeSearchService.search()]
    ↓
Results Found? → YES
    ↓
User views recipe
    ↓
User Action: "I want to customize this"
    ↓
[RecipeForkService.fork()]
    - Create copy of recipe:
      * source_recipe_id = original_recipe_id
      * source_type = 'user'
      * is_public = false
      * household_id = user's household_id
      * validation_status = 'draft'
    ↓
[RecipeAuditService.log()]
    - Log: original_recipe_id, forked_recipe_id, action='forked'
    ↓
User edits forked recipe
    ↓
[RecipeService.update()]
    - Update forked recipe (private, not affecting global)
    ↓
Forked recipe saved as private
    ↓
[RecipeAuditService.log()]
    - Log: forked_recipe_id, action='private_recipe_created'
```

**Key Points:**
- Forking creates private copy of global recipe
- Forked recipes are scoped to household
- Original global recipe remains unchanged
- Fork relationship is tracked for analytics

### 1.4 Quaternary Workflow: Direct Private Creation (Advanced)

**Flow:**
```
User Action: "Create my own recipe" (Advanced/Manual option)
    ↓
[RecipeService.create()]
    - Create recipe with:
      * source_type = 'user'
      * is_public = false
      * household_id = user's household_id
      * validation_status = 'draft'
    ↓
[RecipeAuditService.log()]
    - Log: recipe_id, action='private_recipe_created_manual'
    ↓
User edits recipe
    ↓
Recipe saved as private
    ↓
Optional: User can submit for public promotion
    ↓
[RecipePromotionService.submit()]
    - Create promotion request
    - Recipe remains private until approved
    ↓
[RecipeAuditService.log()]
    - Log: recipe_id, action='promotion_requested'
```

**Key Points:**
- Private creation is advanced/fallback option
- Not part of primary search flow
- Can be promoted to public later (manual review)
- Always logged for audit

---

## 2. Database Design

### 2.1 Core Tables (Conceptual)

#### 2.1.1 `recipes` (Enhanced)

**Purpose:** Canonical recipe entity supporting both global public and private recipes.

**Key Fields:**
- `id` (uuid, PK)
- `name` (text, required)
- `ingredients` (jsonb, required) - References food_item_id
- `instructions` (text)
- `meal_type` (enum)
- `source_type` (enum: 'ai', 'user', 'scrape', 'api', 'import')
- `is_public` (boolean, default: false)
- `household_id` (uuid, nullable)
- `source_recipe_id` (uuid, nullable) - For forked recipes
- `validation_status` (enum: 'draft', 'pending', 'approved', 'deprecated')
- `created_by` (uuid, nullable)
- `created_at` (timestamptz)
- `deleted_at` (timestamptz, nullable) - Soft delete

**Constraints:**
- If `is_public = true`, then `household_id` MUST be null
- If `source_type = 'ai'`, then `is_public` MUST be true
- If `source_recipe_id` is set, then `is_public` MUST be false (forks are private)

**Relationships:**
- `source_recipe_id` → `recipes.id` (self-referential, for forks)
- `household_id` → `households.id` (for private recipes)
- `created_by` → `profiles.id`

#### 2.1.2 `recipe_search_logs`

**Purpose:** Log all search queries and their outcomes.

**Key Fields:**
- `id` (uuid, PK)
- `user_id` (uuid, required)
- `household_id` (uuid, nullable) - Context of search
- `search_query` (text, required)
- `search_type` (enum: 'name', 'ingredient', 'combined')
- `results_count` (int, default: 0)
- `results_returned` (int, default: 0) - How many were shown to user
- `top_result_recipe_id` (uuid, nullable) - Best match recipe
- `similarity_scores` (jsonb) - Array of similarity scores for top results
- `action_taken` (enum: 'search_hit', 'search_miss', 'no_action')
- `selected_recipe_id` (uuid, nullable) - Which recipe user selected
- `ai_generation_triggered` (boolean, default: false)
- `generated_recipe_id` (uuid, nullable) - If AI generated
- `search_metadata` (jsonb) - Filters, meal_type, etc.
- `created_at` (timestamptz)

**Relationships:**
- `user_id` → `profiles.id`
- `household_id` → `households.id`
- `top_result_recipe_id` → `recipes.id`
- `selected_recipe_id` → `recipes.id`
- `generated_recipe_id` → `recipes.id`

**Indexes:**
- `user_id`, `created_at` (for user search history)
- `search_query` (for query analytics)
- `action_taken` (for learning signals)

#### 2.1.3 `recipe_audit_logs`

**Purpose:** Comprehensive audit trail of all recipe interactions.

**Key Fields:**
- `id` (uuid, PK)
- `user_id` (uuid, required)
- `recipe_id` (uuid, required)
- `action` (enum: 'viewed', 'added_to_plan', 'favorited', 'forked', 'shared', 'ai_generated', 'private_created', 'promotion_requested')
- `action_metadata` (jsonb) - Context-specific data
  - For 'added_to_plan': { meal_plan_id, day_of_week, meal_type }
  - For 'forked': { source_recipe_id }
  - For 'ai_generated': { prompt, generation_job_id }
- `household_id` (uuid, nullable) - Context
- `created_at` (timestamptz)

**Relationships:**
- `user_id` → `profiles.id`
- `recipe_id` → `recipes.id`
- `household_id` → `households.id`

**Indexes:**
- `recipe_id`, `created_at` (for recipe analytics)
- `user_id`, `created_at` (for user activity)
- `action` (for action analytics)

#### 2.1.4 `recipe_forks`

**Purpose:** Track forking relationships between global and private recipes.

**Key Fields:**
- `id` (uuid, PK)
- `source_recipe_id` (uuid, required) - Global recipe
- `forked_recipe_id` (uuid, required) - Private copy
- `forked_by` (uuid, required)
- `household_id` (uuid, required) - Where fork is stored
- `fork_reason` (text, nullable) - Why user forked
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- `source_recipe_id` → `recipes.id` (global recipe)
- `forked_recipe_id` → `recipes.id` (private recipe)
- `forked_by` → `profiles.id`
- `household_id` → `households.id`

**Constraints:**
- `source_recipe_id` must have `is_public = true`
- `forked_recipe_id` must have `is_public = false`
- Unique constraint on (`source_recipe_id`, `forked_recipe_id`)

#### 2.1.5 `recipe_promotion_requests`

**Purpose:** Track requests to promote private recipes to public.

**Key Fields:**
- `id` (uuid, PK)
- `recipe_id` (uuid, required) - Private recipe to promote
- `requested_by` (uuid, required)
- `request_reason` (text, nullable)
- `status` (enum: 'pending', 'approved', 'rejected')
- `reviewed_by` (uuid, nullable)
- `reviewed_at` (timestamptz, nullable)
- `review_notes` (text, nullable)
- `created_at` (timestamptz)

**Relationships:**
- `recipe_id` → `recipes.id`
- `requested_by` → `profiles.id`
- `reviewed_by` → `profiles.id`

**Constraints:**
- Recipe must have `is_public = false` and `source_type = 'user'`

### 2.2 Existing Tables (From Phase 1)

The following tables from the original design remain relevant:
- `recipe_sources` - Source provenance
- `recipe_versions` - Version history
- `recipe_generation_jobs` - AI generation jobs (Phase 3)
- `recipe_duplicates` - Duplicate detection (Phase 5)

### 2.3 Data Flow Relationships

```
recipe_search_logs
    ├──→ recipes (top_result_recipe_id, selected_recipe_id)
    └──→ recipes (generated_recipe_id) [if AI generated]

recipe_audit_logs
    └──→ recipes (recipe_id)

recipe_forks
    ├──→ recipes (source_recipe_id) [global]
    └──→ recipes (forked_recipe_id) [private]

recipe_promotion_requests
    └──→ recipes (recipe_id) [private → public]
```

---

## 3. RLS Strategy

### 3.1 Public Recipe Access (Read)

**Policy:** All authenticated users can read public recipes.

**RLS Rule:**
```sql
CREATE POLICY "All users can view public recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_public = true
    AND household_id IS NULL
    AND validation_status IN ('approved', 'pending')
  );
```

**Rationale:**
- Global public database must be accessible to all users
- Only approved/pending recipes shown (drafts hidden)
- Soft-deleted recipes excluded

### 3.2 Private Recipe Access (Read)

**Policy:** Users can read their own household's private recipes.

**RLS Rule:**
```sql
CREATE POLICY "Users can view their household's private recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_public = false
    AND (
      (household_id IS NOT NULL AND is_user_household_member(household_id))
      OR (household_id IS NOT NULL AND is_user_personal_space(household_id))
    )
  );
```

**Rationale:**
- Private recipes scoped to household/personal space
- Household members can view all household recipes
- Personal space recipes visible only to owner

### 3.3 Recipe Creation (Write)

**Policy:** Creation rules vary by source type.

**RLS Rules:**

**For AI-Generated Recipes:**
```sql
CREATE POLICY "System can create public AI recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    source_type = 'ai'
    AND is_public = true
    AND household_id IS NULL
  );
```

**For User-Created Private Recipes:**
```sql
CREATE POLICY "Users can create private recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    source_type = 'user'
    AND is_public = false
    AND household_id IS NOT NULL
    AND (
      is_user_personal_space(household_id)
      OR is_user_household_member(household_id)
    )
    AND created_by = auth.uid()
  );
```

**Rationale:**
- AI recipes must be public (enforced at database level)
- User recipes must be private (enforced at database level)
- Users can only create in their own spaces

### 3.4 Recipe Updates (Write)

**Policy:** Users can only update their own private recipes. Global recipes are immutable.

**RLS Rule:**
```sql
CREATE POLICY "Users can update their private recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (
    is_public = false
    AND created_by = auth.uid()
    AND (
      is_user_personal_space(household_id)
      OR is_user_household_member(household_id)
    )
  )
  WITH CHECK (
    is_public = false
    AND created_by = auth.uid()
  );
```

**Rationale:**
- Global public recipes are immutable (users cannot edit)
- Only private recipes can be updated
- Users can only update their own recipes

### 3.5 Forking (Write)

**Policy:** Users can fork public recipes into private copies.

**Enforcement:**
- Forking is handled by `RecipeForkService` (application logic)
- Service ensures:
  - Source recipe is public
  - Forked recipe is private
  - Fork relationship is recorded
- RLS policies for INSERT apply to forked recipe creation

### 3.6 Audit Log Access

**Policy:** Users can read their own audit logs. System can read all.

**RLS Rule:**
```sql
CREATE POLICY "Users can view their own audit logs"
  ON recipe_audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

**Rationale:**
- Privacy: Users see their own activity
- Analytics: System aggregates all logs for learning

### 3.7 Search Log Access

**Policy:** Users can read their own search logs. System can read all.

**RLS Rule:**
```sql
CREATE POLICY "Users can view their own search logs"
  ON recipe_search_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

**Rationale:**
- Privacy: Users see their own search history
- Analytics: System aggregates all searches for learning

### 3.8 Enforcement Strategy

**Database-Level Enforcement:**
- RLS policies enforce read/write access
- Constraints enforce data integrity (e.g., AI recipes must be public)
- Foreign keys enforce referential integrity

**Application-Level Enforcement:**
- Service layer enforces business rules (e.g., search-first workflow)
- Service layer prevents direct AI recipe creation without search
- Service layer handles fork creation logic

**Why Hybrid Approach:**
- Database enforces security and data integrity
- Application enforces business logic and workflows
- Separation of concerns: security vs. business rules

---

## 4. Service Layer Architecture

### 4.1 RecipeSearchService

**Responsibility:** Handle all recipe search operations.

**Key Methods:**
- `search(query: string, filters?: SearchFilters): Promise<SearchResult>`
  - Query global public recipes
  - Use similarity search (trigram, not exact match)
  - Rank results by relevance/quality
  - Return top N results

- `searchByIngredients(ingredients: string[], filters?: SearchFilters): Promise<SearchResult>`
  - Search recipes by ingredient list
  - Match against recipe ingredients (food_item_id)
  - Return recipes that contain specified ingredients

**Ownership:**
- Owns search query logic
- Owns similarity calculation
- Owns result ranking
- Logs all searches via `RecipeAuditService`

**Dependencies:**
- Database (recipes table)
- `RecipeAuditService` (for logging)

### 4.2 RecipeResolutionService

**Responsibility:** Resolve user intent to a recipe (search → select or generate).

**Key Methods:**
- `resolve(query: string, userId: string, context?: ResolutionContext): Promise<ResolvedRecipe>`
  - Orchestrates search-first workflow
  - Calls `RecipeSearchService.search()`
  - If results found: return results
  - If no results: trigger AI generation via `AIRecipeGenerationService`
  - Logs resolution outcome

**Workflow:**
1. Search global database
2. Evaluate results (count, similarity scores)
3. If suitable results: return them
4. If no suitable results: generate via AI
5. Log entire resolution process

**Ownership:**
- Owns resolution workflow
- Owns decision logic (when to generate)
- Coordinates between search and generation

**Dependencies:**
- `RecipeSearchService`
- `AIRecipeGenerationService`
- `RecipeAuditService`

### 4.3 AIRecipeGenerationService

**Responsibility:** Generate recipes via AI when search fails.

**Key Methods:**
- `generate(prompt: string, context: GenerationContext, userId: string): Promise<Recipe>`
  - Build AI prompt from search query
  - Include optional context (pantry, preferences)
  - Call AI API
  - Map ingredients to food_item_id
  - Create recipe (public, source_type='ai')
  - Validate recipe
  - Return generated recipe

**Constraints:**
- Can only be called after search miss (enforced by `RecipeResolutionService`)
- Always creates public recipes
- Always sets source_type='ai'
- Always logs generation

**Ownership:**
- Owns AI prompt building
- Owns AI API interaction
- Owns ingredient mapping
- Owns recipe creation (for AI recipes)

**Dependencies:**
- AI API (OpenAI/Anthropic)
- `RecipeIngredientMapper`
- `RecipeService` (for creation)
- `RecipeAuditService` (for logging)

### 4.4 RecipeForkService

**Responsibility:** Handle forking of global recipes into private copies.

**Key Methods:**
- `fork(sourceRecipeId: string, userId: string, householdId: string, reason?: string): Promise<Recipe>`
  - Validate source recipe is public
  - Create private copy
  - Set source_recipe_id
  - Create fork relationship record
  - Log fork action
  - Return forked recipe

**Ownership:**
- Owns fork creation logic
- Owns fork relationship tracking
- Ensures fork integrity (public → private)

**Dependencies:**
- `RecipeService` (for creation)
- `RecipeAuditService` (for logging)

### 4.5 RecipeService

**Responsibility:** Core recipe CRUD operations (enhanced for search-first workflow).

**Key Methods:**
- `create(input: CreateRecipeInput, userId: string): Promise<Recipe>`
  - Create recipe (public or private based on input)
  - Enforce constraints (AI = public, User = private)
  - Create initial version
  - Return created recipe

- `getById(recipeId: string, options?: GetOptions): Promise<Recipe | null>`
  - Get recipe by ID
  - Respect RLS policies
  - Optionally include joins (source, version)

- `list(filters: RecipeFilters): Promise<Recipe[]>`
  - List recipes with filters
  - For global search: only public recipes
  - For private: only user's household recipes

**Ownership:**
- Owns recipe CRUD operations
- Owns recipe data integrity
- Enforces RLS policies via queries

**Dependencies:**
- Database (recipes table)
- `RecipeAuditService` (for logging views/updates)

### 4.6 RecipeAuditService

**Responsibility:** Log all recipe-related actions for audit and analytics.

**Key Methods:**
- `logSearch(searchQuery: string, results: SearchResult, userId: string, context?: AuditContext): Promise<void>`
  - Log search query and results
  - Record action_taken (search_hit, search_miss)
  - Record selected recipe (if applicable)

- `logAction(action: AuditAction, recipeId: string, userId: string, metadata?: Record<string, any>): Promise<void>`
  - Log recipe interaction (viewed, added_to_plan, favorited, etc.)
  - Store action-specific metadata

- `logGeneration(recipeId: string, prompt: string, metadata: GenerationMetadata, userId: string): Promise<void>`
  - Log AI recipe generation
  - Store prompt and generation context

- `logFork(sourceRecipeId: string, forkedRecipeId: string, userId: string, reason?: string): Promise<void>`
  - Log recipe fork
  - Record fork relationship

**Ownership:**
- Owns all audit logging
- Owns log data structure
- Provides analytics queries

**Dependencies:**
- Database (recipe_audit_logs, recipe_search_logs)

### 4.7 Service Interaction Diagram

```
User Request: "I want chicken curry"
    ↓
[RecipeResolutionService.resolve()]
    ├──→ [RecipeSearchService.search()]
    │       └──→ Database (recipes)
    │       └──→ [RecipeAuditService.logSearch()]
    │
    ├──→ If no results:
    │       └──→ [AIRecipeGenerationService.generate()]
    │               ├──→ AI API
    │               ├──→ [RecipeIngredientMapper.map()]
    │               ├──→ [RecipeService.create()]
    │               └──→ [RecipeAuditService.logGeneration()]
    │
    └──→ [RecipeAuditService.logAction()]
            └──→ Database (recipe_audit_logs)
```

---

## 5. UX Implications

### 5.1 Search-First Interface

**Why Users Always See Search First:**
- **Low Friction:** Search is faster than creation
- **Discoverability:** Users find existing recipes before creating new ones
- **Quality:** Global database contains validated, tested recipes
- **Learning:** System learns from search patterns

**UI Flow:**
1. User opens meal planner
2. User taps "Add Meal"
3. **Search bar is primary, prominent**
4. User types recipe name
5. Results appear as user types (debounced)
6. If results found: User selects
7. If no results: "Generate with AI" button appears
8. User can still access "Create Custom Recipe" (advanced, secondary)

### 5.2 Private Creation as Advanced Option

**Why Private Creation is Secondary:**
- **Most users don't need it:** Search-first workflow covers 90% of use cases
- **Reduces cognitive load:** Fewer options = less decision fatigue
- **Maintains quality:** Global database stays focused on validated recipes
- **ADHD-friendly:** Clear primary path, optional advanced path

**UI Framing:**
- Primary: Search bar (prominent, always visible)
- Secondary: "Create Custom Recipe" (smaller, in menu/advanced section)
- Messaging: "Can't find what you're looking for? Create your own recipe."

### 5.3 Confidence and Trust

**How Confidence is Preserved:**
- **Transparency:** Show recipe source (AI, user, import)
- **Quality Indicators:** Show validation status, usage stats
- **Forking:** Users can customize without affecting global recipe
- **Audit Trail:** Users can see recipe history and origin

**Trust Signals:**
- "This recipe was generated by AI" badge
- "Used by X households" indicator
- "Validated" badge for approved recipes
- "Forked from [Recipe Name]" for customizations

### 5.4 ADHD-Friendly Design Principles

**Low Pressure:**
- No required fields in search
- No warnings for "no results found"
- Optional AI generation (user chooses)
- No guilt language

**Low Friction:**
- Search is instant (debounced, fast results)
- AI generation is one tap (if no results)
- Forking is one tap (if user wants to customize)
- No complex forms

**Clear Feedback:**
- "Found 5 recipes" vs "No recipes found"
- "Generating recipe..." with progress
- "Recipe saved to global database" confirmation
- Clear distinction between global and private recipes

---

## 6. Logging & Audit System

### 6.1 Search Logs (`recipe_search_logs`)

**Purpose:** Track all search queries and outcomes.

**Logged Data:**
- Search query text
- Search type (name, ingredient, combined)
- Results count
- Top result recipe ID
- Similarity scores
- Whether user selected a result
- Whether AI generation was triggered
- Generated recipe ID (if applicable)
- Search metadata (filters, meal_type, etc.)

**Use Cases:**
- Analytics: What are users searching for?
- Learning: Which searches result in misses?
- Improvement: Which recipes are most popular?
- Optimization: Which queries need better results?

### 6.2 Audit Logs (`recipe_audit_logs`)

**Purpose:** Track all recipe interactions.

**Logged Actions:**
- `viewed` - User viewed recipe details
- `added_to_plan` - User added recipe to meal plan
- `favorited` - User favorited recipe
- `forked` - User forked recipe
- `shared` - User shared recipe
- `ai_generated` - AI generated recipe
- `private_created` - User created private recipe
- `promotion_requested` - User requested public promotion

**Action-Specific Metadata:**
- `added_to_plan`: { meal_plan_id, day_of_week, meal_type }
- `forked`: { source_recipe_id }
- `ai_generated`: { prompt, generation_job_id, confidence_score }
- `private_created`: { creation_method }

**Use Cases:**
- Analytics: Which recipes are most used?
- Learning: Which recipes get forked most?
- Quality: Which AI-generated recipes are actually used?
- Personalization: What recipes does this user prefer?

### 6.3 Analytics Queries

**Example Queries:**

**Most Searched Recipes:**
```sql
SELECT 
  r.id,
  r.name,
  COUNT(rsl.id) as search_count
FROM recipe_search_logs rsl
JOIN recipes r ON r.id = rsl.selected_recipe_id
WHERE rsl.action_taken = 'search_hit'
GROUP BY r.id, r.name
ORDER BY search_count DESC
LIMIT 10;
```

**Search Miss Rate:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE action_taken = 'search_miss') as misses,
  COUNT(*) FILTER (WHERE action_taken = 'search_hit') as hits,
  COUNT(*) as total_searches
FROM recipe_search_logs
WHERE created_at >= NOW() - INTERVAL '7 days';
```

**AI Generation Success Rate:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE ai_generation_triggered = true) as generations,
  COUNT(*) FILTER (WHERE selected_recipe_id IS NOT NULL AND ai_generation_triggered = true) as successful_generations,
  COUNT(*) FILTER (WHERE selected_recipe_id IS NULL AND ai_generation_triggered = true) as unused_generations
FROM recipe_search_logs
WHERE created_at >= NOW() - INTERVAL '7 days';
```

**Recipe Usage Analytics:**
```sql
SELECT 
  r.id,
  r.name,
  COUNT(ral.id) FILTER (WHERE ral.action = 'viewed') as views,
  COUNT(ral.id) FILTER (WHERE ral.action = 'added_to_plan') as added_to_plan,
  COUNT(ral.id) FILTER (WHERE ral.action = 'favorited') as favorites,
  COUNT(ral.id) FILTER (WHERE ral.action = 'forked') as forks
FROM recipes r
LEFT JOIN recipe_audit_logs ral ON ral.recipe_id = r.id
WHERE r.is_public = true
GROUP BY r.id, r.name
ORDER BY views DESC
LIMIT 20;
```

### 6.4 Learning Signals

**Signals for Recipe Ranking:**
- Search frequency (how often recipe appears in results)
- Selection rate (how often recipe is selected when shown)
- Usage rate (how often recipe is added to meal plans)
- Fork rate (how often recipe is forked)
- Feedback (ratings, tags from users)

**Signals for Search Improvement:**
- Search miss rate (queries with no results)
- AI generation rate (how often AI is triggered)
- Unused generations (AI recipes that are never selected)
- Query patterns (common search terms)

**Signals for Quality:**
- Recipe usage over time (declining = low quality?)
- Fork rate (high = recipe needs customization?)
- Feedback patterns (consistent negative feedback = needs improvement?)

---

## 7. Design Principles

### 7.1 Search Before Creation

**Principle:** Every recipe interaction starts with search.

**Rationale:**
- Prevents duplicate recipes
- Leverages existing knowledge
- Faster for users
- Builds better global database

**Enforcement:**
- UI always shows search first
- Service layer enforces search before generation
- Audit logs track search → generation flow

### 7.2 Global Truth, Local Flexibility

**Principle:** Global database is authoritative, but users can customize locally.

**Rationale:**
- Global database maintains quality and consistency
- Local customization allows personalization
- Forking preserves global recipe while allowing edits

**Enforcement:**
- Global recipes are immutable (users can't edit)
- Private recipes are mutable (users can edit)
- Forking creates private copy, preserves global original

### 7.3 AI as Augmentation, Not Authority

**Principle:** AI generates recipes, but users validate and use them.

**Rationale:**
- AI is a tool, not a decision-maker
- Users choose whether to use AI-generated recipes
- AI recipes are validated before being trusted

**Enforcement:**
- AI recipes start as 'pending' validation
- Users can reject AI-generated recipes
- Usage patterns inform AI recipe quality

### 7.4 No Irreversible Schema Decisions

**Principle:** Design allows for future changes without breaking existing data.

**Rationale:**
- Product requirements evolve
- User needs change
- Technology improves

**Enforcement:**
- Soft deletes (not hard deletes)
- Versioning (preserve history)
- Extensible metadata (JSONB fields)
- Audit logs (preserve all actions)

### 7.5 ADHD-Friendly: Low Friction, Low Pressure

**Principle:** System is optional, calm, and supportive.

**Rationale:**
- No pressure to create recipes
- No guilt for not planning
- No required fields
- No warnings or red states

**Enforcement:**
- Search is optional (user can skip)
- AI generation is optional (user chooses)
- Private creation is optional (advanced feature)
- All actions are logged but never required

---

## 8. Implementation Considerations

### 8.1 Migration Path

**From Current System:**
1. Existing `meal_library` recipes can be migrated to global `recipes` table
2. Set `is_public = true`, `household_id = null`, `source_type = 'import'`
3. Preserve existing meal plans (reference both old and new systems during transition)

### 8.2 Performance Considerations

**Search Performance:**
- Use GIN indexes on recipe name (trigram)
- Use GIN indexes on ingredients (JSONB)
- Cache popular search results
- Debounce search queries (client-side)

**AI Generation Performance:**
- Queue generation jobs (don't block user)
- Show progress indicator
- Cache generated recipes (if same query)
- Rate limit AI API calls

### 8.3 Cost Considerations

**AI API Costs:**
- Only generate when search fails (reduces calls)
- Cache similar queries
- Batch ingredient mapping
- Monitor generation rate

**Database Costs:**
- Index search logs appropriately
- Archive old audit logs (keep recent for analytics)
- Use materialized views for common analytics queries

### 8.4 Security Considerations

**Data Privacy:**
- Search logs are user-specific (RLS enforced)
- Audit logs are user-specific (RLS enforced)
- Private recipes are household-scoped (RLS enforced)

**AI Generation:**
- Don't log sensitive user data in prompts
- Sanitize user input before sending to AI
- Validate AI responses before saving

---

## 9. Success Metrics

### 9.1 Search Effectiveness

**Metrics:**
- Search hit rate: % of searches that find results
- Search miss rate: % of searches with no results
- Selection rate: % of searches where user selects a result
- Average results per search

**Targets:**
- Search hit rate: >70%
- Selection rate: >50%
- Average results: 3-10 per search

### 9.2 AI Generation Quality

**Metrics:**
- Generation rate: % of searches that trigger AI
- Generation success rate: % of AI recipes that are selected
- Unused generation rate: % of AI recipes never selected
- Generation quality score: Average quality score of AI recipes

**Targets:**
- Generation rate: <30% (most searches find results)
- Generation success rate: >60%
- Unused generation rate: <20%

### 9.3 User Engagement

**Metrics:**
- Recipes viewed per user
- Recipes added to meal plans per user
- Fork rate: % of recipes that are forked
- Private creation rate: % of users who create private recipes

**Targets:**
- Average recipes viewed: >5 per user per month
- Average recipes added: >3 per user per month
- Fork rate: 5-10%
- Private creation rate: <10%

### 9.4 Database Quality

**Metrics:**
- Duplicate rate: % of recipes that are duplicates
- Validation pass rate: % of recipes that pass validation
- Recipe usage diversity: How many unique recipes are used
- Recipe freshness: % of recipes used in last 30 days

**Targets:**
- Duplicate rate: <5%
- Validation pass rate: >85%
- Usage diversity: >50% of recipes used at least once
- Freshness: >30% of recipes used in last 30 days

---

## 10. Non-Goals (Explicitly Excluded)

### 10.1 UI Components

**Not Included:**
- React component designs
- CSS/styling specifications
- Mobile vs desktop layouts
- Animation specifications

**Rationale:** This is a backend/architecture design document. UI design is separate.

### 10.2 Full SQL Migrations

**Not Included:**
- Complete SQL DDL statements
- All indexes and constraints
- All triggers and functions
- Migration scripts

**Rationale:** Conceptual design first. SQL implementation comes later.

### 10.3 Prompt Engineering Details

**Not Included:**
- Exact AI prompts
- Prompt templates
- Prompt optimization strategies
- Model-specific configurations

**Rationale:** Prompt engineering is implementation detail. Architecture supports any prompt strategy.

### 10.4 Cost Optimization

**Not Included:**
- AI API cost calculations
- Database storage cost estimates
- Caching strategies for cost reduction
- Rate limiting for cost control

**Rationale:** Cost optimization is operational concern. Architecture supports cost-effective implementation.

---

## 11. Future Considerations

### 11.1 Recipe Recommendations

**Potential Enhancement:**
- Recommend recipes based on search history
- Recommend recipes based on pantry
- Recommend recipes based on user preferences

**Architecture Support:**
- Audit logs provide learning signals
- Search logs provide query patterns
- Service layer can be extended with recommendation service

### 11.2 Recipe Collaboration

**Potential Enhancement:**
- Users can suggest improvements to global recipes
- Users can vote on recipe variations
- Community-driven recipe evolution

**Architecture Support:**
- Forking provides foundation for variations
- Audit logs track user preferences
- Service layer can be extended with collaboration features

### 11.3 Recipe Import/Export

**Potential Enhancement:**
- Import recipes from external sources
- Export recipes to other formats
- Bulk import/export

**Architecture Support:**
- Source tracking supports import provenance
- Service layer can be extended with import/export services
- Versioning preserves import history

---

## 12. Conclusion

This design document defines a search-first recipe workflow system that:

1. **Prioritizes Search:** All recipe discovery starts with searching the global database
2. **Augments with AI:** AI generation occurs only when search fails
3. **Maintains Global Database:** All AI-generated recipes are public and global
4. **Allows Local Customization:** Users can create private recipes or fork global ones
5. **Logs Everything:** Comprehensive audit trail for analytics and learning

The architecture is:
- **Scalable:** Supports growth in recipes and users
- **Flexible:** Allows future enhancements without breaking changes
- **Secure:** RLS policies enforce access control
- **Auditable:** Complete logging for compliance and learning
- **ADHD-Friendly:** Low friction, low pressure, optional interactions

**Next Steps:**
1. Review and approve design
2. Create detailed SQL migrations
3. Implement service layer
4. Build UI components
5. Test and iterate

---

**End of Design Document**
