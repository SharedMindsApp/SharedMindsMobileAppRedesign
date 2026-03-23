/**
 * Recipe AI Prompt Service
 * 
 * Service for generating prompts for Perplexity AI to search and extract
 * recipe information from the internet, formatted for our recipe system.
 * 
 * Ensures ingredients can be matched to food_items in the pantry.
 */

import type { RecipeIngredient, MealType, MealCategory, CuisineType, CookingDifficulty } from './recipeGeneratorTypes';
import type { UserFoodProfile } from './foodProfileTypes';
import { DIET_DEFINITIONS, ALLERGY_DEFINITIONS } from './foodProfileTypes';

/**
 * Request structure for recipe generation
 */
export interface RecipeGenerationRequest {
  query: string; // e.g., "chicken curry recipe", "vegetarian pasta", "quick breakfast ideas"
  meal_type?: MealType;
  cuisine?: CuisineType;
  dietary_requirements?: string[]; // e.g., ["vegetarian", "gluten-free", "vegan"]
  selected_tags?: string[]; // Tags selected by user (e.g., ["asian", "quick-meal"]) - these will be automatically assigned to generated recipes and used in AI prompts for better suggestions
  servings?: number;
  max_prep_time?: number; // minutes
  max_cook_time?: number; // minutes
  difficulty?: CookingDifficulty;
  food_profile?: UserFoodProfile | null; // User's dietary constraints and preferences
  location?: string | null; // User's location (e.g., "United Kingdom", "London, UK") for culturally relevant recipes
}

/**
 * Expected JSON response structure from Perplexity
 */
export interface PerplexityRecipeResponse {
  recipe: {
    name: string;
    description?: string;
    meal_type: MealType;
    servings: number;
    ingredients: Array<{
      name: string; // Exact ingredient name as it appears in recipe (e.g., "chicken breast", "olive oil", "garlic cloves")
      quantity: string; // Natural language or numeric (e.g., "2", "1/2 cup", "3 cloves", "250g")
      unit: string; // Unit of measurement (e.g., "cup", "tbsp", "tsp", "cloves", "pieces", "g", "ml", "")
      optional?: boolean;
      notes?: string; // Preparation notes (e.g., "chopped", "diced", "minced")
    }>;
    instructions: string; // Full instructions as text
    instructions_structured?: Array<{
      step_number: number;
      instruction: string;
      duration_minutes?: number;
      temperature_celsius?: number;
    }>;
    categories?: MealCategory[];
    cuisine?: CuisineType;
    difficulty?: CookingDifficulty;
    prep_time_minutes?: number;
    cook_time_minutes?: number;
    total_time_minutes?: number;
    nutrition?: {
      calories?: number;
      protein_grams?: number;
      carbs_grams?: number;
      fat_grams?: number;
      fiber_grams?: number;
      sodium_mg?: number;
    };
    dietary_tags?: string[]; // e.g., ["vegetarian", "gluten-free", "dairy-free"]
    allergies?: string[]; // e.g., ["nuts", "dairy", "eggs"]
    image_url?: string;
    source_url?: string;
    source_name?: string;
  };
  metadata: {
    confidence_score: number; // 0.0 to 1.0
    sources: string[]; // URLs of sources used
    extraction_method: string; // "web_search", "recipe_site", etc.
  };
}

/**
 * Generate a prompt for Perplexity AI to search and suggest multiple recipe variations
 * Returns a prompt that asks for 5 different variations of the search query
 */
