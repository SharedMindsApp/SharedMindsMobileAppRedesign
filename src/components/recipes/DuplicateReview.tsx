/**
 * DuplicateReview - Component for reviewing and merging duplicate recipes
 * 
 * Shows side-by-side comparison, highlights differences, and allows merge/keep separate actions
 * Phase 5: Duplicate Detection
 */

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  GitMerge, 
  X, 
  Loader2,
  Users,
  Clock,
  ChefHat
} from 'lucide-react';
import { 
  getUnresolvedDuplicates,
  mergeRecipes,
  rejectDuplicate,
  type RecipeDuplicateWithDetails 
} from '../../lib/recipeDuplicateService';
import { RecipeDetail } from './RecipeDetail';
import { useAuth } from '../../contexts/AuthContext';

interface DuplicateReviewProps {
  onDuplicateResolved?: (duplicateId: string) => void;
  limit?: number;
}

export function DuplicateReview({
  onDuplicateResolved,
  limit = 50,
}: DuplicateReviewProps) {
  const { user } = useAuth();
  const [duplicates, setDuplicates] = useState<RecipeDuplicateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDuplicate, setSelectedDuplicate] = useState<RecipeDuplicateWithDetails | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<{ id: string; side: 'primary' | 'duplicate' } | null>(null);
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDuplicates();
  }, []);

  const loadDuplicates = async () => {
    setLoading(true);
    try {
      const data = await getUnresolvedDuplicates(limit);
      setDuplicates(data);
    } catch (error) {
      console.error('Error loading duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async (duplicate: RecipeDuplicateWithDetails) => {
    if (!user) return;

    setProcessing(prev => new Set(prev).add(duplicate.id));
    try {
      await mergeRecipes(
        duplicate.primary_recipe_id,
        duplicate.duplicate_recipe_id,
        user.id
      );

      await loadDuplicates();
      
      if (onDuplicateResolved) {
        onDuplicateResolved(duplicate.id);
      }

      if (selectedDuplicate?.id === duplicate.id) {
        setSelectedDuplicate(null);
      }
    } catch (error) {
      console.error('Error merging recipes:', error);
      alert('Failed to merge recipes. Please try again.');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(duplicate.id);
        return next;
      });
    }
  };

  const handleReject = async (duplicate: RecipeDuplicateWithDetails, notes?: string) => {
    if (!user) return;

    setProcessing(prev => new Set(prev).add(duplicate.id));
    try {
      await rejectDuplicate(
        duplicate.primary_recipe_id,
        duplicate.duplicate_recipe_id,
        user.id,
        notes
      );

      await loadDuplicates();
      
      if (onDuplicateResolved) {
        onDuplicateResolved(duplicate.id);
      }

      if (selectedDuplicate?.id === duplicate.id) {
        setSelectedDuplicate(null);
      }
    } catch (error) {
      console.error('Error rejecting duplicate:', error);
      alert('Failed to reject duplicate. Please try again.');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(duplicate.id);
        return next;
      });
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.75) return 'text-yellow-600';
    return 'text-orange-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-orange-500" size={24} />
        <span className="ml-2 text-gray-600">Loading duplicates...</span>
      </div>
    );
  }

  if (duplicates.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No duplicates found</h3>
        <p className="text-gray-600">All recipe duplicates have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Duplicate Review</h2>
          <p className="text-sm text-gray-600 mt-1">
            {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''} need{duplicates.length === 1 ? 's' : ''} review
          </p>
        </div>
      </div>

      {/* Duplicate List */}
      <div className="space-y-6">
        {duplicates.map(duplicate => {
          const primary = duplicate.primary_recipe;
          const dup = duplicate.duplicate_recipe;
          
          if (!primary || !dup) return null;

          const isProcessing = processing.has(duplicate.id);
          const similarity = duplicate.similarity_score;

          return (
            <div
              key={duplicate.id}
              className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm"
            >
              {/* Header with similarity score */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-orange-500" size={20} />
                  <span className={`text-lg font-semibold ${getSimilarityColor(similarity)}`}>
                    {Math.round(similarity * 100)}% Similar
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(duplicate.detection_confidence)}`}>
                    {duplicate.detection_confidence} confidence
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {duplicate.detection_method.replace('_', ' ')}
                </div>
              </div>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Primary Recipe */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Primary Recipe</h3>
                    <button
                      onClick={() => setViewingRecipe({ id: primary.id, side: 'primary' })}
                      className="text-sm text-orange-600 hover:text-orange-700"
                    >
                      View Details
                    </button>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{primary.name}</h4>
                  {primary.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{primary.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {primary.total_time && (
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {primary.total_time} min
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users size={12} />
                      {primary.servings} servings
                    </div>
                    {primary.difficulty && (
                      <div className="flex items-center gap-1">
                        <ChefHat size={12} />
                        {primary.difficulty}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                    <strong>Ingredients:</strong> {primary.ingredients.length}
                  </div>
                </div>

                {/* Duplicate Recipe */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Potential Duplicate</h3>
                    <button
                      onClick={() => setViewingRecipe({ id: dup.id, side: 'duplicate' })}
                      className="text-sm text-orange-600 hover:text-orange-700"
                    >
                      View Details
                    </button>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{dup.name}</h4>
                  {dup.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{dup.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {dup.total_time && (
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {dup.total_time} min
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users size={12} />
                      {dup.servings} servings
                    </div>
                    {dup.difficulty && (
                      <div className="flex items-center gap-1">
                        <ChefHat size={12} />
                        {dup.difficulty}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                    <strong>Ingredients:</strong> {dup.ingredients.length}
                  </div>
                </div>
              </div>

              {/* Similarity Details */}
              {duplicate.similarity_details && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {duplicate.similarity_details.name_similarity !== undefined && (
                      <div>
                        <span className="text-gray-600">Name Similarity:</span>{' '}
                        <span className="font-semibold">
                          {Math.round(duplicate.similarity_details.name_similarity * 100)}%
                        </span>
                      </div>
                    )}
                    {duplicate.similarity_details.ingredient_similarity !== undefined && (
                      <div>
                        <span className="text-gray-600">Ingredient Similarity:</span>{' '}
                        <span className="font-semibold">
                          {Math.round(duplicate.similarity_details.ingredient_similarity * 100)}%
                        </span>
                      </div>
                    )}
                    {duplicate.similarity_details.matching_ingredients && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Matching Ingredients:</span>{' '}
                        <span className="font-semibold">
                          {duplicate.similarity_details.matching_ingredients.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleMerge(duplicate)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <GitMerge size={16} />
                      Merge Duplicate
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const notes = prompt('Reason for keeping separate (optional):');
                    if (notes !== null) {
                      handleReject(duplicate, notes || undefined);
                    }
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  Keep Separate
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Merging will combine the duplicate into the primary recipe and deprecate the duplicate.
              </p>
            </div>
          );
        })}
      </div>

      {/* Recipe Detail Modal */}
      {viewingRecipe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {viewingRecipe.side === 'primary' ? 'Primary Recipe' : 'Duplicate Recipe'}
              </h3>
              <button
                onClick={() => setViewingRecipe(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {(() => {
                const duplicate = duplicates.find(d => 
                  (viewingRecipe.side === 'primary' ? d.primary_recipe_id : d.duplicate_recipe_id) === viewingRecipe.id
                );
                const recipe = viewingRecipe.side === 'primary' 
                  ? duplicate?.primary_recipe 
                  : duplicate?.duplicate_recipe;
                
                if (!recipe) return null;
                
                return <RecipeDetail recipe={recipe} showActions={false} />;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
