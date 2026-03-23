/**
 * Recipe Validation Service
 * 
 * Service functions for validating recipes and calculating quality scores
 * Phase 4: Validation & Quality Assurance
 */

import { supabase } from './supabase';
import { getFoodItemsByIds } from './foodItems';
import type { Recipe, RecipeIngredient } from './recipeGeneratorTypes';

// Validation result types
export interface IngredientValidation {
  all_ingredients_mapped: boolean;
  unknown_ingredients: string[];
  warnings: string[];
  mapped_count: number;
  total_count: number;
}

export interface InstructionValidation {
  has_instructions: boolean;
  step_count: number;
  completeness_score: number; // 0.00 to 1.00
  min_length_met: boolean;
}

export interface NutritionValidation {
  has_nutrition: boolean;
  estimated: boolean;
  source?: string;
  warnings: string[];
}

export interface SourceValidation {
  source_verified: boolean;
  url_accessible: boolean | null; // null if no URL
  trust_score: number;
}

export interface AutomatedCheck {
  check_name: string;
  passed: boolean;
  details: Record<string, any>;
}

export interface RecipeValidationResult {
  ingredient_validation: IngredientValidation;
  instruction_validation: InstructionValidation;
  nutrition_validation: NutritionValidation;
  source_validation: SourceValidation;
  quality_score: number; // 0.00 to 1.00
  automated_checks: AutomatedCheck[];
  status: 'draft' | 'pending' | 'approved' | 'needs_review' | 'deprecated';
  issues: string[];
}

export interface RecipeValidationStatus {
  id: string;
  recipe_id: string;
  status: 'draft' | 'pending' | 'approved' | 'needs_review' | 'deprecated';
  ingredient_validation: IngredientValidation;
  instruction_validation: InstructionValidation;
  nutrition_validation: NutritionValidation;
  source_validation: SourceValidation;
  quality_score: number | null;
  validated_by: string | null;
  validated_at: string | null;
  validation_method: 'automated' | 'human' | 'hybrid' | null;
  validation_notes: string | null;
  automated_checks: AutomatedCheck[];
  created_at: string;
  updated_at: string;
}

/**
 * Validate recipe ingredients - check all ingredients are mapped to food_item_id
 */
export async function checkIngredientMapping(
  ingredients: RecipeIngredient[]
): Promise<IngredientValidation> {
  const result: IngredientValidation = {
    all_ingredients_mapped: true,
    unknown_ingredients: [],
    warnings: [],
    mapped_count: 0,
    total_count: ingredients.length,
  };

  if (ingredients.length === 0) {
    result.all_ingredients_mapped = false;
    result.warnings.push('Recipe has no ingredients');
    return result;
  }

  // Collect all food_item_ids
  const foodItemIds = ingredients
    .map(ing => ing.food_item_id)
    .filter(Boolean) as string[];

  // Verify all ingredients have food_item_id
  const missingIds = ingredients
    .filter(ing => !ing.food_item_id)
    .map(ing => `${ing.quantity || ''} ${ing.unit || ''}`.trim() || 'unnamed ingredient');

  if (missingIds.length > 0) {
    result.all_ingredients_mapped = false;
    result.unknown_ingredients = missingIds;
  }

  // Verify food_item_ids exist in database
  if (foodItemIds.length > 0) {
    const existingItems = await getFoodItemsByIds(foodItemIds);
    const existingIds = new Set(existingItems.map(item => item.id));
    const invalidIds = foodItemIds.filter(id => !existingIds.has(id));

    if (invalidIds.length > 0) {
      result.all_ingredients_mapped = false;
      result.unknown_ingredients.push(...invalidIds);
    }

    result.mapped_count = existingItems.length;
  }

  // Check for quantity sanity (basic checks)
  ingredients.forEach((ing, index) => {
    if (ing.quantity) {
      const qty = parseFloat(ing.quantity);
      if (!isNaN(qty)) {
        // Flag extremely large quantities (possible hallucination)
        if (qty > 100) {
          result.warnings.push(
            `Ingredient ${index + 1} has unusually large quantity: ${ing.quantity} ${ing.unit || ''}`
          );
        }
        // Flag zero or negative quantities
        if (qty <= 0) {
          result.warnings.push(`Ingredient ${index + 1} has invalid quantity: ${ing.quantity}`);
        }
      }
    }
  });

  return result;
}

