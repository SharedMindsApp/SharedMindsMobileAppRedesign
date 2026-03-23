/**
 * Tag Auto-Generation Service
 * 
 * Automatically generates tags with category-based colors for entities.
 * Categories: goal, habit, project, trip, task, meeting, event, etc.
 */

import { createTag, getUserTags, addTagsToEntity, type EntityType } from './tagService';
import { getCategoryColor, DEFAULT_CATEGORY_COLORS } from './categoryColorSettings';

// ============================================================================
// Category Color Mapping
// ============================================================================

/**
 * Get color for a category (uses user settings if userId provided, otherwise defaults)
 */
export async function getColorForCategory(category: string, userId?: string): Promise<string> {
  if (userId) {
    try {
      return await getCategoryColor(userId, category as any);
    } catch (err) {
      console.error('[tagAutoGeneration] Error fetching category color:', err);
      // Fall through to defaults
    }
  }
  // Use defaults
  return DEFAULT_CATEGORY_COLORS[category.toLowerCase() as keyof typeof DEFAULT_CATEGORY_COLORS] || 'gray';
}

/**
 * Synchronous version for backwards compatibility (uses defaults only)
 */
export function getColorForCategorySync(category: string): string {
  return DEFAULT_CATEGORY_COLORS[category.toLowerCase() as keyof typeof DEFAULT_CATEGORY_COLORS] || 'gray';
}

// ============================================================================
// Tag Auto-Generation
// ============================================================================

/**
 * Auto-generate or find existing tag with category and color
 * Extracts keywords from title/description and creates tags
 */
export async function autoGenerateTags(
  userId: string,
  entityType: EntityType,
  title: string,
  description?: string
): Promise<string[]> {
  // Extract keywords from title and description
  const keywords = extractKeywords(title, description);
  
  if (keywords.length === 0) {
    return [];
  }

  const category = entityType;
  const color = await getColorForCategory(category, userId);
  const tagIds: string[] = [];

  // Get existing user tags
  const existingTags = await getUserTags(userId);
  const existingTagMap = new Map(existingTags.map(t => [t.name.toLowerCase(), t]));

  // Create or find tags for each keyword
  for (const keyword of keywords) {
    const tagName = keyword;
    const lowerName = tagName.toLowerCase();
    
    // Check if tag already exists
    let tag = existingTagMap.get(lowerName);
    
    if (!tag) {
      // Create new tag with category and color
      try {
        tag = await createTag(userId, {
          name: tagName,
          color: color,
          // category will be set via direct update (since it's not in CreateTagInput yet)
        });
        
        // Update tag with category (if column exists)
        // Note: This requires the migration to be applied
        try {
          const { supabase } = await import('../supabase');
          await supabase
            .from('tags')
            .update({ category })
            .eq('id', tag.id)
            .eq('owner_id', userId);
        } catch (err) {
          // Category column might not exist yet, ignore
          console.warn('[tagAutoGeneration] Category update failed (column may not exist):', err);
        }
        
        existingTagMap.set(lowerName, tag);
      } catch (err: any) {
        // Tag might have been created by another process, try to fetch it
        if (err.message?.includes('already exists')) {
          const tags = await getUserTags(userId);
          tag = tags.find(t => t.name.toLowerCase() === lowerName);
          if (tag) {
            existingTagMap.set(lowerName, tag);
          }
        } else {
          console.error('[tagAutoGeneration] Error creating tag:', err);
          continue;
        }
      }
    }
    
    if (tag) {
      tagIds.push(tag.id);
    }
  }

  return tagIds;
}

/**
 * Extract keywords from title and description
 * Simple keyword extraction - can be enhanced with NLP later
 */
function extractKeywords(title: string, description?: string): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Common words to ignore
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'get', 'got', 'want', 'need', 'make', 'take', 'go', 'come', 'see',
    'know', 'think', 'say', 'tell', 'ask', 'work', 'call', 'try', 'use',
    'find', 'give', 'keep', 'let', 'put', 'set', 'turn', 'move', 'play',
    'run', 'walk', 'start', 'stop', 'end', 'begin', 'finish', 'complete',
    'again', 'more', 'very', 'much', 'many', 'some', 'any', 'all', 'each',
    'every', 'other', 'another', 'such', 'only', 'just', 'also', 'even',
    'still', 'yet', 'already', 'now', 'then', 'here', 'there', 'where',
    'when', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose',
  ]);
  
  // Extract words (alphanumeric sequences)
  const words = text.match(/\b[a-z]+\b/g) || [];
  
  // Filter out stop words and short words
  const keywords = words
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter((word, index, self) => self.indexOf(word) === index) // unique
    .slice(0, 5); // Limit to top 5 keywords
  
  return keywords.map(word => capitalizeFirst(word));
}

/**
 * Capitalize first letter of word
 */
function capitalizeFirst(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Auto-generate tags and link them to an entity
 */
export async function autoGenerateAndLinkTags(
  userId: string,
  entityType: EntityType,
  entityId: string,
  title: string,
  description?: string
): Promise<string[]> {
  const tagIds = await autoGenerateTags(userId, entityType, title, description);
  
  if (tagIds.length > 0) {
    try {
      await addTagsToEntity(userId, tagIds, entityType, entityId);
    } catch (err) {
      console.error('[tagAutoGeneration] Error linking auto-generated tags:', err);
    }
  }
  
  return tagIds;
}

