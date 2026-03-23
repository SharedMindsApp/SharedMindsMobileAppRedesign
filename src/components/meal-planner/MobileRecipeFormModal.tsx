import { useState, useEffect } from 'react';
import { X, Plus, Minus, ChevronLeft } from 'lucide-react';
import type { MealLibraryItem } from '../../lib/mealPlanner';

interface MobileRecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: RecipeFormData) => Promise<void>;
  existingRecipe?: MealLibraryItem;
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
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
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

export function MobileRecipeFormModal({ isOpen, onClose, onSave, existingRecipe }: MobileRecipeFormModalProps) {
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

  useEffect(() => {
    if (existingRecipe) {
      setFormData({
        name: existingRecipe.name,
        mealType: existingRecipe.meal_type,
        categories: existingRecipe.categories,
        cuisine: existingRecipe.cuisine || '',
        difficulty: existingRecipe.difficulty,
        prepTime: existingRecipe.prep_time || 15,
        cookTime: existingRecipe.cook_time || 30,
        servings: existingRecipe.servings,
        ingredients: existingRecipe.ingredients.length > 0
          ? existingRecipe.ingredients
          : [{ name: '', quantity: '', unit: '' }],
        instructions: existingRecipe.instructions || '',
        calories: existingRecipe.calories,
        protein: existingRecipe.protein,
        carbs: existingRecipe.carbs,
        fat: existingRecipe.fat,
        allergies: existingRecipe.allergies
      });
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
      ingredients: [...prev.ingredients, { name: '', quantity: '', unit: '' }]
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index: number, field: 'name' | 'quantity' | 'unit', value: string) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
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
    <div className="fixed inset-0 bg-white z-[120] flex flex-col">
      <div className="bg-orange-500 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <h2 className="text-lg font-semibold text-white flex-1">
          {existingRecipe ? 'Edit Recipe' : 'New Recipe'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Recipe Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              placeholder="e.g., Spaghetti Carbonara"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Meal Type *
              </label>
              <select
                required
                value={formData.mealType}
                onChange={(e) => setFormData(prev => ({ ...prev, mealType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Prep (min)
              </label>
              <input
                type="number"
                min="0"
                value={formData.prepTime}
                onChange={(e) => setFormData(prev => ({ ...prev, prepTime: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Cook (min)
              </label>
              <input
                type="number"
                min="0"
                value={formData.cookTime}
                onChange={(e) => setFormData(prev => ({ ...prev, cookTime: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Servings
              </label>
              <input
                type="number"
                min="1"
                value={formData.servings}
                onChange={(e) => setFormData(prev => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Cuisine
            </label>
            <input
              type="text"
              value={formData.cuisine}
              onChange={(e) => setFormData(prev => ({ ...prev, cuisine: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              placeholder="e.g., Italian, Mexican"
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    formData.categories.includes(cat)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700'
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
                className="text-orange-600 font-medium text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    placeholder="Name"
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="text"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                    placeholder="Amt"
                    className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                  />
                  {formData.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="p-1.5 text-red-600 rounded"
                    >
                      <Minus size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Instructions
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              placeholder="Step-by-step instructions..."
            />
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    formData.allergies.includes(allergy)
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {allergy.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>

      <div className="p-4 border-t border-gray-200 bg-white">
        <button
          type="submit"
          disabled={saving}
          onClick={handleSubmit}
          className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving...' : existingRecipe ? 'Update Recipe' : 'Create Recipe'}
        </button>
      </div>
    </div>
  );
}
