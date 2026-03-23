/**
 * Hooks for tag-based filtering and discovery
 * 
 * Enables:
 * - "Show all habits related to this trip"
 * - "Show all goals related to this project"
 * - "Why am I doing this habit?" answers
 */

import { useState, useEffect } from 'react';
import {
  getEntitiesForTag,
  getTagsForEntity,
  type EntityType,
} from '../lib/tags/tagService';
import { FEATURE_CONTEXT_TAGGING } from '../lib/featureFlags';

// ============================================================================
// useTaggedEntities Hook
// ============================================================================

/**
 * Get all entities tagged with a specific tag
 * 
 * @param tagId - The tag ID to filter by
 * @param entityType - Optional entity type filter
 * @returns Array of { entity_type, entity_id } pairs
 */
export function useTaggedEntities(
  tagId: string | null,
  entityType?: EntityType
) {
  const [entities, setEntities] = useState<
    Array<{ entity_type: EntityType; entity_id: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!FEATURE_CONTEXT_TAGGING || !tagId) {
      setEntities([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadEntities() {
      try {
        setLoading(true);
        setError(null);
        const result = await getEntitiesForTag(tagId, entityType);
        if (!cancelled) {
          setEntities(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load tagged entities'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEntities();

    return () => {
      cancelled = true;
    };
  }, [tagId, entityType]);

  return { entities, loading, error };
}

// ============================================================================
// useEntityTags Hook
// ============================================================================

/**
 * Get all tags for a specific entity
 * 
 * @param entityType - The type of entity
 * @param entityId - The ID of the entity
 * @returns Array of tags
 */
export function useEntityTags(
  entityType: EntityType | null,
  entityId: string | null
) {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!FEATURE_CONTEXT_TAGGING || !entityType || !entityId) {
      setTags([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadTags() {
      try {
        setLoading(true);
        setError(null);
        const result = await getTagsForEntity(entityType, entityId);
        if (!cancelled) {
          setTags(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load entity tags'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTags();

    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  return { tags, loading, error };
}