/**
 * Validate recipe instructions
 */
export function checkInstructionCompleteness(
  instructions: string | null,
  instructionsStructured: Record<string, any> | null
): InstructionValidation {
  const result: InstructionValidation = {
    has_instructions: false,
    step_count: 0,
    completeness_score: 0.0,
    min_length_met: false,
  };

  // Check structured instructions first
  if (instructionsStructured && typeof instructionsStructured === 'object') {
    if (Array.isArray(instructionsStructured)) {
      result.step_count = instructionsStructured.length;
      result.has_instructions = result.step_count > 0;
    } else if (instructionsStructured.steps && Array.isArray(instructionsStructured.steps)) {
      result.step_count = instructionsStructured.steps.length;
      result.has_instructions = result.step_count > 0;
    }
  }

  // Check text instructions
  if (instructions && instructions.trim().length > 0) {
    result.has_instructions = true;
    
    // Count steps (approximate - look for numbered steps or line breaks)
    const lines = instructions.split('\n').filter(line => line.trim().length > 0);
    const numberedSteps = lines.filter(line => /^\d+[\.\)]/.test(line.trim()));
    
    if (numberedSteps.length > 0) {
      result.step_count = Math.max(result.step_count, numberedSteps.length);
    } else {
      result.step_count = Math.max(result.step_count, lines.length);
    }

    // Minimum length check (at least 20 characters for meaningful instructions)
    result.min_length_met = instructions.trim().length >= 20;
  }

  // Calculate completeness score
  if (result.has_instructions) {
    // Base score for having instructions
    let score = 0.5;
    
    // Bonus for having multiple steps
    if (result.step_count >= 3) {
      score += 0.3;
    } else if (result.step_count >= 1) {
      score += 0.1;
    }
    
    // Bonus for meeting minimum length
    if (result.min_length_met) {
      score += 0.2;
    }
    
    result.completeness_score = Math.min(score, 1.0);
  }

  return result;
}

/**
 * Validate nutrition data
 */
export function checkQuantitySanity(
  calories: number | null,
  protein: number | null,
  carbs: number | null,
  fat: number | null,
  servings: number
): NutritionValidation {
  const result: NutritionValidation = {
    has_nutrition: false,
    estimated: false,
    warnings: [],
  };

  const hasAnyNutrition = calories !== null || protein !== null || carbs !== null || fat !== null;
  result.has_nutrition = hasAnyNutrition;

  if (!hasAnyNutrition) {
    return result;
  }

  // Sanity checks for nutrition values (per serving)
  if (calories !== null) {
    // Typical range: 50-2000 calories per serving (very wide range)
    if (calories < 0 || calories > 2000) {
      result.warnings.push(`Calories per serving (${calories}) seems unrealistic`);
    }
  }

  if (protein !== null) {
    // Typical range: 0-200g protein per serving
    if (protein < 0 || protein > 200) {
      result.warnings.push(`Protein per serving (${protein}g) seems unrealistic`);
    }
  }

  if (carbs !== null) {
    // Typical range: 0-300g carbs per serving
    if (carbs < 0 || carbs > 300) {
      result.warnings.push(`Carbs per serving (${carbs}g) seems unrealistic`);
    }
  }

  if (fat !== null) {
    // Typical range: 0-150g fat per serving
    if (fat < 0 || fat > 150) {
      result.warnings.push(`Fat per serving (${fat}g) seems unrealistic`);
    }
  }

  return result;
}

/**
 * Check source accessibility (basic check - doesn't actually ping URL)
 */
