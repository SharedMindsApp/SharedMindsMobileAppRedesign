/**
 * RecipePreviewModal - Component for previewing AI-generated recipes before saving
 * 
 * Allows users to review generated recipes and decide whether to save or regenerate
 */

import { useState } from 'react';
import { X, Save, RefreshCw, ChefHat, Clock, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Recipe } from '../../lib/recipeGeneratorTypes';
import { RecipeDetail } from './RecipeDetail';

interface RecipePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  onSave: (recipe: Recipe) => Promise<void>;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

export function RecipePreviewModal({
  isOpen,
  onClose,
  recipe,
  onSave,
  onRegenerate,
  isGenerating = false,
}: RecipePreviewModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(recipe);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChefHat className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Review Generated Recipe</h2>
              <p className="text-sm text-gray-500">Review the recipe before saving to your library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={18} />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Recipe Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <RecipeDetail
            recipe={recipe}
            onClose={onClose}
            showActions={false}
          />
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-500">
            {recipe.validation_status === 'draft' && (
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-600" />
                <span>This recipe will be saved as a draft and can be edited later</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRegenerate && (
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Recipe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