export function generateRecipeVariationsPrompt(
  baseQuery: string,
  mealType?: MealType,
  cuisine?: CuisineType,
  dietaryRequirements?: string[],
  location?: string | null,
  selectedTags?: string[], // Tags selected by user for this meal type (e.g., ["quick-meal", "vegetarian"])
  includeLocationInAI: boolean = true, // Whether to include location in prompt (default: true)
  courseType?: 'starter' | 'side' | 'main' | 'dessert' | 'shared' | 'snack' // Course/dish type (e.g., "dessert", "starter")
): string {
  let prompt = `Find 5 different FOOD OR DRINK recipe variations for: ${baseQuery}`;
  
  // Add location to the base query for culturally relevant variations (only if enabled)
  if (location && includeLocationInAI) {
    prompt += ` in ${location}`;
  }
  prompt += `\n\n`;
  
  // CRITICAL: Explicitly state this is for food/drink only
  prompt += `🚨 CRITICAL REQUIREMENT: ALL results MUST be FOOD or DRINK recipes only.\n`;
  prompt += `- DO NOT return non-food items (e.g., LED bulbs, light fixtures, appliances, furniture, etc.)\n`;
  prompt += `- DO NOT return non-drink items (e.g., light beer as a product, not a recipe)\n`;
  prompt += `- ONLY return edible food recipes or drink recipes that can be prepared/cooked\n`;
  prompt += `- If the search term is ambiguous (e.g., "light"), interpret it as a food/drink term:\n`;
  prompt += `  * "light" = light meals, light dishes, light desserts, light drinks (low-calorie, refreshing)\n`;
  prompt += `  * "light" = NOT light bulbs, lighting fixtures, or electrical items\n`;
  prompt += `  * Always prioritize food/drink interpretations over other meanings\n\n`;
  
  if (mealType) {
    prompt += `Meal type: ${mealType}\n`;
  }
  
  // Add course/dish type to guide AI suggestions
  if (courseType && courseType !== 'main') {
    const courseTypeLabels: Record<string, string> = {
      starter: 'starter/appetizer',
      side: 'side dish',
      main: 'main course',
      dessert: 'dessert',
      shared: 'shared dish (e.g., tapas, mezze, family-style)',
      snack: 'snack',
    };
    prompt += `Dish type: ${courseTypeLabels[courseType] || courseType}\n`;
    prompt += `IMPORTANT: All suggestions MUST be ${courseTypeLabels[courseType] || courseType} recipes. For example:\n`;
    if (courseType === 'dessert') {
      prompt += `- Return dessert recipes like cakes, cookies, ice cream, puddings, pies, tarts, etc.\n`;
      prompt += `- DO NOT return main courses, starters, or side dishes\n`;
    } else if (courseType === 'starter') {
      prompt += `- Return starter/appetizer recipes like soups, salads, small plates, dips, etc.\n`;
      prompt += `- DO NOT return main courses or desserts\n`;
    } else if (courseType === 'side') {
      prompt += `- Return side dish recipes like vegetables, salads, breads, rice dishes, etc.\n`;
      prompt += `- DO NOT return main courses or desserts\n`;
    } else if (courseType === 'shared') {
      prompt += `- Return shared/family-style dishes like tapas, mezze, platters, etc.\n`;
      prompt += `- These are dishes meant to be shared among multiple people\n`;
    }
    prompt += `\n`;
  }
  
  if (cuisine) {
    prompt += `Cuisine style: ${cuisine}\n`;
  }
  
  if (dietaryRequirements && dietaryRequirements.length > 0) {
    prompt += `Dietary requirements: ${dietaryRequirements.join(', ')}\n`;
  }
  
  // Add selected tags to tailor suggestions based on user preferences
  if (selectedTags && selectedTags.length > 0) {
    prompt += `User preferences: ${selectedTags.map(tag => tag.replace(/-/g, ' ')).join(', ')}\n`;
    prompt += `IMPORTANT: Prioritize recipes that match these preferences. These tags represent what the user likes for ${mealType || 'this meal'}.\n`;
  }
  
  prompt += `\nReturn a JSON array with 5 different FOOD/DRINK recipe variations. Each variation should be a distinct type or flavor.\n\n`;
  prompt += `Example: If searching for "pizza", return variations like:\n`;
  prompt += `- Margherita Pizza\n`;
  prompt += `- Pepperoni Pizza\n`;
  prompt += `- Hawaiian Pizza\n`;
  prompt += `- BBQ Chicken Pizza\n`;
  prompt += `- Vegetarian Pizza\n\n`;
  prompt += `Example: If searching for "ice cream", return variations like:\n`;
  prompt += `- Vanilla Ice Cream\n`;
  prompt += `- Chocolate Ice Cream\n`;
  prompt += `- Strawberry Ice Cream\n`;
  prompt += `- Cookies and Cream Ice Cream\n`;
  prompt += `- Mint Chocolate Chip Ice Cream\n\n`;
  prompt += `Example: If searching for "light", return FOOD/DRINK variations like:\n`;
  prompt += `- Light Caesar Salad\n`;
  prompt += `- Light Lemon Chicken\n`;
  prompt += `- Light Tiramisu\n`;
  prompt += `- Light Fruit Smoothie\n`;
  prompt += `- Light Greek Yogurt Parfait\n\n`;
  
  prompt += `Return ONLY a JSON array in this format:\n`;
  prompt += `[\n`;
  prompt += `  { "name": "Variation 1 name", "description": "Brief description", "query": "Specific search query for this variation" },\n`;
  prompt += `  { "name": "Variation 2 name", "description": "Brief description", "query": "Specific search query for this variation" },\n`;
  prompt += `  ...\n`;
  prompt += `]\n\n`;
  prompt += `Each variation should:\n`;
  prompt += `- Be a distinct, popular FOOD or DRINK recipe variation of ${baseQuery}\n`;
  prompt += `- Be an edible item that can be prepared, cooked, or made in a kitchen\n`;
  prompt += `- Have a clear, descriptive name\n`;
  prompt += `- Include a brief description (1 sentence) explaining what the recipe is\n`;
  prompt += `- Have a specific search query that would find that exact recipe variation\n`;
  prompt += `- Be different enough from other variations to provide variety\n`;
  
  // Add location context only if enabled
  if (location && includeLocationInAI) {
    prompt += `- Be culturally relevant to ${location} (use local ingredients, traditional methods, and regional variations where appropriate)\n`;
  }
  
  prompt += `\n🚨 FINAL CHECK: Before returning, verify ALL 5 variations are FOOD or DRINK recipes. Reject any non-food items.\n`;
  prompt += `\nReturn ONLY valid JSON, no markdown, no code blocks, no explanations.`;
  
  return prompt;
}

/**
 * Generate a prompt for Perplexity AI to search and extract recipe information
 */
