import { supabase } from './supabase';
import {
  ExternalLink,
  ExternalLinkWithTags,
  LinkTag,
  CreateExternalLinkParams,
  UpdateExternalLinkParams,
  LinkMetadata,
} from './externalLinksTypes';

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

/**
 * Fetch metadata from a URL using the edge function
 * Supports YouTube videos, Open Graph tags, and dead link detection
 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const domain = extractDomain(url);

  try {
    // Get the user's session token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        title: url,
        domain,
        is_valid: false,
        error: 'Not authenticated',
      };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-link-metadata`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ url }),
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch metadata:', response.status, response.statusText);
      return {
        title: url,
        domain,
        is_valid: false,
        error: 'Failed to fetch metadata',
      };
    }

    const result = await response.json();

    // Handle the new response format { ok: true, data: metadata }
    if (result.ok && result.data) {
      return result.data;
    }

    // Handle error response { ok: false, error: string }
    if (!result.ok) {
      return {
        title: url,
        domain,
        is_valid: false,
        error: result.error || 'Failed to fetch metadata',
      };
    }

    // Fallback for old format
    return result;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return {
      title: url,
      domain,
      is_valid: false,
      error: 'Network error',
    };
  }
}

/**
 * Create a new external link
 */
export async function createExternalLink(
  params: CreateExternalLinkParams
): Promise<ExternalLink | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('external_links')
    .insert({
      ...params,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating external link:', error);
    throw error;
  }

  return data;
}

/**
 * Get all external links for a space
 */
export async function getExternalLinks(
  spaceId: string | null,
  spaceType: 'personal' | 'shared'
): Promise<ExternalLinkWithTags[]> {
  let query = supabase
    .from('external_links')
    .select('*')
    .eq('space_type', spaceType);

  if (spaceType === 'shared' && spaceId) {
    query = query.eq('space_id', spaceId);
  } else if (spaceType === 'personal') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching external links:', error);
    return [];
  }

  // Fetch tags for each link
  const linksWithTags = await Promise.all(
    (data || []).map(async (link) => {
      const tags = await getLinkTags(link.id);
      return { ...link, tags };
    })
  );

  return linksWithTags;
}

/**
 * Get a single external link by ID
 */
export async function getExternalLink(linkId: string): Promise<ExternalLinkWithTags | null> {
  const { data, error } = await supabase
    .from('external_links')
    .select('*')
    .eq('id', linkId)
    .single();

  if (error) {
    console.error('Error fetching external link:', error);
    return null;
  }

  const tags = await getLinkTags(linkId);
  return { ...data, tags };
}

/**
 * Update an external link
 */
export async function updateExternalLink(
  linkId: string,
  params: UpdateExternalLinkParams
): Promise<ExternalLink | null> {
  const { data, error } = await supabase
    .from('external_links')
    .update(params)
    .eq('id', linkId)
    .select()
    .single();

  if (error) {
    console.error('Error updating external link:', error);
    throw error;
  }

  return data;
}

/**
 * Delete an external link
 */
export async function deleteExternalLink(linkId: string): Promise<boolean> {
  const { error } = await supabase
    .from('external_links')
    .delete()
    .eq('id', linkId);

  if (error) {
    console.error('Error deleting external link:', error);
    return false;
  }

  return true;
}

/**
 * Check if a link is still valid (not dead)
 */
export async function checkLinkValidity(url: string): Promise<boolean> {
  try {
    const metadata = await fetchLinkMetadata(url);
    return metadata.is_valid;
  } catch {
    return false;
  }
}

/**
 * Search external links
 */
