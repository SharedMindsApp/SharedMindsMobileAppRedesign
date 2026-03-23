import { supabase } from '../supabase';
import type {
  RoadmapItem,
  RoadmapItemTreeNode,
  RoadmapItemPath,
  AttachChildItemInput,
  DetachChildItemInput,
} from './coreTypes';
import {
  MAX_ITEM_DEPTH,
  canParentContainChild,
  validateComposition,
  COMPOSITION_ERROR_MESSAGES,
  validateParentEnvelope,
} from './roadmapItemCompositionRules';

function transformRoadmapItemFromDb(row: any): RoadmapItem {
  return {
    id: row.id,
    masterProjectId: row.master_project_id,
    trackId: row.track_id,
    type: row.type,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    parentItemId: row.parent_item_id,
    itemDepth: row.item_depth || 0,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function attachChildItem(
  input: AttachChildItemInput
): Promise<{ success: boolean; error?: string; item?: RoadmapItem }> {
  const { childItemId, parentItemId, userId } = input;

  if (childItemId === parentItemId) {
    return {
      success: false,
      error: COMPOSITION_ERROR_MESSAGES.SELF_REFERENCE,
    };
  }

  const { data: childData, error: childError } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('id', childItemId)
    .maybeSingle();

  if (childError || !childData) {
    return {
      success: false,
      error: COMPOSITION_ERROR_MESSAGES.CHILD_NOT_FOUND,
    };
  }

  const child = transformRoadmapItemFromDb(childData);

  if (child.parentItemId) {
    return {
      success: false,
      error: COMPOSITION_ERROR_MESSAGES.ALREADY_HAS_PARENT,
    };
  }

  const { data: parentData, error: parentError } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('id', parentItemId)
    .maybeSingle();

  if (parentError || !parentData) {
    return {
      success: false,
      error: COMPOSITION_ERROR_MESSAGES.PARENT_NOT_FOUND,
    };
  }

  const parent = transformRoadmapItemFromDb(parentData);

  const { data: isSameSectionResult } = await supabase.rpc('items_same_section', {
    item_id_1: parentItemId,
    item_id_2: childItemId,
  });

  if (!isSameSectionResult) {
    return {
      success: false,
      error: COMPOSITION_ERROR_MESSAGES.DIFFERENT_SECTION,
    };
  }

  const { data: isAncestorResult } = await supabase.rpc('is_item_ancestor', {
    potential_ancestor: childItemId,
    potential_descendant: parentItemId,
  });

  if (isAncestorResult) {
    return {
      success: false,
      error: COMPOSITION_ERROR_MESSAGES.CYCLE_DETECTED,
    };
  }

  const newDepth = parent.itemDepth + 1;

  if (newDepth > MAX_ITEM_DEPTH) {
    return {
      success: false,
      error: COMPOSITION_ERROR_MESSAGES.MAX_DEPTH_EXCEEDED,
    };
  }

  const compositionValidation = validateComposition(
    parent.type,
    child.type,
    newDepth
  );

  if (!compositionValidation.valid) {
    return {
      success: false,
      error: compositionValidation.errors.join('; '),
    };
  }

  const envelopeValidation = validateParentEnvelope(
    parent.startDate,
    parent.endDate,
    child.startDate,
    child.endDate
  );

  if (!envelopeValidation.isWithinParentWindow && envelopeValidation.violation) {
    return {
      success: false,
      error: COMPOSITION_ERROR_MESSAGES.PARENT_ENVELOPE_VIOLATION(
        envelopeValidation.violation
      ),
    };
  }

  const { data: updatedData, error: updateError } = await supabase
    .from('roadmap_items')
    .update({
      parent_item_id: parentItemId,
      item_depth: newDepth,
    })
    .eq('id', childItemId)
    .select()
    .maybeSingle();

  if (updateError || !updatedData) {
    return {
      success: false,
      error: updateError?.message || 'Failed to attach child item',
    };
  }

  const { data: childrenData } = await supabase.rpc('get_all_child_items', {
    input_parent_id: childItemId,
  });

  if (childrenData && childrenData.length > 0) {
    for (const childRow of childrenData) {
      await supabase
        .from('roadmap_items')
        .update({
          item_depth: newDepth + childRow.depth,
        })
        .eq('id', childRow.item_id);
    }
  }

  return {
    success: true,
    item: transformRoadmapItemFromDb(updatedData),
  };
}

export async function detachChildItem(
  input: DetachChildItemInput
): Promise<{ success: boolean; error?: string; item?: RoadmapItem }> {
  const { childItemId, userId } = input;

  const { data: childData, error: childError } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('id', childItemId)
    .maybeSingle();

  if (childError || !childData) {
    return {
      success: false,
      error: COMPOSITION_ERROR_MESSAGES.CHILD_NOT_FOUND,
    };
  }

  const child = transformRoadmapItemFromDb(childData);

  if (!child.parentItemId) {
    return {
      success: false,
      error: 'Item does not have a parent',
    };
  }

  const { data: updatedData, error: updateError } = await supabase
    .from('roadmap_items')
    .update({
      parent_item_id: null,
      item_depth: 0,
    })
    .eq('id', childItemId)
    .select()
    .maybeSingle();

  if (updateError || !updatedData) {
    return {
      success: false,
      error: updateError?.message || 'Failed to detach child item',
    };
  }

  const { data: childrenData } = await supabase.rpc('get_all_child_items', {
    input_parent_id: childItemId,
  });

  if (childrenData && childrenData.length > 0) {
    for (const childRow of childrenData) {
      await supabase
        .from('roadmap_items')
        .update({
          item_depth: childRow.depth,
        })
        .eq('id', childRow.item_id);
    }
  }

  return {
    success: true,
    item: transformRoadmapItemFromDb(updatedData),
  };
}

export async function getChildrenForItem(
  itemId: string
): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('parent_item_id', itemId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching children:', error);
    return [];
  }

  return (data || []).map(transformRoadmapItemFromDb);
}

export async function getParentForItem(
  itemId: string
): Promise<RoadmapItem | null> {
  const { data: itemData, error: itemError } = await supabase
    .from('roadmap_items')
    .select('parent_item_id')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError || !itemData || !itemData.parent_item_id) {
    return null;
  }

  const { data, error } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('id', itemData.parent_item_id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return transformRoadmapItemFromDb(data);
}

export async function getRoadmapItemTree(params: {
  masterProjectId?: string;
  trackId?: string;
  itemId?: string;
  includeArchived?: boolean;
  includeChildren?: boolean;
  userId?: string;
}): Promise<RoadmapItemTreeNode[]> {
  const {
    masterProjectId,
    trackId,
    itemId,
    includeArchived = false,
    includeChildren = true,
  } = params;

  if (itemId) {
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();

    if (error || !data) return [];

    const item = transformRoadmapItemFromDb(data);
    const children = includeChildren ? await buildTreeNode(item) : [];
    return [
      {
        item,
        children,
        childCount: children.length,
        descendantCount: countDescendants(children),
      },
    ];
  }

  let query = supabase
    .from('roadmap_items')
    .select('*')
    .is('parent_item_id', null);

  if (masterProjectId) {
    const { data: sectionsData } = await supabase
      .from('roadmap_sections')
      .select('id')
      .eq('master_project_id', masterProjectId);

    if (sectionsData && sectionsData.length > 0) {
      const sectionIds = sectionsData.map((s) => s.id);
      query = query.in('section_id', sectionIds);
    }
  }

  if (trackId) {
    query = query.eq('track_id', trackId);
  }

  if (!includeArchived) {
    query = query.neq('status', 'archived');
  }

  const { data, error } = await query.order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching roadmap tree:', error);
    return [];
  }

  const items = (data || []).map(transformRoadmapItemFromDb);

  if (!includeChildren) {
    return items.map((item) => ({
      item,
      children: [],
      childCount: 0,
      descendantCount: 0,
    }));
  }

  const treeNodes: RoadmapItemTreeNode[] = [];

  for (const item of items) {
    const children = await buildTreeNode(item);
    treeNodes.push({
      item,
      children,
      childCount: children.length,
      descendantCount: countDescendants(children),
    });
  }

  return treeNodes;
}