export function generatePerplexityPrompt(
  request: RecipeGenerationRequest,
  includeLocationInAI: boolean = true // Whether to include location in prompt (default: true)
): string {
  const {
    query,
    meal_type,
    cuisine,
    dietary_requirements = [],
    servings = 4,
    max_prep_time,
    max_cook_time,
    difficulty,
    location,
  } = request;

  // Build search-friendly query (Perplexity best practice: be specific and contextual)
  // Think like a web search user - use terms that would appear on recipe websites
  const searchTerms: string[] = [query];
  
  if (meal_type) {
    searchTerms.push(`${meal_type} recipe`);
  }
  
  if (cuisine) {
    searchTerms.push(`${cuisine} cuisine`);
  }
  
  if (dietary_requirements.length > 0) {
    searchTerms.push(dietary_requirements.join(' '));
  }
  
  // Separate ingredients from preference tags
  // When query has ingredient keywords, first items in selected_tags are ingredients
  // Remaining items are preference tags
  let ingredients: string[] = [];
  let preferenceTags: string[] = [];
  
  if (request.selected_tags && request.selected_tags.length > 0) {
    const queryLower = query.toLowerCase();
    const hasIngredientKeywords = queryLower.includes('using') || 
                                  queryLower.includes('with') ||
                                  queryLower.includes('ingredients');
    
    if (hasIngredientKeywords && request.selected_tags.length >= 2) {
      // First items are ingredients (max 5), rest are preference tags
      ingredients = request.selected_tags.slice(0, 5);
      preferenceTags = request.selected_tags.slice(5);
    } else {
      // No ingredient keywords, treat all as preference tags
      preferenceTags = request.selected_tags;
    }
  }
  
  // Add preference tags to search terms to tailor AI suggestions
  // These tags represent user preferences for this specific meal type
  if (preferenceTags.length > 0) {
    preferenceTags.forEach(tag => {
      if (tag && tag.trim().length > 0) {
        searchTerms.push(tag.trim());
      }
    });
  }
  
  if (servings) {
    searchTerms.push(`serves ${servings}`);
  }
  
  if (max_prep_time || max_cook_time) {
    const totalTime = (max_prep_time || 0) + (max_cook_time || 0);
    if (totalTime > 0) {
      searchTerms.push(`${totalTime} minutes`);
    }
  }
  
  if (difficulty) {
    searchTerms.push(`${difficulty} difficulty`);
  }
  
  // Add location to search terms for culturally relevant recipes (only if enabled)
  if (location && includeLocationInAI) {
    searchTerms.push(`in ${location}`);
  }

  // Create search-friendly query (Perplexity best practice: specific and contextual)
  const searchQuery = searchTerms.join(' ');
  
  let prompt = `Find a complete FOOD OR DRINK recipe for: ${searchQuery}\n\n`;
  
  // CRITICAL: Explicitly state this is for food/drink only
  prompt += `🚨 CRITICAL REQUIREMENT: You MUST return a FOOD or DRINK recipe only.\n`;
  prompt += `- DO NOT return non-food items (e.g., LED bulbs, light fixtures, appliances, furniture, etc.)\n`;
  prompt += `- DO NOT return non-drink items (e.g., light beer as a product listing, not a recipe)\n`;
  prompt += `- ONLY return an edible food recipe or drink recipe that can be prepared/cooked in a kitchen\n`;
  prompt += `- If the search term is ambiguous (e.g., "light"), interpret it as a food/drink term:\n`;
  prompt += `  * "light" = light meals, light dishes, light desserts, light drinks (low-calorie, refreshing, airy)\n`;
  prompt += `  * "light" = NOT light bulbs, lighting fixtures, electrical items, or non-food products\n`;
  prompt += `  * Always prioritize food/drink interpretations over other meanings\n`;
  prompt += `- The recipe must have ingredients that can be purchased at a grocery store or food market\n`;
  prompt += `- The recipe must have cooking/preparation instructions\n\n`;
  
  // Add specific requirements
  const requirements: string[] = [];
  
  if (meal_type) {
    requirements.push(`Must be suitable for ${meal_type}`);
  }
  
  if (cuisine) {
    requirements.push(`Must be ${cuisine} cuisine style`);
  }
  
  if (dietary_requirements.length > 0) {
    requirements.push(`Must be ${dietary_requirements.join(' and ')}`);
  }
  
  // Add ingredient constraints if provided (from ingredient-based search)
  // Use the separated ingredients array
  const ingredientConstraints: string[] = [];
  
  if (ingredients.length >= 2) {
    ingredientConstraints.push(
      `🚨 CRITICAL INGREDIENT REQUIREMENT: The recipe MUST use at least 3 of the following ingredients: ${ingredients.join(', ')}`
    );
    ingredientConstraints.push(
      `- Prefer recipes that use ALL of these ingredients: ${ingredients.join(', ')}`
    );
    ingredientConstraints.push(
      `- Do NOT suggest recipes that exclude or omit these ingredients`
    );
    ingredientConstraints.push(
      `- These ingredients are required and must be prominently featured in the recipe`
    );
  }
  
  // Add preference tags as requirements if provided
  if (preferenceTags.length > 0) {
    requirements.push(`Recipe should match these preferences: ${preferenceTags.map(t => t.replace(/-/g, ' ')).join(', ')}`);
  }
  
  if (servings) {
    requirements.push(`Must serve ${servings} people`);
  }
  
  if (max_prep_time) {
    requirements.push(`Prep time should not exceed ${max_prep_time} minutes`);
  }
  
  if (max_cook_time) {
    requirements.push(`Cook time should not exceed ${max_cook_time} minutes`);
  }
  
  if (difficulty) {
    requirements.push(`Difficulty level should be ${difficulty}`);
  }
  
  // Add location requirement for culturally relevant recipes (only if enabled)
  if (location && includeLocationInAI) {
    requirements.push(`Recipe should be culturally relevant to ${location} (use local ingredients, traditional methods, and regional variations where appropriate)`);
  }

  if (requirements.length > 0) {
    prompt += `Recipe Requirements:\n${requirements.map(r => `- ${r}`).join('\n')}\n\n`;
  }
  
  // Add ingredient constraints if provided
  if (ingredientConstraints.length > 0) {
    prompt += `🍽️ INGREDIENT CONSTRAINTS (CRITICAL):\n${ingredientConstraints.map(c => `${c}`).join('\n')}\n\n`;
  }

  // Add food profile constraints if provided
  if (request.food_profile) {
    const profile = request.food_profile;
    const constraints: string[] = [];

    // Diet constraints
    if (profile.diet && profile.diet !== 'omnivore') {
      const dietDef = DIET_DEFINITIONS[profile.diet];
      if (dietDef) {
        constraints.push(`DIET: ${dietDef.label} - ${dietDef.description}`);
        if (dietDef.disallowedCategories.length > 0) {
          constraints.push(`  - MUST NOT contain: ${dietDef.disallowedCategories.join(', ')}`);
        }
        if (dietDef.disallowedIngredients && dietDef.disallowedIngredients.length > 0) {
          constraints.push(`  - MUST NOT contain ingredients: ${dietDef.disallowedIngredients.join(', ')}`);
        }
      }
    }

    // Allergies (hard block)
    if (profile.allergies.length > 0) {
      const allergyLabels = profile.allergies.map(a => {
        const allergyDef = ALLERGY_DEFINITIONS[a];
        return allergyDef ? allergyDef.label : a;
      });
      constraints.push(`ALLERGIES (CRITICAL - DO NOT VIOLATE): ${allergyLabels.join(', ')}`);
      constraints.push(`  - Recipe MUST NOT contain any of these allergens`);
      constraints.push(`  - Check all ingredients carefully`);
    }

    // Excluded ingredients
    if (profile.excluded_ingredients.length > 0) {
      constraints.push(`EXCLUDED INGREDIENTS: ${profile.excluded_ingredients.join(', ')}`);
      constraints.push(`  - Recipe MUST NOT contain these ingredients`);
    }

    // Preferred ingredients (for ranking, not blocking)
    if (profile.preferred_ingredients.length > 0) {
      constraints.push(`PREFERRED INGREDIENTS (prefer but not required): ${profile.preferred_ingredients.join(', ')}`);
    }

    // Excluded cuisines
    if (profile.excluded_cuisines.length > 0) {
      constraints.push(`EXCLUDED CUISINES (avoid if possible): ${profile.excluded_cuisines.join(', ')}`);
    }

    // Preferred cuisines
    if (profile.preferred_cuisines.length > 0) {
      constraints.push(`PREFERRED CUISINES (prefer but not required): ${profile.preferred_cuisines.join(', ')}`);
    }

    if (constraints.length > 0) {
      prompt += `\n🚨 USER DIETARY CONSTRAINTS (MANDATORY):\n`;
      prompt += constraints.map(c => `- ${c}`).join('\n');
      prompt += `\n\nCRITICAL RULES:\n`;
      prompt += `- NEVER suggest recipes that violate allergies or diet constraints\n`;
      prompt += `- NEVER include excluded ingredients\n`;
      prompt += `- If a recipe would violate these constraints, DO NOT suggest it\n`;
      prompt += `- Preferred items are suggestions only - they do not block other recipes\n`;
      prompt += `\n`;
    }
  }

  prompt += `🚨 VALIDATION: Before extracting, verify the search result is a FOOD or DRINK recipe:\n`;
  prompt += `- Does it have food ingredients (e.g., flour, eggs, vegetables, meat, spices, fruits, dairy)?\n`;
  prompt += `- Does it have cooking/preparation instructions?\n`;
  prompt += `- Can it be made in a kitchen?\n`;
  prompt += `- If NO to any of these, DO NOT extract it. Search for a different food/drink recipe instead.\n\n`;
  
  prompt += `🚨 CRITICAL REQUIRED FIELDS (MANDATORY - DO NOT OMIT):\n`;
  prompt += `- name: A short, human-readable recipe title (string, REQUIRED)\n`;
  prompt += `- meal_type: One of: "breakfast" | "lunch" | "dinner" | "snack" | "drink" (REQUIRED)\n`;
  prompt += `  * If the recipe is a beverage, use "drink"\n`;
  prompt += `  * If the recipe is a dessert, use "snack"\n`;
  prompt += `  * If unsure, choose the most appropriate meal type based on when it's typically consumed\n`;
  prompt += `- Failure to include these fields will invalidate the response and cause the recipe to be rejected.\n\n`;
  
  prompt += `Extract the complete FOOD/DRINK recipe information from the search results and return it in the following JSON format. Use EXACT ingredient names as they appear in the recipe source (e.g., "chicken breast" not "chicken", "olive oil" not "oil", "garlic cloves" not "garlic").\n\n`;

  prompt += `⏱️ TIMING INFORMATION (REQUIRED):\n`;
  prompt += `- ALWAYS include prep_time_minutes (time for chopping, mixing, marinating, etc.)\n`;
  prompt += `- ALWAYS include cook_time_minutes (active cooking time: baking, frying, simmering, etc.)\n`;
  prompt += `- ALWAYS include total_time_minutes (prep_time_minutes + cook_time_minutes)\n`;
  prompt += `- If the source recipe doesn't specify exact times, estimate based on typical preparation and cooking times for similar dishes\n`;
  prompt += `- Times should be realistic and helpful for meal planning\n`;
  prompt += `- If prep and cook times overlap (e.g., prep while cooking), still include both separately\n\n`;

  prompt += `Required JSON structure:
{
  "recipe": {
    "name": "Recipe name",  // REQUIRED: Short, human-readable title
    "description": "Brief description (optional)",
    "meal_type": "breakfast" | "lunch" | "dinner" | "snack" | "drink",  // REQUIRED: Must be one of these exact values
    "servings": ${servings},
    "ingredients": [
      {
        "name": "Exact ingredient name as written in recipe (e.g., 'chicken breast', 'olive oil', 'garlic cloves', 'all-purpose flour')",
        "quantity": "Amount (e.g., '2', '1/2', '250')",
        "unit": "Unit - PREFER measurable units: 'g' (grams), 'kg' (kilograms), 'oz' (ounces), 'ml' (milliliters), 'l' (liters), 'cup', 'tbsp', 'tsp'. AVOID 'piece' or 'pieces' unless absolutely necessary (e.g., for eggs, which are commonly measured by count). If you must use 'piece', provide the weight equivalent in grams or ounces instead when possible.",
        "optional": false,
        "notes": "Preparation notes if any (e.g., 'chopped', 'diced', 'minced', 'sliced')"
      }
    ],
    "instructions": "Step-by-step instructions formatted with numbered steps. Each step should be on a new line starting with the step number (e.g., '1. First step', '2. Second step', etc.). Break long instructions into clear, sequential steps.",
    "instructions_structured": [
      {
        "step_number": 1,
        "instruction": "Clear, concise description of this step",
        "duration_minutes": 10,
        "temperature_celsius": 180
      }
    ],
    "categories": ["home_cooked", "healthy", etc.],
    "cuisine": "italian" | "indian" | etc. | null,
    "difficulty": "easy" | "medium" | "hard",
    "prep_time_minutes": 15,  // REQUIRED: Preparation time in minutes (chopping, mixing, etc.)
    "cook_time_minutes": 30,  // REQUIRED: Active cooking time in minutes (baking, frying, etc.)
    "total_time_minutes": 45, // REQUIRED: Total time = prep_time_minutes + cook_time_minutes
    "nutrition": {
      "calories": 350,
      "protein_grams": 25,
      "carbs_grams": 30,
      "fat_grams": 15,
      "fiber_grams": 5,
      "sodium_mg": 500
    },
    "dietary_tags": ["vegetarian", "gluten-free", "breakfast", "drink", "quick-meal", etc.],
    "allergies": ["nuts", "dairy"],
    "image_url": "URL if available",
    "source_url": "Original recipe URL",
    "source_name": "Source website name"
  },
  "metadata": {
    "confidence_score": 0.85,
    "sources": ["url1", "url2"],
    "extraction_method": "web_search"
  }
}

IMPORTANT INGREDIENT NAMING RULES:
1. Use the EXACT ingredient name as it appears in the recipe source
2. Include specific descriptors (e.g., "chicken breast" not "chicken", "olive oil" not "oil")
3. Include preparation state if part of the name (e.g., "ground beef" not "beef")
4. Be specific about cuts/types (e.g., "boneless chicken thighs" not "chicken")
5. Include unit descriptors when relevant (e.g., "garlic cloves" not "garlic")
6. Preserve brand names if specified (e.g., "Kosher salt" not just "salt")
7. Keep compound ingredients together (e.g., "all-purpose flour" not "flour")

DO NOT normalize, simplify, or generalize ingredient names.
DO NOT convert ingredient names to categories.
DO NOT replace ingredient names with common equivalents.

EXAMPLE INGREDIENT FORMATTING:
Good: "chicken breast", "olive oil", "garlic cloves", "all-purpose flour", "ground beef", "Kosher salt"
Bad: "chicken", "oil", "garlic", "flour", "beef", "salt"

UNIT RULE (CRITICAL):
- PREFER measurable units (grams, ounces, milliliters, cups, tablespoons, teaspoons) over vague units like "piece" or "pieces"
- For ingredients commonly measured by weight, use: "g" (grams), "kg" (kilograms), or "oz" (ounces)
- For ingredients commonly measured by volume, use: "ml" (milliliters), "l" (liters), "cup", "tbsp", "tsp"
- ONLY use "piece" or "pieces" for items that are genuinely counted (e.g., eggs, whole fruits for garnish)
- If a recipe says "2 chicken breasts", convert to weight: use "340g" (approximately 170g per breast) instead of "2 pieces"
- If a recipe says "1 onion", convert to weight: use "150g" instead of "1 piece"
- If the unit is included inside the quantity string (e.g. "1/2 cup", "250g"), set unit to an empty string ""
- Only use the unit field when quantity is purely numeric (e.g. "2" + "cloves", "3" + "tbsp")
- Examples:
  * quantity: "340", unit: "g" ✓ (for "2 chicken breasts")
  * quantity: "150", unit: "g" ✓ (for "1 onion")
  * quantity: "1/2 cup", unit: "" ✓
  * quantity: "250g", unit: "" ✓
  * quantity: "2", unit: "cloves" ✓ (garlic cloves are small and commonly counted)
  * quantity: "3", unit: "tbsp" ✓
  * quantity: "2", unit: "piece" ✗ (WRONG - use weight instead)
  * quantity: "1/2 cup", unit: "cup" ✗ (WRONG - duplicate)

NUTRITION DATA RULES:
- Only include nutrition values if explicitly available from the source
- If nutrition data is not found, omit the nutrition object entirely
- Do NOT estimate or infer nutrition values
- Do NOT guess or calculate nutrition values
- If you cannot find exact nutrition data, set nutrition to null or omit it

IMAGE RULE:
- Only include image_url if it exists on the source page
- Do NOT invent or guess image URLs
- Do NOT generate placeholder URLs
- If no image is found, omit image_url or set to null

🏷️ DIETARY TAGS RULES (CRITICAL)

You are a recipe analysis assistant. Your goal is to generate high-quality, widely useful tags that describe the recipe accurately and consistently. Tags must support search, filtering, and discovery.

Tags must be broadly understandable:
- Use tags a normal person would expect
- Avoid niche, obscure, or overly clever tags
- Prefer common food language
- Use lowercase, hyphen-separated format (e.g., "quick-meal" not "Quick Meal" or "quick_meal")

Include 3–8 tags total:
- Fewer than 3 = not descriptive enough
- More than 8 = noisy and unhelpful

Do NOT invent tags:
- Only include tags that are clearly supported by the recipe
- If unsure, leave the tag out

REQUIRED TAG TYPES (WHEN APPLICABLE):

1. Meal Context:
   - Include meal type tags (breakfast, lunch, dinner, snack) if the recipe is clearly associated with that meal

2. Drink Detection:
   - If the recipe is a beverage (smoothie, juice, coffee, tea, cocktail, mocktail, shake, etc.), ALWAYS include: "drink"

3. Time & Convenience:
   - Include only if strongly supported: "quick-meal", "15-min", "30-min", "one-pot", "meal-prep"

4. Dietary Characteristics:
   - Only include if explicitly true: "vegetarian", "vegan", "gluten-free", "dairy-free", "keto", "paleo"
   - Do NOT guess. If uncertain, omit.

5. Taste & Style:
   - Optional but encouraged when obvious: "comfort-food", "spicy", "sweet", "savory", "light", "hearty"

6. Cuisine Signal (Optional):
   - Include cuisine-style tags only if unambiguous: "italian", "chinese", "mexican", "asian", "indian"

TAGGING ANTI-RULES:
❌ Do NOT include duplicate tags
❌ Do NOT include tags that simply restate ingredients (chicken, rice, noodles unless dish-defining)
❌ Do NOT include subjective hype tags (amazing, best-ever, viral)
❌ Do NOT include preparation steps as tags (stir-fried, baked) unless core to the dish identity

GOOD TAG EXAMPLES:
- Quick dinner recipe: ["dinner", "quick-meal", "15-min", "comfort-food"]
- Breakfast smoothie: ["drink", "breakfast", "healthy", "quick-meal"]
- Family pasta bake: ["dinner", "comfort-food", "family-friendly"]
- Light lunch salad: ["lunch", "healthy", "vegetarian"]

BAD TAG EXAMPLES:
- ["food", "recipe", "yummy", "easy-cooking", "chef-special"]
- ["chicken", "garlic", "pan", "oil"]

FINAL INSTRUCTION:
Return only the dietary_tags array as part of the recipe JSON. Do not explain your choices. Do not include metadata about how tags were chosen. Do not exceed 8 tags.

INSTRUCTIONS FORMATTING RULES (CRITICAL):
1. ALWAYS break instructions into numbered steps (1., 2., 3., etc.)
2. Each step should be a separate, clear action
3. Format instructions as: "1. First step description\n2. Second step description\n3. Third step description"
4. DO NOT return instructions as one long paragraph
5. DO NOT use bullet points (-, •, *) - use numbers only
6. Each step should be concise but complete (one action per step)
7. If the source recipe has long paragraphs, break them into logical numbered steps
8. Preferred: Use instructions_structured array with step_number and instruction fields
9. If using instructions string, ensure each step starts with a number followed by a period and space

EXAMPLE OF GOOD INSTRUCTIONS FORMAT:
"instructions": "1. Heat oil in a large pan over medium heat.\n2. Add onions and cook until translucent, about 5 minutes.\n3. Add garlic and cook for 1 minute until fragrant.\n4. Add chicken and cook until browned, about 8 minutes.\n5. Add spices and stir to combine.\n6. Pour in coconut milk and bring to a simmer.\n7. Cook for 15 minutes until chicken is cooked through.\n8. Serve hot with rice."

EXAMPLE OF BAD INSTRUCTIONS FORMAT (DO NOT USE):
"instructions": "Heat oil in a large pan over medium heat. Add onions and cook until translucent, about 5 minutes. Add garlic and cook for 1 minute until fragrant. Add chicken and cook until browned, about 8 minutes. Add spices and stir to combine. Pour in coconut milk and bring to a simmer. Cook for 15 minutes until chicken is cooked through. Serve hot with rice."

Return ONLY valid JSON, no markdown, no code blocks, no explanations.`;

  return prompt;
}