export async function checkSourceAccessibility(
  sourceUrl: string | null,
  sourceType: string
): Promise<SourceValidation> {
  const result: SourceValidation = {
    source_verified: false,
    url_accessible: null,
    trust_score: 0.5, // Default neutral score
  };

  // For user-created recipes, trust score is high
  if (sourceType === 'user') {
    result.source_verified = true;
    result.trust_score = 1.0;
    return result;
  }

  // For AI-generated recipes, moderate trust score
  if (sourceType === 'ai') {
    result.source_verified = true; // AI is always "verified" (it's the source)
    result.trust_score = 0.7; // Moderate trust for AI-generated content
    return result;
  }

  // For URL-based sources, check if URL is present and valid format
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      result.url_accessible = true; // We don't actually ping it, just check format
      result.source_verified = url.protocol === 'http:' || url.protocol === 'https:';
      
      // Higher trust for https
      if (url.protocol === 'https:') {
        result.trust_score = 0.8;
      } else {
        result.trust_score = 0.6;
      }
    } catch {
      result.url_accessible = false;
      result.source_verified = false;
      result.trust_score = 0.3;
    }
  } else {
    // No source URL but not user/AI - lower trust
    result.trust_score = 0.4;
  }

  return result;
}

/**
 * Calculate overall quality score from all validation checks
 */
export function calculateQualityScore(
  ingredientValidation: IngredientValidation,
  instructionValidation: InstructionValidation,
  nutritionValidation: NutritionValidation,
  sourceValidation: SourceValidation
): number {
  let score = 0.0;

  // Ingredient mapping: 40% weight
  if (ingredientValidation.all_ingredients_mapped) {
    score += 0.4;
  } else if (ingredientValidation.mapped_count > 0) {
    // Partial credit for some mapped ingredients
    const mappingRatio = ingredientValidation.mapped_count / ingredientValidation.total_count;
    score += 0.4 * mappingRatio * 0.5; // Half credit for partial mapping
  }

  // Instructions: 30% weight
  if (instructionValidation.has_instructions) {
    score += 0.3 * instructionValidation.completeness_score;
  }

  // Source trust: 20% weight
  score += 0.2 * sourceValidation.trust_score;

  // Nutrition: 10% weight (optional, so less weight)
  if (nutritionValidation.has_nutrition) {
    score += 0.1;
    // Deduct for warnings
    if (nutritionValidation.warnings.length > 0) {
      score -= 0.05 * Math.min(nutritionValidation.warnings.length, 2);
    }
  } else {
    // No penalty for missing nutrition (it's optional)
    score += 0.05; // Small bonus for having any data
  }

  // Deduct for ingredient warnings
  if (ingredientValidation.warnings.length > 0) {
    score -= 0.05 * Math.min(ingredientValidation.warnings.length, 3);
  }

  return Math.max(0.0, Math.min(1.0, score));
}

/**
 * Determine validation status based on quality score and checks
 */
export function determineValidationStatus(
  qualityScore: number,
  ingredientValidation: IngredientValidation,
  instructionValidation: InstructionValidation,
  sourceType: string
): 'draft' | 'pending' | 'approved' | 'needs_review' | 'deprecated' {
  // User-created recipes are auto-approved (high trust)
  if (sourceType === 'user') {
    if (ingredientValidation.all_ingredients_mapped && instructionValidation.has_instructions) {
      return 'approved';
    }
    return 'needs_review'; // User recipes with missing data need review
  }

  // Low quality scores need review
  if (qualityScore < 0.5) {
    return 'needs_review';
  }

  // Critical checks must pass for approval
  if (!ingredientValidation.all_ingredients_mapped) {
    return 'needs_review';
  }

  if (!instructionValidation.has_instructions) {
    return 'needs_review';
  }

  // High quality scores can be auto-approved
  if (qualityScore >= 0.8) {
    return 'approved';
  }

  // Medium quality scores go to pending
  return 'pending';
}

/**
 * Run all validation checks on a recipe
 */
