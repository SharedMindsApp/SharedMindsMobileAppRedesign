/**
 * Recipe Category Normalizer
 * 
 * Maps AI-provided category strings to valid MealCategory enum values.
 * Prevents database insert failures when AI output doesn't match enum exactly.
 * 
 * Rules:
 * - AI categories are NEVER written directly to DB
 * - Unknown categories are dropped (not cause failure)
 * - DB enum remains strict and unchanged
 */

import type { MealCategory, CuisineType, MealType } from './recipeGeneratorTypes';

/**
 * Mapping from AI-provided category strings to valid MealCategory enum values
 * 
 * This handles common variations and synonyms that AI might use.
 * Only valid enum values are included in the mapping.
 */
const MEAL_CATEGORY_MAP: Record<string, MealCategory> = {
  // Direct matches
  'home_cooked': 'home_cooked',
  'healthy': 'healthy',
  'vegetarian': 'vegetarian',
  'vegan': 'vegan',
  'gluten_free': 'gluten_free',
  'high_protein': 'high_protein',
  'budget_friendly': 'budget_friendly',
  'takeaway': 'takeaway',
  
  // Common AI variations and synonyms
  'comfort_food': 'home_cooked', // Comfort food is typically home-cooked
  'comfort': 'home_cooked',
  'home': 'home_cooked',
  'home-cooked': 'home_cooked',
  'homecooked': 'home_cooked',
  
  'quick_meal': 'budget_friendly', // Quick meals are often budget-friendly
  'quick': 'budget_friendly',
  'fast': 'budget_friendly',
  'easy': 'budget_friendly',
  
  'date_night': 'home_cooked', // Special occasions are home-cooked
  'special': 'home_cooked',
  'special_occasion': 'home_cooked',
  'occasion': 'home_cooked',
  
  'family': 'home_cooked',
  'family_meal': 'home_cooked',
  
  'protein': 'high_protein',
  'high-protein': 'high_protein',
  'protein_rich': 'high_protein',
  'protein-rich': 'high_protein',
  
  'gluten-free': 'gluten_free',
  'glutenfree': 'gluten_free',
  'gf': 'gluten_free',
  
  'budget': 'budget_friendly',
  'budget-friendly': 'budget_friendly',
  'cheap': 'budget_friendly',
  'affordable': 'budget_friendly',
  
  'take-out': 'takeaway',
  'takeout': 'takeaway',
  'take_away': 'takeaway',
  'delivery': 'takeaway',
  
  // Dietary variations
  'plant_based': 'vegan',
  'plant-based': 'vegan',
  'plantbased': 'vegan',
  
  // Health variations
  'nutritious': 'healthy',
  'wellness': 'healthy',
  'light': 'healthy',
  'low_calorie': 'healthy',
  'low-calorie': 'healthy',
};

/**
 * Normalize AI-provided category strings to valid MealCategory enum values
 * 
 * @param input - Array of category strings from AI (may include invalid values)
 * @returns Array of valid MealCategory enum values (invalid categories are dropped)
 * 
 * @example
 * normalizeMealCategories(['comfort_food', 'quick_meal', 'invalid_category'])
 * // Returns: ['home_cooked', 'budget_friendly']
 */
export function normalizeMealCategories(input: string[] | undefined | null): MealCategory[] {
  if (!input || !Array.isArray(input) || input.length === 0) {
    return [];
  }

  const normalized: MealCategory[] = [];
  const unmapped: string[] = [];

  for (const category of input) {
    if (!category || typeof category !== 'string') {
      continue; // Skip invalid entries
    }

    const normalizedKey = category.toLowerCase().trim();
    
    // Check if it's already a valid enum value
    if (MEAL_CATEGORY_MAP[normalizedKey]) {
      const mapped = MEAL_CATEGORY_MAP[normalizedKey];
      // Avoid duplicates
      if (!normalized.includes(mapped)) {
        normalized.push(mapped);
      }
    } else {
      // Log unmapped categories for review
      if (!unmapped.includes(normalizedKey)) {
        unmapped.push(normalizedKey);
      }
    }
  }

  // Log unmapped categories (for monitoring and potential future mapping additions)
  if (unmapped.length > 0) {
    console.warn('[RecipeCategoryNormalizer] Unmapped AI recipe categories (dropped):', {
      unmapped,
      input,
      normalized,
    });
  }

  return normalized;
}

