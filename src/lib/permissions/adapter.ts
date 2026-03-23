/**
 * Share Adapter Interface
 * 
 * Generic interface for sharing any entity type.
 * The SharingDrawer UI component works via adapters, not hardcoded entity types.
 * 
 * This allows the same UI pattern to work for:
 * - Trips
 * - Guardrails Projects
 * - Calendar Events
 * - Roadmap Items
 * - Tracks/Subtracks
 * - Future entities
 */

import type {
  PermissionFlags,
  PermissionGrantWithDisplay,
  PermissionSubjectType,
  DetailLevel,
  ShareScope,
} from './types';

/**
 * Share Adapter
 * 
 * Implement this interface for each entity type that can be shared.
 * The SharingDrawer component uses adapters to work with any entity.
 */
export interface ShareAdapter {
  /**
   * Entity type identifier (e.g., 'trip', 'project', 'calendar_event')
   */
  entityType: string;
  
  /**
   * Entity ID
   */
  entityId: string;
  
  /**
   * Get entity title for display
   */
  getEntityTitle(): Promise<string>;
  
  /**
   * List current permission grants
   * 
   * Returns all subjects that have been granted access to this entity.
   */
  listGrants(): Promise<PermissionGrantWithDisplay[]>;
  
  /**
   * Upsert a permission grant
   * 
   * Creates or updates a grant for a subject.
   */
  upsertGrant(input: {
    subject_type: PermissionSubjectType;
    subject_id: string;
    flags: PermissionFlags;
  }): Promise<void>;
  
  /**
   * Revoke a permission grant
   * 
   * Removes access for a subject.
   */
  revokeGrant(
    subject_type: PermissionSubjectType,
    subject_id: string
  ): Promise<void>;
  
  /**
   * Preview scope impact (optional)
   * 
   * If include_children scope is selected, preview how many child items
   * would be affected. Used for UI confirmation.
   * 
   * Returns null if scope preview is not applicable.
   */
  previewScopeImpact?(scope: ShareScope): Promise<{
    affected_count: number;
    sample: string[];
  } | null>;
  
  /**
   * Check if current user can manage permissions
   * 
   * Used to determine if Share button should be visible/enabled.
   */
  canManagePermissions(): Promise<boolean>;
}

/**
 * Adapter Registry
 * 
 * Registry of adapters by entity type.
 * Used by SharingDrawer to find the right adapter.
 */
class AdapterRegistry {
  private adapters = new Map<string, (entityId: string) => ShareAdapter>();
  
  register(entityType: string, factory: (entityId: string) => ShareAdapter) {
    this.adapters.set(entityType, factory);
  }
  
  get(entityType: string, entityId: string): ShareAdapter | null {
    const factory = this.adapters.get(entityType);
    if (!factory) return null;
    return factory(entityId);
  }
  
  has(entityType: string): boolean {
    return this.adapters.has(entityType);
  }
}

export const adapterRegistry = new AdapterRegistry();