/**
 * Infer food category from ingredient name
 */
function inferCategory(ingredientName: string): string | null {
  const name = ingredientName.toLowerCase();
  
  // Dairy
  if (/\b(milk|cheese|butter|cream|yogurt|yoghurt|sour cream|cottage cheese|mozzarella|cheddar|parmesan)\b/.test(name)) {
    return 'dairy';
  }
  
  // Produce
  if (/\b(tomato|lettuce|onion|garlic|pepper|carrot|potato|broccoli|spinach|celery|cucumber|mushroom|avocado|lemon|lime|apple|banana|orange)\b/.test(name)) {
    return 'produce';
  }
  
  // Meat
  if (/\b(chicken|beef|pork|turkey|lamb|bacon|sausage|ham|steak|ground)\b/.test(name)) {
    return 'meat';
  }
  
  // Seafood
  if (/\b(fish|salmon|tuna|shrimp|prawn|crab|lobster|seafood)\b/.test(name)) {
    return 'seafood';
  }
  
  // Pantry/Staples
  if (/\b(flour|sugar|salt|pepper|oil|vinegar|spice|herb|rice|pasta|noodle|bread|cereal)\b/.test(name)) {
    return 'pantry';
  }
  
  // Frozen
  if (/\b(frozen)\b/.test(name)) {
    return 'frozen';
  }
  
  return null;
}

