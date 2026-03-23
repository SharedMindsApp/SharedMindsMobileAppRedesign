/**
 * AddRecipeToMealModal - Modal for adding a recipe to a specific meal slot
 * 
 * Allows users to select:
 * - Day of week
 * - Meal type (breakfast, lunch, dinner, snack)
 * - Week (current or next)
 */

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, Tag, Minus, Plus } from 'lucide-react';
import { getWeekStartDate, addRecipeToPlan, type MealPlan } from '../../lib/mealPlanner';
import { useMealSchedule } from '../../hooks/useMealSchedule';
import { getActiveUserProfile } from '../../lib/profiles/getActiveUserProfile';
import { showToast } from '../Toast';
import type { Recipe } from '../../lib/recipeGeneratorTypes';
import { getTagPreferences, toggleTagPreference, batchUpsertTagPreferences, type UserTagPreference, type TagPreferenceInput } from '../../lib/tagPreferencesService';

interface AddRecipeToMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  spaceId: string;
  onSuccess?: () => void;
}

// Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (JavaScript Date.getDay())
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const MEAL_TYPES = [
  { value: 'breakfast' as const, label: 'Breakfast', emoji: '🍳' },
  { value: 'lunch' as const, label: 'Lunch', emoji: '🥪' },
  { value: 'dinner' as const, label: 'Dinner', emoji: '🍲' },
  { value: 'snack' as const, label: 'Snack', emoji: '🍪' },
];

