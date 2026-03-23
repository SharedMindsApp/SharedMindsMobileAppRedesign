import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Heart, UtensilsCrossed, Clock, Plus, Trash2, ChefHat } from 'lucide-react';
import { getMealLibrary, getHouseholdFavourites, toggleMealFavourite, isMealFavourite, getCategoryBadgeColor, getCategoryLabel, createCustomMeal, type MealLibraryItem, type MealFavourite } from '../../lib/mealPlanner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface MealPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMeal: (meal: MealLibraryItem | null, customName?: string) => void;
  householdId: string;
  dayName: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

const CATEGORY_FILTERS = [
  { id: 'home_cooked', label: 'Home Cooked' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'high_protein', label: 'High Protein' },
  { id: 'budget_friendly', label: 'Budget' },
  { id: 'gluten_free', label: 'Gluten Free' }
];

export function MealPickerModal({
  isOpen,
  onClose,
  onSelectMeal,
  householdId,
  dayName,
  mealType
}: MealPickerModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'favourites' | 'takeaway'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [meals, setMeals] = useState<MealLibraryItem[]>([]);
  const [favourites, setFavourites] = useState<MealFavourite[]>([]);
  const [favouriteMealIds, setFavouriteMealIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [customMealName, setCustomMealName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showRecipeBuilder, setShowRecipeBuilder] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    categories: [] as string[],
    cuisine: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    prepTime: '',
    cookTime: '',
    servings: '4',
    ingredients: [{ name: '', quantity: '', unit: '' }],
    instructions: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });

  useEffect(() => {
    if (isOpen && householdId) {
      loadMeals();
      loadFavourites();
    }
  }, [isOpen, householdId, searchQuery, selectedCategories, activeTab]);

  const loadMeals = async () => {
    setLoading(true);
    try {
      const filters: any = {};

      if (activeTab === 'takeaway') {
        filters.categories = ['takeaway'];
      } else if (activeTab === 'all' && selectedCategories.length > 0) {
        filters.categories = selectedCategories;
      }

      if (searchQuery) {
        filters.searchQuery = searchQuery;
      }

      const data = await getMealLibrary(filters);
      setMeals(data);
    } catch (error) {
      console.error('Failed to load meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavourites = async () => {
    try {
      const data = await getHouseholdFavourites(householdId);
      setFavourites(data);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          const favIds = new Set<string>();
          for (const fav of data) {
            const isFav = await isMealFavourite(fav.meal_id, householdId, profile.id);
            if (isFav) {
              favIds.add(fav.meal_id);
            }
          }
          setFavouriteMealIds(favIds);
        }
      }
    } catch (error) {
      console.error('Failed to load favourites:', error);
    }
  };

  const handleToggleFavourite = async (mealId: string) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      const isFav = await toggleMealFavourite(mealId, householdId, profile.id);

      setFavouriteMealIds(prev => {
        const next = new Set(prev);
        if (isFav) {
          next.add(mealId);
        } else {
          next.delete(mealId);
        }
        return next;
      });

      await loadFavourites();
    } catch (error) {
      console.error('Failed to toggle favourite:', error);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectMeal = (meal: MealLibraryItem) => {
    onSelectMeal(meal);
    onClose();
  };

  const handleCustomMeal = () => {
    if (customMealName.trim()) {
      onSelectMeal(null, customMealName.trim());
      onClose();
    }
  };

  const handleAddIngredient = () => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: '', unit: '' }]
    }));
  };

  const handleRemoveIngredient = (index: number) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleIngredientChange = (index: number, field: 'name' | 'quantity' | 'unit', value: string) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const handleCreateRecipe = async () => {
    if (!newRecipe.name.trim() || !user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      const meal = await createCustomMeal(
        newRecipe.name,
        mealType,
        householdId,
        profile.id,
        {
          categories: newRecipe.categories,
          cuisine: newRecipe.cuisine || undefined,
          difficulty: newRecipe.difficulty,
          prepTime: newRecipe.prepTime ? parseInt(newRecipe.prepTime) : undefined,
          cookTime: newRecipe.cookTime ? parseInt(newRecipe.cookTime) : undefined,
          servings: parseInt(newRecipe.servings) || 4,
          ingredients: newRecipe.ingredients.filter(i => i.name.trim()),
          instructions: newRecipe.instructions || undefined,
          calories: newRecipe.calories ? parseInt(newRecipe.calories) : undefined,
          protein: newRecipe.protein ? parseInt(newRecipe.protein) : undefined,
          carbs: newRecipe.carbs ? parseInt(newRecipe.carbs) : undefined,
          fat: newRecipe.fat ? parseInt(newRecipe.fat) : undefined
        }
      );

      onSelectMeal(meal);
      onClose();
    } catch (error) {
      console.error('Failed to create recipe:', error);
    }
  };

  const toggleRecipeCategory = (category: string) => {
    setNewRecipe(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const displayMeals = activeTab === 'favourites'
    ? favourites.map(f => f.meal).filter(Boolean) as MealLibraryItem[]
    : meals;

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {dayName} — {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Choose a meal or enter a custom name</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-700" />
            </button>
          </div>

          <div className="relative mb-4">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search meals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-400"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Meals
            </button>
            <button
              onClick={() => setActiveTab('favourites')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'favourites'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart size={16} />
              Favourites
            </button>
            <button
              onClick={() => setActiveTab('takeaway')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'takeaway'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Takeaway
            </button>
            <button
              onClick={() => {
                setShowCustomInput(!showCustomInput);
                setShowRecipeBuilder(false);
              }}
              className={`ml-auto px-4 py-2 rounded-lg font-medium transition-colors ${
                showCustomInput
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Quick Add
            </button>
            <button
              onClick={() => {
                setShowRecipeBuilder(!showRecipeBuilder);
                setShowCustomInput(false);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showRecipeBuilder
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChefHat size={16} />
              Create Recipe
            </button>
          </div>

          {activeTab === 'all' && (
            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategories.includes(category.id)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {showCustomInput && (
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter custom meal name..."
                value={customMealName}
                onChange={(e) => setCustomMealName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomMeal()}
                className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleCustomMeal}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {showRecipeBuilder && (
          <div className="p-6 border-b border-gray-200 bg-green-50 max-h-[60vh] overflow-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
                <input
                  type="text"
                  placeholder="e.g., Mom's Spaghetti Bolognese"
                  value={newRecipe.name}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
                  <input
                    type="text"
                    placeholder="e.g., Italian"
                    value={newRecipe.cuisine}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, cuisine: e.target.value }))}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={newRecipe.difficulty}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    value={newRecipe.prepTime}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, prepTime: e.target.value }))}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (min)</label>
                  <input
                    type="number"
                    value={newRecipe.cookTime}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, cookTime: e.target.value }))}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                  <input
                    type="number"
                    value={newRecipe.servings}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, servings: e.target.value }))}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_FILTERS.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => toggleRecipeCategory(category.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        newRecipe.categories.includes(category.id)
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-700 border border-green-300 hover:bg-green-100'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Ingredients</label>
                  <button
                    onClick={handleAddIngredient}
                    className="text-sm px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {newRecipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ingredient"
                        value={ingredient.name}
                        onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                      />
                      <input
                        type="text"
                        placeholder="Qty"
                        value={ingredient.quantity}
                        onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                        className="w-20 px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={ingredient.unit}
                        onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                        className="w-20 px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                      />
                      {newRecipe.ingredients.length > 1 && (
                        <button
                          onClick={() => handleRemoveIngredient(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  placeholder="Step-by-step cooking instructions..."
                  value={newRecipe.instructions}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, instructions: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
                  <input
                    type="number"
                    value={newRecipe.calories}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, calories: e.target.value }))}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={newRecipe.protein}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, protein: e.target.value }))}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={newRecipe.carbs}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, carbs: e.target.value }))}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={newRecipe.fat}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, fat: e.target.value }))}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateRecipe}
                disabled={!newRecipe.name.trim()}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Recipe & Add to Plan
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading meals...</div>
            </div>
          ) : displayMeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <UtensilsCrossed size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500">No meals found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayMeals.map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => handleSelectMeal(meal)}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-orange-400 hover:shadow-lg transition-all text-left relative group"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavourite(meal.id);
                    }}
                    className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Heart
                      size={20}
                      className={favouriteMealIds.has(meal.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                    />
                  </button>

                  <h3 className="font-semibold text-gray-900 mb-2 pr-8">{meal.name}</h3>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {meal.categories.slice(0, 2).map((category) => (
                      <span
                        key={category}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(category)}`}
                      >
                        {getCategoryLabel(category)}
                      </span>
                    ))}
                  </div>

                  {meal.cuisine && (
                    <p className="text-sm text-gray-600 mb-2 capitalize">{meal.cuisine}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {(meal.prep_time || meal.cook_time) && (
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{(meal.prep_time || 0) + (meal.cook_time || 0)} min</span>
                      </div>
                    )}
                    {meal.calories && (
                      <span>{meal.calories} cal</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
