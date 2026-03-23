import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import type { MealLibraryItem } from '../../lib/mealPlanner';
import { FoodPicker } from '../shared/FoodPicker';
import { getFoodItemName, type FoodItem } from '../../lib/foodItems';

interface RecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: RecipeFormData) => Promise<void>;
  existingRecipe?: MealLibraryItem;
  householdId?: string; // Required for FoodPicker
}

export interface RecipeFormData {
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  categories: string[];
  cuisine: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: Array<{ 
    food_item_id?: string; // Preferred - use this
    name?: string; // Deprecated - kept for backward compatibility
    quantity: string; 
    unit: string;
    optional?: boolean;
  }>;
  instructions: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  allergies: string[];
}

const AVAILABLE_CATEGORIES = [
  'home_cooked',
  'healthy',
  'vegetarian',
  'vegan',
  'gluten_free',
  'high_protein',
  'budget_friendly',
  'takeaway'
];

const CATEGORY_LABELS: Record<string, string> = {
  home_cooked: 'Home Cooked',
  healthy: 'Healthy',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  gluten_free: 'Gluten Free',
  high_protein: 'High Protein',
  budget_friendly: 'Budget Friendly',
  takeaway: 'Takeaway'
};

const COMMON_ALLERGIES = [
  'dairy',
  'eggs',
  'peanuts',
  'tree_nuts',
  'soy',
  'wheat',
  'fish',
  'shellfish'
];

export function RecipeFormModal({ isOpen, onClose, onSave, existingRecipe, householdId = '' }: RecipeFormModalProps) {
  const [formData, setFormData] = useState<RecipeFormData>({
    name: '',
    mealType: 'dinner',
    categories: [],
    cuisine: '',
    difficulty: 'medium',
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    ingredients: [{ name: '', quantity: '', unit: '' }],
    instructions: '',
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    allergies: []
  });

  const [saving, setSaving] = useState(false);
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null);
  const [foodItemNames, setFoodItemNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingRecipe) {
      // Migrate ingredients: if they have food_item_id, use it; otherwise keep name for backward compatibility
      const migratedIngredients = existingRecipe.ingredients.map((ing: any) => ({
        food_item_id: ing.food_item_id || undefined,
        name: ing.name || undefined, // Keep for backward compatibility
        quantity: ing.quantity || '',
        unit: ing.unit || '',
        optional: ing.optional || false,
      }));

      setFormData({
        name: existingRecipe.name,
        mealType: existingRecipe.meal_type,
        categories: existingRecipe.categories,
        cuisine: existingRecipe.cuisine || '',
        difficulty: existingRecipe.difficulty,
        prepTime: existingRecipe.prep_time || 15,
        cookTime: existingRecipe.cook_time || 30,
        servings: existingRecipe.servings,
        ingredients: migratedIngredients.length > 0
          ? migratedIngredients
          : [{ quantity: '', unit: '' }],
        instructions: existingRecipe.instructions || '',
        calories: existingRecipe.calories,
        protein: existingRecipe.protein,
        carbs: existingRecipe.carbs,
        fat: existingRecipe.fat,
        allergies: existingRecipe.allergies
      });

      // Load food item names for display
      const foodItemIds = migratedIngredients.map((ing: any) => ing.food_item_id).filter(Boolean);
      if (foodItemIds.length > 0) {
        getFoodItemNames(foodItemIds).then(names => {
          setFoodItemNames(names);
        });
      }
    }
  }, [existingRecipe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save recipe:', error);
    } finally {
      setSaving(false);
    }
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { quantity: '', unit: '' }]
    }));
    // Open FoodPicker for the new ingredient
    setEditingIngredientIndex(prev.ingredients.length);
    setShowFoodPicker(true);
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
    // Update food item names cache
    const remainingIds = formData.ingredients
      .filter((_, i) => i !== index)
      .map(ing => ing.food_item_id)
      .filter(Boolean) as string[];
    if (remainingIds.length > 0) {
      getFoodItemNames(remainingIds).then(names => setFoodItemNames(names));
    } else {
      setFoodItemNames({});
    }
  };

  const updateIngredient = (index: number, field: 'quantity' | 'unit', value: string) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const handleFoodItemSelect = async (foodItem: FoodItem) => {
    if (editingIngredientIndex !== null) {
      setFormData(prev => ({
        ...prev,
        ingredients: prev.ingredients.map((ing, i) =>
          i === editingIngredientIndex 
            ? { ...ing, food_item_id: foodItem.id, name: foodItem.name } 
            : ing
        )
      }));
      setFoodItemNames(prev => ({ ...prev, [foodItem.id]: foodItem.name }));
      setShowFoodPicker(false);
      setEditingIngredientIndex(null);
    }
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const toggleAllergy = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {existingRecipe ? 'Edit Recipe' : 'Create New Recipe'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Recipe Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="e.g., Spaghetti Carbonara"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Meal Type *
                </label>
                <select
                  required
                  value={formData.mealType}
                  onChange={(e) => setFormData(prev => ({ ...prev, mealType: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Prep Time (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.prepTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, prepTime: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Cook Time (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.cookTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, cookTime: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Servings
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.servings}
                  onChange={(e) => setFormData(prev => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Cuisine
              </label>
              <input
                type="text"
                value={formData.cuisine}
                onChange={(e) => setFormData(prev => ({ ...prev, cuisine: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="e.g., Italian, Mexican, Thai"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.categories.includes(cat)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">
                  Ingredients
                </label>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add Ingredient
                </button>
              </div>
              <div className="space-y-2">
                {formData.ingredients.map((ing, index) => {
                  const displayName = ing.food_item_id 
                    ? (foodItemNames[ing.food_item_id] || ing.name || 'Select food item...')
                    : (ing.name || 'Select food item...');
                  
                  return (
                    <div key={index} className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIngredientIndex(index);
                          setShowFoodPicker(true);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-left bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        {ing.food_item_id && foodItemNames[ing.food_item_id] && (
                          <span className="text-base">{/* Emoji would come from food_item */}</span>
                        )}
                        <span className={displayName === 'Select food item...' ? 'text-gray-400' : 'text-gray-900'}>
                          {displayName}
                        </span>
                      </button>
                      <input
                        type="text"
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                        placeholder="Amount"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                      <input
                        type="text"
                        value={ing.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                      {formData.ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Minus size={20} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* FoodPicker Modal */}
              {householdId && (
                <FoodPicker
                  isOpen={showFoodPicker}
                  onClose={() => {
                    setShowFoodPicker(false);
                    setEditingIngredientIndex(null);
                  }}
                  onSelect={handleFoodItemSelect}
                  householdId={householdId}
                  excludeIds={formData.ingredients.map(ing => ing.food_item_id).filter(Boolean) as string[]}
                  placeholder="Search for a food item..."
                  title="Select Ingredient"
                  showAwareness={true}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="Step-by-step cooking instructions..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nutrition (Optional)
              </label>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <input
                    type="number"
                    min="0"
                    value={formData.calories || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      calories: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    placeholder="Calories"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    value={formData.protein || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      protein: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    placeholder="Protein (g)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    value={formData.carbs || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      carbs: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    placeholder="Carbs (g)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    value={formData.fat || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      fat: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    placeholder="Fat (g)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Allergens
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map(allergy => (
                  <button
                    key={allergy}
                    type="button"
                    onClick={() => toggleAllergy(allergy)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                      formData.allergies.includes(allergy)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {allergy.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : existingRecipe ? 'Update Recipe' : 'Create Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