export async function searchExternalLinks(
  searchTerm: string,
  spaceId: string | null,
  spaceType: 'personal' | 'shared'
): Promise<ExternalLinkWithTags[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('external_links')
    .select('*')
    .eq('space_type', spaceType);

  if (spaceType === 'shared' && spaceId) {
    query = query.eq('space_id', spaceId);
  } else if (spaceType === 'personal') {
    query = query.eq('user_id', user.id);
  }

  // Search in title, description, and domain
  query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,domain.ilike.%${searchTerm}%`);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching external links:', error);
    return [];
  }

  const linksWithTags = await Promise.all(
    (data || []).map(async (link) => {
      const tags = await getLinkTags(link.id);
      return { ...link, tags };
    })
  );

  return linksWithTags;
}

// ===== Tag Management =====

/**
 * Get or create a tag
 */
export async function getOrCreateTag(tagName: string): Promise<LinkTag | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Try to find existing tag
  const { data: existing } = await supabase
    .from('link_tags')
    .select('*')
    .eq('user_id', user.id)
    .eq('name', tagName)
    .maybeSingle();

  if (existing) return existing;

  // Create new tag
  const { data, error } = await supabase
    .from('link_tags')
    .insert({ user_id: user.id, name: tagName })
    .select()
    .single();

  if (error) {
    console.error('Error creating tag:', error);
    throw error;
  }

  return data;
}

/**
 * Get all tags for a link
 */
export async function getLinkTags(linkId: string): Promise<LinkTag[]> {
  const { data, error } = await supabase
    .from('link_tag_assignments')
    .select('tag_id, link_tags(*)')
    .eq('link_id', linkId);

  if (error) {
    console.error('Error fetching link tags:', error);
    return [];
  }

  return (data || [])
    .map((item: any) => item.link_tags)
    .filter((tag): tag is LinkTag => tag !== null);
}

/**
 * Add a tag to a link
 */
export async function addTagToLink(linkId: string, tagName: string): Promise<boolean> {
  const tag = await getOrCreateTag(tagName);
  if (!tag) return false;

  const { error } = await supabase
    .from('link_tag_assignments')
    .insert({ link_id: linkId, tag_id: tag.id });

  if (error) {
    if (error.code === '23505') {
      // Duplicate - tag already assigned
      return true;
    }
    console.error('Error adding tag to link:', error);
    return false;
  }

  return true;
}

/**
 * Remove a tag from a link
 */
export async function removeTagFromLink(linkId: string, tagId: string): Promise<boolean> {
  const { error } = await supabase
    .from('link_tag_assignments')
    .delete()
    .eq('link_id', linkId)
    .eq('tag_id', tagId);

  if (error) {
    console.error('Error removing tag from link:', error);
    return false;
  }

  return true;
}

/**
 * Get all user's tags
 */
export async function getUserTags(): Promise<LinkTag[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('link_tags')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) {
    console.error('Error fetching user tags:', error);
    return [];
  }

  return data || [];
}

// ===== Collection Management =====

/**
 * Add a link to a collection
 */
export async function addLinkToCollection(
  collectionId: string,
  linkId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if the link is already in the collection
  const { data: existingLink } = await supabase
    .from('collection_external_links')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('link_id', linkId)
    .maybeSingle();

  // If link already exists, return success (idempotent operation)
  if (existingLink) {
    return true;
  }

  // Get the highest display_order
  const { data: existing } = await supabase
    .from('collection_external_links')
    .select('display_order')
    .eq('collection_id', collectionId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const displayOrder = existing ? existing.display_order + 1 : 0;

  const { error } = await supabase
    .from('collection_external_links')
    .insert({
      collection_id: collectionId,
      link_id: linkId,
      added_by: user.id,
      display_order: displayOrder,
    });

  if (error) {
    if (error.code === '23505') {
      // Duplicate - link already in collection (race condition)
      return true;
    }
    console.error('Error adding link to collection:', error);
    return false;
  }

  return true;
}

/**
 * Remove a link from a collection
 */
export async function removeLinkFromCollection(
  collectionId: string,
  linkId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('collection_external_links')
    .delete()
    .eq('collection_id', collectionId)
    .eq('link_id', linkId);

  if (error) {
    console.error('Error removing link from collection:', error);
    return false;
  }

  return true;
}

/**
 * Get all links in a collection
 */
export async function getCollectionLinks(collectionId: string): Promise<ExternalLinkWithTags[]> {
  const { data, error } = await supabase
    .from('collection_external_links')
    .select('link_id, display_order, external_links(*)')
    .eq('collection_id', collectionId)
    .order('display_order');

  if (error) {
    console.error('Error fetching collection links:', error);
    return [];
  }

  const links = (data || [])
    .map((item: any) => item.external_links)
    .filter((link): link is ExternalLink => link !== null);

  // Fetch tags for each link
  const linksWithTags = await Promise.all(
    links.map(async (link) => {
      const tags = await getLinkTags(link.id);
      return { ...link, tags };
    })
  );

  return linksWithTags;
}
