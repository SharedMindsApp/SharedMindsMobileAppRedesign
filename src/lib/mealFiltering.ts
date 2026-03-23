import { getDietProfile, getAllHouseholdDietProfiles, DietProfile } from './dietProfiles';

export type Meal = {
  id: string;
  name: string;
  ingredients?: string[];
  tags?: string[];
  mealType?: 'breakfast' | 'lunch' | 'dinner';
  dayOfWeek?: string;
  prepTime?: number;
  description?: string;
};

export type MealFilterResult = {
  allowed: boolean;
  reasons: string[];
};

export async function getDietProfiles(householdId: string): Promise<DietProfile[]> {
  return await getAllHouseholdDietProfiles(householdId);
}

export function mealMatchesDiet(meal: Meal, dietProfiles: DietProfile[]): MealFilterResult {
  const reasons: string[] = [];

  for (const profile of dietProfiles) {
    if (profile.diet_type.length === 0) continue;

    for (const dietType of profile.diet_type) {
      const violated = checkDietViolation(meal, dietType);
      if (violated) {
        reasons.push(violated);
      }
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

function checkDietViolation(meal: Meal, dietType: string): string | null {
  const mealTags = (meal.tags || []).map(t => t.toLowerCase());
  const mealIngredients = (meal.ingredients || []).map(i => i.toLowerCase());
  const allContent = [...mealTags, ...mealIngredients, meal.name.toLowerCase()];

  switch (dietType.toLowerCase()) {
    case 'vegan':
      if (containsAny(allContent, ['meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'seafood', 'dairy', 'milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'honey'])) {
        return `Contains animal products (vegan restriction)`;
      }
      break;

    case 'vegetarian':
      if (containsAny(allContent, ['meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'seafood', 'poultry'])) {
        return `Contains meat or fish (vegetarian restriction)`;
      }
      break;

    case 'pescatarian':
      if (containsAny(allContent, ['meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'poultry'])) {
        return `Contains meat (pescatarian restriction)`;
      }
      break;

    case 'halal':
      if (containsAny(allContent, ['pork', 'bacon', 'ham', 'alcohol', 'wine', 'beer', 'gelatin'])) {
        return `Contains non-halal ingredients`;
      }
      break;

    case 'kosher':
      if (containsAny(allContent, ['pork', 'bacon', 'ham', 'shellfish', 'shrimp', 'lobster', 'crab', 'oyster'])) {
        return `Contains non-kosher ingredients`;
      }
      if (containsAny(allContent, ['meat']) && containsAny(allContent, ['dairy', 'milk', 'cheese', 'cream'])) {
        return `Mixes meat and dairy (kosher restriction)`;
      }
      break;

    case 'keto':
      if (containsAny(allContent, ['bread', 'pasta', 'rice', 'potato', 'sugar', 'wheat', 'flour', 'oat', 'quinoa', 'corn', 'cereal'])) {
        return `High carb content (keto restriction)`;
      }
      break;

    case 'paleo':
      if (containsAny(allContent, ['dairy', 'milk', 'cheese', 'yogurt', 'grain', 'bread', 'pasta', 'rice', 'wheat', 'legume', 'bean', 'peanut', 'soy', 'processed'])) {
        return `Contains non-paleo ingredients`;
      }
      break;

    case 'low-fodmap':
      if (containsAny(allContent, ['onion', 'garlic', 'wheat', 'apple', 'pear', 'watermelon', 'honey', 'milk', 'yogurt', 'bean', 'lentil', 'chickpea'])) {
        return `Contains high-FODMAP ingredients`;
      }
      break;

    case 'gluten-free':
      if (containsAny(allContent, ['wheat', 'barley', 'rye', 'bread', 'pasta', 'flour', 'gluten', 'malt', 'couscous', 'seitan'])) {
        return `Contains gluten`;
      }
      break;

    case 'dairy-free':
      if (containsAny(allContent, ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy', 'whey', 'casein', 'lactose'])) {
        return `Contains dairy`;
      }
      break;

    case 'diabetic-friendly':
      if (containsAny(allContent, ['sugar', 'syrup', 'candy', 'sweetened', 'honey', 'dessert'])) {
        return `High sugar content (diabetic-friendly restriction)`;
      }
      break;
  }

  return null;
}

export function mealMatchesAllergies(meal: Meal, dietProfiles: DietProfile[]): MealFilterResult {
  const reasons: string[] = [];
  const allAllergies = new Set<string>();

  for (const profile of dietProfiles) {
    profile.allergies.forEach(allergy => allAllergies.add(allergy.toLowerCase()));
  }

  if (allAllergies.size === 0) {
    return { allowed: true, reasons: [] };
  }

  const mealIngredients = (meal.ingredients || []).map(i => i.toLowerCase());
  const mealTags = (meal.tags || []).map(t => t.toLowerCase());
  const allContent = [...mealIngredients, ...mealTags, meal.name.toLowerCase()];

  for (const allergy of allAllergies) {
    const allergyKeywords = getAllergyKeywords(allergy);

    if (containsAny(allContent, allergyKeywords)) {
      reasons.push(`Contains ${allergy} (allergen)`);
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

function getAllergyKeywords(allergy: string): string[] {
  const allergyMap: { [key: string]: string[] } = {
    'nuts': ['nut', 'almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia'],
    'peanuts': ['peanut', 'peanut butter'],
    'tree nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut'],
    'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy', 'whey', 'casein', 'lactose'],
    'milk': ['milk', 'dairy', 'whey', 'casein', 'lactose'],
    'gluten': ['wheat', 'barley', 'rye', 'gluten', 'flour', 'bread', 'pasta'],
    'wheat': ['wheat', 'flour', 'bread', 'pasta', 'couscous'],
    'soy': ['soy', 'tofu', 'edamame', 'miso', 'tempeh', 'soy sauce'],
    'eggs': ['egg', 'mayonnaise', 'mayo'],
    'shellfish': ['shrimp', 'crab', 'lobster', 'crayfish', 'prawn', 'shellfish'],
    'fish': ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'trout', 'sardine', 'anchovy'],
    'sesame': ['sesame', 'tahini'],
    'mustard': ['mustard'],
    'celery': ['celery'],
    'lupin': ['lupin'],
    'sulfites': ['sulfite', 'sulfur dioxide'],
  };

  return allergyMap[allergy.toLowerCase()] || [allergy.toLowerCase()];
}

export function mealMatchesAvoidList(meal: Meal, dietProfiles: DietProfile[]): MealFilterResult {
  const reasons: string[] = [];
  const allAvoidItems = new Set<string>();

  for (const profile of dietProfiles) {
    profile.avoid_list.forEach(item => allAvoidItems.add(item.toLowerCase()));
  }

  if (allAvoidItems.size === 0) {
    return { allowed: true, reasons: [] };
  }

  const mealIngredients = (meal.ingredients || []).map(i => i.toLowerCase());
  const mealTags = (meal.tags || []).map(t => t.toLowerCase());
  const allContent = [...mealIngredients, ...mealTags, meal.name.toLowerCase()];

  for (const avoidItem of allAvoidItems) {
    if (allContent.some(content => content.includes(avoidItem) || avoidItem.includes(content))) {
      reasons.push(`Contains ${avoidItem} (avoid list)`);
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export function isMealSkippedDueToFasting(
  meal: Meal,
  dietProfiles: DietProfile[]
): MealFilterResult {
  const reasons: string[] = [];

  if (!meal.mealType) {
    return { allowed: true, reasons: [] };
  }

  for (const profile of dietProfiles) {
    const fastingSchedule = profile.fasting_schedule;

    if (!fastingSchedule?.type || fastingSchedule.type === 'none') {
      continue;
    }

    if (fastingSchedule.start && fastingSchedule.end) {
      const mealTime = getMealTypeTime(meal.mealType);
      const isFasting = isTimeInFastingWindow(
        mealTime,
        fastingSchedule.start,
        fastingSchedule.end
      );

      if (isFasting) {
        reasons.push(`Falls within fasting window (${fastingSchedule.type})`);
      }
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export function isMealSkippedDueToAvailability(
  meal: Meal,
  dietProfiles: DietProfile[]
): MealFilterResult {
  const reasons: string[] = [];

  if (!meal.mealType || !meal.dayOfWeek) {
    return { allowed: true, reasons: [] };
  }

  const dayOfWeek = meal.dayOfWeek.toLowerCase();
  const mealType = meal.mealType.toLowerCase();

  for (const profile of dietProfiles) {
    const daySchedule = profile.weekly_schedule?.[dayOfWeek];

    if (!daySchedule) continue;

    const availability = daySchedule[mealType as 'breakfast' | 'lunch' | 'dinner'];

    if (availability === 'away') {
      reasons.push(`Member is away for this meal`);
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export function filterMeal(meal: Meal, dietProfiles: DietProfile[]): MealFilterResult {
  const dietCheck = mealMatchesDiet(meal, dietProfiles);
  if (!dietCheck.allowed) return dietCheck;

  const allergyCheck = mealMatchesAllergies(meal, dietProfiles);
  if (!allergyCheck.allowed) return allergyCheck;

  const avoidCheck = mealMatchesAvoidList(meal, dietProfiles);
  if (!avoidCheck.allowed) return avoidCheck;

  const fastingCheck = isMealSkippedDueToFasting(meal, dietProfiles);
  if (!fastingCheck.allowed) return fastingCheck;

  const availabilityCheck = isMealSkippedDueToAvailability(meal, dietProfiles);
  if (!availabilityCheck.allowed) return availabilityCheck;

  return { allowed: true, reasons: [] };
}

export async function filterMeals(
  meals: Meal[],
  householdId: string
): Promise<{ allowed: Meal[]; filtered: Array<{ meal: Meal; reasons: string[] }> }> {
  const dietProfiles = await getDietProfiles(householdId);

  const allowed: Meal[] = [];
  const filtered: Array<{ meal: Meal; reasons: string[] }> = [];

  for (const meal of meals) {
    const result = filterMeal(meal, dietProfiles);

    if (result.allowed) {
      allowed.push(meal);
    } else {
      filtered.push({ meal, reasons: result.reasons });
    }
  }

  return { allowed, filtered };
}

export function getQuickMealSuggestions(
  meals: Meal[],
  dietProfiles: DietProfile[]
): Meal[] {
  return meals.filter(meal => {
    const result = filterMeal(meal, dietProfiles);
    return result.allowed && (meal.prepTime || 60) <= 30;
  });
}

export function getMealsForDay(
  meals: Meal[],
  dayOfWeek: string,
  dietProfiles: DietProfile[]
): { breakfast: Meal[]; lunch: Meal[]; dinner: Meal[] } {
  const breakfast: Meal[] = [];
  const lunch: Meal[] = [];
  const dinner: Meal[] = [];

  for (const meal of meals) {
    const mealWithDay = { ...meal, dayOfWeek };

    if (meal.mealType === 'breakfast') {
      const result = filterMeal(mealWithDay, dietProfiles);
      if (result.allowed) breakfast.push(meal);
    } else if (meal.mealType === 'lunch') {
      const result = filterMeal(mealWithDay, dietProfiles);
      if (result.allowed) lunch.push(meal);
    } else if (meal.mealType === 'dinner') {
      const result = filterMeal(mealWithDay, dietProfiles);
      if (result.allowed) dinner.push(meal);
    }
  }

  return { breakfast, lunch, dinner };
}

function containsAny(content: string[], keywords: string[]): boolean {
  return content.some(item =>
    keywords.some(keyword => item.includes(keyword))
  );
}

function getMealTypeTime(mealType: string): string {
  const mealTimes: { [key: string]: string } = {
    breakfast: '08:00',
    lunch: '12:00',
    dinner: '18:00',
  };
  return mealTimes[mealType.toLowerCase()] || '12:00';
}

function isTimeInFastingWindow(
  mealTime: string,
  fastingStart: string,
  fastingEnd: string
): boolean {
  const meal = timeToMinutes(mealTime);
  const start = timeToMinutes(fastingStart);
  const end = timeToMinutes(fastingEnd);

  if (start < end) {
    return meal >= start && meal < end;
  } else {
    return meal >= start || meal < end;
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export type IngredientStatus = {
  ingredient: string;
  status: 'safe' | 'allergen' | 'restricted' | 'avoid';
  reason?: string;
  suggestion?: string;
};

export type SanitizedIngredients = {
  safe: string[];
  conflicts: IngredientStatus[];
  suggestions: Array<{ original: string; replacement: string; reason: string }>;
};

const COMMON_SUBSTITUTIONS: { [key: string]: Array<{ replacement: string; reason: string }> } = {
  'milk': [
    { replacement: 'almond milk', reason: 'dairy-free alternative' },
    { replacement: 'oat milk', reason: 'vegan option' },
    { replacement: 'soy milk', reason: 'plant-based' }
  ],
  'butter': [
    { replacement: 'coconut oil', reason: 'vegan alternative' },
    { replacement: 'olive oil', reason: 'dairy-free' },
    { replacement: 'vegan butter', reason: 'plant-based spread' }
  ],
  'cheese': [
    { replacement: 'nutritional yeast', reason: 'vegan cheesy flavor' },
    { replacement: 'cashew cheese', reason: 'dairy-free alternative' }
  ],
  'egg': [
    { replacement: 'flax egg', reason: 'vegan binding agent' },
    { replacement: 'chia egg', reason: 'plant-based binder' },
    { replacement: 'applesauce', reason: 'egg substitute for baking' }
  ],
  'beef': [
    { replacement: 'lentils', reason: 'vegetarian protein' },
    { replacement: 'mushrooms', reason: 'meaty texture' },
    { replacement: 'tofu', reason: 'plant-based protein' }
  ],
  'chicken': [
    { replacement: 'tofu', reason: 'vegan protein' },
    { replacement: 'tempeh', reason: 'fermented soy protein' },
    { replacement: 'chickpeas', reason: 'plant-based option' }
  ],
  'peanut butter': [
    { replacement: 'almond butter', reason: 'tree nut alternative' },
    { replacement: 'sunflower seed butter', reason: 'nut-free option' },
    { replacement: 'tahini', reason: 'seed-based spread' }
  ],
  'flour': [
    { replacement: 'almond flour', reason: 'gluten-free, low-carb' },
    { replacement: 'coconut flour', reason: 'grain-free option' },
    { replacement: 'rice flour', reason: 'gluten-free alternative' }
  ],
  'bread': [
    { replacement: 'gluten-free bread', reason: 'celiac-safe' },
    { replacement: 'lettuce wraps', reason: 'low-carb option' },
    { replacement: 'rice cakes', reason: 'gluten-free base' }
  ],
  'pasta': [
    { replacement: 'zucchini noodles', reason: 'low-carb, keto-friendly' },
    { replacement: 'chickpea pasta', reason: 'gluten-free, high-protein' },
    { replacement: 'rice noodles', reason: 'gluten-free alternative' }
  ],
  'soy sauce': [
    { replacement: 'coconut aminos', reason: 'soy-free alternative' },
    { replacement: 'tamari', reason: 'gluten-free soy sauce' }
  ]
};

export function sanitizeIngredientsForHousehold(
  ingredients: string[],
  dietProfiles: DietProfile[]
): SanitizedIngredients {
  const safe: string[] = [];
  const conflicts: IngredientStatus[] = [];
  const suggestions: Array<{ original: string; replacement: string; reason: string }> = [];

  const allAllergies = new Set<string>();
  const allDietTypes = new Set<string>();
  const allAvoidItems = new Set<string>();

  for (const profile of dietProfiles) {
    profile.allergies.forEach(a => allAllergies.add(a.toLowerCase()));
    profile.diet_type.forEach(d => allDietTypes.add(d.toLowerCase()));
    profile.avoid_list.forEach(a => allAvoidItems.add(a.toLowerCase()));
  }

  for (const ingredient of ingredients) {
    const lowerIngredient = ingredient.toLowerCase();
    let hasConflict = false;
    let conflictReason = '';
    let conflictStatus: 'safe' | 'allergen' | 'restricted' | 'avoid' = 'safe';

    for (const allergy of allAllergies) {
      const allergyKeywords = getAllergyKeywords(allergy);
      if (allergyKeywords.some(keyword => lowerIngredient.includes(keyword))) {
        hasConflict = true;
        conflictReason = `Contains ${allergy} (allergen)`;
        conflictStatus = 'allergen';

        const subs = findSubstitution(lowerIngredient);
        if (subs.length > 0) {
          suggestions.push({
            original: ingredient,
            replacement: subs[0].replacement,
            reason: subs[0].reason
          });
        }
        break;
      }
    }

    if (!hasConflict) {
      for (const dietType of allDietTypes) {
        const violation = checkIngredientDietViolation(lowerIngredient, dietType);
        if (violation) {
          hasConflict = true;
          conflictReason = violation;
          conflictStatus = 'restricted';

          const subs = findSubstitution(lowerIngredient);
          if (subs.length > 0) {
            suggestions.push({
              original: ingredient,
              replacement: subs[0].replacement,
              reason: subs[0].reason
            });
          }
          break;
        }
      }
    }

    if (!hasConflict) {
      for (const avoidItem of allAvoidItems) {
        if (lowerIngredient.includes(avoidItem) || avoidItem.includes(lowerIngredient)) {
          hasConflict = true;
          conflictReason = `On household avoid list`;
          conflictStatus = 'avoid';

          const subs = findSubstitution(lowerIngredient);
          if (subs.length > 0) {
            suggestions.push({
              original: ingredient,
              replacement: subs[0].replacement,
              reason: subs[0].reason
            });
          }
          break;
        }
      }
    }

    if (hasConflict) {
      conflicts.push({
        ingredient,
        status: conflictStatus,
        reason: conflictReason,
        suggestion: suggestions.find(s => s.original === ingredient)?.replacement
      });
    } else {
      safe.push(ingredient);
    }
  }

  return { safe, conflicts, suggestions };
}

function checkIngredientDietViolation(ingredient: string, dietType: string): string | null {
  const restrictedIngredients: { [key: string]: string[] } = {
    'vegan': ['meat', 'beef', 'pork', 'chicken', 'fish', 'salmon', 'dairy', 'milk', 'cheese', 'butter', 'egg', 'honey'],
    'vegetarian': ['meat', 'beef', 'pork', 'chicken', 'fish', 'salmon', 'shrimp', 'seafood'],
    'pescatarian': ['meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb'],
    'halal': ['pork', 'bacon', 'ham', 'alcohol', 'wine', 'beer'],
    'kosher': ['pork', 'bacon', 'shellfish', 'shrimp', 'lobster'],
    'keto': ['bread', 'pasta', 'rice', 'potato', 'sugar', 'wheat', 'flour'],
    'paleo': ['dairy', 'grain', 'bread', 'pasta', 'bean', 'peanut', 'soy'],
    'gluten-free': ['wheat', 'barley', 'rye', 'bread', 'pasta', 'flour'],
    'dairy-free': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy']
  };

  const restricted = restrictedIngredients[dietType] || [];

  for (const item of restricted) {
    if (ingredient.includes(item)) {
      return `Not ${dietType}`;
    }
  }

  return null;
}

function findSubstitution(ingredient: string): Array<{ replacement: string; reason: string }> {
  for (const [key, subs] of Object.entries(COMMON_SUBSTITUTIONS)) {
    if (ingredient.includes(key)) {
      return subs;
    }
  }
  return [];
}
