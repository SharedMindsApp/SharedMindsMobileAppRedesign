/**
 * RecipeFeedback - Component for submitting and viewing recipe feedback
 * 
 * Optional feedback system - no pressure, positive-first design
 * Phase 6: Learning & Analytics
 */

import { useState, useEffect } from 'react';
import { Star, Save, X, Loader2, CheckCircle2 } from 'lucide-react';
import { 
  submitFeedback,
  getUserFeedback,
  getRecipeFeedbackStats,
  deleteFeedback,
  type RecipeFeedback,
  type FeedbackTag,
  type CreateFeedbackInput,
} from '../../lib/recipeFeedbackService';
import { useAuth } from '../../contexts/AuthContext';
import type { Recipe } from '../../lib/recipeGeneratorTypes';

interface RecipeFeedbackProps {
  recipe: Recipe;
  householdId?: string;
  onFeedbackSubmitted?: () => void;
}

const FEEDBACK_TAGS: { value: FeedbackTag; label: string; icon: string }[] = [
  { value: 'loved_it', label: 'Loved it', icon: '❤️' },
  { value: 'worked_well', label: 'Worked well', icon: '✅' },
  { value: 'will_make_again', label: 'Will make again', icon: '🔄' },
  { value: 'quick_and_easy', label: 'Quick & easy', icon: '⚡' },
  { value: 'family_favorite', label: 'Family favorite', icon: '👨‍👩‍👧‍👦' },
  { value: 'too_complex', label: 'Too complex', icon: '😓' },
  { value: 'too_simple', label: 'Too simple', icon: '🤷' },
  { value: 'needed_help', label: 'Needed help', icon: '❓' },
];

export function RecipeFeedback({
  recipe,
  householdId,
  onFeedbackSubmitted,
}: RecipeFeedbackProps) {
  const { user } = useAuth();
  const [userFeedback, setUserFeedback] = useState<RecipeFeedback | null>(null);
  const [stats, setStats] = useState<{
    total_feedback: number;
    average_rating: number | null;
    rating_count: number;
    tag_counts: Record<FeedbackTag, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);

  // Form state
  const [rating, setRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<FeedbackTag[]>([]);
  const [notes, setNotes] = useState('');
  const [madeOnDate, setMadeOnDate] = useState('');
  const [madeWithModifications, setMadeWithModifications] = useState(false);
  const [modificationsNotes, setModificationsNotes] = useState('');

  useEffect(() => {
    loadFeedback();
  }, [recipe.id, user]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      if (user) {
        const feedback = await getUserFeedback(recipe.id, user.id);
        setUserFeedback(feedback);
        
        if (feedback) {
          setRating(feedback.rating);
          setSelectedTags(feedback.feedback_tags || []);
          setNotes(feedback.notes || '');
          setMadeOnDate(feedback.made_on_date || '');
          setMadeWithModifications(feedback.made_with_modifications);
          setModificationsNotes(feedback.modifications_notes || '');
        }
      }
      
      const feedbackStats = await getRecipeFeedbackStats(recipe.id);
      setStats(feedbackStats);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const input: CreateFeedbackInput = {
        recipe_id: recipe.id,
        rating: rating || undefined,
        feedback_tags: selectedTags.length > 0 ? selectedTags : undefined,
        notes: notes.trim() || undefined,
        made_on_date: madeOnDate || undefined,
        made_with_modifications: madeWithModifications,
        modifications_notes: modificationsNotes.trim() || undefined,
      };

      await submitFeedback(input, user.id, householdId);
      await loadFeedback();
      
      setShowForm(false);
      setEditing(false);
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !userFeedback) return;
    
    if (!confirm('Are you sure you want to delete your feedback?')) {
      return;
    }

    setSaving(true);
    try {
      await deleteFeedback(recipe.id, user.id);
      await loadFeedback();
      
      // Reset form
      setRating(null);
      setSelectedTags([]);
      setNotes('');
      setMadeOnDate('');
      setMadeWithModifications(false);
      setModificationsNotes('');
      setShowForm(false);
      setEditing(false);
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Failed to delete feedback. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: FeedbackTag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-orange-500" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Display */}
      {stats && stats.total_feedback > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-6">
            {stats.average_rating !== null && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      className={star <= Math.round(stats.average_rating!)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                      }
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {stats.average_rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">
                  ({stats.rating_count} rating{stats.rating_count !== 1 ? 's' : ''})
                </span>
              </div>
            )}
            <div className="text-sm text-gray-600">
              {stats.total_feedback} feedback{stats.total_feedback !== 1 ? ' entries' : ' entry'}
            </div>
          </div>

          {/* Popular Tags */}
          {Object.values(stats.tag_counts).some(count => count > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {FEEDBACK_TAGS.map(tag => {
                const count = stats.tag_counts[tag.value];
                if (count === 0) return null;
                return (
                  <div
                    key={tag.value}
                    className="flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs border border-gray-200"
                  >
                    <span>{tag.icon}</span>
                    <span className="text-gray-700">{tag.label}</span>
                    <span className="text-gray-500">({count})</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* User Feedback Status */}
      {userFeedback && !showForm && !editing && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="text-green-600" size={18} />
                <span className="font-medium text-green-900">You've given feedback</span>
              </div>
              {userFeedback.rating && (
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={star <= userFeedback.rating!
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                      }
                    />
                  ))}
                </div>
              )}
              {userFeedback.feedback_tags && userFeedback.feedback_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {userFeedback.feedback_tags.map(tag => {
                    const tagInfo = FEEDBACK_TAGS.find(t => t.value === tag);
                    if (!tagInfo) return null;
                    return (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-white rounded text-xs border border-green-200"
                      >
                        {tagInfo.icon} {tagInfo.label}
                      </span>
                    );
                  })}
                </div>
              )}
              {userFeedback.notes && (
                <p className="text-sm text-gray-700 mt-2">{userFeedback.notes}</p>
              )}
            </div>
            <button
              onClick={() => {
                setEditing(true);
                setShowForm(true);
              }}
              className="text-sm text-green-700 hover:text-green-800 font-medium"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Feedback Form */}
      {(showForm || (!userFeedback && user)) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {editing ? 'Edit Your Feedback' : 'Share Your Experience'}
            </h3>
            {showForm && (
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-4">
            All feedback is optional. Share what you'd like, when you'd like.
          </p>

          <div className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating (optional)
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? null : star)}
                    className="focus:outline-none"
                  >
                    <Star
                      size={32}
                      className={
                        rating && star <= rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300 hover:text-yellow-300'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAGS.map(tag => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedTags.includes(tag.value)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1">{tag.icon}</span>
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Share your thoughts, modifications, or tips..."
              />
            </div>

            {/* Made Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                When did you make this? (optional)
              </label>
              <input
                type="date"
                value={madeOnDate}
                onChange={(e) => setMadeOnDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Modifications */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={madeWithModifications}
                  onChange={(e) => setMadeWithModifications(e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                Made with modifications
              </label>
              {madeWithModifications && (
                <textarea
                  value={modificationsNotes}
                  onChange={(e) => setModificationsNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="What did you change?"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {userFeedback && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 border-2 border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Feedback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Form Button (if no feedback yet) */}
      {!userFeedback && !showForm && user && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-colors font-medium"
        >
          Share Your Experience (Optional)
        </button>
      )}

      {!user && (
        <p className="text-sm text-gray-500 text-center py-4">
          Sign in to share feedback about this recipe
        </p>
      )}
    </div>
  );
}
