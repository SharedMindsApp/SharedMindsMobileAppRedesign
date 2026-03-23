/**
 * Recipe Compatibility Service
 * 
 * Evaluates recipe compatibility with user food profiles
 */

import type { Recipe, RecipeVersion } from './recipeGeneratorTypes';
import type { UserFoodProfile, RecipeCompatibilityResult, DietType, AllergyType } from './foodProfileTypes';
import { DIET_DEFINITIONS, ALLERGY_DEFINITIONS } from './foodProfileTypes';

/**
 * Normalize ingredient name for matching (lowercase, trim, remove special chars)
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Check if an ingredient matches any in a list (case-insensitive, fuzzy)
 */
function ingredientMatches(ingredient: string, list: string[]): boolean {
  const normalized = normalizeIngredientName(ingredient);
  return list.some(item => {
    const normalizedItem = normalizeIngredientName(item);
    return normalized.includes(normalizedItem) || normalizedItem.includes(normalized);
  });
}

/**
 * Check if recipe contains any allergens
 */
function checkAllergies(
  recipe: Recipe,
  allergies: AllergyType[]
): { hasAllergy: boolean; matchedAllergens: AllergyType[] } {
  if (allergies.length === 0) {
    return { hasAllergy: false, matchedAllergens: [] };
  }

  const matchedAllergens: AllergyType[] = [];
  const recipeIngredients = recipe.ingredients || [];
  const recipeTags = recipe.dietary_tags || [];

  for (const allergy of allergies) {
    const allergyDef = ALLERGY_DEFINITIONS[allergy];
    if (!allergyDef) continue;

    // Check ingredient names
    const hasIngredient = recipeIngredients.some(ing => {
      const ingName = ing.name?.toLowerCase() || '';
      return allergyDef.blockedIngredients.some(blocked =>
        ingName.includes(blocked.toLowerCase())
      );
    });

    // Check dietary tags
    const hasTag = recipeTags.some(tag =>
      allergyDef.blockedCategories?.some(cat =>
        tag.toLowerCase().includes(cat.toLowerCase())
      )
    );

    if (hasIngredient || hasTag) {
      matchedAllergens.push(allergy);
    }
  }

  return {
    hasAllergy: matchedAllergens.length > 0,
    matchedAllergens,
  };
}

/**
 * Check if recipe violates diet constraints
 */
function checkDiet(
  recipe: Recipe,
  diet: DietType | null
): { violatesDiet: boolean; reason?: string } {
  if (!diet || diet === 'omnivore') {
    return { violatesDiet: false };
  }

  const dietDef = DIET_DEFINITIONS[diet];
  if (!dietDef) {
    return { violatesDiet: false };
  }

  const recipeTags = recipe.dietary_tags || [];
  const recipeIngredients = recipe.ingredients || [];

  // Check disallowed categories
  for (const disallowed of dietDef.disallowedCategories) {
    if (recipeTags.some(tag => tag.toLowerCase().includes(disallowed.toLowerCase()))) {
      return {
        violatesDiet: true,
        reason: `Contains ${disallowed} (not allowed in ${dietDef.label} diet)`,
      };
    }
  }

  // Check disallowed ingredients
  if (dietDef.disallowedIngredients) {
    for (const disallowed of dietDef.disallowedIngredients) {
      const hasIngredient = recipeIngredients.some(ing => {
        const ingName = ing.name?.toLowerCase() || '';
        return ingName.includes(disallowed.toLowerCase());
      });

      if (hasIngredient) {
        return {
          violatesDiet: true,
          reason: `Contains ${disallowed} (not allowed in ${dietDef.label} diet)`,
        };
      }
    }
  }

  return { violatesDiet: false };
}

/**
 * Check if recipe contains excluded ingredients
 */
function checkExcludedIngredients(
  recipe: Recipe,
  excludedIngredients: string[]
): { hasExcluded: boolean; matched: string[] } {
  if (excludedIngredients.length === 0) {
    return { hasExcluded: false, matched: [] };
  }

  const recipeIngredients = recipe.ingredients || [];
  const matched: string[] = [];

  for (const excluded of excludedIngredients) {
    if (ingredientMatches(excluded, recipeIngredients.map(ing => ing.name || ''))) {
      matched.push(excluded);
    }
  }

  return {
    hasExcluded: matched.length > 0,
    matched,
  };
}

/**
 * Calculate compatibility score (0-100)
 * Higher score = more compatible
 */
