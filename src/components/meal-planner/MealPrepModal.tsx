/**
 * Meal Prep Modal
 * 
 * Modal for creating meal preparations from recipes or meal library items
 */

import { useState, useEffect } from 'react';
import { X, ChefHat, Users, Calendar, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { createPreparedMeal, type CreatePreparedMealInput } from '../../lib/mealPrepService';
import { showToast } from '../Toast';
import type { Recipe } from '../../lib/recipeGeneratorTypes';
import type { MealLibraryItem } from '../../lib/mealPlanner';
import { useAuth } from '../../contexts/AuthContext';

interface MealPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  recipe?: Recipe | null;
  meal?: MealLibraryItem | null;
  onSuccess?: () => void;
}

export function MealPrepModal({
  isOpen,
  onClose,
  spaceId,
  recipe,
  meal,
  onSuccess,
}: MealPrepModalProps) {
  const { user } = useAuth();
  const [preparedServings, setPreparedServings] = useState<number>(4);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoAssign, setAutoAssign] = useState(false);

  const baseServings = recipe?.servings || meal?.servings || 4;
  const recipeName = recipe?.name || meal?.name || 'Unknown';
  const scalingFactor = preparedServings / baseServings;

  useEffect(() => {
    if (isOpen) {
      // Set default prepared servings to base servings
      setPreparedServings(baseServings);
      setNotes('');
      setAutoAssign(false);
    }
  }, [isOpen, baseServings]);

  const handleCreatePrep = async () => {
    if (!user) {
      showToast('error', 'Please sign in to create meal prep');
      return;
    }

    if (preparedServings < baseServings) {
      showToast('error', `Prepared servings must be at least ${baseServings} (base servings)`);
      return;
    }

    setSaving(true);
    try {
      const input: CreatePreparedMealInput = {
        space_id: spaceId,
        recipe_id: recipe?.id || null,
        meal_library_id: meal?.id || null,
        prepared_servings: preparedServings,
        notes: notes.trim() || null,
      };

      await createPreparedMeal(user.id, input);
      
      showToast('success', `Prepared ${preparedServings} servings of ${recipeName}`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error: any) {
      console.error('Failed to create meal prep:', error);
      showToast('error', error.message || 'Failed to create meal prep');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 safe-top safe-bottom">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat size={24} className="text-white" />
              <h2 className="text-xl font-bold text-white">Meal Prep</h2>
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
            {/* Recipe Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{recipeName}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>Base: {baseServings} servings</span>
                </div>
              </div>
            </div>

            {/* Prepared Servings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many servings are you preparing?
              </label>
              <input
                type="number"
                min={baseServings}
                step="0.5"
                value={preparedServings}
                onChange={(e) => setPreparedServings(parseFloat(e.target.value) || baseServings)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-lg font-semibold"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least {baseServings} servings (base recipe)
              </p>
              
              {preparedServings > baseServings && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Sparkles size={14} />
                    <span>
                      Scaling by {scalingFactor.toFixed(2)}x ({preparedServings} ÷ {baseServings})
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    All ingredients and nutrition will be scaled automatically
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., 'For work lunches', 'Freeze half'"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 resize-none"
                rows={3}
              />
            </div>

            {/* Auto-assign option (future feature) */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="autoAssign"
                checked={autoAssign}
                onChange={(e) => setAutoAssign(e.target.checked)}
                className="mt-1"
                disabled
              />
              <label htmlFor="autoAssign" className="flex-1 text-sm text-gray-600">
                <span className="font-medium text-gray-900">Auto-assign to meal slots</span>
                <span className="block text-xs text-gray-500 mt-1">
                  Coming soon: Automatically distribute servings across upcoming meals
                </span>
              </label>
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
            onClick={handleCreatePrep}
            disabled={saving || preparedServings < baseServings}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <ChefHat size={18} />
                Create Prep
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
