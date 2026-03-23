# Recipe Generator System - Implementation Plan

**Version:** 1.0  
**Date:** 2025-02-23  
**Status:** Planning Phase  
**Related Document:** `RECIPE_GENERATOR_DATABASE_DESIGN.md`

---

## Executive Summary

This document provides a phased implementation plan for the Recipe Generator Database System. The implementation is designed to be incremental, allowing for early value delivery while building toward a complete system. Each phase builds upon the previous, with clear milestones and success criteria.

**Timeline Estimate:** 8-12 weeks (depending on team size and priorities)  
**Team Requirements:** 1-2 Backend Engineers, 1 Frontend Engineer (part-time), 1 QA Engineer (part-time)

---

## Table of Contents

1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Phase 1: Foundation & Core Tables](#2-phase-1-foundation--core-tables)
3. [Phase 2: Basic Recipe Operations](#3-phase-2-basic-recipe-operations)
4. [Phase 3: AI Generation Pipeline](#4-phase-3-ai-generation-pipeline)
5. [Phase 4: Validation & Quality Assurance](#5-phase-4-validation--quality-assurance)
6. [Phase 5: Duplicate Detection](#6-phase-5-duplicate-detection)
7. [Phase 6: Learning & Analytics](#7-phase-6-learning--analytics)
8. [Phase 7: Integration & Migration](#8-phase-7-integration--migration)
9. [Testing Strategy](#9-testing-strategy)
10. [Rollout Plan](#10-rollout-plan)
11. [Risk Mitigation](#11-risk-mitigation)
12. [Success Metrics](#12-success-metrics)

---

## 1. Prerequisites & Setup

### 1.1 Environment Requirements

**Database:**
- Supabase/PostgreSQL 14+ with extensions:
  - `pg_trgm` (trigram similarity)
  - `uuid-ossp` (UUID generation)
  - `pgcrypto` (if encryption needed)

**Application:**
- Node.js 18+ (TypeScript)
- Supabase Client SDK
- Access to AI API (OpenAI/Anthropic)

**Development Tools:**
- Database migration tool (Supabase CLI)
- TypeScript for type safety
- Testing framework (Jest/Vitest)

### 1.2 Initial Setup Tasks

**Week 0 (Setup):**

- [ ] **Task 1.1**: Review and approve database design document
  - **Owner**: Tech Lead + Product Manager
  - **Duration**: 2 hours
  - **Deliverable**: Signed-off design document

- [ ] **Task 1.2**: Set up development environment
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Deliverable**: Local Supabase instance running, migrations folder structure

- [ ] **Task 1.3**: Create feature branch and project structure
  - **Owner**: Backend Engineer
  - **Duration**: 2 hours
  - **Deliverable**: Git branch `feature/recipe-generator`, folder structure

- [ ] **Task 1.4**: Set up AI API credentials (if not already)
  - **Owner**: Backend Engineer
  - **Duration**: 1 hour
  - **Deliverable**: API keys stored in environment variables

- [ ] **Task 1.5**: Create TypeScript types/interfaces
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Deliverable**: Type definitions matching database schema

**Dependencies:** None  
**Blockers:** None  
**Success Criteria:** All setup tasks completed, team can start Phase 1

---

## 2. Phase 1: Foundation & Core Tables

**Duration:** 1-2 weeks  
**Goal:** Create core database schema and basic infrastructure

### 2.1 Database Schema Creation

**Week 1:**

- [ ] **Task 2.1**: Create core tables migration
  - **Owner**: Backend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Create `recipes` table
    - Create `recipe_sources` table
    - Create `recipe_versions` table
    - Add all indexes
    - Add constraints and foreign keys
  - **Deliverable**: Migration file `20250223_000001_create_recipe_core_tables.sql`

- [ ] **Task 2.2**: Create enums and types
  - **Owner**: Backend Engineer
  - **Duration**: 2 hours
  - **Tasks:**
    - Create `meal_type` enum (if not exists)
    - Create `meal_category` enum (if not exists)
    - Create `cuisine_type` enum (if not exists)
    - Create `cooking_difficulty` enum (if not exists)
  - **Deliverable**: Migration file with enum definitions

- [ ] **Task 2.3**: Create ingredient validation trigger
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Create `validate_recipe_ingredients()` function
    - Create trigger on `recipes` table
    - Test with valid/invalid ingredients
  - **Deliverable**: Migration file with trigger

- [ ] **Task 2.4**: Set up RLS policies (basic)
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Create SELECT policy (view recipes)
    - Create INSERT policy (create recipes)
    - Create UPDATE policy (edit recipes)
    - Create DELETE policy (soft delete)
  - **Deliverable**: Migration file with RLS policies

- [ ] **Task 2.5**: Run migration and verify
  - **Owner**: Backend Engineer + QA
  - **Duration**: 2 hours
  - **Tasks:**
    - Run migration on dev database
    - Verify tables created correctly
    - Verify indexes created
    - Verify RLS enabled
  - **Deliverable**: Verified database schema

### 2.2 TypeScript Service Layer

**Week 1-2:**

- [ ] **Task 2.6**: Create recipe service functions
  - **Owner**: Backend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - `createRecipe()` - Create new recipe
    - `getRecipeById()` - Get recipe by ID
    - `updateRecipe()` - Update recipe (creates new version)
    - `deleteRecipe()` - Soft delete recipe
    - `listRecipes()` - List recipes with filters
  - **Deliverable**: `src/lib/recipeService.ts`

- [ ] **Task 2.7**: Create recipe source service
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - `createRecipeSource()` - Create source record
    - `getRecipeSourceById()` - Get source by ID
  - **Deliverable**: Functions in `recipeService.ts`

- [ ] **Task 2.8**: Create recipe version service
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - `createRecipeVersion()` - Create version snapshot
    - `getRecipeVersions()` - Get version history
    - `getCurrentVersion()` - Get current active version
  - **Deliverable**: Functions in `recipeService.ts`

### 2.3 Testing

- [ ] **Task 2.9**: Write unit tests for services
  - **Owner**: Backend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Test recipe CRUD operations
    - Test ingredient validation
    - Test RLS policies
  - **Deliverable**: Test suite with >80% coverage

**Dependencies:** Prerequisites completed  
**Blockers:** None  
**Success Criteria:**
- All tables created and verified
- RLS policies working
- Basic CRUD operations functional
- Tests passing

---

## 3. Phase 2: Basic Recipe Operations

**Duration:** 1 week  
**Goal:** Enable users to create, view, and manage recipes

### 3.1 Frontend Integration

**Week 2-3:**

- [ ] **Task 3.1**: Create recipe form component
  - **Owner**: Frontend Engineer
  - **Duration**: 12 hours
  - **Tasks:**
    - Recipe name, description, meal type
    - Ingredient selector (with `food_item_id` lookup)
    - Instructions textarea
    - Metadata fields (categories, cuisine, difficulty, times)
    - Nutrition fields (optional, hidden by default)
  - **Deliverable**: `src/components/recipes/RecipeForm.tsx`

- [ ] **Task 3.2**: Create recipe detail view
  - **Owner**: Frontend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Display recipe information
    - Show ingredients with food item names
    - Show instructions
    - Display metadata (categories, cuisine, etc.)
    - Edit/Delete actions
  - **Deliverable**: `src/components/recipes/RecipeDetail.tsx`

- [ ] **Task 3.3**: Create recipe list view
  - **Owner**: Frontend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Grid/list view of recipes
    - Filtering (meal type, categories, cuisine)
    - Search functionality
    - Pagination
  - **Deliverable**: `src/components/recipes/RecipeList.tsx`

- [ ] **Task 3.4**: Integrate with meal planner
  - **Owner**: Frontend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Update `AddMealBottomSheet` to show recipes
    - Allow selecting recipes from new system
    - Update `meal_plans` to reference `recipes.id`
  - **Deliverable**: Updated meal planner components

### 3.2 Ingredient Management

- [ ] **Task 3.5**: Create ingredient selector component
  - **Owner**: Frontend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Search/filter `food_items` table
    - Select food item (returns `food_item_id`)
    - Add quantity, unit, optional flag
    - Support substitutions
  - **Deliverable**: `src/components/recipes/IngredientSelector.tsx`

- [ ] **Task 3.6**: Create food item lookup service
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - `searchFoodItems()` - Fuzzy search food items
    - `getFoodItemById()` - Get food item details
    - Use `pg_trgm` for fuzzy matching
  - **Deliverable**: `src/lib/foodItemService.ts`

### 3.3 Testing

- [ ] **Task 3.7**: Integration tests
  - **Owner**: QA Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Test recipe creation flow
    - Test ingredient selection
    - Test recipe display
    - Test meal planner integration
  - **Deliverable**: Integration test suite

**Dependencies:** Phase 1 completed  
**Blockers:** None  
**Success Criteria:**
- Users can create recipes via UI
- Users can view recipe details
- Users can add recipes to meal plans
- All tests passing

---

## 4. Phase 3: AI Generation Pipeline

**Duration:** 2 weeks  
**Goal:** Enable AI-powered recipe generation

### 4.1 Job System

**Week 3-4:**

- [ ] **Task 4.1**: Create `recipe_generation_jobs` table
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Create table migration
    - Add indexes
    - Add RLS policies
  - **Deliverable**: Migration file

- [ ] **Task 4.2**: Create job service
  - **Owner**: Backend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - `createGenerationJob()` - Create job
    - `getJobStatus()` - Get job status
    - `updateJobStatus()` - Update job status
    - `listJobs()` - List user's jobs
  - **Deliverable**: `src/lib/recipeGenerationService.ts`

### 4.2 AI Integration

**Week 4:**

- [ ] **Task 4.3**: Create AI prompt builder
  - **Owner**: Backend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Build prompt from user request
    - Include pantry context (if provided)
    - Include dietary preferences
    - Include meal type and constraints
  - **Deliverable**: `src/lib/ai/promptBuilder.ts`

- [ ] **Task 4.4**: Create AI client wrapper
  - **Owner**: Backend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Wrap OpenAI/Anthropic API
    - Handle rate limiting
    - Handle errors and retries
    - Parse AI response to recipe JSON
  - **Deliverable**: `src/lib/ai/aiClient.ts`

- [ ] **Task 4.5**: Create ingredient mapper
  - **Owner**: Backend Engineer
  - **Duration**: 10 hours
  - **Tasks:**
    - Parse AI ingredient strings
    - Map to `food_item_id` using fuzzy matching
    - Use AI to assist with ambiguous ingredients
    - Handle unmapped ingredients (flag for review)
  - **Deliverable**: `src/lib/ai/ingredientMapper.ts`

- [ ] **Task 4.6**: Create job processor
  - **Owner**: Backend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Process pending jobs
    - Call AI API
    - Map ingredients
    - Create recipe and version
    - Update job status
  - **Deliverable**: `src/lib/ai/jobProcessor.ts`

### 4.3 Background Processing

**Week 4-5:**

- [ ] **Task 4.7**: Set up job queue (Supabase Edge Functions or external)
  - **Owner**: Backend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Choose queue system (Supabase Edge Functions, BullMQ, etc.)
    - Set up worker process
    - Handle job retries
    - Handle failures
  - **Deliverable**: Job queue system operational

- [ ] **Task 4.8**: Create job polling/notification
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Real-time updates via Supabase Realtime
    - Or polling mechanism for job status
  - **Deliverable**: Real-time job status updates

### 4.4 Frontend Integration

**Week 5:**

- [ ] **Task 4.9**: Create AI generation UI
  - **Owner**: Frontend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Generation request form
    - Job status display
    - Recipe preview after generation
    - Accept/reject generated recipe
  - **Deliverable**: `src/components/recipes/AIRecipeGenerator.tsx`

- [ ] **Task 4.10**: Integrate with meal planner
  - **Owner**: Frontend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Add "Generate Recipe" option in meal planner
    - Show generated recipes in suggestions
  - **Deliverable**: Updated meal planner components

### 4.5 Testing

- [ ] **Task 4.11**: Test AI generation flow
  - **Owner**: QA Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Test job creation
    - Test AI API integration
    - Test ingredient mapping
    - Test error handling
    - Test job retries
  - **Deliverable**: Test suite

**Dependencies:** Phase 2 completed  
**Blockers:** AI API access, rate limits  
**Success Criteria:**
- Users can request AI recipe generation
- Jobs process successfully
- Ingredients are mapped correctly
- Generated recipes are usable

---

## 5. Phase 4: Validation & Quality Assurance

**Duration:** 1 week  
**Goal:** Ensure recipe quality and safety

### 5.1 Validation System

**Week 5-6:**

- [ ] **Task 5.1**: Create `recipe_validation_status` table
  - **Owner**: Backend Engineer
  - **Duration**: 3 hours
  - **Tasks:**
    - Create table migration
    - Add indexes
  - **Deliverable**: Migration file

- [ ] **Task 5.2**: Create validation service
  - **Owner**: Backend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - `validateRecipe()` - Run all validation checks
    - `checkIngredientMapping()` - Verify all ingredients mapped
    - `checkInstructionCompleteness()` - Verify instructions exist
    - `checkQuantitySanity()` - Flag unrealistic quantities
    - `checkSourceAccessibility()` - Verify source URL (if applicable)
    - `calculateQualityScore()` - Compute overall quality score
  - **Deliverable**: `src/lib/recipeValidationService.ts`

- [ ] **Task 5.3**: Create validation triggers
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Auto-validate on recipe creation
    - Auto-validate on recipe update
    - Update validation status
  - **Deliverable**: Migration file with triggers

### 5.2 Review Queue

- [ ] **Task 5.4**: Create review queue UI
  - **Owner**: Frontend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - List recipes needing review
    - Show validation issues
    - Allow approve/reject actions
    - Allow editing before approval
  - **Deliverable**: `src/components/recipes/ReviewQueue.tsx`

- [ ] **Task 5.5**: Create validation status indicators
  - **Owner**: Frontend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Show validation status badges
    - Show quality score
    - Indicate if review needed
  - **Deliverable**: Updated recipe components

### 5.3 Testing

- [ ] **Task 5.6**: Test validation system
  - **Owner**: QA Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Test validation checks
    - Test quality score calculation
    - Test review workflow
  - **Deliverable**: Test suite

**Dependencies:** Phase 3 completed  
**Blockers:** None  
**Success Criteria:**
- Recipes are automatically validated
- Quality scores are calculated
- Review queue is functional
- Low-quality recipes are flagged

---

## 6. Phase 5: Duplicate Detection

**Duration:** 1.5 weeks  
**Goal:** Prevent and handle duplicate recipes

### 6.1 Duplicate Detection System

**Week 6-7:**

- [ ] **Task 6.1**: Create `recipe_duplicates` table
  - **Owner**: Backend Engineer
  - **Duration**: 3 hours
  - **Tasks:**
    - Create table migration
    - Add indexes
    - Add constraints
  - **Deliverable**: Migration file

- [ ] **Task 6.2**: Create similarity calculation functions
  - **Owner**: Backend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - `calculate_name_similarity()` - Trigram similarity
    - `calculate_ingredient_similarity()` - Jaccard similarity
    - `calculate_combined_similarity()` - Weighted combination
    - Test functions with various inputs
  - **Deliverable**: Migration file with functions

- [ ] **Task 6.3**: Create duplicate detection function
  - **Owner**: Backend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - `detect_recipe_duplicates()` - Main detection function
    - Compare against household + public recipes
    - Store duplicate records
    - Return similarity scores
  - **Deliverable**: Migration file with function

- [ ] **Task 6.4**: Create detection trigger
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Trigger on recipe insert
    - Call detection function
    - Create duplicate records
  - **Deliverable**: Migration file with trigger

### 6.2 Merge System

**Week 7:**

- [ ] **Task 6.5**: Create merge function
  - **Owner**: Backend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - `merge_recipe_duplicates()` - Merge two recipes
    - Aggregate usage stats
    - Transfer favorites
    - Update meal plans
    - Deprecate duplicate
  - **Deliverable**: Migration file with function

- [ ] **Task 6.6**: Create merge service
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - `mergeRecipes()` - Service wrapper
    - Handle errors
    - Log merge actions
  - **Deliverable**: `src/lib/recipeMergeService.ts`

### 6.3 Frontend Integration

**Week 7:**

- [ ] **Task 6.7**: Create duplicate review UI
  - **Owner**: Frontend Engineer
  - **Duration**: 10 hours
  - **Tasks:**
    - Show duplicate notifications
    - Side-by-side comparison view
    - Highlight differences
    - Merge/Keep Separate actions
  - **Deliverable**: `src/components/recipes/DuplicateReview.tsx`

- [ ] **Task 6.8**: Create duplicate detection UI
  - **Owner**: Frontend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Show potential duplicates when creating recipe
    - Suggest existing recipes
    - Allow user to proceed or use existing
  - **Deliverable**: Updated recipe form

### 6.4 Batch Processing

- [ ] **Task 6.9**: Create batch duplicate detection job
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Scheduled job to detect duplicates
    - Compare recipes that haven't been checked
    - Create duplicate records
  - **Deliverable**: Scheduled job/function

### 6.5 Testing

- [ ] **Task 6.10**: Test duplicate detection
  - **Owner**: QA Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Test name similarity
    - Test ingredient similarity
    - Test combined similarity
    - Test merge workflow
    - Test false positive handling
  - **Deliverable**: Test suite

**Dependencies:** Phase 2 completed  
**Blockers:** None  
**Success Criteria:**
- Duplicates are detected automatically
- Users can review and merge duplicates
- Merge workflow preserves data
- False positives can be rejected

---

## 7. Phase 6: Learning & Analytics

**Duration:** 1.5 weeks  
**Goal:** Enable recipe learning and popularity tracking

### 7.1 Feedback System

**Week 7-8:**

- [ ] **Task 7.1**: Create `recipe_feedback` table
  - **Owner**: Backend Engineer
  - **Duration**: 2 hours
  - **Tasks:**
    - Create table migration
    - Add indexes
  - **Deliverable**: Migration file

- [ ] **Task 7.2**: Create feedback service
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - `submitFeedback()` - Submit user feedback
    - `getRecipeFeedback()` - Get feedback for recipe
    - `updateFeedback()` - Update existing feedback
  - **Deliverable**: `src/lib/recipeFeedbackService.ts`

- [ ] **Task 7.3**: Create feedback UI
  - **Owner**: Frontend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Optional rating (1-5 stars)
    - Feedback tags (loved_it, too_complex, etc.)
    - Free-form notes
    - "Made this recipe" button
  - **Deliverable**: `src/components/recipes/RecipeFeedback.tsx`

### 7.2 Usage Statistics

**Week 8:**

- [ ] **Task 7.4**: Create `recipe_usage_stats` table
  - **Owner**: Backend Engineer
  - **Duration**: 2 hours
  - **Tasks:**
    - Create table migration
    - Add indexes
  - **Deliverable**: Migration file

- [ ] **Task 7.5**: Create stats update triggers
  - **Owner**: Backend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Trigger on `meal_plans` insert (increment `times_added_to_plan`)
    - Trigger on recipe view (increment `times_viewed`)
    - Trigger on `meal_favourites` insert (increment `times_favorited`)
    - Update `last_*` timestamps
  - **Deliverable**: Migration file with triggers

- [ ] **Task 7.6**: Create popularity score calculation
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Calculate popularity score
    - Update score on stats change
    - Consider recency weighting
  - **Deliverable**: Function to calculate popularity

- [ ] **Task 7.7**: Create stats aggregation job
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Aggregate stats by period (daily, weekly, monthly)
    - Calculate trends
    - Update period-based records
  - **Deliverable**: Scheduled job

### 7.3 Learning Integration

**Week 8:**

- [ ] **Task 7.8**: Integrate feedback into popularity
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Weight feedback in popularity score
    - Consider feedback tags
    - Update score calculation
  - **Deliverable**: Updated popularity calculation

- [ ] **Task 7.9**: Create recipe suggestions
  - **Owner**: Backend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Suggest recipes based on popularity
    - Consider user's historical preferences
    - Consider household preferences
  - **Deliverable**: `src/lib/recipeSuggestionService.ts`

### 7.4 Frontend Integration

- [ ] **Task 7.10**: Show popularity in UI
  - **Owner**: Frontend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Display popularity score
    - Show usage stats
    - Show trending indicators
  - **Deliverable**: Updated recipe components

### 7.5 Testing

- [ ] **Task 7.11**: Test learning system
  - **Owner**: QA Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Test feedback submission
    - Test stats updates
    - Test popularity calculation
    - Test suggestions
  - **Deliverable**: Test suite

**Dependencies:** Phase 2 completed  
**Blockers:** None  
**Success Criteria:**
- Users can provide feedback
- Usage stats are tracked
- Popularity scores are calculated
- Recipe suggestions work

---

## 8. Phase 7: Integration & Migration

**Duration:** 1.5 weeks  
**Goal:** Integrate with existing meal planner and migrate data

### 8.1 Meal Planner Integration

**Week 8-9:**

- [ ] **Task 8.1**: Update `meal_plans` table
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Add `recipe_id` column (nullable)
    - Keep `meal_id` for backward compatibility
    - Add foreign key to `recipes` table
    - Update RLS policies
  - **Deliverable**: Migration file

- [ ] **Task 8.2**: Update meal planner service
  - **Owner**: Backend Engineer
  - **Duration**: 6 hours
  - **Tasks:**
    - Support both `meal_id` and `recipe_id`
    - Prioritize `recipe_id` if both exist
    - Update queries to join recipes
  - **Deliverable**: Updated `mealPlanner.ts`

- [ ] **Task 8.3**: Update meal planner UI
  - **Owner**: Frontend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Show recipes in meal planner
    - Allow selecting from new recipe system
    - Handle both old and new systems
  - **Deliverable**: Updated meal planner components

### 8.2 Data Migration

**Week 9:**

- [ ] **Task 8.4**: Create migration script for `meal_library`
  - **Owner**: Backend Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Read from `meal_library` table
    - Map ingredients to `food_item_id`
    - Create `recipes` records
    - Create `recipe_sources` records
    - Preserve metadata
  - **Deliverable**: Migration script

- [ ] **Task 8.5**: Test migration on staging
  - **Owner**: Backend Engineer + QA
  - **Duration**: 4 hours
  - **Tasks:**
    - Run migration on staging data
    - Verify data integrity
    - Check ingredient mapping
    - Verify RLS policies
  - **Deliverable**: Migration verified

- [ ] **Task 8.6**: Create rollback plan
  - **Owner**: Backend Engineer
  - **Duration**: 2 hours
  - **Tasks:**
    - Document rollback steps
    - Create rollback script (if needed)
  - **Deliverable**: Rollback documentation

### 8.3 Feature Flags

- [ ] **Task 8.7**: Add feature flags
  - **Owner**: Backend Engineer
  - **Duration**: 4 hours
  - **Tasks:**
    - Add flag for new recipe system
    - Add flag for AI generation
    - Add flag for duplicate detection
    - Control rollout percentage
  - **Deliverable**: Feature flag system

### 8.4 Testing

- [ ] **Task 8.8**: Integration testing
  - **Owner**: QA Engineer
  - **Duration**: 8 hours
  - **Tasks:**
    - Test meal planner with new recipes
    - Test migration script
    - Test backward compatibility
    - Test feature flags
  - **Deliverable**: Integration test suite

**Dependencies:** All previous phases completed  
**Blockers:** None  
**Success Criteria:**
- Meal planner works with new recipe system
- Migration completed successfully
- Backward compatibility maintained
- Feature flags working

---

## 9. Testing Strategy

### 9.1 Unit Testing

**Coverage Requirements:**
- Service functions: >80% coverage
- Database functions: >90% coverage
- Utility functions: >90% coverage

**Key Areas:**
- Recipe CRUD operations
- Ingredient validation
- Similarity calculations
- Popularity score calculation
- Merge operations

### 9.2 Integration Testing

**Test Scenarios:**
1. **Recipe Creation Flow**
   - Create recipe via UI
   - Verify database record
   - Verify RLS policies
   - Verify validation

2. **AI Generation Flow**
   - Create generation job
   - Process job
   - Verify recipe created
   - Verify ingredient mapping

3. **Duplicate Detection Flow**
   - Create duplicate recipe
   - Verify detection
   - Test merge workflow

4. **Meal Planner Integration**
   - Add recipe to meal plan
   - Verify meal plan updated
   - Verify recipe linked correctly

### 9.3 Performance Testing

**Key Metrics:**
- Recipe list query: <200ms
- "What can I make?" query: <500ms
- Duplicate detection: <1s per recipe
- AI generation: <30s (depends on API)

**Load Testing:**
- 1000 recipes in database
- 100 concurrent users
- Test query performance
- Test write performance

### 9.4 Security Testing

**Areas to Test:**
- RLS policies (users can't access other households' recipes)
- Input validation (prevent SQL injection, XSS)
- API rate limiting
- AI API key security

---

## 10. Rollout Plan

### 10.1 Phased Rollout

**Phase 1: Internal Testing (Week 9)**
- Deploy to staging environment
- Internal team testing
- Fix critical bugs
- **Duration:** 1 week

**Phase 2: Beta Testing (Week 10)**
- Enable for 10% of users (via feature flag)
- Monitor errors and performance
- Collect feedback
- **Duration:** 1 week

**Phase 3: Gradual Rollout (Week 11)**
- Increase to 25% of users
- Monitor metrics
- Fix issues
- **Duration:** 1 week

**Phase 4: Full Rollout (Week 12)**
- Enable for 100% of users
- Monitor closely for first 48 hours
- **Duration:** Ongoing

### 10.2 Rollback Plan

**Triggers for Rollback:**
- Critical bugs affecting >5% of users
- Performance degradation (>2s query times)
- Data integrity issues
- Security vulnerabilities

**Rollback Steps:**
1. Disable feature flags
2. Revert to `meal_library` system
3. Investigate issues
4. Fix and re-test
5. Re-enable gradually

---

## 11. Risk Mitigation

### 11.1 Technical Risks

**Risk 1: AI API Rate Limits**
- **Impact:** High
- **Probability:** Medium
- **Mitigation:**
  - Implement rate limiting
  - Queue jobs if rate limited
  - Have fallback AI provider
  - Cache common requests

**Risk 2: Ingredient Mapping Failures**
- **Impact:** Medium
- **Probability:** High
- **Mitigation:**
  - Flag unmapped ingredients for review
  - Use AI to assist mapping
  - Allow manual mapping
  - Learn from user corrections

**Risk 3: Performance Issues**
- **Impact:** High
- **Probability:** Medium
- **Mitigation:**
  - Add proper indexes
  - Use materialized views for complex queries
  - Implement caching
  - Monitor query performance

**Risk 4: Duplicate Detection False Positives**
- **Impact:** Low
- **Probability:** Medium
- **Mitigation:**
  - Require user confirmation before merge
  - Learn from rejections
  - Adjust thresholds based on feedback
  - Allow "not a duplicate" marking

### 11.2 Data Risks

**Risk 5: Data Loss During Migration**
- **Impact:** Critical
- **Probability:** Low
- **Mitigation:**
  - Backup database before migration
  - Test migration on staging
  - Create rollback script
  - Verify data integrity after migration

**Risk 6: RLS Policy Issues**
- **Impact:** High
- **Probability:** Low
- **Mitigation:**
  - Thoroughly test RLS policies
  - Use security definer functions carefully
  - Audit access logs
  - Regular security reviews

### 11.3 Product Risks

**Risk 7: User Confusion (Old vs New System)**
- **Impact:** Medium
- **Probability:** Medium
- **Mitigation:**
  - Clear UI indicators
  - Gradual migration
  - User education
  - Support documentation

**Risk 8: Low Adoption**
- **Impact:** Medium
- **Probability:** Low
- **Mitigation:**
  - Make new system clearly better
  - Provide migration incentives
  - Gather user feedback
  - Iterate based on feedback

---

## 12. Success Metrics

### 12.1 Technical Metrics

**Performance:**
- Recipe list query: <200ms (p95)
- "What can I make?" query: <500ms (p95)
- AI generation: <30s (p95)
- Duplicate detection: <1s per recipe

**Reliability:**
- API uptime: >99.9%
- Error rate: <0.1%
- Job success rate: >95%

**Data Quality:**
- Ingredient mapping success: >90%
- Validation pass rate: >85%
- Duplicate detection accuracy: >80%

### 12.2 Product Metrics

**Adoption:**
- % of users creating recipes: >20%
- % of users using AI generation: >10%
- % of meal plans using new recipes: >50%

**Engagement:**
- Average recipes per user: >5
- Average feedback submissions: >2 per user
- Recipe reuse rate: >30%

**Quality:**
- Average recipe quality score: >0.7
- User satisfaction (feedback): >4.0/5.0
- Recipe completion rate: >60%

### 12.3 Business Metrics

**Efficiency:**
- Time to create recipe: <5 minutes
- Time to generate AI recipe: <2 minutes
- Reduction in duplicate recipes: >50%

**Cost:**
- AI API costs: <$X per month (set budget)
- Database storage: <X GB (set limit)

---

## 13. Post-Launch

### 13.1 Monitoring

**Key Metrics to Monitor:**
- Error rates
- Query performance
- AI generation success rate
- Duplicate detection accuracy
- User feedback

**Tools:**
- Supabase Dashboard (database metrics)
- Application logs
- Error tracking (Sentry, etc.)
- Analytics (user behavior)

### 13.2 Iteration Plan

**Month 1:**
- Fix critical bugs
- Improve performance
- Gather user feedback

**Month 2-3:**
- Improve AI generation quality
- Refine duplicate detection
- Add requested features

**Ongoing:**
- Monitor metrics
- Iterate based on data
- Add new features as needed

---

## 14. Dependencies & Resources

### 14.1 External Dependencies

- **Supabase/PostgreSQL**: Database infrastructure
- **AI API (OpenAI/Anthropic)**: Recipe generation
- **Food Items System**: Ingredient mapping (existing)

### 14.2 Team Resources

- **Backend Engineer**: 8-10 weeks (full-time)
- **Frontend Engineer**: 3-4 weeks (part-time)
- **QA Engineer**: 2-3 weeks (part-time)
- **Tech Lead**: 1-2 hours/week (review)

### 14.3 Budget Estimates

- **Development Time**: X hours × $Y/hour = $Z
- **AI API Costs**: ~$X/month (estimate based on usage)
- **Database Storage**: Included in Supabase plan

---

## 15. Appendix

### 15.1 Migration Checklist

**Pre-Migration:**
- [ ] Backup production database
- [ ] Test migration on staging
- [ ] Verify rollback plan
- [ ] Schedule maintenance window
- [ ] Notify users (if needed)

**Migration:**
- [ ] Run migration scripts
- [ ] Verify data integrity
- [ ] Test critical paths
- [ ] Monitor for errors

**Post-Migration:**
- [ ] Verify all systems working
- [ ] Monitor metrics
- [ ] Gather user feedback
- [ ] Document any issues

### 15.2 Code Review Checklist

**Database:**
- [ ] Migrations are reversible (where possible)
- [ ] Indexes are appropriate
- [ ] RLS policies are correct
- [ ] Functions are optimized

**Application:**
- [ ] Type safety (TypeScript)
- [ ] Error handling
- [ ] Input validation
- [ ] Security considerations

**Testing:**
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Edge cases covered
- [ ] Performance tested

---

**End of Implementation Plan**