/**
 * Get all valid MealCategory enum values
 * Useful for validation or UI display
 */
export function getValidMealCategories(): MealCategory[] {
  return [
    'home_cooked',
    'healthy',
    'vegetarian',
    'vegan',
    'gluten_free',
    'high_protein',
    'budget_friendly',
    'takeaway',
  ];
}

/**
 * Check if a category string is a valid MealCategory enum value
 */
export function isValidMealCategory(category: string): category is MealCategory {
  return getValidMealCategories().includes(category as MealCategory);
}

/**
 * Mapping from AI-provided cuisine strings to valid CuisineType enum values
 * 
 * This handles common variations and synonyms that AI might use.
 * Only valid enum values are included in the mapping.
 */
const CUISINE_TYPE_MAP: Record<string, CuisineType> = {
  // Direct matches
  'italian': 'italian',
  'indian': 'indian',
  'chinese': 'chinese',
  'thai': 'thai',
  'british': 'british',
  'american': 'american',
  'mexican': 'mexican',
  'mediterranean': 'mediterranean',
  'japanese': 'japanese',
  'french': 'french',
  'greek': 'greek',
  'korean': 'korean',
  
  // Common AI variations and synonyms
  'moroccan': 'mediterranean', // Moroccan is Mediterranean cuisine
  'middle eastern': 'mediterranean',
  'middle-eastern': 'mediterranean',
  'middleeastern': 'mediterranean',
  'arabic': 'mediterranean',
  'turkish': 'mediterranean',
  'spanish': 'mediterranean',
  'portuguese': 'mediterranean',
  'lebanese': 'mediterranean',
  
  'vietnamese': 'thai', // Similar Southeast Asian cuisine
  'cambodian': 'thai',
  'laotian': 'thai',
  
  'sushi': 'japanese',
  'ramen': 'japanese',
  'korean bbq': 'korean',
  'korean-bbq': 'korean',
  'koreanbbq': 'korean',
  
  'tex-mex': 'mexican',
  'texmex': 'mexican',
  'southwestern': 'mexican',
  
  'cantonese': 'chinese',
  'szechuan': 'chinese',
  'sichuan': 'chinese',
  'hunan': 'chinese',
  'peking': 'chinese',
  
  'northern italian': 'italian',
  'southern italian': 'italian',
  'tuscan': 'italian',
  'sicilian': 'italian',
  
  'north indian': 'indian',
  'south indian': 'indian',
  'curry': 'indian',
  
  'pub food': 'british',
  'fish and chips': 'british',
  'fish-and-chips': 'british',
  
  'southern': 'american',
  'bbq': 'american',
  'barbecue': 'american',
  'cajun': 'american',
  'creole': 'american',
};

/**
 * Normalize AI-provided cuisine strings to valid CuisineType enum values
 * 
 * @param input - Cuisine string from AI (may be invalid)
 * @returns Valid CuisineType enum value or null if unmapped
 * 
 * @example
 * normalizeCuisine('moroccan') // Returns: 'mediterranean'
 * normalizeCuisine('invalid') // Returns: null
 */