export function AddRecipeToMealModal({
  isOpen,
  onClose,
  recipe,
  spaceId,
  onSuccess,
}: AddRecipeToMealModalProps) {
  const { schedule, getMealSlotsForDay } = useMealSchedule(spaceId);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  // recipe.meal_type is now an array, use first value or default
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(
    Array.isArray(recipe.meal_type) && recipe.meal_type.length > 0 
      ? recipe.meal_type[0] 
      : recipe.meal_type || 'dinner'
  );
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0); // 0 = current week, 1 = next week
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPreferences, setTagPreferences] = useState<Map<string, UserTagPreference>>(new Map());
  const [preferredTags, setPreferredTags] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [servings, setServings] = useState<number>(recipe.servings || 4); // Default to recipe's servings

  // Get available meal slots for selected day
  const availableSlots = schedule ? getMealSlotsForDay(selectedDay) : [];
  const availableMealTypes = availableSlots
    .map(slot => slot.mealTypeMapping)
    .filter((type): type is 'breakfast' | 'lunch' | 'dinner' | 'snack' => type !== undefined);

  // Load tag preferences
  useEffect(() => {
    if (spaceId) {
      loadTagPreferences();
    }
  }, [spaceId]);

  // Update servings when recipe changes
  useEffect(() => {
    if (recipe?.servings) {
      setServings(recipe.servings);
    }
  }, [recipe?.servings]);

  const loadTagPreferences = async () => {
    try {
      const preferences = await getTagPreferences(spaceId);
      const prefMap = new Map(preferences.map(p => [p.tag, p]));
      const preferred = new Set(preferences.filter(p => p.is_preferred).map(p => p.tag));
      setTagPreferences(prefMap);
      setPreferredTags(preferred);
    } catch (error) {
      console.error('Failed to load tag preferences:', error);
    }
  };

  // Filter tags by meal type
  const getMealTypeTags = (): string[] => {
    // Tags relevant to the selected meal type
    const mealTypeTagMap: Record<string, string[]> = {
      breakfast: [
        'breakfast', 'quick-meal', '15-min', '30-min', 'healthy', 'high-protein', 
        'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'comfort-food', 'light',
        'kid-friendly', 'family-friendly', 'make-ahead', 'meal-prep'
      ],
      lunch: [
        'lunch', 'quick-meal', '15-min', '30-min', 'healthy', 'light', 'salad',
        'vegetarian', 'vegan', 'gluten-free', 'make-ahead', 'meal-prep', 'leftovers',
        'one-pot', 'sandwich', 'wrap', 'bowl', 'kid-friendly', 'family-friendly'
      ],
      dinner: [
        'dinner', 'comfort-food', 'hearty', 'family-dinner', 'date-night', 'romantic',
        'one-pot', 'slow-cooker', 'instant-pot', 'make-ahead', 'meal-prep',
        'vegetarian', 'vegan', 'gluten-free', 'high-protein', 'kid-friendly', 'family-friendly'
      ],
      snack: [
        'snack', 'quick-meal', '15-min', 'no-cook', 'healthy', 'sweet', 'savory',
        'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'kid-friendly'
      ],
    };
    return mealTypeTagMap[selectedMealType] || [];
  };

  const availableTags = getMealTypeTags();

  // Update selected meal type if it's not available for the selected day
  useEffect(() => {
    if (availableMealTypes.length > 0 && !availableMealTypes.includes(selectedMealType)) {
      setSelectedMealType(availableMealTypes[0]);
    }
  }, [selectedDay, availableMealTypes, selectedMealType]);

  // Calculate week start date
  const getSelectedWeekStartDate = (): string => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + (selectedWeekOffset * 7));
    return getWeekStartDate(baseDate);
  };

  const handleAddToMeal = async () => {
    if (!spaceId) {
      showToast('error', 'Space ID is required');
      return;
    }

    if (!recipe?.id) {
      showToast('error', 'Recipe ID is required');
      console.error('[AddRecipeToMealModal] Recipe ID is missing:', { recipe });
      return;
    }

    setSaving(true);
    try {
      const profile = await getActiveUserProfile();
      const weekStartDate = getSelectedWeekStartDate();

      // Save tag preferences - this builds the intelligent preference learning system
      // When users select tags for a meal type, we save them as preferences
      if (selectedTags.length > 0) {
        try {
          const tagPreferences: TagPreferenceInput[] = selectedTags.map(tag => ({
            tag,
            is_preferred: true, // Mark as preferred since user explicitly selected it
          }));
          
          await batchUpsertTagPreferences(spaceId, tagPreferences);
          console.log('[AddRecipeToMealModal] Saved tag preferences:', {
            tags: selectedTags,
            mealType: selectedMealType,
            spaceId,
          });
        } catch (error) {
          console.error('[AddRecipeToMealModal] Failed to save tag preferences:', error);
          // Don't block the meal addition if preference saving fails
        }
      }

      console.log('[AddRecipeToMealModal] Adding recipe to plan:', {
        recipeId: recipe.id,
        spaceId,
        mealType: selectedMealType,
        day: selectedDay,
        weekStartDate,
        profileId: profile.id,
      });

      const result = await addRecipeToPlan(
        spaceId,
        recipe.id,
        selectedMealType,
        selectedDay,
        weekStartDate,
        profile.id,
        servings // Pass the adjusted servings
      );

      const dayLabel = DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label || 'Unknown';
      const wasReplaced = (result as any).wasReplaced;
      
      if (wasReplaced) {
        showToast('success', `Meal replaced: ${recipe.name} on ${dayLabel} ${selectedMealType}`);
      } else {
        showToast('success', `Added ${recipe.name} to ${dayLabel} ${selectedMealType}`);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error: any) {
      console.error('Failed to add recipe to meal plan:', error);
      // Only show error if it's not a duplicate key error (which should be handled by replacement)
      if (error.code === '23505') {
        // This shouldn't happen anymore, but if it does, show a friendly message
        showToast('error', 'A meal already exists in this slot. Please try again.');
      } else {
        showToast('error', error.message || 'Failed to add recipe to meal plan');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const weekStartDate = getSelectedWeekStartDate();
  const weekLabel = selectedWeekOffset === 0 ? 'This Week' : 'Next Week';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 safe-top safe-bottom">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Add to Meal Plan</h2>
              <p className="text-orange-100 text-sm mt-1">{recipe.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-xl p-2 transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Recipe Info with Adjustable Servings */}
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
              </div>
              {(recipe.prep_time || recipe.cook_time) && (
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  {recipe.prep_time && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>Prep: {recipe.prep_time} min</span>
                    </div>
                  )}
                  {recipe.cook_time && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>Cook: {recipe.cook_time} min</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Servings Selector */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-3 mt-3">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  How many servings?
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    disabled={servings <= 1}
                    className="w-10 h-10 bg-white border-2 border-orange-300 rounded-lg flex items-center justify-center hover:bg-orange-50 active:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                    aria-label="Decrease servings"
                  >
                    <Minus size={18} className="text-orange-600" />
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold text-orange-700">{servings}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {servings === 1 ? 'serving' : 'servings'}
                    </div>
                  </div>
                  <button
                    onClick={() => setServings(Math.min(12, servings + 1))}
                    disabled={servings >= 12}
                    className="w-10 h-10 bg-white border-2 border-orange-300 rounded-lg flex items-center justify-center hover:bg-orange-50 active:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                    aria-label="Increase servings"
                  >
                    <Plus size={18} className="text-orange-600" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  {servings === 1 
                    ? "Making this just for yourself? Perfect! Ingredients will scale automatically."
                    : `Cooking for ${servings}? Ingredients will scale automatically.`}
                </p>
              </div>
            </div>

            {/* Week Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedWeekOffset(0)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedWeekOffset === 0
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setSelectedWeekOffset(1)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedWeekOffset === 1
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Next Week
                </button>
              </div>
            </div>

            {/* Day Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day
              </label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map(day => {
                  const isToday = new Date().getDay() === day.value && selectedWeekOffset === 0;
                  const isSelected = selectedDay === day.value;
                  
                  return (
                    <button
                      key={day.value}
                      onClick={() => setSelectedDay(day.value)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-orange-500 text-white'
                          : isToday
                          ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.label.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Selected: {DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label || 'Unknown'} ({weekLabel})
              </p>
            </div>

            {/* Meal Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meal Time
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_TYPES.map(mealType => {
                  const isAvailable = availableMealTypes.length === 0 || availableMealTypes.includes(mealType.value);
                  const isSelected = selectedMealType === mealType.value;
                  
                  return (
                    <button
                      key={mealType.value}
                      onClick={() => isAvailable && setSelectedMealType(mealType.value)}
                      disabled={!isAvailable}
                      className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-orange-500 text-white'
                          : isAvailable
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span className="text-lg">{mealType.emoji}</span>
                      <span>{mealType.label}</span>
                    </button>
                  );
                })}
              </div>
              {availableMealTypes.length === 0 && schedule && (
                <p className="text-xs text-gray-500 mt-2">
                  No meal slots available for {DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label || 'this day'}. Check your meal schedule.
                </p>
              )}
            </div>

            {/* Tag Selection - Quick Options for Meal Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag size={14} className="inline mr-1" />
                Preferences for {MEAL_TYPES.find(m => m.value === selectedMealType)?.label || 'this meal'}
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select tags to personalize your recipe suggestions. These preferences help us learn what you like.
              </p>
              
              {/* Preferred Tags Section */}
              {preferredTags.size > 0 && Array.from(preferredTags).some(tag => availableTags.includes(tag)) && (
                <div className="mb-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-green-600">Your Preferences</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(preferredTags)
                      .filter(tag => availableTags.includes(tag))
                      .map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={`pref-${tag}`}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTags(prev => prev.filter(t => t !== tag));
                              } else {
                                setSelectedTags(prev => [...prev, tag]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all relative ${
                              isSelected
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-green-100 border-2 border-green-500 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              {tag.replace(/-/g, ' ')}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* All Available Tags */}
              <div className="flex flex-wrap gap-2">
                {availableTags
                  .filter(tag => !preferredTags.has(tag)) // Don't show preferred tags again
                  .map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(prev => prev.filter(t => t !== tag));
                          } else {
                            setSelectedTags(prev => [...prev, tag]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        {tag.replace(/-/g, ' ')}
                      </button>
                    );
                  })}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 bg-white"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              {selectedTags.length > 0 && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ {selectedTags.length} preference{selectedTags.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Summary:</span> Adding <span className="font-semibold">{recipe.name}</span> to{' '}
                <span className="font-semibold">{DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label || 'Unknown'} {selectedMealType}</span> ({weekLabel})
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Recipe will be added with {servings} {servings === 1 ? 'serving' : 'servings'} (ingredients will scale automatically)
              </p>
              {selectedTags.length > 0 && (
                <p className="text-xs text-blue-700 mt-1">
                  Preferences: {selectedTags.map(tag => tag.replace(/-/g, ' ')).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleAddToMeal}
            disabled={saving || availableMealTypes.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding...
              </>
            ) : (
              <>
                <Calendar size={18} />
                Add to Meal Plan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
