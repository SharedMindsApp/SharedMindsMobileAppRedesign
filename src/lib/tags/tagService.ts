/**
 * Tag Service
 * 
 * Canonical tagging service for creating and managing tags and tag links
 * across Habits, Goals, Projects, Trips, and Calendar views.
 * 
 * Principles:
 * - Tags are connections, not ownership
 * - No circular hard dependencies
 * - No data duplication
 * - Tags are many-to-many
 * - Removing a tag NEVER deletes data
 */

import { supabase } from '../supabase';

// ============================================================================
// Types
// ============================================================================

export interface Tag {
  id: string;
  owner_id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  category?: string | null; // Entity type category (goal, habit, etc.) - not shown in UI
  created_at: string;
}

export interface TagLink {
  id: string;
  tag_id: string;
  entity_type: 'habit' | 'goal' | 'project' | 'trip' | 'activity' | 'task' | 'meeting';
  entity_id: string;
  created_at: string;
}

export type EntityType = TagLink['entity_type'];

export interface CreateTagInput {
  name: string;
  color?: string;
  icon?: string;
}

// ============================================================================
// Tag CRUD Operations
// ============================================================================

/**
 * Create a new tag for a user
 */
export async function createTag(
  userId: string,
  input: CreateTagInput
): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({
      owner_id: userId,
      name: input.name.trim(),
      color: input.color || null,
      icon: input.icon || null,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (tag already exists for user)
    if (error.code === '23505') {
      throw new Error(`Tag "${input.name}" already exists`);
    }
    throw new Error(`Failed to create tag: ${error.message}`);
  }

  return data;
}

/**
 * Get all tags for a user
 */
export async function getUserTags(userId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('owner_id', userId)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  return data || [];
}

/**
 * Update a tag (only if user owns it)
 */
export async function updateTag(
  userId: string,
  tagId: string,
  updates: Partial<Pick<Tag, 'name' | 'color' | 'icon'>>
): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .update({
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.color !== undefined && { color: updates.color || null }),
      ...(updates.icon !== undefined && { icon: updates.icon || null }),
    })
    .eq('id', tagId)
    .eq('owner_id', userId) // Ensure user owns the tag
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Tag not found or you do not have permission to update it');
    }
    throw new Error(`Failed to update tag: ${error.message}`);
  }

  return data;
}

/**
 * Delete a tag (only if user owns it)
 * This will cascade delete all tag_links via foreign key constraint
 */
export async function deleteTag(userId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', tagId)
    .eq('owner_id', userId); // Ensure user owns the tag

  if (error) {
    throw new Error(`Failed to delete tag: ${error.message}`);
  }
}

// ============================================================================
// Tag Link Operations
// ============================================================================

/**
 * Add a tag to an entity
 * Silent no-op if tag link already exists
 */
export async function addTagToEntity(
  userId: string,
  tagId: string,
  entityType: EntityType,
  entityId: string
): Promise<TagLink> {
  // First verify user owns the tag
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id')
    .eq('id', tagId)
    .eq('owner_id', userId)
    .single();

  if (tagError || !tag) {
    throw new Error('Tag not found or you do not have permission to use it');
  }

  // Try to insert (will fail silently if unique constraint violation)
  const { data, error } = await supabase
    .from('tag_links')
    .insert({
      tag_id: tagId,
      entity_type: entityType,
      entity_id: entityId,
    })
    .select()
    .single();

  if (error) {
    // If unique constraint violation, tag link already exists - return existing
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('tag_links')
        .select('*')
        .eq('tag_id', tagId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .single();
      
      if (existing) {
        return existing;
      }
    }
    throw new Error(`Failed to add tag to entity: ${error.message}`);
  }

  return data!;
}

/**
 * Remove a tag from an entity
 * Silent no-op if tag link doesn't exist
 */
export async function removeTagFromEntity(
  userId: string,
  tagId: string,
  entityType: EntityType,
  entityId: string
): Promise<void> {
  // First verify user owns the tag
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id')
    .eq('id', tagId)
    .eq('owner_id', userId)
    .single();

  if (tagError || !tag) {
    throw new Error('Tag not found or you do not have permission to remove it');
  }

  const { error } = await supabase
    .from('tag_links')
    .delete()
    .eq('tag_id', tagId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    throw new Error(`Failed to remove tag from entity: ${error.message}`);
  }
}

/**
 * Get all tags for a specific entity
 */
export async function getTagsForEntity(
  entityType: EntityType,
  entityId: string
): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tag_links')
    .select(`
      tag_id,
      tags (
        id,
        owner_id,
        name,
        color,
        icon,
        category,
        created_at
      )
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    throw new Error(`Failed to fetch tags for entity: ${error.message}`);
  }

  // Extract tags from nested structure
  return (data || [])
    .map((link: any) => link.tags)
    .filter((tag: Tag | null) => tag !== null) as Tag[];
}

/**
 * Get all entities tagged with a specific tag
 */
export async function getEntitiesForTag(
  tagId: string,
  entityType?: EntityType
): Promise<Array<{ entity_type: EntityType; entity_id: string }>> {
  let query = supabase
    .from('tag_links')
    .select('entity_type, entity_id')
    .eq('tag_id', tagId);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch entities for tag: ${error.message}`);
  }

  return (data || []) as Array<{ entity_type: EntityType; entity_id: string }>;
}

/**
 * Batch add multiple tags to an entity
 */
export async function addTagsToEntity(
  userId: string,
  tagIds: string[],
  entityType: EntityType,
  entityId: string
): Promise<TagLink[]> {
  // Verify user owns all tags
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('id')
    .eq('owner_id', userId)
    .in('id', tagIds);

  if (tagsError) {
    throw new Error(`Failed to verify tag ownership: ${tagsError.message}`);
  }

  if (tags.length !== tagIds.length) {
    throw new Error('Some tags not found or you do not have permission to use them');
  }

  // Insert all tag links (ignore duplicates)
  const links = tagIds.map(tagId => ({
    tag_id: tagId,
    entity_type: entityType,
    entity_id: entityId,
  }));

  const { data, error } = await supabase
    .from('tag_links')
    .upsert(links, {
      onConflict: 'tag_id,entity_type,entity_id',
      ignoreDuplicates: true,
    })
    .select();

  if (error) {
    throw new Error(`Failed to add tags to entity: ${error.message}`);
  }

  return data || [];
}

/**
 * Batch remove multiple tags from an entity
 */
export async function removeTagsFromEntity(
  userId: string,
  tagIds: string[],
  entityType: EntityType,
  entityId: string
): Promise<void> {
  // Verify user owns all tags
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('id')
    .eq('owner_id', userId)
    .in('id', tagIds);

  if (tagsError) {
    throw new Error(`Failed to verify tag ownership: ${tagsError.message}`);
  }

  if (tags.length !== tagIds.length) {
    throw new Error('Some tags not found or you do not have permission to remove them');
  }

  const { error } = await supabase
    .from('tag_links')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .in('tag_id', tagIds);

  if (error) {
    throw new Error(`Failed to remove tags from entity: ${error.message}`);
  }
}

