import { supabase } from './supabase';
import type {
  Collection,
  CollectionReference,
  CollectionTreeNode,
  CollectionReferenceWithTags,
  CreateCollectionData,
  UpdateCollectionData,
  CreateReferenceData,
  SpaceType,
} from './collectionsTypes';

export async function getCollectionsForSpace(
  spaceId: string | null,
  spaceType: SpaceType
): Promise<Collection[]> {
  let query = supabase
    .from('collections')
    .select('*')
    .eq('space_type', spaceType)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (spaceType === 'personal') {
    query = query.is('space_id', null);
  } else {
    query = query.eq('space_id', spaceId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getCollectionById(collectionId: string): Promise<Collection | null> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', collectionId)
    .single();

  if (error) throw error;
  return data;
}

export async function buildCollectionTree(collections: Collection[]): Promise<CollectionTreeNode[]> {
  const collectionsMap = new Map<string, CollectionTreeNode>();
  const rootCollections: CollectionTreeNode[] = [];

  collections.forEach(collection => {
    collectionsMap.set(collection.id, {
      ...collection,
      children: [],
      depth: 0,
      referenceCount: 0,
    });
  });

  const referenceCounts = await getCollectionReferenceCounts(collections.map(c => c.id));
  referenceCounts.forEach(({ collection_id, count }) => {
    const node = collectionsMap.get(collection_id);
    if (node) {
      node.referenceCount = count;
    }
  });

  collections.forEach(collection => {
    const node = collectionsMap.get(collection.id);
    if (!node) return;

    if (collection.parent_id) {
      const parent = collectionsMap.get(collection.parent_id);
      if (parent) {
        node.depth = parent.depth + 1;
        parent.children.push(node);
      } else {
        rootCollections.push(node);
      }
    } else {
      rootCollections.push(node);
    }
  });

  return rootCollections;
}

async function getCollectionReferenceCounts(
  collectionIds: string[]
): Promise<Array<{ collection_id: string; count: number }>> {
  if (collectionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('collection_references')
    .select('collection_id')
    .in('collection_id', collectionIds);

  if (error) throw error;

  const counts = new Map<string, number>();
  data?.forEach(ref => {
    counts.set(ref.collection_id, (counts.get(ref.collection_id) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([collection_id, count]) => ({
    collection_id,
    count,
  }));
}

export async function createCollection(data: CreateCollectionData): Promise<Collection> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const maxOrder = await getMaxDisplayOrder(data.space_id, data.space_type, data.parent_id);

  const { data: collection, error } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      space_id: data.space_id,
      space_type: data.space_type,
      parent_id: data.parent_id || null,
      name: data.name,
      description: data.description || null,
      color: data.color || 'blue',
      icon: data.icon || 'folder',
      display_order: maxOrder + 1,
    })
    .select()
    .single();

  if (error) throw error;
  return collection;
}

async function getMaxDisplayOrder(
  spaceId: string | null,
  spaceType: SpaceType,
  parentId: string | null
): Promise<number> {
  let query = supabase
    .from('collections')
    .select('display_order')
    .eq('space_type', spaceType);

  if (spaceType === 'personal') {
    query = query.is('space_id', null);
  } else {
    query = query.eq('space_id', spaceId);
  }

  if (parentId) {
    query = query.eq('parent_id', parentId);
  } else {
    query = query.is('parent_id', null);
  }

  const { data } = await query.order('display_order', { ascending: false }).limit(1);

  return data && data.length > 0 ? data[0].display_order : 0;
}

export async function updateCollection(
  collectionId: string,
  updates: UpdateCollectionData
): Promise<Collection> {
  const { data, error } = await supabase
    .from('collections')
    .update(updates)
    .eq('id', collectionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId);

  if (error) throw error;
}

export async function getCollectionReferences(
  collectionId: string
): Promise<CollectionReferenceWithTags[]> {
  // Fetch collection_references (quick links and files)
  const { data, error } = await supabase
    .from('collection_references')
    .select('*')
    .eq('collection_id', collectionId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;

  const references = data || [];

  const referencesWithTags = await Promise.all(
    references.map(async ref => {
      if (ref.entity_type === 'file' && ref.entity_id) {
        const { data: fileData } = await supabase
          .from('files')
          .select(`
            display_filename,
            file_type,
            file_size,
            file_tag_assignments(
              tag_id,
              file_tags(id, name)
            )
          `)
          .eq('id', ref.entity_id)
          .single();

        if (fileData) {
          return {
            ...ref,
            file_name: fileData.display_filename,
            file_type: fileData.file_type,
            file_size: fileData.file_size,
            tags: fileData.file_tag_assignments
              ?.map((a: any) => a.file_tags)
              .filter(Boolean) || [],
          };
        }
      }

      return { ...ref, tags: [] };
    })
  );

  // Also fetch external links from collection_external_links table
  const { data: externalLinksData } = await supabase
    .from('collection_external_links')
    .select(`
      id,
      link_id,
      display_order,
      created_at,
      external_links(
        id,
        url,
        title,
        description,
        domain,
        thumbnail_url
      )
    `)
    .eq('collection_id', collectionId)
    .order('display_order', { ascending: true });

  // Convert external links to collection reference format
  const externalLinksAsReferences = await Promise.all(
    (externalLinksData || []).map(async (item: any) => {
      const link = item.external_links;
      if (!link) return null;

      // Get tags for the link
      const { data: tagData } = await supabase
        .from('link_tag_assignments')
        .select('tag_id, link_tags(id, name)')
        .eq('link_id', link.id);

      const tags = (tagData || [])
        .map((t: any) => t.link_tags)
        .filter(Boolean);

      return {
        id: item.id,
        collection_id: collectionId,
        entity_type: 'link' as const,
        entity_id: link.id,
        link_url: link.url,
        link_title: link.title,
        link_description: link.description,
        display_order: item.display_order,
        created_at: item.created_at,
        added_by: null,
        tags,
      };
    })
  );

  const validExternalLinks = externalLinksAsReferences.filter(Boolean) as CollectionReferenceWithTags[];

  // Combine and sort by display_order
  const allReferences = [...referencesWithTags, ...validExternalLinks].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  );

  return allReferences;
}

export async function addReferenceToCollection(
  data: CreateReferenceData
): Promise<CollectionReference> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const maxOrder = await getMaxReferenceDisplayOrder(data.collection_id);

  const { data: reference, error } = await supabase
    .from('collection_references')
    .insert({
      collection_id: data.collection_id,
      entity_type: data.entity_type,
      entity_id: data.entity_id || null,
      link_url: data.link_url || null,
      link_title: data.link_title || null,
      link_description: data.link_description || null,
      display_order: data.display_order !== undefined ? data.display_order : maxOrder + 1,
      added_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return reference;
}

async function getMaxReferenceDisplayOrder(collectionId: string): Promise<number> {
  const { data } = await supabase
    .from('collection_references')
    .select('display_order')
    .eq('collection_id', collectionId)
    .order('display_order', { ascending: false })
    .limit(1);

  return data && data.length > 0 ? data[0].display_order : 0;
}

export async function removeReferenceFromCollection(referenceId: string): Promise<void> {
  // Try to delete from collection_references first
  const { error: refError } = await supabase
    .from('collection_references')
    .delete()
    .eq('id', referenceId);

  // If deletion from collection_references failed, try collection_external_links
  if (refError) {
    const { error: linkError } = await supabase
      .from('collection_external_links')
      .delete()
      .eq('id', referenceId);

    if (linkError) throw linkError;
  }
}

export async function updateReferenceOrder(
  referenceId: string,
  newOrder: number
): Promise<void> {
  const { error } = await supabase
    .from('collection_references')
    .update({ display_order: newOrder })
    .eq('id', referenceId);

  if (error) throw error;
}

export async function searchCollectionsAndReferences(
  spaceId: string | null,
  spaceType: SpaceType,
  searchTerm: string
): Promise<{
  collections: Collection[];
  references: Array<CollectionReferenceWithTags & { collection_name: string }>;
}> {
  const collections = await getCollectionsForSpace(spaceId, spaceType);

  const term = searchTerm.toLowerCase();

  const matchingCollections = collections.filter(c =>
    c.name.toLowerCase().includes(term) ||
    (c.description && c.description.toLowerCase().includes(term))
  );

  const allReferences = await Promise.all(
    collections.map(async c => {
      const refs = await getCollectionReferences(c.id);
      return refs.map(ref => ({ ...ref, collection_name: c.name }));
    })
  );

  const flatReferences = allReferences.flat();

  const matchingReferences = flatReferences.filter(ref => {
    if (ref.entity_type === 'link') {
      return (
        ref.link_title?.toLowerCase().includes(term) ||
        ref.link_url?.toLowerCase().includes(term) ||
        ref.link_description?.toLowerCase().includes(term)
      );
    }
    if (ref.entity_type === 'file') {
      const nameMatch = ref.file_name?.toLowerCase().includes(term);
      const tagMatch = ref.tags?.some(tag => tag.name.toLowerCase().includes(term));
      return nameMatch || tagMatch;
    }
    return false;
  });

  return {
    collections: matchingCollections,
    references: matchingReferences,
  };
}

export async function getCollectionsContainingEntity(
  entityType: 'file' | 'link' | 'table' | 'note',
  entityId: string
): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collection_references')
    .select('collection_id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) throw error;

  if (!data || data.length === 0) return [];

  const collectionIds = [...new Set(data.map(r => r.collection_id))];

  const { data: collections, error: collectionsError } = await supabase
    .from('collections')
    .select('*')
    .in('id', collectionIds);

  if (collectionsError) throw collectionsError;
  return collections || [];
}
