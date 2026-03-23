/**
 * Quick Log Emoji Mapping
 * 
 * Maps quick log button labels (category and subcategory names) to emojis
 * Used for quick log buttons instead of icons
 */

import { getSportEmoji } from './sportEmojis';

/**
 * Category name to emoji mapping for main activity categories
 */
const CATEGORY_EMOJIS: Record<string, string> = {
  'Gym Sessions': '💪',
  'Running Sessions': '🏃',
  'Cycling Sessions': '🚴',
  'Swimming Sessions': '🏊',
  'Team Sports': '👥',
  'Individual Sports': '🎯',
  'Martial Arts': '🥋',
  'Yoga / Mobility': '🧘',
  'Rehab / Physio': '❤️',
  'Other Movement': '➕',
};

/**
 * Get emoji for a quick log button based on its label
 * Falls back to sport emoji if label matches a sport
 */
export function getQuickLogEmoji(label: string): string {
  // First check category emojis
  if (CATEGORY_EMOJIS[label]) {
    return CATEGORY_EMOJIS[label];
  }
  
  // Then check sport emojis (covers subcategory buttons for sports)
  const sportEmoji = getSportEmoji(label);
  if (sportEmoji !== '⚪') { // Default fallback emoji
    return sportEmoji;
  }
  
  // Fallback to category emoji if label contains category keywords
  const labelLower = label.toLowerCase();
  if (labelLower.includes('gym') || labelLower.includes('workout')) return '💪';
  if (labelLower.includes('run') || labelLower.includes('walk')) return '🏃';
  if (labelLower.includes('cycle') || labelLower.includes('bike')) return '🚴';
  if (labelLower.includes('swim')) return '🏊';
  if (labelLower.includes('yoga') || labelLower.includes('mobility')) return '🧘';
  if (labelLower.includes('rehab') || labelLower.includes('physio')) return '❤️';
  if (labelLower.includes('martial') || labelLower.includes('combat')) return '🥋';
  
  // Default fallback
  return '⚪';
}
