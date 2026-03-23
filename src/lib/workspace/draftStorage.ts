/**
 * Draft Storage Service
 * 
 * Manages local drafts for Workspace units to prevent data loss.
 * Uses localStorage as primary storage with IndexedDB as fallback.
 */

export interface DraftUnit {
  id: string;
  page_id: string;
  content: any;
  type: string;
  updated_at: string;
  local_version: number;
}

export interface DraftPage {
  page_id: string;
  units: DraftUnit[];
  updated_at: string;
}

const STORAGE_KEY_PREFIX = 'workspace_draft_';
const VERSION_KEY = 'workspace_draft_version';

/**
 * Get storage key for a page
 */
function getPageKey(pageId: string): string {
  return `${STORAGE_KEY_PREFIX}${pageId}`;
}

/**
 * Get current draft version (for conflict resolution)
 */
export function getDraftVersion(): number {
  try {
    const version = localStorage.getItem(VERSION_KEY);
    return version ? parseInt(version, 10) : 1;
  } catch {
    return 1;
  }
}

/**
 * Increment draft version
 */
function incrementDraftVersion(): number {
  try {
    const current = getDraftVersion();
    const next = current + 1;
    localStorage.setItem(VERSION_KEY, next.toString());
    return next;
  } catch {
    return Date.now();
  }
}

/**
 * Save draft for a unit
 */
export function saveDraft(pageId: string, unit: DraftUnit): void {
  try {
    const pageKey = getPageKey(pageId);
    const existing = localStorage.getItem(pageKey);
    let draft: DraftPage;
    
    if (existing) {
      draft = JSON.parse(existing);
    } else {
      draft = {
        page_id: pageId,
        units: [],
        updated_at: new Date().toISOString(),
      };
    }
    
    // Update or add unit
    const existingIndex = draft.units.findIndex(u => u.id === unit.id);
    const draftUnit: DraftUnit = {
      ...unit,
      updated_at: new Date().toISOString(),
      local_version: incrementDraftVersion(),
    };
    
    if (existingIndex >= 0) {
      draft.units[existingIndex] = draftUnit;
    } else {
      draft.units.push(draftUnit);
    }
    
    draft.updated_at = new Date().toISOString();
    localStorage.setItem(pageKey, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
}

/**
 * Get all drafts for a page
 */
export function getDrafts(pageId: string): DraftUnit[] {
  try {
    const pageKey = getPageKey(pageId);
    const existing = localStorage.getItem(pageKey);
    if (!existing) return [];
    
    const draft: DraftPage = JSON.parse(existing);
    return draft.units || [];
  } catch (error) {
    console.error('Failed to get drafts:', error);
    return [];
  }
}

/**
 * Get draft for a specific unit
 */
export function getDraft(pageId: string, unitId: string): DraftUnit | null {
  try {
    const drafts = getDrafts(pageId);
    return drafts.find(u => u.id === unitId) || null;
  } catch {
    return null;
  }
}

/**
 * Clear drafts for a page (after successful save)
 */
export function clearDrafts(pageId: string): void {
  try {
    const pageKey = getPageKey(pageId);
    localStorage.removeItem(pageKey);
  } catch (error) {
    console.error('Failed to clear drafts:', error);
  }
}

/**
 * Clear draft for a specific unit
 */
export function clearDraft(pageId: string, unitId: string): void {
  try {
    const pageKey = getPageKey(pageId);
    const existing = localStorage.getItem(pageKey);
    if (!existing) return;
    
    const draft: DraftPage = JSON.parse(existing);
    draft.units = draft.units.filter(u => u.id !== unitId);
    
    if (draft.units.length === 0) {
      localStorage.removeItem(pageKey);
    } else {
      localStorage.setItem(pageKey, JSON.stringify(draft));
    }
  } catch (error) {
    console.error('Failed to clear draft:', error);
  }
}

/**
 * Check if there are unsaved drafts for a page
 */
export function hasUnsavedDrafts(pageId: string): boolean {
  try {
    const drafts = getDrafts(pageId);
    return drafts.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get all draft page IDs
 */
export function getAllDraftPageIds(): string[] {
  try {
    const pageIds: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const pageId = key.replace(STORAGE_KEY_PREFIX, '');
        pageIds.push(pageId);
      }
    }
    return pageIds;
  } catch {
    return [];
  }
}

/**
 * Restore drafts for a page (merge with server data)
 */
export async function restoreDrafts(
  pageId: string,
  serverUnits: any[]
): Promise<any[]> {
  try {
    const drafts = getDrafts(pageId);
    if (drafts.length === 0) return serverUnits;
    
    // Merge drafts with server units
    const merged = serverUnits.map(unit => {
      const draft = drafts.find(d => d.id === unit.id);
      if (draft) {
        // Use draft if it's newer or if server unit doesn't exist
        return {
          ...unit,
          content: draft.content,
          type: draft.type,
        };
      }
      return unit;
    });
    
    // Add drafts that don't exist on server
    const serverUnitIds = new Set(serverUnits.map(u => u.id));
    drafts.forEach(draft => {
      if (!serverUnitIds.has(draft.id)) {
        merged.push({
          id: draft.id,
          page_id: draft.page_id,
          type: draft.type,
          content: draft.content,
          order_index: 0,
          parent_id: null,
          is_collapsed: false,
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: draft.updated_at,
        });
      }
    });
    
    return merged;
  } catch (error) {
    console.error('Failed to restore drafts:', error);
    return serverUnits;
  }
}
