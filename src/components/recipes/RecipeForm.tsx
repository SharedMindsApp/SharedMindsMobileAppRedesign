/**
 * RecipeForm - Form component for creating/editing recipes
 * 
 * Uses the new recipe generator system with food_item_id references
 * ADHD-first design: optional fields, no pressure
 */

import { useState, useEffect } from 'react';
import { X, Save, Clock, Users, ChefHat, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { IngredientSelector } from './IngredientSelector';
import type { Recipe, CreateRecipeInput, UpdateRecipeInput, RecipeIngredient } from '../../lib/recipeGeneratorTypes';
import type { MealType, MealCategory, CuisineType, CookingDifficulty } from '../../lib/recipeGeneratorTypes';
import { detectDuplicatesForRecipe, getDuplicatesForRecipe, type RecipeDuplicateWithDetails } from '../../lib/recipeDuplicateService';
import { RecipeDetail } from './RecipeDetail';

interface RecipeFormProps {
  recipe?: Recipe;
  onSave: (data: CreateRecipeInput | UpdateRecipeInput) => Promise<void>;
  onCancel: () => void;
  isPrivate?: boolean; // If true, creates private recipe; if false, creates public (for AI/system)
  householdId?: string; // Required for private recipes
  loading?: boolean;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const CATEGORIES: MealCategory[] = [
  'home_cooked',
  'healthy',
  'vegetarian',
  'vegan',
  'gluten_free',
  'high_protein',
  'budget_friendly',
  'takeaway',
];

const CATEGORY_LABELS: Record<MealCategory, string> = {
  home_cooked: 'Home Cooked',
  healthy: 'Healthy',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  gluten_free: 'Gluten Free',
  high_protein: 'High Protein',
  budget_friendly: 'Budget Friendly',
  takeaway: 'Takeaway',
};

const CUISINES: CuisineType[] = [
  'italian',
  'indian',
  'chinese',
  'thai',
  'british',
  'american',
  'mexican',
  'mediterranean',
  'japanese',
  'french',
  'greek',
  'korean',
];

const CUISINE_LABELS: Record<CuisineType, string> = {
  italian: 'Italian',
  indian: 'Indian',
  chinese: 'Chinese',
  thai: 'Thai',
  british: 'British',
  american: 'American',
  mexican: 'Mexican',
  mediterranean: 'Mediterranean',
  japanese: 'Japanese',
  french: 'French',
  greek: 'Greek',
  korean: 'Korean',
};

const DIFFICULTIES: CookingDifficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS: Record<CookingDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export function RecipeForm({
  recipe,
  onSave,
  onCancel,
  isPrivate = true,
  householdId,
  loading = false,
}: RecipeFormProps) {
  const [name, setName] = useState(recipe?.name || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [mealType, setMealType] = useState<MealType>(recipe?.meal_type || 'dinner');
  const [servings, setServings] = useState(recipe?.servings || 4);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe?.ingredients || []);
  const [instructions, setInstructions] = useState(recipe?.instructions || '');
  const [categories, setCategories] = useState<MealCategory[]>(recipe?.categories || []);
  const [cuisine, setCuisine] = useState<CuisineType | ''>(recipe?.cuisine || '');
  const [difficulty, setDifficulty] = useState<CookingDifficulty>(recipe?.difficulty || 'medium');
  const [prepTime, setPrepTime] = useState<number | ''>(recipe?.prep_time || '');
  const [cookTime, setCookTime] = useState<number | ''>(recipe?.cook_time || '');
  const [showNutrition, setShowNutrition] = useState(false);
  const [calories, setCalories] = useState<number | ''>(recipe?.calories || '');
  const [protein, setProtein] = useState<number | ''>(recipe?.protein || '');
  const [carbs, setCarbs] = useState<number | ''>(recipe?.carbs || '');
  const [fat, setFat] = useState<number | ''>(recipe?.fat || '');
  const [potentialDuplicates, setPotentialDuplicates] = useState<RecipeDuplicateWithDetails[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [viewingDuplicate, setViewingDuplicate] = useState<Recipe | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formData: CreateRecipeInput | UpdateRecipeInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      meal_type: mealType,
      servings: servings || 4,
      ingredients,
      instructions: instructions.trim() || undefined,
      categories: categories.length > 0 ? categories : undefined,
      cuisine: cuisine || undefined,
      difficulty,
      prep_time: prepTime ? Number(prepTime) : undefined,
      cook_time: cookTime ? Number(cookTime) : undefined,
      calories: calories ? Number(calories) : undefined,
      protein: protein ? Number(protein) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      fat: fat ? Number(fat) : undefined,
      source_type: isPrivate ? 'user' : 'ai',
      household_id: isPrivate ? householdId : undefined,
      is_public: !isPrivate,
    };

    await onSave(formData);
    
    // For new recipes, check for duplicates after save
    // Note: The actual recipe ID would need to be returned from onSave
    // For now, duplicates are automatically detected via trigger
    // This is a placeholder - in production, onSave should return the created recipe ID
  };

  const toggleCategory = (category: MealCategory) => {
    setCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleUseExisting = (existingRecipe: Recipe) => {
    // User chose to use existing recipe instead
    // Close the form and let parent component handle navigation
    onCancel();
    // Could emit an event or call a callback here to navigate to existing recipe
  };

  const handleProceedAnyway = () => {
    setPotentialDuplicates([]);
  };

  // Check for duplicates after save completes (only for new recipes)
  const checkDuplicatesAfterSave = async (savedRecipeId: string) => {
    try {
      setCheckingDuplicates(true);
      // Wait a moment for trigger to run
      await new Promise(resolve => setTimeout(resolve, 500));
      const duplicates = await getDuplicatesForRecipe(savedRecipeId);
      if (duplicates.length > 0) {
        setPotentialDuplicates(duplicates);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    } finally {
      setCheckingDuplicates(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Duplicate Warning */}
      {potentialDuplicates.length > 0 && !recipe && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-orange-600 mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-2">
                Similar recipes found
              </h4>
              <p className="text-sm text-orange-700 mb-3">
                We found {potentialDuplicates.length} similar recipe{potentialDuplicates.length !== 1 ? 's' : ''} that might be duplicates:
              </p>
              <div className="space-y-2 mb-3">
                {potentialDuplicates.slice(0, 3).map(dup => {
                  const existingRecipe = dup.duplicate_recipe || dup.primary_recipe;
                  if (!existingRecipe) return null;
                  
                  return (
                    <div
                      key={dup.id}
                      className="bg-white border border-orange-200 rounded p-3 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{existingRecipe.name}</div>
                        <div className="text-xs text-gray-600">
                          {Math.round(dup.similarity_score * 100)}% similar • {dup.detection_confidence} confidence
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingDuplicate(existingRecipe)}
                        className="ml-3 text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleProceedAnyway}
                  className="text-sm px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded transition-colors"
                >
                  Proceed Anyway
                </button>
                <p className="text-xs text-orange-600 self-center ml-2">
                  You can review and merge duplicates later
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipe Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="e.g., Chicken Curry"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="A brief description of the recipe..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meal Type
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {MEAL_TYPES.map(type => (
                <option key={type} value={type}>
                  {MEAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Users size={14} />
              Servings
            </label>
            <input
              type="number"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value) || 4)}
              min={1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <IngredientSelector
          ingredients={ingredients}
          onChange={setIngredients}
        />
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Instructions (optional)
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Step-by-step instructions..."
        />
      </div>

      {/* Metadata */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categories (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categories.includes(category)
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cuisine (optional)
            </label>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value as CuisineType | '')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select cuisine...</option>
              {CUISINES.map(c => (
                <option key={c} value={c}>
                  {CUISINE_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <ChefHat size={14} />
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as CookingDifficulty)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {DIFFICULTIES.map(d => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Clock size={14} />
              Prep Time (minutes, optional)
            </label>
            <input
              type="number"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value ? Number(e.target.value) : '')}
              min={0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="15"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cook Time (minutes, optional)
            </label>
            <input
              type="number"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value ? Number(e.target.value) : '')}
              min={0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="30"
            />
          </div>
        </div>
      </div>

      {/* Nutrition (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowNutrition(!showNutrition)}
          className="text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          {showNutrition ? 'Hide' : 'Show'} Nutrition Info (optional)
        </button>

        {showNutrition && (
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Calories</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value ? Number(e.target.value) : '')}
                min={0}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value ? Number(e.target.value) : '')}
                min={0}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value ? Number(e.target.value) : '')}
                min={0}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value ? Number(e.target.value) : '')}
                min={0}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>Saving...</>
          ) : (
            <>
              <Save size={18} />
              {recipe ? 'Update Recipe' : 'Save Recipe'}
            </>
          )}
        </button>
      </div>

      {/* View Duplicate Recipe Modal */}
      {viewingDuplicate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">Existing Recipe</h3>
              <button
                onClick={() => setViewingDuplicate(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <RecipeDetail recipe={viewingDuplicate} showActions={false} />
              <div className="mt-6 flex gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    handleUseExisting(viewingDuplicate);
                  }}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Use This Recipe Instead
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDuplicate(null)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Continue Creating New
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
