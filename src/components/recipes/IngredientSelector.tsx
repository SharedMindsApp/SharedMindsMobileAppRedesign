/**
 * IngredientSelector - Component for selecting ingredients with food_item_id lookup
 * 
 * ADHD-first design: simple, clear, no pressure
 */

import { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { searchFoodItems, getFoodItemsByIds, type FoodItem } from '../../lib/foodItems';
import type { RecipeIngredient } from '../../lib/recipeGeneratorTypes';

interface IngredientSelectorProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
  disabled?: boolean;
}

export function IngredientSelector({
  ingredients,
  onChange,
  disabled = false,
}: IngredientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [isOptional, setIsOptional] = useState(false);
  const [notes, setNotes] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (searchQuery.trim() && showSearch) {
      // Debounce search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await searchFoodItems(searchQuery, 10);
          setSearchResults(results);
        } catch (error) {
          console.error('Error searching food items:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, showSearch]);

  const handleSelectFoodItem = (foodItem: FoodItem) => {
    setSelectedFoodItem(foodItem);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddIngredient = () => {
    if (!selectedFoodItem) return;

    const newIngredient: RecipeIngredient = {
      food_item_id: selectedFoodItem.id,
      quantity: quantity || '1',
      unit: unit || '',
      optional: isOptional,
      notes: notes || undefined,
    };

    onChange([...ingredients, newIngredient]);

    // Reset form
    setSelectedFoodItem(null);
    setQuantity('');
    setUnit('');
    setIsOptional(false);
    setNotes('');
  };

  const handleRemoveIngredient = (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateIngredient = (index: number, updates: Partial<RecipeIngredient>) => {
    const updated = ingredients.map((ing, i) =>
      i === index ? { ...ing, ...updates } : ing
    );
    onChange(updated);
  };

  // Load food item names for display
  const [foodItemMap, setFoodItemMap] = useState<Map<string, FoodItem>>(new Map());

  useEffect(() => {
    const loadFoodItems = async () => {
      const foodItemIds = ingredients.map(ing => ing.food_item_id);
      if (foodItemIds.length === 0) return;

      const items = await getFoodItemsByIds(foodItemIds);
      const map = new Map(items.map(item => [item.id, item]));
      setFoodItemMap(map);
    };

    loadFoodItems();
  }, [ingredients]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Ingredients ({ingredients.length})
        </label>
        {!disabled && (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
          >
            <Plus size={16} />
            Add Ingredient
          </button>
        )}
      </div>

      {/* Search for food item */}
      {showSearch && !selectedFoodItem && (
        <div className="border border-gray-300 rounded-lg p-3 bg-white">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for ingredient..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search results */}
          {isSearching && (
            <div className="mt-2 text-sm text-gray-500 text-center py-2">
              Searching...
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectFoodItem(item)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                >
                  {item.emoji && <span>{item.emoji}</span>}
                  <span className="flex-1">{item.name}</span>
                  {item.category && (
                    <span className="text-xs text-gray-500">{item.category}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div className="mt-2 text-sm text-gray-500 text-center py-2">
              No ingredients found. Try a different search.
            </div>
          )}
        </div>
      )}

      {/* Ingredient form (after selecting food item) */}
      {selectedFoodItem && (
        <div className="border border-orange-300 rounded-lg p-4 bg-orange-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {selectedFoodItem.emoji && <span>{selectedFoodItem.emoji}</span>}
              <span className="font-medium">{selectedFoodItem.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFoodItem(null);
                setQuantity('');
                setUnit('');
                setIsOptional(false);
                setNotes('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Quantity</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="2"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="cups"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isOptional}
                onChange={(e) => setIsOptional(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-gray-700">Optional ingredient</span>
            </label>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., chopped, fresh"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddIngredient}
            className="mt-3 w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Add Ingredient
          </button>
        </div>
      )}

      {/* List of added ingredients */}
      {ingredients.length > 0 && (
        <div className="space-y-2">
          {ingredients.map((ingredient, index) => {
            const foodItem = foodItemMap.get(ingredient.food_item_id);
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {foodItem?.emoji && <span>{foodItem.emoji}</span>}
                    <span className="font-medium truncate">{foodItem?.name || 'Loading...'}</span>
                    {ingredient.optional && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        Optional
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {ingredient.quantity} {ingredient.unit && ingredient.unit}
                    {ingredient.notes && ` • ${ingredient.notes}`}
                  </div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(index)}
                    className="text-red-500 hover:text-red-600 p-1"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {ingredients.length === 0 && !showSearch && (
        <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
          No ingredients added yet. Click "Add Ingredient" to get started.
        </div>
      )}
    </div>
  );
}
