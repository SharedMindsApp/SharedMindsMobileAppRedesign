/**
 * Recipe Generator System - TypeScript Types
 * 
 * Type definitions for the Recipe Generator Database System
 * Matches the database schema defined in migrations
 */

// Enums (matching database enums)
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealCategory = 
  | 'home_cooked'
  | 'healthy'
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'high_protein'
  | 'budget_friendly'
  | 'takeaway';

export type CuisineType =
  | 'italian'
  | 'indian'
  | 'chinese'
  | 'thai'
  | 'british'
  | 'american'
  | 'mexican'
  | 'mediterranean'
  | 'japanese'
  | 'french'
  | 'greek'
  | 'korean';

export type CookingDifficulty = 'easy' | 'medium' | 'hard';

export type SourceType = 'ai' | 'user' | 'scrape' | 'api' | 'import';

export type ValidationStatus = 'draft' | 'pending' | 'approved' | 'needs_review' | 'deprecated';

// Ingredient structure (JSONB in database)
export interface RecipeIngredient {
  food_item_id: string; // UUID
  quantity: string; // Natural language or numeric
  unit: string;
  optional?: boolean; // Default: false
  notes?: string; // Preparation notes
  substitutions?: string[]; // Alternative food_item_ids
  pantry_equivalent?: string; // Pantry-friendly food_item_id
}

// Recipe Source
export interface RecipeSource {
  id: string;
  source_type: SourceType;
  source_name: string | null;
  source_url: string | null;
  source_api_key: string | null; // Encrypted
  is_validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
  validation_method: string | null;
  metadata: Record<string, any>; // JSONB
  trust_score: number; // 0.00 to 1.00
  requires_validation: boolean;
  created_at: string;
  updated_at: string;
}

// Recipe (canonical entity)
export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  meal_type: MealType[]; // Array to support multiple meal types (e.g., smoothies can be breakfast OR snack)
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string | null;
  instructions_structured: Record<string, any> | null; // JSONB
  categories: MealCategory[];
  cuisine: CuisineType | null;
  difficulty: CookingDifficulty;
  prep_time: number | null; // minutes
  cook_time: number | null; // minutes
  total_time: number | null; // calculated: prep_time + cook_time
  calories: number | null;
  protein: number | null; // grams
  carbs: number | null; // grams
  fat: number | null; // grams
  fiber: number | null; // grams
  sodium: number | null; // mg
  allergies: string[];
  dietary_tags: string[];
  image_url: string | null;
  image_urls: string[] | null;
  source_id: string | null;
  source_type: SourceType;
  source_url: string | null;
  current_version_id: string | null;
  version_count: number;
  validation_status: ValidationStatus;
  validation_notes: string | null;
  quality_score: number | null; // 0.00 to 1.00
  created_by: string | null;
  created_for_profile_id: string | null; // For AI recipes in personal spaces: profile.id of user who requested it
  household_id: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
  
  // Joined data (optional, populated by queries)
  source?: RecipeSource;
  current_version?: RecipeVersion;
}

// Recipe Version
export interface RecipeVersion {
  id: string;
  recipe_id: string;
  version_number: number;
  parent_version_id: string | null;
  
  // Full recipe snapshot
  name: string;
  description: string | null;
  meal_type: MealType[]; // Array to support multiple meal types
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string | null;
  instructions_structured: Record<string, any> | null;
  categories: MealCategory[];
  cuisine: CuisineType | null;
  difficulty: CookingDifficulty;
  prep_time: number | null;
  cook_time: number | null;
  total_time: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  allergies: string[];
  dietary_tags: string[];
  image_url: string | null;
  image_urls: string[] | null;
  
  // Version-specific metadata
  change_reason: string | null;
  change_notes: string | null;
  generated_by_job_id: string | null;
  generation_prompt: string | null;
  generation_context: Record<string, any> | null; // JSONB
  created_by: string | null;
  created_at: string;
  diff_summary: Record<string, any> | null; // JSONB
}

// Recipe creation input (for creating new recipes)
export interface CreateRecipeInput {
  created_for_profile_id?: string | null; // For AI recipes in personal spaces: profile.id of user who requested it
  name: string;
  description?: string;
  meal_type: MealType[]; // Array to support multiple meal types
  servings?: number;
  ingredients: RecipeIngredient[];
  instructions?: string;
  instructions_structured?: Record<string, any>;
  categories?: MealCategory[];
  cuisine?: CuisineType;
  difficulty?: CookingDifficulty;
  prep_time?: number;
  cook_time?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  allergies?: string[];
  dietary_tags?: string[];
  image_url?: string;
  image_urls?: string[];
  source_type: SourceType;
  source_id?: string;
  source_url?: string;
  household_id?: string;
  is_public?: boolean;
  validation_status?: ValidationStatus;
}

// Recipe update input
export interface UpdateRecipeInput {
  name?: string;
  description?: string;
  meal_type?: MealType[]; // Array to support multiple meal types
  servings?: number;
  ingredients?: RecipeIngredient[];
  instructions?: string;
  instructions_structured?: Record<string, any>;
  categories?: MealCategory[];
  cuisine?: CuisineType;
  difficulty?: CookingDifficulty;
  prep_time?: number;
  cook_time?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  allergies?: string[];
  dietary_tags?: string[];
  image_url?: string;
  image_urls?: string[];
  change_reason?: string;
  change_notes?: string;
}

// Recipe filters for listing
export interface RecipeFilters {
  meal_type?: MealType;
  categories?: MealCategory[];
  cuisine?: CuisineType;
  difficulty?: CookingDifficulty;
  tags?: string[]; // Dietary tags / occasion tags for filtering
  search_query?: string;
  household_id?: string | null; // null for personal spaces, string for household spaces, undefined if no filter
  include_public?: boolean;
  validation_status?: ValidationStatus;
  limit?: number;
  offset?: number;
  order_by?: 'name' | 'created_at' | 'quality_score' | 'updated_at';
  order_direction?: 'asc' | 'desc';
}

// Recipe source creation input
export interface CreateRecipeSourceInput {
  source_type: SourceType;
  source_name?: string;
  source_url?: string;
  source_api_key?: string;
  metadata?: Record<string, any>;
  trust_score?: number;
  requires_validation?: boolean;
}

// Recipe version creation input
export interface CreateRecipeVersionInput {
  recipe_id: string;
  parent_version_id?: string;
  change_reason?: string;
  change_notes?: string;
  generated_by_job_id?: string;
  generation_prompt?: string;
  generation_context?: Record<string, any>;
  // All recipe fields are included via UpdateRecipeInput
}
