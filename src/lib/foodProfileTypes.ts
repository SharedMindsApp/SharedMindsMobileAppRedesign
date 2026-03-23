/**
 * Food Profile Types
 * 
 * Defines types for user dietary constraints, allergies, and food preferences
 */

export type DietType =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'halal'
  | 'kosher'
  | 'keto'
  | 'paleo';

export type AllergyType =
  | 'nuts'
  | 'peanuts'
  | 'dairy'
  | 'eggs'
  | 'soy'
  | 'gluten'
  | 'shellfish'
  | 'fish';

export interface UserFoodProfile {
  id: string;
  profile_id: string | null;
  household_id: string | null;
  space_id: string;
  diet: DietType | null;
  allergies: AllergyType[];
  excluded_ingredients: string[];
  preferred_ingredients: string[];
  excluded_cuisines: string[];
  preferred_cuisines: string[];
  allow_overrides: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodProfileInput {
  diet?: DietType | null;
  allergies?: AllergyType[];
  excluded_ingredients?: string[];
  preferred_ingredients?: string[];
  excluded_cuisines?: string[];
  preferred_cuisines?: string[];
  allow_overrides?: boolean;
}

export interface RecipeCompatibilityResult {
  allowed: boolean;
  reasons?: string[];
  warnings?: string[];
  score?: number; // 0-100, higher = more compatible
}

/**
 * Diet definitions - what each diet allows/disallows
 */
export const DIET_DEFINITIONS: Record<DietType, {
  label: string;
  description: string;
  allowedCategories: string[];
  disallowedCategories: string[];
  allowedIngredients?: string[];
  disallowedIngredients?: string[];
}> = {
  omnivore: {
    label: 'Omnivore',
    description: 'Eats all foods',
    allowedCategories: [],
    disallowedCategories: [],
  },
  vegetarian: {
    label: 'Vegetarian',
    description: 'No meat or fish, but includes eggs and dairy',
    allowedCategories: ['vegetarian', 'dairy', 'eggs'],
    disallowedCategories: ['meat', 'fish', 'seafood', 'poultry'],
    disallowedIngredients: ['beef', 'pork', 'chicken', 'turkey', 'lamb', 'fish', 'seafood'],
  },
  vegan: {
    label: 'Vegan',
    description: 'No animal products',
    allowedCategories: ['vegan'],
    disallowedCategories: ['meat', 'fish', 'seafood', 'poultry', 'dairy', 'eggs'],
    disallowedIngredients: ['beef', 'pork', 'chicken', 'turkey', 'lamb', 'fish', 'seafood', 'milk', 'cheese', 'butter', 'eggs', 'honey'],
  },
  pescatarian: {
    label: 'Pescatarian',
    description: 'Vegetarian but includes fish and seafood',
    allowedCategories: ['vegetarian', 'fish', 'seafood'],
    disallowedCategories: ['meat', 'poultry'],
    disallowedIngredients: ['beef', 'pork', 'chicken', 'turkey', 'lamb'],
  },
  halal: {
    label: 'Halal',
    description: 'Permissible according to Islamic law',
    allowedCategories: ['halal'],
    disallowedCategories: ['pork', 'alcohol'],
    disallowedIngredients: ['pork', 'bacon', 'ham', 'alcohol', 'wine', 'beer'],
  },
  kosher: {
    label: 'Kosher',
    description: 'Permissible according to Jewish law',
    allowedCategories: ['kosher'],
    disallowedCategories: ['pork', 'shellfish', 'mixing_meat_dairy'],
    disallowedIngredients: ['pork', 'bacon', 'ham', 'shellfish', 'shrimp', 'crab', 'lobster'],
  },
  keto: {
    label: 'Keto',
    description: 'Low-carb, high-fat diet',
    allowedCategories: ['keto', 'high_fat'],
    disallowedCategories: ['high_carb', 'sugar'],
    disallowedIngredients: ['bread', 'pasta', 'rice', 'potatoes', 'sugar', 'honey'],
  },
  paleo: {
    label: 'Paleo',
    description: 'Paleolithic diet - whole foods only',
    allowedCategories: ['paleo'],
    disallowedCategories: ['processed', 'grains', 'legumes', 'dairy'],
    disallowedIngredients: ['bread', 'pasta', 'rice', 'beans', 'lentils', 'milk', 'cheese'],
  },
};

/**
 * Allergy definitions - what each allergy blocks
 */
export const ALLERGY_DEFINITIONS: Record<AllergyType, {
  label: string;
  description: string;
  blockedIngredients: string[];
  blockedCategories?: string[];
}> = {
  nuts: {
    label: 'Tree Nuts',
    description: 'Allergic to tree nuts (almonds, walnuts, cashews, etc.)',
    blockedIngredients: ['almonds', 'walnuts', 'cashews', 'pecans', 'hazelnuts', 'pistachios', 'macadamia', 'brazil nuts'],
    blockedCategories: ['nuts'],
  },
  peanuts: {
    label: 'Peanuts',
    description: 'Allergic to peanuts',
    blockedIngredients: ['peanuts', 'peanut butter', 'peanut oil'],
    blockedCategories: ['peanuts'],
  },
  dairy: {
    label: 'Dairy',
    description: 'Lactose intolerant or dairy allergy',
    blockedIngredients: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein'],
    blockedCategories: ['dairy'],
  },
  eggs: {
    label: 'Eggs',
    description: 'Allergic to eggs',
    blockedIngredients: ['eggs', 'egg whites', 'egg yolks', 'mayonnaise'],
    blockedCategories: ['eggs'],
  },
  soy: {
    label: 'Soy',
    description: 'Allergic to soy',
    blockedIngredients: ['soy', 'soybean', 'tofu', 'tempeh', 'soy sauce', 'edamame'],
    blockedCategories: ['soy'],
  },
  gluten: {
    label: 'Gluten',
    description: 'Celiac disease or gluten sensitivity',
    blockedIngredients: ['wheat', 'barley', 'rye', 'bread', 'pasta', 'flour'],
    blockedCategories: ['gluten', 'wheat'],
  },
  shellfish: {
    label: 'Shellfish',
    description: 'Allergic to shellfish',
    blockedIngredients: ['shrimp', 'crab', 'lobster', 'mussels', 'clams', 'oysters', 'scallops'],
    blockedCategories: ['shellfish', 'seafood'],
  },
  fish: {
    label: 'Fish',
    description: 'Allergic to fish',
    blockedIngredients: ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'sardines'],
    blockedCategories: ['fish'],
  },
};

/**
 * Get all available diet types
 */
export function getAllDietTypes(): DietType[] {
  return Object.keys(DIET_DEFINITIONS) as DietType[];
}

/**
 * Get all available allergy types
 */
export function getAllergyTypes(): AllergyType[] {
  return Object.keys(ALLERGY_DEFINITIONS) as AllergyType[];
}

/**
 * Get diet label
 */
export function getDietLabel(diet: DietType | null): string {
  if (!diet) return 'No diet specified';
  return DIET_DEFINITIONS[diet]?.label || diet;
}

/**
 * Get allergy label
 */
export function getAllergyLabel(allergy: AllergyType): string {
  return ALLERGY_DEFINITIONS[allergy]?.label || allergy;
}