export function normalizeCuisine(input: string | undefined | null): CuisineType | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const normalizedKey = input.toLowerCase().trim();
  
  // Check if it's already a valid enum value
  if (CUISINE_TYPE_MAP[normalizedKey]) {
    return CUISINE_TYPE_MAP[normalizedKey];
  }
  
  // Check if it's a direct match to a valid enum value
  const validCuisines: CuisineType[] = [
    'italian', 'indian', 'chinese', 'thai', 'british', 'american',
    'mexican', 'mediterranean', 'japanese', 'french', 'greek', 'korean'
  ];
  
  if (validCuisines.includes(normalizedKey as CuisineType)) {
    return normalizedKey as CuisineType;
  }
  
  // Log unmapped cuisine for review
  console.warn('[RecipeCategoryNormalizer] Unmapped AI cuisine (dropped):', {
    input,
    normalizedKey,
  });
  
  return null;
}

/**
 * Get all valid CuisineType enum values
 */
export function getValidCuisineTypes(): CuisineType[] {
  return [
    'italian', 'indian', 'chinese', 'thai', 'british', 'american',
    'mexican', 'mediterranean', 'japanese', 'french', 'greek', 'korean'
  ];
}

/**
 * Check if a cuisine string is a valid CuisineType enum value
 */
export function isValidCuisineType(cuisine: string): cuisine is CuisineType {
  return getValidCuisineTypes().includes(cuisine as CuisineType);
}

/**
 * Mapping from AI-provided meal_type strings to valid MealType enum values
 * 
 * This handles common variations and synonyms that AI might use.
 * Only valid enum values are included in the mapping.
 */
const MEAL_TYPE_MAP: Record<string, MealType> = {
  // Direct matches
  'breakfast': 'breakfast',
  'lunch': 'lunch',
  'dinner': 'dinner',
  'snack': 'snack',
  'drink': 'snack', // Drinks are stored as snacks in the current schema
  
  // Common AI variations
  'beverage': 'snack', // Normalize beverage to snack (drinks category)
  'beverages': 'snack',
  'drink': 'snack',
  'drinks': 'snack',
  'cocktail': 'snack',
  'smoothie': 'snack',
  'juice': 'snack',
  
  'dessert': 'snack', // Normalize dessert to snack
  'desserts': 'snack',
  'sweet': 'snack',
  'treat': 'snack',
  
  'brunch': 'breakfast', // Brunch is breakfast
  'morning meal': 'breakfast',
  'breakfast meal': 'breakfast',
  
  'afternoon meal': 'lunch',
  'midday meal': 'lunch',
  'lunch meal': 'lunch',
  
  'evening meal': 'dinner',
  'supper': 'dinner',
  'dinner meal': 'dinner',
  'main meal': 'dinner',
};

/**
 * Normalize AI-provided meal_type strings to valid MealType enum values
 * 
 * @param input - Meal type string from AI (may be invalid)
 * @returns Valid MealType enum value or null if unmapped
 * 
 * @example
 * normalizeMealType('beverage') // Returns: 'snack'
 * normalizeMealType('dessert') // Returns: 'snack'
 * normalizeMealType('invalid') // Returns: null
 */
export function normalizeMealType(input: string | undefined | null): MealType | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const normalizedKey = input.toLowerCase().trim();
  
  // Check if it's already a valid enum value
  const validMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  
  if (validMealTypes.includes(normalizedKey as MealType)) {
    return normalizedKey as MealType;
  }
  
  // Check mapping
  if (MEAL_TYPE_MAP[normalizedKey]) {
    return MEAL_TYPE_MAP[normalizedKey];
  }
  
  // Log unmapped meal type for review
  console.warn('[RecipeCategoryNormalizer] Unmapped AI meal_type (dropped):', {
    input,
    normalizedKey,
  });
  
  return null;
}

/**
 * Get all valid MealType enum values
 */
export function getValidMealTypes(): MealType[] {
  return ['breakfast', 'lunch', 'dinner', 'snack'];
}

/**
 * Check if a meal type string is a valid MealType enum value
 */
export function isValidMealType(mealType: string): mealType is MealType {
  return getValidMealTypes().includes(mealType as MealType);
}
