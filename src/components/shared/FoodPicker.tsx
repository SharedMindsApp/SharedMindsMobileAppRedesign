/**
 * Shared Food Picker Component
 * 
 * Single component for selecting/creating food items.
 * Used by Pantry, Grocery List, and Meal Planner.
 * 
 * ADHD-First Principles:
 * - Fast search with fuzzy matching
 * - Recently used items shown first
 * - No pressure to be precise
 * - Visual feedback with emojis
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Clock, X, Sparkles } from 'lucide-react';
import { 
  searchFoodItems, 
  getRecentlyUsedFoodItems, 
  getOrCreateFoodItem,
  normalizeFoodName,
  type FoodItem,
  type FoodItemWithUsage 
} from '../../lib/foodItems';
import { getFoodAwarenessBatch, type FoodAwarenessMap } from '../../lib/foodAwareness';
import type { PantryItemType } from '../../lib/intelligentGrocery';
import { BottomSheet } from './BottomSheet';

export interface FoodPickerPresetItem {
  name: string;
  category?: string | null;
  description?: string;
  pantryType?: PantryItemType | null;
  estimatedCost?: number | null;
}

export interface FoodPickerPresetSection {
  title: string;
  description?: string;
  items: FoodPickerPresetItem[];
}

interface FoodPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (foodItem: FoodItem, meta?: { pantryType?: PantryItemType | null; estimatedCost?: number | null }) => void;
  householdId: string;
  excludeIds?: string[]; // Food items to exclude from suggestions
  placeholder?: string;
  title?: string;
  showAwareness?: boolean; // Show awareness hints (optional)
  presetSections?: FoodPickerPresetSection[];
  quickPickItems?: FoodPickerPresetItem[];
  layout?: 'default' | 'pantry';
}

// Category emojis for visual identification
const CATEGORY_EMOJIS: Record<string, string> = {
  produce: '🥬',
  dairy: '🥛',
  meat: '🥩',
  pantry: '🥫',
  frozen: '🧊',
  bakery: '🍞',
  beverages: '🥤',
  snacks: '🍿',
  household: '🧻',
  other: '📦',
};

export function FoodPicker({
  isOpen,
  onClose,
  onSelect,
  householdId,
  excludeIds = [],
  placeholder = 'Search for a food item...',
  title = 'Select Food Item',
  showAwareness = false,
  presetSections = [],
  quickPickItems = [],
  layout = 'default',
}: FoodPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPantryType, setSelectedPantryType] = useState<PantryItemType | null>(null);
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [recentItems, setRecentItems] = useState<FoodItemWithUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [awarenessMap, setAwarenessMap] = useState<FoodAwarenessMap>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const getUniquePresetItems = (items: FoodPickerPresetItem[]): FoodPickerPresetItem[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = normalizeFoodName(item.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getFilteredPresetSections = (query: string): FoodPickerPresetSection[] => {
    const normalizedQuery = normalizeFoodName(query);
    const typeFilteredSections = presetSections.map((section) => ({
      ...section,
      items: section.items.filter((item) => !selectedPantryType || item.pantryType === selectedPantryType),
    }));

    if (!normalizedQuery) {
      return typeFilteredSections.map((section) => ({
        ...section,
        items: getUniquePresetItems(section.items),
      }));
    }

    return typeFilteredSections
      .map((section) => ({
        ...section,
        items: getUniquePresetItems(
          section.items.filter((item) => {
            const normalizedName = normalizeFoodName(item.name);
            const normalizedDescription = normalizeFoodName(item.description || '');
            return normalizedName.includes(normalizedQuery) || normalizedDescription.includes(normalizedQuery);
          })
        ),
      }))
      .filter((section) => section.items.length > 0);
  };

  const filteredPresetSections = getFilteredPresetSections(searchQuery);
  const filteredQuickPickItems = getUniquePresetItems(
    quickPickItems.filter((item) => !selectedPantryType || item.pantryType === selectedPantryType)
  );
  const matchedPresetItems = getUniquePresetItems(filteredPresetSections.flatMap((section) => section.items)).slice(0, 12);
  const hasPresetContent = filteredQuickPickItems.length > 0 || filteredPresetSections.length > 0;

  useEffect(() => {
    if (isOpen) {
      loadRecentItems();
      // Focus input after a brief delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
    } else {
      setSearchQuery('');
      setSelectedPantryType(null);
      setSearchResults([]);
      setShowCreateNew(false);
      setAwarenessMap({});
    }
  }, [isOpen, householdId, showAwareness]);

  useEffect(() => {
    if (!isOpen) return;

    const searchTimeout = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
        setShowCreateNew(false);
      }
    }, 300); // Debounce search

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, isOpen]);

  const loadRecentItems = async () => {
    try {
      const recent = await getRecentlyUsedFoodItems(householdId, 8);
      const filtered = recent.filter(item => !excludeIds.includes(item.id));
      setRecentItems(filtered);
      
      // Load awareness for recent items if enabled
      if (showAwareness && householdId && filtered.length > 0) {
        const foodItemIds = filtered.map(item => item.id);
        try {
          const awareness = await getFoodAwarenessBatch(foodItemIds, householdId);
          setAwarenessMap(prev => ({ ...prev, ...awareness }));
        } catch (error) {
          console.error('Error loading recent awareness:', error);
          // Silent fail - awareness is optional
        }
      }
    } catch (error) {
      console.error('Error loading recent items:', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowCreateNew(false);
      return;
    }

    setLoading(true);
    try {
      const results = await searchFoodItems(searchQuery, 10);
      const filtered = results.filter(item => !excludeIds.includes(item.id));
      setSearchResults(filtered);
      
      // Load awareness if enabled
      if (showAwareness && householdId && filtered.length > 0) {
        const foodItemIds = filtered.map(item => item.id);
        const awareness = await getFoodAwarenessBatch(foodItemIds, householdId);
        setAwarenessMap(awareness);
      }
      
      // Show "create new" option if no exact match
      const exactMatch = filtered.some(
        item => item.normalized_name === normalizeFoodName(searchQuery)
      );
      const exactPresetMatch = matchedPresetItems.some(
        (item) => normalizeFoodName(item.name) === normalizeFoodName(searchQuery)
      );
      setShowCreateNew(!exactMatch && !exactPresetMatch && searchQuery.trim().length > 0);
    } catch (error) {
      console.error('Error searching food items:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (
    item: FoodItem,
    meta?: { pantryType?: PantryItemType | null; estimatedCost?: number | null }
  ) => {
    onSelect(item, meta);
    onClose();
  };

  const handleCreateNew = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const newItem = await getOrCreateFoodItem(searchQuery.trim());
      handleSelect(newItem, { pantryType: selectedPantryType });
    } catch (error) {
      console.error('Error creating food item:', error);
      alert('Failed to create food item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = async (item: FoodPickerPresetItem) => {
    try {
      setLoading(true);
      const foodItem = await getOrCreateFoodItem(item.name, item.category ?? undefined);
      handleSelect(foodItem, {
        pantryType: item.pantryType ?? selectedPantryType,
        estimatedCost: item.estimatedCost ?? null,
      });
    } catch (error) {
      console.error('Error creating preset food item:', error);
      alert('Failed to add this food item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryEmoji = (category: string | null): string => {
    if (!category) return CATEGORY_EMOJIS.other;
    const key = category.toLowerCase();
    return CATEGORY_EMOJIS[key] || CATEGORY_EMOJIS.other;
  };

  if (!isOpen) return null;

  const pantryTypeFilters: { value: PantryItemType | null; label: string }[] = [
    { value: null, label: 'All' },
    { value: 'perishable', label: 'Perishable' },
    { value: 'long_life', label: 'Long Life' },
    { value: 'non_food', label: 'Non-Food' },
  ];

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 pb-4">
        {layout === 'pantry' && !searchQuery && (
          <div className="mb-4 rounded-[1.5rem] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#f7fee7)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-emerald-600 shadow-sm">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Start with everyday staples</h3>
                <p className="mt-1 text-sm text-stone-600">
                  Pick from common pantry foods first, then adjust quantity and expiry in the next step.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
            autoFocus
          />
        </div>

        {layout === 'pantry' && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Categories
            </div>
            <div className="flex flex-wrap gap-2">
              {pantryTypeFilters.map((type) => (
                <button
                  key={type.label}
                  onClick={() => setSelectedPantryType(type.value)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    selectedPantryType === type.value
                      ? 'bg-stone-900 text-white'
                      : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {layout === 'pantry' && !searchQuery && filteredQuickPickItems.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-800">Quick add</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredQuickPickItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleSelectPreset(item)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-100"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && searchQuery && (
            <div className="text-center py-8 text-gray-500">Searching...</div>
          )}

          {/* Search Results */}
          {!loading && searchQuery && searchResults.length > 0 && (
            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Search Results</h3>
              {searchResults.map((item) => {
                const awareness = showAwareness ? awarenessMap[item.id] : undefined;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item, { pantryType: selectedPantryType })}
                    className="w-full text-left p-3 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-colors flex items-center gap-3"
                  >
                    <span className="text-2xl">{item.emoji || getCategoryEmoji(item.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.category && (
                          <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                        )}
                        {awareness?.inPantry && (
                          <span className="text-xs text-gray-400 italic">• You already have this</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && searchQuery && matchedPresetItems.length > 0 && (
            <div className="mb-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Suggested staples</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {matchedPresetItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleSelectPreset(item)}
                    className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-left transition-colors hover:bg-emerald-100"
                  >
                    <p className="font-medium text-stone-900">{item.name}</p>
                    {(item.description || item.category) && (
                      <p className="mt-1 text-xs text-stone-600">{item.description || item.category}</p>
                    )}
                    {item.pantryType && (
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
                        {item.pantryType.replace('_', ' ')}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create New Option */}
          {!loading && showCreateNew && (
            <button
              onClick={handleCreateNew}
              className="w-full p-3 rounded-lg border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50 transition-colors flex items-center gap-3 text-left mb-4"
            >
              <Plus size={20} className="text-orange-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Create "{searchQuery.trim()}"</p>
                <p className="text-xs text-gray-500">Add as new food item</p>
              </div>
            </button>
          )}

          {/* Recent Items */}
          {!searchQuery && recentItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-gray-400" />
                <h3 className="text-sm font-medium text-gray-700">Recently Used</h3>
              </div>
              {recentItems.map((item) => {
                const awareness = showAwareness ? awarenessMap[item.id] : undefined;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full text-left p-3 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-colors flex items-center gap-3"
                  >
                    <span className="text-2xl">{item.emoji || getCategoryEmoji(item.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.category && (
                          <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                        )}
                        {awareness?.inPantry && (
                          <span className="text-xs text-gray-400 italic">• You already have this</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!searchQuery && presetSections.length > 0 && (
            <div className={`space-y-4 ${recentItems.length > 0 ? 'mt-5' : ''}`}>
              {filteredPresetSections.map((section) => (
                <div key={section.title} className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-stone-900">{section.title}</h3>
                    {section.description && (
                      <p className="mt-1 text-xs text-stone-500">{section.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item) => (
                      <button
                        key={`${section.title}-${item.name}`}
                        onClick={() => handleSelectPreset(item)}
                        className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-100"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty States */}
          {!loading && !searchQuery && recentItems.length === 0 && !hasPresetContent && (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">No recent items</p>
              <p className="text-sm">Start typing to search for food items</p>
            </div>
          )}

          {!loading && searchQuery && searchResults.length === 0 && matchedPresetItems.length === 0 && !showCreateNew && (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">No results found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
      </div>
    </div>
  );

  if (layout === 'pantry') {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
        {content}
      </BottomSheet>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 safe-top safe-bottom">
      <div className="mx-4 flex h-full max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
