/**
 * Page Service
 * 
 * Service for managing Pages - the hierarchical navigation structure
 * that contains Workspace content units.
 */

import { supabase } from '../supabase';
import type { Page } from './types';
import { deleteAllWorkspaceUnitsForPage } from './workspaceService';

/**
 * Get a page by ID
 */
export async function getPage(pageId: string): Promise<Page | null> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', pageId)
    .is('archived_at', null)
    .single();

  if (error) {
    console.error('Error fetching page:', error);
    return null;
  }

  return data as Page;
}

/**
 * Get all pages for a space (flat list)
 */
export async function getPagesBySpaceId(spaceId: string): Promise<Page[]> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('space_id', spaceId)
    .is('archived_at', null)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching pages:', error);
    return [];
  }

  return (data || []) as Page[];
}

/**
 * Get root pages (top-level pages with no parent)
 */
export async function getRootPages(spaceId: string): Promise<Page[]> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('space_id', spaceId)
    .is('parent_page_id', null)
    .is('archived_at', null)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching root pages:', error);
    return [];
  }

  return (data || []) as Page[];
}

/**
 * Get child pages of a parent page
 */
export async function getChildPages(parentPageId: string): Promise<Page[]> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('parent_page_id', parentPageId)
    .is('archived_at', null)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching child pages:', error);
    return [];
  }

  return (data || []) as Page[];
}

/**
 * Build a tree structure from flat pages list
 */
export function buildPageTree(pages: Page[]): Page[] {
  const pageMap = new Map<string, Page>();
  const rootPages: Page[] = [];

  // Create map of all pages
  pages.forEach(page => {
    pageMap.set(page.id, { ...page, children: [] });
  });

  // Build tree
  pages.forEach(page => {
    const pageWithChildren = pageMap.get(page.id)!;
    if (page.parent_page_id) {
      const parent = pageMap.get(page.parent_page_id);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(pageWithChildren);
      }
    } else {
      rootPages.push(pageWithChildren);
    }
  });

  return rootPages;
}

/**
 * Create a new page
 */
export async function createPage(params: {
  space_id: string;
  parent_page_id?: string;
  title?: string;
}): Promise<Page | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    console.error('User not authenticated');
    return null;
  }

  // Get profile ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!profile) {
    console.error('Profile not found');
    return null;
  }

  // Get siblings to calculate order_index
  const siblings = params.parent_page_id
    ? await getChildPages(params.parent_page_id)
    : await getRootPages(params.space_id);

  const maxOrder = siblings.length > 0
    ? Math.max(...siblings.map(p => p.order_index))
    : 0;
  const newOrderIndex = maxOrder + 1;

  const { data, error } = await supabase
    .from('pages')
    .insert({
      space_id: params.space_id,
      parent_page_id: params.parent_page_id || null,
      title: params.title || 'Untitled Page',
      order_index: newOrderIndex,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating page:', error);
    return null;
  }

  return data as Page;
}

/**
 * Update a page
 */
export async function updatePage(
  pageId: string,
  updates: Partial<Pick<Page, 'title' | 'parent_page_id' | 'order_index' | 'archived_at'>>
): Promise<Page | null> {
  const { data, error } = await supabase
    .from('pages')
    .update(updates)
    .eq('id', pageId)
    .select()
    .single();

  if (error) {
    console.error('Error updating page:', error);
    return null;
  }

  return data as Page;
}

/**
 * Archive a page (soft delete) and all its workspace units
 */
export async function archivePage(pageId: string): Promise<boolean> {
  // Soft-delete all workspace units for this page
  try {
    await deleteAllWorkspaceUnitsForPage(pageId);
  } catch (error) {
    console.error('Error deleting workspace units for page:', error);
    // Continue with page archiving even if unit deletion fails
  }

  // Soft-delete the page
  const { error } = await supabase
    .from('pages')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', pageId);

  if (error) {
    console.error('Error archiving page:', error);
    return false;
  }

  return true;
}

/**
 * Reorder pages using fractional indexing
 */
export async function reorderPages(
  spaceId: string,
  orders: Array<{ id: string; order_index: number; parent_page_id?: string | null }>
): Promise<boolean> {
  // Update all pages in a transaction-like manner
  const updates = orders.map(order =>
    supabase
      .from('pages')
      .update({
        order_index: order.order_index,
        parent_page_id: order.parent_page_id || null,
      })
      .eq('id', order.id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(result => result.error);

  if (hasError) {
    console.error('Error reordering pages');
    return false;
  }

  return true;
}