async function buildTreeNode(item: RoadmapItem): Promise<RoadmapItemTreeNode[]> {
  const children = await getChildrenForItem(item.id);

  const childNodes: RoadmapItemTreeNode[] = [];

  for (const child of children) {
    const grandchildren = await buildTreeNode(child);
    childNodes.push({
      item: child,
      children: grandchildren,
      childCount: grandchildren.length,
      descendantCount: countDescendants(grandchildren),
    });
  }

  return childNodes;
}

function countDescendants(children: RoadmapItemTreeNode[]): number {
  let count = children.length;
  for (const child of children) {
    count += child.descendantCount;
  }
  return count;
}

export async function getItemPath(itemId: string): Promise<RoadmapItemPath[]> {
  const { data, error } = await supabase.rpc('get_item_path', {
    input_item_id: itemId,
  });

  if (error || !data) {
    console.error('Error fetching item path:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    itemId: row.path_item_id,
    title: row.title,
    type: row.item_type,
    depth: row.depth,
  }));
}

export async function getRootItem(itemId: string): Promise<RoadmapItem | null> {
  const { data: rootIdData, error: rootIdError } = await supabase.rpc(
    'get_root_item_id',
    {
      input_item_id: itemId,
    }
  );

  if (rootIdError || !rootIdData) {
    return null;
  }

  const { data, error } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('id', rootIdData)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return transformRoadmapItemFromDb(data);
}

