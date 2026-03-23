/**
 * Emotion Words for Mood Tracking
 * 
 * Provides emotion word lists based on mood level (1-5).
 * Used for dynamic emotion selection in mood trackers.
 */

export const EMOTION_WORDS: Record<number, string[]> = {
  1: [
    'sad', 'drained', 'overwhelmed', 'lonely', 'anxious', 'frustrated',
    'exhausted', 'stressed', 'worried', 'disappointed', 'hurt', 'empty'
  ],
  2: [
    'low', 'tired', 'uneasy', 'restless', 'uncertain', 'foggy',
    'unsettled', 'heavy', 'stuck', 'distant', 'numb', 'off'
  ],
  3: [
    'neutral', 'flat', 'okay', 'steady', 'calm', 'fine',
    'balanced', 'present', 'grounded', 'even', 'stable', 'content'
  ],
  4: [
    'calm', 'content', 'hopeful', 'relaxed', 'peaceful', 'grateful',
    'light', 'present', 'comfortable', 'satisfied', 'at ease', 'centered'
  ],
  5: [
    'joyful', 'energized', 'excited', 'grateful', 'inspired', 'confident',
    'peaceful', 'loved', 'fulfilled', 'optimistic', 'radiant', 'alive'
  ],
};

/**
 * Get emotion words for a given mood level
 */
export function getEmotionWordsForMood(moodLevel: number | null): string[] {
  if (!moodLevel || moodLevel < 1 || moodLevel > 5) {
    return [];
  }
  return EMOTION_WORDS[moodLevel] || [];
}

/**
 * Check if a tracker is a mood tracker based on its name or fields
 */
export function isMoodTracker(trackerName: string, fieldSchema: Array<{ label: string; type: string }>): boolean {
  const name = trackerName.toLowerCase();
  if (name.includes('mood')) {
    return true;
  }
  
  // Check if it has a rating field labeled as mood
  const hasMoodField = fieldSchema.some(
    field => field.type === 'rating' && 
    (field.label.toLowerCase().includes('mood') || field.label.toLowerCase().includes('feeling'))
  );
  
  return hasMoodField;
}

/**
 * Check if a tracker should use low-friction UX patterns
 */
export function shouldUseLowFrictionUX(trackerName: string, fieldSchema: Array<{ label: string; type: string }>): boolean {
  const name = trackerName.toLowerCase();
  
  // Trackers that benefit from low-friction UX
  const lowFrictionTrackers = [
    'mood', 'energy', 'stress', 'sleep', 'water', 'hydration',
    'gratitude', 'meditation', 'mindfulness', 'habit'
  ];
  
  return lowFrictionTrackers.some(keyword => name.includes(keyword));
}
