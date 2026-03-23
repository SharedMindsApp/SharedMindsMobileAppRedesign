/**
 * Category Ordering Utility
 * 
 * Provides intelligent, relevance-based ordering for track categories
 * based on the track template being configured.
 * 
 * This is a pure client-side implementation that uses keyword matching
 * to determine relevance between templates and categories.
 */

import type { ProjectTrackCategory } from './trackCategories';
import type { AnyTrackTemplate, AnyTrackTemplateWithSubTracks } from './templateTypes';

/**
 * Common words to filter out when extracting keywords
 */
const STOP_WORDS = [
  'the', 'and', 'for', 'with', 'this', 'that',
  'from', 'into', 'over', 'under', 'about', 'are',
  'was', 'were', 'been', 'being', 'have', 'has',
  'had', 'will', 'would', 'could', 'should', 'may',
  'might', 'must', 'can', 'cannot', 'shall', 'should'
];

/**
 * Extract meaningful keywords from text
 * Removes stop words, short words, and special characters
 */
export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 2)
    .filter(w => !STOP_WORDS.includes(w));
}

/**
 * Calculate relevance score (0-1) for a category given a template
 * Higher scores indicate stronger semantic match
 * Accepts AnyTrackTemplate (with or without subtracks) since we only use name and description
 */
export function calculateCategoryRelevance(
  category: ProjectTrackCategory,
  template: AnyTrackTemplate | AnyTrackTemplateWithSubTracks
): number {
  let score = 0;

  // Combine template name and description for matching
  const templateText = `${template.name} ${template.description ?? ''}`;
  const categoryText = `${category.name} ${category.description ?? ''}`;

  // Extract keywords from both
  const templateKeywords = extractKeywords(templateText);
  const categoryKeywords = extractKeywords(categoryText);

  // Exact keyword matches (strong signal)
  for (const tk of templateKeywords) {
    for (const ck of categoryKeywords) {
      if (tk === ck) {
        score += 0.3;
      } else if (tk.includes(ck) || ck.includes(tk)) {
        score += 0.15;
      }
    }
  }

  // Strong signal: identical names (case-insensitive)
  if (category.name.toLowerCase() === template.name.toLowerCase()) {
    score = Math.max(score, 0.9);
  }

  // Mild bias toward system categories (verified defaults)
  if (category.is_system) {
    score += 0.05;
  }

  // Mild bias toward recently created custom categories (project-specific investment)
  if (!category.is_system && category.created_at) {
    const daysOld = (Date.now() - new Date(category.created_at).getTime()) / 86400000;
    if (daysOld <= 7) {
      score += 0.1;
    }
  }

  // Cap score at 1.0
  return Math.min(score, 1.0);
}

/**
 * Sort categories by relevance to a template
 * Returns categories sorted by relevance score (descending),
 * with alphabetical as a secondary sort for ties
 * Accepts AnyTrackTemplate (with or without subtracks) since we only use name and description
 */
export function sortCategoriesByRelevance(
  categories: ProjectTrackCategory[],
  template: AnyTrackTemplate | AnyTrackTemplateWithSubTracks
): ProjectTrackCategory[] {
  // If template has no meaningful text, fall back to alphabetical
  const templateText = `${template.name} ${template.description ?? ''}`.trim();
  if (!templateText) {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Calculate relevance scores and sort
  return categories
    .map(category => ({
      category,
      score: calculateCategoryRelevance(category, template),
    }))
    .sort((a, b) => {
      // Primary sort: by relevance score (descending)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Secondary sort: by name (alphabetical)
      return a.category.name.localeCompare(b.category.name);
    })
    .map(item => item.category);
}