export async function getAllDescendants(
  itemId: string
): Promise<RoadmapItem[]> {
  const { data: childrenData, error } = await supabase.rpc(
    'get_all_child_items',
    {
      input_parent_id: itemId,
    }
  );

  if (error || !childrenData) {
    console.error('Error fetching descendants:', error);
    return [];
  }

  const childIds = childrenData.map((row: any) => row.item_id);

  if (childIds.length === 0) return [];

  const { data: itemsData, error: itemsError } = await supabase
    .from('roadmap_items')
    .select('*')
    .in('id', childIds);

  if (itemsError || !itemsData) {
    return [];
  }

  return (itemsData || []).map(transformRoadmapItemFromDb);
}

export async function getTopLevelItems(params: {
  masterProjectId?: string;
  trackId?: string;
  includeArchived?: boolean;
}): Promise<RoadmapItem[]> {
  const { masterProjectId, trackId, includeArchived = false } = params;

  let query = supabase
    .from('roadmap_items')
    .select('*')
    .is('parent_item_id', null);

  if (masterProjectId) {
    const { data: sectionsData } = await supabase
      .from('roadmap_sections')
      .select('id')
      .eq('master_project_id', masterProjectId);

    if (sectionsData && sectionsData.length > 0) {
      const sectionIds = sectionsData.map((s) => s.id);
      query = query.in('section_id', sectionIds);
    }
  }

  if (trackId) {
    query = query.eq('track_id', trackId);
  }

  if (!includeArchived) {
    query = query.neq('status', 'archived');
  }

  const { data, error } = await query.order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching top-level items:', error);
    return [];
  }

  return (data || []).map(transformRoadmapItemFromDb);
}

export async function moveItemToNewParent(
  itemId: string,
  newParentId: string | null
): Promise<{ success: boolean; error?: string }> {
  if (newParentId === null) {
    return detachChildItem({ childItemId: itemId });
  }

  const currentItem = await supabase
    .from('roadmap_items')
    .select('parent_item_id')
    .eq('id', itemId)
    .maybeSingle();

  if (currentItem.data?.parent_item_id) {
    const detachResult = await detachChildItem({ childItemId: itemId });
    if (!detachResult.success) {
      return detachResult;
    }
  }

  return attachChildItem({ childItemId: itemId, parentItemId: newParentId });
}
