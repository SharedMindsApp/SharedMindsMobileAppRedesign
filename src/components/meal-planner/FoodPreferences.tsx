/**
 * Food Preferences Component
 * 
 * Allows users to configure their dietary constraints, allergies, and food preferences
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle2, XCircle, UtensilsCrossed } from 'lucide-react';
import {
  getFoodProfile,
  upsertFoodProfile,
} from '../../lib/foodProfileService';
import type {
  UserFoodProfile,
  FoodProfileInput,
  DietType,
  AllergyType,
} from '../../lib/foodProfileTypes';
import {
  getAllDietTypes,
  getAllergyTypes,
  getDietLabel,
  getAllergyLabel,
  DIET_DEFINITIONS,
  ALLERGY_DEFINITIONS,
} from '../../lib/foodProfileTypes';
import { showToast } from '../Toast';

interface FoodPreferencesProps {
  spaceId: string;
}

export function FoodPreferences({ spaceId }: FoodPreferencesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserFoodProfile | null>(null);

  // Form state
  const [diet, setDiet] = useState<DietType | null>('omnivore');
  const [allergies, setAllergies] = useState<AllergyType[]>([]);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [preferredIngredients, setPreferredIngredients] = useState<string[]>([]);
  const [excludedCuisines, setExcludedCuisines] = useState<string[]>([]);
  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [allowOverrides, setAllowOverrides] = useState(false);

  // Input states for adding new items
  const [newExcludedIngredient, setNewExcludedIngredient] = useState('');
  const [newPreferredIngredient, setNewPreferredIngredient] = useState('');
  const [newExcludedCuisine, setNewExcludedCuisine] = useState('');
  const [newPreferredCuisine, setNewPreferredCuisine] = useState('');

  useEffect(() => {
    loadProfile();
  }, [spaceId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const foodProfile = await getFoodProfile(spaceId);
      if (foodProfile) {
        setProfile(foodProfile);
        setDiet(foodProfile.diet);
        setAllergies(foodProfile.allergies);
        setExcludedIngredients(foodProfile.excluded_ingredients);
        setPreferredIngredients(foodProfile.preferred_ingredients);
        setExcludedCuisines(foodProfile.excluded_cuisines);
        setPreferredCuisines(foodProfile.preferred_cuisines);
        setAllowOverrides(foodProfile.allow_overrides);
      } else {
        // Default values
        setDiet('omnivore');
        setAllergies([]);
        setExcludedIngredients([]);
        setPreferredIngredients([]);
        setExcludedCuisines([]);
        setPreferredCuisines([]);
        setAllowOverrides(false);
      }
    } catch (error) {
      console.error('Failed to load food profile:', error);
      showToast('error', 'Failed to load food preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const input: FoodProfileInput = {
        diet,
        allergies,
        excluded_ingredients: excludedIngredients,
        preferred_ingredients: preferredIngredients,
        excluded_cuisines: excludedCuisines,
        preferred_cuisines: preferredCuisines,
        allow_overrides: allowOverrides,
      };
      await upsertFoodProfile(spaceId, input);
      await loadProfile();
      showToast('success', 'Food preferences saved');
    } catch (error) {
      console.error('Failed to save food profile:', error);
      showToast('error', 'Failed to save food preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleAllergy = (allergy: AllergyType) => {
    setAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  const addExcludedIngredient = () => {
    if (newExcludedIngredient.trim() && !excludedIngredients.includes(newExcludedIngredient.trim())) {
      setExcludedIngredients(prev => [...prev, newExcludedIngredient.trim()]);
      setNewExcludedIngredient('');
    }
  };

  const removeExcludedIngredient = (ingredient: string) => {
    setExcludedIngredients(prev => prev.filter(i => i !== ingredient));
  };

  const addPreferredIngredient = () => {
    if (newPreferredIngredient.trim() && !preferredIngredients.includes(newPreferredIngredient.trim())) {
      setPreferredIngredients(prev => [...prev, newPreferredIngredient.trim()]);
      setNewPreferredIngredient('');
    }
  };

  const removePreferredIngredient = (ingredient: string) => {
    setPreferredIngredients(prev => prev.filter(i => i !== ingredient));
  };

  const addExcludedCuisine = () => {
    if (newExcludedCuisine.trim() && !excludedCuisines.includes(newExcludedCuisine.trim())) {
      setExcludedCuisines(prev => [...prev, newExcludedCuisine.trim()]);
      setNewExcludedCuisine('');
    }
  };

  const removeExcludedCuisine = (cuisine: string) => {
    setExcludedCuisines(prev => prev.filter(c => c !== cuisine));
  };

  const addPreferredCuisine = () => {
    if (newPreferredCuisine.trim() && !preferredCuisines.includes(newPreferredCuisine.trim())) {
      setPreferredCuisines(prev => [...prev, newPreferredCuisine.trim()]);
      setNewPreferredCuisine('');
    }
  };

  const removePreferredCuisine = (cuisine: string) => {
    setPreferredCuisines(prev => prev.filter(c => c !== cuisine));
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading food preferences...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2">Food Preferences</h2>
        <p className="text-xs sm:text-sm text-gray-600">
          Configure your dietary constraints, allergies, and preferences to get personalized recipe suggestions
        </p>
      </div>

      {/* Diet Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
            <UtensilsCrossed size={18} className="text-orange-600 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Diet Type</h3>
            <p className="text-xs sm:text-sm text-gray-600">Select your primary dietary pattern</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {getAllDietTypes().map((dietType) => {
            const dietDef = DIET_DEFINITIONS[dietType];
            return (
              <button
                key={dietType}
                onClick={() => setDiet(dietType)}
                className={`p-3 rounded-lg border-2 transition-all text-left touch-manipulation ${
                  diet === dietType
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300 bg-white'
                }`}
              >
                <div className="font-semibold text-sm text-gray-900 mb-1">{dietDef.label}</div>
                <div className="text-xs text-gray-600">{dietDef.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Allergies */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-red-600" />
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Allergies</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Medical constraints - recipes containing these will be blocked
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {getAllergyTypes().map((allergyType) => {
            const allergyDef = ALLERGY_DEFINITIONS[allergyType];
            const isSelected = allergies.includes(allergyType);
            return (
              <button
                key={allergyType}
                onClick={() => toggleAllergy(allergyType)}
                className={`p-3 rounded-lg border-2 transition-all text-left touch-manipulation ${
                  isSelected
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isSelected ? (
                    <CheckCircle2 size={16} className="text-red-600" />
                  ) : (
                    <XCircle size={16} className="text-gray-400" />
                  )}
                  <span className="font-semibold text-sm text-gray-900">{allergyDef.label}</span>
                </div>
                <div className="text-xs text-gray-600">{allergyDef.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Excluded Ingredients */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <XCircle size={20} className="text-orange-600" />
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Excluded Ingredients</h3>
            <p className="text-xs sm:text-sm text-gray-600">Ingredients you don't want in recipes</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newExcludedIngredient}
            onChange={(e) => setNewExcludedIngredient(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addExcludedIngredient()}
            placeholder="e.g. mushrooms, cilantro"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm touch-manipulation"
          />
          <button
            onClick={addExcludedIngredient}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors text-sm font-medium touch-manipulation"
          >
            Add
          </button>
        </div>

        {excludedIngredients.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {excludedIngredients.map((ingredient) => (
              <span
                key={ingredient}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm"
              >
                {ingredient}
                <button
                  onClick={() => removeExcludedIngredient(ingredient)}
                  className="hover:text-red-900 touch-manipulation"
                  aria-label={`Remove ${ingredient}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Preferred Ingredients */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
            <CheckCircle2 size={18} className="text-green-600 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Preferred Ingredients</h3>
            <p className="text-xs sm:text-sm text-gray-600">Ingredients you'd like to see more of</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newPreferredIngredient}
            onChange={(e) => setNewPreferredIngredient(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addPreferredIngredient()}
            placeholder="e.g. chicken, lentils, tofu"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm touch-manipulation"
          />
          <button
            onClick={addPreferredIngredient}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 transition-colors text-sm font-medium touch-manipulation"
          >
            Add
          </button>
        </div>

        {preferredIngredients.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {preferredIngredients.map((ingredient) => (
              <span
                key={ingredient}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm"
              >
                {ingredient}
                <button
                  onClick={() => removePreferredIngredient(ingredient)}
                  className="hover:text-green-900 touch-manipulation"
                  aria-label={`Remove ${ingredient}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Excluded Cuisines */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <XCircle size={20} className="text-orange-600" />
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Excluded Cuisines</h3>
            <p className="text-xs sm:text-sm text-gray-600">Cuisines you'd prefer to avoid</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newExcludedCuisine}
            onChange={(e) => setNewExcludedCuisine(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addExcludedCuisine()}
            placeholder="e.g. Thai, Indian"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm touch-manipulation"
          />
          <button
            onClick={addExcludedCuisine}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors text-sm font-medium touch-manipulation"
          >
            Add
          </button>
        </div>

        {excludedCuisines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {excludedCuisines.map((cuisine) => (
              <span
                key={cuisine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm"
              >
                {cuisine}
                <button
                  onClick={() => removeExcludedCuisine(cuisine)}
                  className="hover:text-orange-900 touch-manipulation"
                  aria-label={`Remove ${cuisine}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Preferred Cuisines */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
            <CheckCircle2 size={18} className="text-green-600 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Preferred Cuisines</h3>
            <p className="text-xs sm:text-sm text-gray-600">Cuisines you'd like to see more of</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newPreferredCuisine}
            onChange={(e) => setNewPreferredCuisine(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addPreferredCuisine()}
            placeholder="e.g. Italian, Mexican"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm touch-manipulation"
          />
          <button
            onClick={addPreferredCuisine}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 transition-colors text-sm font-medium touch-manipulation"
          >
            Add
          </button>
        </div>

        {preferredCuisines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {preferredCuisines.map((cuisine) => (
              <span
                key={cuisine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm"
              >
                {cuisine}
                <button
                  onClick={() => removePreferredCuisine(cuisine)}
                  className="hover:text-green-900 touch-manipulation"
                  aria-label={`Remove ${cuisine}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Override Toggle */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-3">
          <Info size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Allow Overrides</h3>
            <p className="text-xs sm:text-sm text-gray-700 mb-3">
              When enabled, you can manually add recipes that don't match your preferences.
              Allergies will still be blocked for safety.
            </p>
            <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={allowOverrides}
                onChange={(e) => setAllowOverrides(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-900 select-none">
                Allow me to manually add recipes that don't match my preferences
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium touch-manipulation active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}