function calculateCompatibilityScore(
  recipe: Recipe,
  profile: UserFoodProfile
): number {
  let score = 50; // Base score

  const recipeTags = recipe.dietary_tags || [];
  const recipeIngredients = recipe.ingredients.map(ing => ing.name?.toLowerCase() || '').filter(Boolean);
  const recipeCuisine = recipe.cuisine?.toLowerCase() || '';

  // Boost for preferred ingredients
  for (const preferred of profile.preferred_ingredients) {
    if (recipeIngredients.some(ing => ing.includes(preferred.toLowerCase()))) {
      score += 5;
    }
  }

  // Boost for preferred cuisines
  for (const preferred of profile.preferred_cuisines) {
    if (recipeCuisine.includes(preferred.toLowerCase())) {
      score += 10;
    }
  }

  // Penalize for excluded cuisines (but don't block)
  for (const excluded of profile.excluded_cuisines) {
    if (recipeCuisine.includes(excluded.toLowerCase())) {
      score -= 10;
    }
  }

  // Boost if recipe matches diet tags
  if (profile.diet && profile.diet !== 'omnivore') {
    const dietDef = DIET_DEFINITIONS[profile.diet];
    if (dietDef.allowedCategories.some(cat =>
      recipeTags.some(tag => tag.toLowerCase().includes(cat.toLowerCase()))
    )) {
      score += 15;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Evaluate recipe compatibility with user food profile
 */
export function evaluateRecipeCompatibility(
  recipe: Recipe,
  profile: UserFoodProfile | null
): RecipeCompatibilityResult {
  // If no profile, allow everything
  if (!profile) {
    return {
      allowed: true,
      score: 50,
    };
  }

  const reasons: string[] = [];
  const warnings: string[] = [];

  // Check allergies (hard block)
  const allergyCheck = checkAllergies(recipe, profile.allergies);
  if (allergyCheck.hasAllergy) {
    reasons.push(
      `Contains allergens: ${allergyCheck.matchedAllergens.map(a => ALLERGY_DEFINITIONS[a]?.label || a).join(', ')}`
    );
  }

  // Check diet (hard block)
  const dietCheck = checkDiet(recipe, profile.diet);
  if (dietCheck.violatesDiet && dietCheck.reason) {
    reasons.push(dietCheck.reason);
  }

  // Check excluded ingredients (hard block)
  const excludedCheck = checkExcludedIngredients(recipe, profile.excluded_ingredients);
  if (excludedCheck.hasExcluded) {
    reasons.push(
      `Contains excluded ingredients: ${excludedCheck.matched.join(', ')}`
    );
  }

  // Check excluded cuisines (soft warning, not a block)
  if (profile.excluded_cuisines.length > 0) {
    const recipeCuisine = recipe.cuisine?.toLowerCase() || '';
    const matchedCuisines = profile.excluded_cuisines.filter(cuisine =>
      recipeCuisine.includes(cuisine.toLowerCase())
    );
    if (matchedCuisines.length > 0) {
      warnings.push(`Cuisine preference: ${matchedCuisines.join(', ')}`);
    }
  }

  // Calculate compatibility score
  const score = calculateCompatibilityScore(recipe, profile);

  // Recipe is allowed if no hard blocks
  const allowed = reasons.length === 0;

  return {
    allowed,
    reasons: reasons.length > 0 ? reasons : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    score,
  };
}

/**
 * Filter recipes based on food profile
 */
export function filterRecipesByProfile(
  recipes: Recipe[],
  profile: UserFoodProfile | null,
  options?: {
    allowOverrides?: boolean;
    minScore?: number;
  }
): Recipe[] {
  if (!profile) {
    return recipes;
  }

  const allowOverrides = options?.allowOverrides ?? profile.allow_overrides;
  const minScore = options?.minScore ?? 0;

  return recipes.filter(recipe => {
    const compatibility = evaluateRecipeCompatibility(recipe, profile);
    
    // If overrides allowed, only filter by allergies (safety)
    if (allowOverrides) {
      const hasAllergy = compatibility.reasons?.some(r => r.includes('allergen'));
      return !hasAllergy;
    }

    // Otherwise, respect all constraints
    return compatibility.allowed && (compatibility.score ?? 0) >= minScore;
  });
}

/**
 * Sort recipes by compatibility score (highest first)
 */
export function sortRecipesByCompatibility(
  recipes: Recipe[],
  profile: UserFoodProfile | null
): Recipe[] {
  if (!profile) {
    return recipes;
  }

  return [...recipes].sort((a, b) => {
    const scoreA = evaluateRecipeCompatibility(a, profile).score ?? 0;
    const scoreB = evaluateRecipeCompatibility(b, profile).score ?? 0;
    return scoreB - scoreA;
  });
}
