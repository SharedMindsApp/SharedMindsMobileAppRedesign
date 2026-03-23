/**
 * Low-Friction Mood Tracker Entry Form
 * 
 * Emotion-first, fast check-in interface for mood tracking.
 * Uses emojis and emotion words instead of numeric scales.
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import type { Tracker, TrackerEntry, TrackerFieldSchema } from '../../lib/trackerStudio/types';
import type { TrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';
import { getEmotionWordsForMood } from '../../lib/trackerStudio/emotionWords';

type MoodTrackerEntryFormProps = {
  tracker: Tracker;
  entryDate: string;
  existingEntry?: TrackerEntry | null;
  onEntrySaved: () => void;
  readOnly?: boolean;
  theme: TrackerTheme;
  onSave: (fieldValues: Record<string, string | number | boolean | null>, notes: string) => Promise<void>;
  loading: boolean;
};

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];
const MOOD_LABELS = ['', '', '', '', '']; // No evaluative labels

export function MoodTrackerEntryForm({
  tracker,
  entryDate,
  existingEntry,
  onEntrySaved,
  readOnly = false,
  theme,
  onSave,
  loading,
}: MoodTrackerEntryFormProps) {
  // Find the mood rating field
  const moodField = tracker.field_schema_snapshot.find(
    field => field.type === 'rating' && 
    (field.label.toLowerCase().includes('mood') || field.label.toLowerCase().includes('feeling'))
  ) || tracker.field_schema_snapshot.find(field => field.type === 'rating');

  const [moodLevel, setMoodLevel] = useState<number | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean | null>>({});
  const [error, setError] = useState<string | null>(null);

  // Initialize from existing entry
  useEffect(() => {
    if (existingEntry) {
      const moodValue = moodField ? existingEntry.field_values[moodField.id] as number : null;
      setMoodLevel(moodValue || null);
      
      // Extract emotions from field_values (primary source) or notes (fallback)
      const emotionsFromField = existingEntry.field_values['_emotion_words'];
      if (emotionsFromField) {
        if (Array.isArray(emotionsFromField)) {
          setSelectedEmotions(emotionsFromField);
        } else if (typeof emotionsFromField === 'string') {
          setSelectedEmotions(emotionsFromField.split(',').map(e => e.trim()).filter(Boolean));
        }
      }
      
      // Extract notes (remove emotions line if present)
      const notesText = existingEntry.notes || '';
      const notesWithoutEmotions = notesText.replace(/Emotions:.*$/m, '').trim();
      setNotes(notesWithoutEmotions);
      setShowNotes(!!notesWithoutEmotions);
      setFieldValues(existingEntry.field_values);
    } else {
      // Initialize field values with entry_date if required
      const dateField = tracker.field_schema_snapshot.find(f => f.id === 'entry_date' || f.type === 'date');
      const initialFieldValues: Record<string, string | number | boolean | null> = {};
      if (dateField) {
        initialFieldValues[dateField.id] = entryDate;
      }
      setFieldValues(initialFieldValues);
      setMoodLevel(null);
      setSelectedEmotions([]);
      setNotes('');
      setShowNotes(false);
    }
  }, [existingEntry, moodField, tracker, entryDate]);

  const handleMoodSelect = (level: number) => {
    if (readOnly) return;
    setMoodLevel(level);
    setSelectedEmotions([]); // Reset emotions when mood changes
    setError(null);
    
    // Update field values
    if (moodField) {
      setFieldValues(prev => ({ ...prev, [moodField.id]: level }));
    }
  };

  const handleEmotionToggle = (emotion: string) => {
    if (readOnly) return;
    setSelectedEmotions(prev => {
      if (prev.includes(emotion)) {
        return prev.filter(e => e !== emotion);
      } else if (prev.length < 3) {
        return [...prev, emotion];
      }
      return prev; // Max 3 emotions
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!moodLevel || !moodField) {
      setError('Please select how you\'re feeling');
      return;
    }

    try {
      // Find date and time_of_day fields if they exist in schema
      const dateField = tracker.field_schema_snapshot.find(f => f.id === 'entry_date' || f.type === 'date');
      const timeOfDayField = tracker.field_schema_snapshot.find(f => f.id === 'time_of_day');
      
      // Get current time of day (e.g., "Morning", "Afternoon", "Evening", "Night")
      const now = new Date();
      const hour = now.getHours();
      let timeOfDayLabel = '';
      if (hour >= 5 && hour < 12) {
        timeOfDayLabel = 'Morning';
      } else if (hour >= 12 && hour < 17) {
        timeOfDayLabel = 'Afternoon';
      } else if (hour >= 17 && hour < 21) {
        timeOfDayLabel = 'Evening';
      } else {
        timeOfDayLabel = 'Night';
      }
      
      // Prepare field values
      const finalFieldValues: Record<string, string | number | boolean | null> = {
        ...fieldValues,
        [moodField.id]: moodLevel,
      };
      
      // Include entry_date field if it exists in schema and is required
      if (dateField) {
        finalFieldValues[dateField.id] = entryDate;
      }
      
      // Automatically set time_of_day if field exists in schema
      if (timeOfDayField) {
        finalFieldValues[timeOfDayField.id] = timeOfDayLabel;
      }

      // Store emotions in field_values as structured data for analytics
      // Use a special key that won't conflict with schema fields
      if (selectedEmotions.length > 0) {
        finalFieldValues['_emotion_words'] = selectedEmotions;
      } else {
        // Remove emotion words if none selected
        delete finalFieldValues['_emotion_words'];
      }

      // Also store in notes for human readability (optional, for display)
      let finalNotes = notes;
      if (selectedEmotions.length > 0) {
        const emotionsText = `Emotions: ${selectedEmotions.join(', ')}`;
        if (finalNotes.trim()) {
          finalNotes = `${finalNotes}\n\n${emotionsText}`;
        } else {
          finalNotes = emotionsText;
        }
      }

      await onSave(finalFieldValues, finalNotes);
      onEntrySaved();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save entry';
      
      // Prepare field values for logging (reconstruct if needed)
      const loggedFieldValues: Record<string, string | number | boolean | null> = {
        ...fieldValues,
        [moodField.id]: moodLevel,
      };
      if (selectedEmotions.length > 0) {
        loggedFieldValues['_emotion_words'] = selectedEmotions;
      }
      
      console.error('[MoodTrackerEntryForm] Save failed:', {
        trackerId: tracker.id,
        trackerName: tracker.name,
        entryDate,
        moodLevel,
        selectedEmotions,
        fieldValues: loggedFieldValues,
        error: errorMessage,
        errorStack: err instanceof Error ? err.stack : undefined,
      });
      setError(errorMessage);
    }
  };

  const availableEmotions = moodLevel ? getEmotionWordsForMood(moodLevel) : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Mood Selection - Primary Action */}
      <div className="text-center">
        <label className="block text-lg font-semibold text-gray-900 mb-6">
          How are you feeling?
        </label>
        
        <div className="flex justify-center gap-3 sm:gap-4">
          {MOOD_EMOJIS.map((emoji, index) => {
            const level = index + 1;
            const isSelected = moodLevel === level;
            
            return (
              <button
                key={level}
                type="button"
                onClick={() => handleMoodSelect(level)}
                disabled={readOnly}
                className={`
                  w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 transition-all
                  flex items-center justify-center text-4xl sm:text-5xl
                  ${isSelected 
                    ? `${theme.buttonBg} border-transparent shadow-lg scale-110` 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md active:scale-95'
                  }
                  ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                aria-label={`Mood level ${level}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      {/* Emotion Words - Dynamic Selection */}
      {moodLevel && availableEmotions.length > 0 && (
        <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${theme.borderColor} animate-in fade-in slide-in-from-top-2`}>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            What words describe this? <span className="text-gray-500 font-normal">(optional, up to 3)</span>
          </label>
          
          <div className="flex flex-wrap gap-2">
            {availableEmotions.map(emotion => {
              const isSelected = selectedEmotions.includes(emotion);
              
              return (
                <button
                  key={emotion}
                  type="button"
                  onClick={() => handleEmotionToggle(emotion)}
                  disabled={readOnly || (!isSelected && selectedEmotions.length >= 3)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${isSelected
                      ? `${theme.buttonBg} text-white shadow-md`
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
                    }
                    ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${!isSelected && selectedEmotions.length >= 3 ? 'opacity-40' : ''}
                  `}
                >
                  {emotion}
                </button>
              );
            })}
          </div>
          
          {selectedEmotions.length > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Selected:</p>
              <div className="flex flex-wrap gap-2">
                {selectedEmotions.map(emotion => (
                  <span
                    key={emotion}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${theme.buttonBg} text-white rounded-full text-sm font-medium`}
                  >
                    {emotion}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleEmotionToggle(emotion)}
                        className="hover:bg-white/20 rounded-full p-0.5"
                        aria-label={`Remove ${emotion}`}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes - Collapsible */}
      <div>
        {!showNotes ? (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            disabled={readOnly}
            className={`w-full ${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-4 text-left transition-all hover:shadow-md ${
              readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Add a note <span className="text-gray-500">(optional)</span>
              </span>
              <Plus size={18} className="text-gray-400" />
            </div>
          </button>
        ) : (
          <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${theme.borderColor}`}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-900">
                Note <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNotes(false);
                    setNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Hide notes"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={readOnly || loading}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base bg-white disabled:bg-gray-50"
              placeholder="Anything you want to add?"
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      {readOnly ? (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-6 text-center`}>
          <p className={`text-sm ${theme.accentText} font-medium`}>You have read-only access to this tracker</p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={loading || !moodLevel}
          className={`w-full px-6 py-4 ${theme.buttonBg} ${theme.buttonHover} text-white rounded-xl hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[52px] text-base shadow-md flex items-center justify-center gap-3`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{existingEntry ? 'Update Entry' : 'Save Entry'}</span>
          )}
        </button>
      )}
    </form>
  );
}