/**
 * Generate a hash for recipe deduplication
 * Uses recipe name + ingredient names + instructions
 * Returns SHA-256 hash as hex string
 */
export async function generateRecipeHash(
  name: string,
  ingredients: Array<{ name: string }>,
  instructions: string
): Promise<string> {
  const content = `${name}|${ingredients.map(i => i.name).sort().join(',')}|${instructions}`;
  
  // Use Web Crypto API for SHA-256 hashing (available in browser and Node.js)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback for environments without Web Crypto API
    // Simple hash function (not cryptographically secure, but works for deduplication)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Process Perplexity response and map ingredient names to food_item_ids
 * This function will attempt to match ingredient names to existing food_items
 * and create new ones if they don't exist
 * 
 * @param response - Perplexity AI response
 * @param spaceId - Space ID (personal/household/team) - reserved for future space-scoped food items
 */
export async function processPerplexityResponse(
  response: PerplexityRecipeResponse,
  _spaceId?: string // Reserved for future use - food items are currently global
): Promise<{
  recipe: Omit<PerplexityRecipeResponse['recipe'], 'ingredients'> & {
    ingredients: RecipeIngredient[];
  };
  metadata: PerplexityRecipeResponse['metadata'] & {
    recipe_hash?: string;
  };
  ingredientMapping: Map<string, string>; // ingredient name -> food_item_id
}> {
  const { getOrCreateFoodItem } = await import('./foodItems');
  
  const ingredientMapping = new Map<string, string>();
  const mappedIngredients: RecipeIngredient[] = [];

  // Process each ingredient
  for (const ingredient of response.recipe.ingredients) {
    try {
      // First, try to search for existing food item with fuzzy matching
      const { searchFoodItems } = await import('./foodItems');
      const searchResults = await searchFoodItems(ingredient.name, 5);
      
      let foodItem: Awaited<ReturnType<typeof getOrCreateFoodItem>>;
      
      if (searchResults.length > 0) {
        // Use the best match (first result from fuzzy search)
        foodItem = searchResults[0];
      } else {
        // No match found, create new food item
        // Extract category from ingredient name if possible
        const category = inferCategory(ingredient.name);
        foodItem = await getOrCreateFoodItem(ingredient.name, category);
      }
      
      ingredientMapping.set(ingredient.name, foodItem.id);

      // Create recipe ingredient structure
      const recipeIngredient: RecipeIngredient = {
        food_item_id: foodItem.id,
        quantity: ingredient.quantity,
        unit: ingredient.unit || '',
        optional: ingredient.optional || false,
        notes: ingredient.notes || undefined,
      };

      mappedIngredients.push(recipeIngredient);
    } catch (error) {
      console.error(`Error processing ingredient "${ingredient.name}":`, error);
      // Continue with other ingredients even if one fails
    }
  }

  // Generate recipe hash for deduplication
  const recipeHash = await generateRecipeHash(
    response.recipe.name,
    response.recipe.ingredients,
    response.recipe.instructions || ''
  );

  return {
    recipe: {
      ...response.recipe,
      ingredients: mappedIngredients,
    },
    metadata: {
      ...response.metadata,
      recipe_hash: recipeHash,
    },
    ingredientMapping,
  };
}

/**
 * Generate a batch prompt for multiple recipe searches
 */
export function generateBatchPrompt(requests: RecipeGenerationRequest[]): string {
  if (requests.length === 0) {
    throw new Error('At least one recipe request is required');
  }

  if (requests.length === 1) {
    return generatePerplexityPrompt(requests[0]);
  }

  let prompt = `Search the internet for ${requests.length} recipes:\n\n`;

  requests.forEach((request, index) => {
    prompt += `${index + 1}. "${request.query}"`;
    if (request.meal_type) prompt += ` (${request.meal_type})`;
    if (request.cuisine) prompt += ` - ${request.cuisine} cuisine`;
    prompt += '\n';
  });

  prompt += `\nFor each recipe, extract and return in the same JSON format as specified in the single recipe prompt. Return an array of recipe objects:\n\n`;
  prompt += `[\n  { recipe: {...}, metadata: {...} },\n  { recipe: {...}, metadata: {...} },\n  ...\n]\n\n`;
  prompt += `Follow the same ingredient naming rules and instructions formatting rules (numbered steps) for all recipes.`;

  return prompt;
}

/**
 * Validate Perplexity response structure
 */
/**
 * Validate Perplexity recipe response (relaxed validation for search-based LLM)
 * 
 * Validates minimum viable recipe structure:
 * - Allows optional fields to be missing
 * - Allows extra keys (doesn't fail on unknown fields)
 * - Accepts instructions OR instructions_structured (not both required)
 * - Validates only essential recipe fields
 */
/**
 * Check if a recipe name/description suggests it's a non-food item
 */
function isNonFoodItem(name: string, description?: string): boolean {
  const text = `${name} ${description || ''}`.toLowerCase();
  
  // Common non-food keywords that should be rejected
  const nonFoodKeywords = [
    'led bulb', 'light bulb', 'light fixture', 'lighting', 'lamp', 'light switch',
    'electrical', 'appliance', 'furniture', 'hardware', 'tool', 'gadget',
    'product listing', 'buy', 'purchase', 'price', 'watt', 'voltage', 'lumens',
    'socket', 'fixture', 'wiring', 'circuit', 'electrical item', 'home improvement',
    'lighting solution', 'bulb type', 'bulb size', 'bulb wattage', 'bayonet cap',
    'edison screw', 'gu10', 'mr16', 'b22', 'e27', 'philips hue', 'smart bulb'
  ];
  
  return nonFoodKeywords.some(keyword => text.includes(keyword));
}

/**
 * Check if ingredients suggest this is a food recipe
 */
function hasFoodIngredients(ingredients: Array<{ name: string }>): boolean {
  if (!ingredients || ingredients.length === 0) return false;
  
  // Common food ingredient keywords
  const foodKeywords = [
    'flour', 'sugar', 'salt', 'pepper', 'oil', 'butter', 'egg', 'milk', 'cheese',
    'chicken', 'beef', 'pork', 'fish', 'vegetable', 'fruit', 'herb', 'spice',
    'onion', 'garlic', 'tomato', 'rice', 'pasta', 'bread', 'flour', 'yeast',
    'cream', 'yogurt', 'sauce', 'stock', 'broth', 'wine', 'vinegar', 'lemon',
    'lime', 'orange', 'apple', 'banana', 'berry', 'nut', 'seed', 'grain', 'bean',
    'lentil', 'quinoa', 'coconut', 'avocado', 'spinach', 'lettuce', 'carrot',
    'potato', 'mushroom', 'pepper', 'cucumber', 'zucchini', 'eggplant'
  ];
  
  const ingredientText = ingredients.map(ing => ing.name.toLowerCase()).join(' ');
  return foodKeywords.some(keyword => ingredientText.includes(keyword));
}

export function validatePerplexityResponse(data: any): data is PerplexityRecipeResponse {
  // Basic structure checks
  if (!data || typeof data !== 'object') return false;
  if (!data.recipe || typeof data.recipe !== 'object') return false;
  
  // Required fields: name, meal_type, ingredients
  // name must be a non-empty string
  if (!data.recipe.name || typeof data.recipe.name !== 'string' || data.recipe.name.trim().length === 0) {
    console.warn('[validatePerplexityResponse] Missing or empty name');
    return false;
  }
  
  // meal_type must be present (can be string or array, will be normalized later)
  if (!data.recipe.meal_type) {
    console.warn('[validatePerplexityResponse] Missing meal_type');
    return false;
  }

  // Accept 'drink' as valid input (will be normalized to 'snack' later)
  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'];
  // Handle both string (single) and array (multiple) meal types
  const mealTypes = Array.isArray(data.recipe.meal_type) 
    ? data.recipe.meal_type 
    : [data.recipe.meal_type];
  
  // All meal types must be valid
  const allValid = mealTypes.every(mt => 
    typeof mt === 'string' && validMealTypes.includes(mt.toLowerCase())
  );
  
  if (!allValid) {
    console.warn('[validatePerplexityResponse] Invalid meal_type:', data.recipe.meal_type);
    return false;
  }
  
  if (!Array.isArray(data.recipe.ingredients) || data.recipe.ingredients.length === 0) {
    console.warn('[validatePerplexityResponse] Missing or empty ingredients array');
    return false;
  }
  
  // CRITICAL: Validate this is actually a food/drink recipe
  if (isNonFoodItem(data.recipe.name, data.recipe.description)) {
    console.warn('[validatePerplexityResponse] Rejected non-food item:', data.recipe.name);
    return false;
  }
  
  // Validate ingredients suggest this is food (warning only, don't reject)
  if (!hasFoodIngredients(data.recipe.ingredients)) {
    console.warn('[validatePerplexityResponse] Recipe may lack food ingredients:', data.recipe.name, {
      ingredients: data.recipe.ingredients.map((ing: any) => ing.name),
    });
    // Don't reject entirely - some recipes might have unusual ingredients
  }
  
  // Instructions: accept EITHER instructions OR instructions_structured (not both required)
  const hasInstructions = data.recipe.instructions && typeof data.recipe.instructions === 'string';
  const hasInstructionsStructured = Array.isArray(data.recipe.instructions_structured) && data.recipe.instructions_structured.length > 0;
  
  if (!hasInstructions && !hasInstructionsStructured) {
    return false; // Must have at least one form of instructions
  }
  
  // Validate ingredients structure (minimum required fields)
  for (const ing of data.recipe.ingredients) {
    if (!ing || typeof ing !== 'object') return false;
    if (!ing.name || typeof ing.name !== 'string') return false;
    // quantity and unit are required but can be empty strings
    if (ing.quantity === undefined || ing.quantity === null) return false;
    if (ing.unit === undefined || ing.unit === null) return false;
  }

  // Optional fields are allowed to be missing or have any type
  // We don't validate: description, categories, cuisine, difficulty, nutrition, etc.
  // These are optional and can be missing or have unexpected formats

  return true;
}