export async function validateRecipe(recipe: Recipe): Promise<RecipeValidationResult> {
  const automatedChecks: AutomatedCheck[] = [];
  const issues: string[] = [];

  // Run all validation checks
  const ingredientValidation = await checkIngredientMapping(recipe.ingredients);
  const instructionValidation = checkInstructionCompleteness(
    recipe.instructions,
    recipe.instructions_structured
  );
  const nutritionValidation = checkQuantitySanity(
    recipe.calories,
    recipe.protein,
    recipe.carbs,
    recipe.fat,
    recipe.servings
  );
  const sourceValidation = await checkSourceAccessibility(
    recipe.source_url,
    recipe.source_type
  );

  // Record automated checks
  automatedChecks.push({
    check_name: 'ingredient_mapping',
    passed: ingredientValidation.all_ingredients_mapped,
    details: ingredientValidation,
  });

  automatedChecks.push({
    check_name: 'instruction_completeness',
    passed: instructionValidation.has_instructions && instructionValidation.min_length_met,
    details: instructionValidation,
  });

  automatedChecks.push({
    check_name: 'nutrition_sanity',
    passed: nutritionValidation.warnings.length === 0,
    details: nutritionValidation,
  });

  automatedChecks.push({
    check_name: 'source_verification',
    passed: sourceValidation.source_verified,
    details: sourceValidation,
  });

  // Collect issues
  if (!ingredientValidation.all_ingredients_mapped) {
    issues.push(`Missing ingredient mappings: ${ingredientValidation.unknown_ingredients.join(', ')}`);
  }
  if (!instructionValidation.has_instructions) {
    issues.push('Missing instructions');
  }
  if (instructionValidation.has_instructions && !instructionValidation.min_length_met) {
    issues.push('Instructions too short');
  }
  issues.push(...ingredientValidation.warnings);
  issues.push(...nutritionValidation.warnings);

  // Calculate quality score
  const qualityScore = calculateQualityScore(
    ingredientValidation,
    instructionValidation,
    nutritionValidation,
    sourceValidation
  );

  // Determine status
  const status = determineValidationStatus(
    qualityScore,
    ingredientValidation,
    instructionValidation,
    recipe.source_type
  );

  return {
    ingredient_validation: ingredientValidation,
    instruction_validation: instructionValidation,
    nutrition_validation: nutritionValidation,
    source_validation: sourceValidation,
    quality_score: qualityScore,
    automated_checks: automatedChecks,
    status,
    issues,
  };
}

/**
 * Save validation results to database
 */
export async function saveValidationStatus(
  recipeId: string,
  validationResult: RecipeValidationResult,
  userId?: string,
  validationMethod: 'automated' | 'human' | 'hybrid' = 'automated',
  validationNotes?: string
): Promise<RecipeValidationStatus> {
  // Upsert validation status
  const { data, error } = await supabase
    .from('recipe_validation_status')
    .upsert({
      recipe_id: recipeId,
      status: validationResult.status,
      ingredient_validation: validationResult.ingredient_validation,
      instruction_validation: validationResult.instruction_validation,
      nutrition_validation: validationResult.nutrition_validation,
      source_validation: validationResult.source_validation,
      quality_score: validationResult.quality_score,
      validated_by: userId || null,
      validated_at: userId ? new Date().toISOString() : null,
      validation_method: validationMethod,
      validation_notes: validationNotes || null,
      automated_checks: validationResult.automated_checks,
    }, {
      onConflict: 'recipe_id',
    })
    .select()
    .single();

  if (error) throw error;

  // Update recipe's validation_status and quality_score
  await supabase
    .from('recipes')
    .update({
      validation_status: validationResult.status,
      quality_score: validationResult.quality_score,
    })
    .eq('id', recipeId);

  return data as RecipeValidationStatus;
}

/**
 * Get validation status for a recipe
 */
export async function getValidationStatus(recipeId: string): Promise<RecipeValidationStatus | null> {
  const { data, error } = await supabase
    .from('recipe_validation_status')
    .select('*')
    .eq('recipe_id', recipeId)
    .maybeSingle();

  if (error) throw error;
  return data as RecipeValidationStatus | null;
}

/**
 * List recipes needing review
 */
export async function listRecipesNeedingReview(limit: number = 50): Promise<RecipeValidationStatus[]> {
  const { data, error } = await supabase
    .from('recipe_validation_status')
    .select('*')
    .eq('status', 'needs_review')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as RecipeValidationStatus[];
}
