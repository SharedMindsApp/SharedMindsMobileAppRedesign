/**
 * ReviewQueue - Component for reviewing recipes that need validation
 * 
 * Shows recipes flagged for review, validation issues, and allows approve/reject actions
 * Phase 4: Validation & Quality Assurance
 */

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Edit, Eye, Loader2 } from 'lucide-react';
import { 
  listRecipesNeedingReview, 
  getValidationStatus,
  type RecipeValidationStatus 
} from '../../lib/recipeValidationService';
import { getRecipeById, updateRecipe } from '../../lib/recipeGeneratorService';
import { saveValidationStatus } from '../../lib/recipeValidationService';
import type { Recipe } from '../../lib/recipeGeneratorTypes';
import { RecipeDetail } from './RecipeDetail';
import { RecipeForm } from './RecipeForm';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ReviewQueueProps {
  householdId?: string;
  onRecipeApproved?: (recipeId: string) => void;
  onRecipeRejected?: (recipeId: string) => void;
}

export function ReviewQueue({
  householdId,
  onRecipeApproved,
  onRecipeRejected,
}: ReviewQueueProps) {
  const { user } = useAuth();
  const [validationStatuses, setValidationStatuses] = useState<RecipeValidationStatus[]>([]);
  const [recipes, setRecipes] = useState<Map<string, Recipe>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReviewQueue();
  }, []);

  const loadReviewQueue = async () => {
    setLoading(true);
    try {
      const statuses = await listRecipesNeedingReview(50);
      setValidationStatuses(statuses);

      // Load recipes for each status
      const recipePromises = statuses.map(status => getRecipeById(status.recipe_id));
      const recipeResults = await Promise.all(recipePromises);
      
      const recipeMap = new Map<string, Recipe>();
      recipeResults.forEach(recipe => {
        if (recipe) {
          recipeMap.set(recipe.id, recipe);
        }
      });
      setRecipes(recipeMap);
    } catch (error) {
      console.error('Error loading review queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (recipeId: string) => {
    if (!user) return;
    
    setProcessing(prev => new Set(prev).add(recipeId));
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      // Get current validation status
      const validationStatus = await getValidationStatus(recipeId);
      if (!validationStatus) return;

      // Update to approved
      await saveValidationStatus(
        recipeId,
        {
          ...validationStatus,
          status: 'approved',
        } as any,
        profile.id,
        'human',
        'Approved by reviewer'
      );

      // Refresh queue
      await loadReviewQueue();
      
      if (onRecipeApproved) {
        onRecipeApproved(recipeId);
      }

      // Close detail view if viewing this recipe
      if (selectedRecipeId === recipeId) {
        setSelectedRecipeId(null);
      }
    } catch (error) {
      console.error('Error approving recipe:', error);
      alert('Failed to approve recipe. Please try again.');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
  };

  const handleReject = async (recipeId: string, reason?: string) => {
    if (!user) return;
    
    setProcessing(prev => new Set(prev).add(recipeId));
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      // Get current validation status
      const validationStatus = await getValidationStatus(recipeId);
      if (!validationStatus) return;

      // Update to deprecated
      await saveValidationStatus(
        recipeId,
        {
          ...validationStatus,
          status: 'deprecated',
        } as any,
        profile.id,
        'human',
        reason || 'Rejected by reviewer'
      );

      // Refresh queue
      await loadReviewQueue();
      
      if (onRecipeRejected) {
        onRecipeRejected(recipeId);
      }

      // Close detail view if viewing this recipe
      if (selectedRecipeId === recipeId) {
        setSelectedRecipeId(null);
      }
    } catch (error) {
      console.error('Error rejecting recipe:', error);
      alert('Failed to reject recipe. Please try again.');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
  };

  const handleSaveEdit = async (recipeId: string, data: any) => {
    if (!user) return;
    
    setProcessing(prev => new Set(prev).add(recipeId));
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      await updateRecipe(recipeId, data, profile.id);
      
      // Refresh data
      await loadReviewQueue();
      setEditingRecipeId(null);
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('Failed to update recipe. Please try again.');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'needs_review':
        return 'text-orange-600 bg-orange-100';
      case 'deprecated':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getQualityScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-orange-500" size={24} />
        <span className="ml-2 text-gray-600">Loading review queue...</span>
      </div>
    );
  }

  if (validationStatuses.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
        <p className="text-gray-600">No recipes need review at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Queue</h2>
          <p className="text-sm text-gray-600 mt-1">
            {validationStatuses.length} recipe{validationStatuses.length !== 1 ? 's' : ''} need{validationStatuses.length === 1 ? 's' : ''} review
          </p>
        </div>
      </div>

      {/* Recipe Cards */}
      <div className="space-y-4">
        {validationStatuses.map(status => {
          const recipe = recipes.get(status.recipe_id);
          if (!recipe) return null;

          const issues: string[] = [];
          
          // Collect issues
          if (!status.ingredient_validation.all_ingredients_mapped) {
            issues.push('Missing ingredient mappings');
          }
          if (!status.instruction_validation.has_instructions) {
            issues.push('Missing instructions');
          }
          if (status.instruction_validation.has_instructions && !status.instruction_validation.min_length_met) {
            issues.push('Instructions too short');
          }
          issues.push(...(status.ingredient_validation.warnings || []));
          issues.push(...(status.nutrition_validation.warnings || []));

          const isProcessing = processing.has(recipe.id);

          return (
            <div
              key={recipe.id}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{recipe.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                      {status.status.replace('_', ' ')}
                    </span>
                  </div>

                  {recipe.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
                  )}

                  {/* Quality Score */}
                  {status.quality_score !== null && (
                    <div className="flex items-center gap-4 mb-3 text-sm">
                      <span className="text-gray-600">Quality Score:</span>
                      <span className={`font-semibold ${getQualityScoreColor(status.quality_score)}`}>
                        {(status.quality_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {/* Issues */}
                  {issues.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="text-orange-500 mt-0.5 flex-shrink-0" size={16} />
                        <div className="flex-1">
                          <div className="font-medium text-gray-700 mb-1">Issues found:</div>
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            {issues.slice(0, 3).map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                            {issues.length > 3 && (
                              <li className="text-gray-500">+{issues.length - 3} more issue{issues.length - 3 !== 1 ? 's' : ''}</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Validation Details */}
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mt-4">
                    <div>
                      <span className="font-medium">Ingredients:</span>{' '}
                      {status.ingredient_validation.mapped_count}/{status.ingredient_validation.total_count} mapped
                    </div>
                    <div>
                      <span className="font-medium">Instructions:</span>{' '}
                      {status.instruction_validation.has_instructions 
                        ? `${status.instruction_validation.step_count} step${status.instruction_validation.step_count !== 1 ? 's' : ''}`
                        : 'Missing'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSelectedRecipeId(recipe.id)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View details"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => setEditingRecipeId(recipe.id)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit recipe"
                    disabled={isProcessing}
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleApprove(recipe.id)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Rejection reason (optional):');
                      if (reason !== null) {
                        handleReject(recipe.id, reason || undefined);
                      }
                    }}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipeId && recipes.has(selectedRecipeId) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <RecipeDetail
              recipe={recipes.get(selectedRecipeId)!}
              onClose={() => setSelectedRecipeId(null)}
              showActions={false}
            />
          </div>
        </div>
      )}

      {/* Recipe Edit Modal */}
      {editingRecipeId && recipes.has(editingRecipeId) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Recipe</h2>
              <button
                onClick={() => setEditingRecipeId(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <XCircle size={20} />
              </button>
            </div>
            <RecipeForm
              recipe={recipes.get(editingRecipeId)!}
              onSave={async (data) => {
                await handleSaveEdit(editingRecipeId, data);
              }}
              onCancel={() => setEditingRecipeId(null)}
              householdId={householdId}
              loading={processing.has(editingRecipeId)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
