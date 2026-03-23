/**
 * Workspace Service
 * 
 * Service for managing workspaces and workspace units.
 */

import { supabase } from '../supabase';
import type {
  WorkspaceUnit,
  WorkspaceUnitType,
  WorkspaceUnitContent,
} from './types';

// Workspace Units CRUD (page-scoped)
export async function getWorkspaceUnits(pageId: string): Promise<WorkspaceUnit[]> {
  const { data, error } = await supabase
    .from('workspace_units')
    .select('*')
    .eq('page_id', pageId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getWorkspaceUnit(id: string): Promise<WorkspaceUnit | null> {
  const { data, error } = await supabase
    .from('workspace_units')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createWorkspaceUnit(input: {
  page_id: string; // Changed from workspace_id
  parent_id?: string;
  type: WorkspaceUnitType;
  content: WorkspaceUnitContent;
  order_index?: number;
}): Promise<WorkspaceUnit> {
  // Calculate order_index if not provided using fractional indexing
  let orderIndex = input.order_index;
  if (orderIndex === undefined) {
    // Get max order_index for siblings
    let query = supabase
      .from('workspace_units')
      .select('order_index')
      .eq('page_id', input.page_id)
      .is('deleted_at', null)
      .order('order_index', { ascending: false })
      .limit(1);
    
    // Handle parent_id filter correctly (null vs value)
    if (input.parent_id) {
      query = query.eq('parent_id', input.parent_id);
    } else {
      query = query.is('parent_id', null);
    }
    
    const { data: siblings } = await query;

    const maxOrder = siblings && siblings.length > 0 ? siblings[0].order_index : 0;
    // Use fractional indexing: add 1 to max, allowing insertion between items
    orderIndex = maxOrder + 1;
  }

  const { data, error } = await supabase
    .from('workspace_units')
    .insert({
      page_id: input.page_id,
      parent_id: input.parent_id,
      type: input.type,
      content: input.content,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWorkspaceUnit(
  id: string,
  updates: Partial<Pick<WorkspaceUnit, 'content' | 'order_index' | 'is_collapsed' | 'is_completed' | 'parent_id'>>
): Promise<WorkspaceUnit> {
  const { data, error } = await supabase
    .from('workspace_units')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWorkspaceUnit(id: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_units')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Soft-delete all workspace units for a page
 */
export async function deleteAllWorkspaceUnitsForPage(pageId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_units')
    .update({ deleted_at: new Date().toISOString() })
    .eq('page_id', pageId)
    .is('deleted_at', null);

  if (error) throw error;
}

export async function reorderWorkspaceUnits(
  pageId: string, // Changed from workspaceId
  unitOrders: Array<{ id: string; order_index: number; parent_id?: string | null }>
): Promise<void> {
  // Update all units in a transaction-like manner
  for (const { id, order_index, parent_id } of unitOrders) {
    const updateData: any = { order_index };
    if (parent_id !== undefined) {
      updateData.parent_id = parent_id;
    }
    
    const { error } = await supabase
      .from('workspace_units')
      .update(updateData)
      .eq('id', id)
      .eq('page_id', pageId);

    if (error) throw error;
  }
}

// Helper: Build hierarchical structure from flat list
export function buildWorkspaceUnitTree(units: WorkspaceUnit[]): WorkspaceUnit[] {
  const unitMap = new Map<string, WorkspaceUnit>();
  const rootUnits: WorkspaceUnit[] = [];

  // First pass: create map and add children array
  for (const unit of units) {
    unitMap.set(unit.id, { ...unit, children: [] });
  }

  // Second pass: build tree
  for (const unit of units) {
    const unitWithChildren = unitMap.get(unit.id)!;
    if (unit.parent_id) {
      const parent = unitMap.get(unit.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(unitWithChildren);
      }
    } else {
      rootUnits.push(unitWithChildren);
    }
  }

  // Sort children by order_index
  const sortChildren = (units: WorkspaceUnit[]) => {
    units.sort((a, b) => a.order_index - b.order_index);
    for (const unit of units) {
      if (unit.children && unit.children.length > 0) {
        sortChildren(unit.children);
      }
    }
  };

  sortChildren(rootUnits);
  return rootUnits;
}
