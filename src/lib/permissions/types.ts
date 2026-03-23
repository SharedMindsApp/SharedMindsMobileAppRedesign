/**
 * Canonical Permission Types
 * 
 * ⚠️ CRITICAL: These types are used consistently across ALL modules:
 * - Guardrails (projects, roadmap items, tracks, subtracks)
 * - Planner + Personal Spaces (calendar, events, projections)
 * - Shared Spaces (shared calendar, shared items)
 * - Trips (trip context, container, nested itinerary)
 * 
 * DO NOT invent different permission rules per module.
 * Use these canonical types everywhere.
 */

// ============================================================================
// Core Permission Primitives
// ============================================================================

/**
 * Permission Role
 * 
 * High-level role that maps to a set of capabilities.
 * Used for quick role assignment in UI.
 */
export type PermissionRole = 'owner' | 'editor' | 'commenter' | 'viewer';

/**
 * Permission Access
 * 
 * Granular access level for specific operations.
 */
export type PermissionAccess = 'view' | 'comment' | 'edit' | 'manage';

/**
 * Detail Level
 * 
 * Controls how much detail is visible.
 * - 'overview': Title and time only (description/location hidden)
 * - 'detailed': Full event details visible
 */
export type DetailLevel = 'overview' | 'detailed';

/**
 * Share Scope
 * 
 * Controls what is included when sharing.
 * - 'this_only': Only the entity itself
 * - 'include_children': Entity and all nested/child items
 */
export type ShareScope = 'this_only' | 'include_children';

/**
 * Permission Subject Type
 * 
 * Who or what is being granted access.
 */
export type PermissionSubjectType = 'user' | 'contact' | 'group' | 'space' | 'link';

// ============================================================================
// Permission Flags
// ============================================================================

/**
 * Permission Flags
 * 
 * Explicit permission flags that define what a subject can do.
 * These are the source of truth - UI should never infer permissions.
 * 
 * Rules:
 * - can_view: If false, entity is hidden (filtered at service layer)
 * - can_comment: If true, subject can add comments/notes
 * - can_edit: If true, subject can modify entity
 * - can_manage: If true, subject can manage permissions and members
 * - detail_level: Controls detail visibility
 * - scope: Controls child/nested item visibility
 */
export interface PermissionFlags {
  /**
   * Can the subject view this entity?
   * If false, entity is hidden (filtered out at service layer)
   */
  can_view: boolean;
  
  /**
   * Can the subject comment on this entity?
   * Allows adding comments, notes, annotations
   */
  can_comment: boolean;
  
  /**
   * Can the subject edit this entity?
   * If false, mutations are blocked at service layer
   */
  can_edit: boolean;
  
  /**
   * Can the subject manage this entity?
   * Includes: managing permissions, members, settings
   */
  can_manage: boolean;
  
  /**
   * Level of detail visible
   */
  detail_level: DetailLevel;
  
  /**
   * Scope of what's included
   */
  scope: ShareScope;
  
  /**
   * Whether these permissions are inherited from a parent
   */
  is_inherited?: boolean;
  
  /**
   * Source context ID if inherited
   */
  source_context_id?: string;
}

// ============================================================================
// Permission Grant
// ============================================================================

/**
 * Permission Grant
 * 
 * Represents a grant of permissions to a subject.
 */
export interface PermissionGrant {
  id: string;
  entity_type: string;
  entity_id: string;
  subject_type: PermissionSubjectType;
  subject_id: string;
  flags: PermissionFlags;
  granted_by: string;
  granted_at: string;
  updated_at: string;
}

/**
 * Permission Grant with Display Info
 * 
 * Includes display information for the subject.
 */
export interface PermissionGrantWithDisplay extends PermissionGrant {
  display_name: string;
  avatar_url?: string;
  email?: string;
}

// ============================================================================
// Role to Flags Mapping
// ============================================================================

/**
 * Map a role to permission flags
 * 
 * This provides default flags for a role.
 * Individual grants can override these defaults.
 */
export function roleToFlags(role: PermissionRole, options?: {
  detail_level?: DetailLevel;
  scope?: ShareScope;
}): PermissionFlags {
  const baseFlags: PermissionFlags = {
    can_view: true,
    can_comment: false,
    can_edit: false,
    can_manage: false,
    detail_level: options?.detail_level || 'detailed',
    scope: options?.scope || 'this_only',
  };
  
  switch (role) {
    case 'owner':
      return {
        ...baseFlags,
        can_comment: true,
        can_edit: true,
        can_manage: true,
      };
    
    case 'editor':
      return {
        ...baseFlags,
        can_comment: true,
        can_edit: true,
        can_manage: false,
      };
    
    case 'commenter':
      return {
        ...baseFlags,
        can_comment: true,
        can_edit: false,
        can_manage: false,
      };
    
    case 'viewer':
      return {
        ...baseFlags,
        can_comment: false,
        can_edit: false,
        can_manage: false,
      };
  }
}

/**
 * Approximate flags to a role
 * 
 * This is a best-effort mapping for display purposes.
 * Not all flag combinations map cleanly to roles.
 */
export function flagsToRoleApprox(flags: PermissionFlags): PermissionRole {
  if (flags.can_manage) {
    return 'owner';
  }
  
  if (flags.can_edit) {
    return 'editor';
  }
  
  if (flags.can_comment) {
    return 'commenter';
  }
  
  return 'viewer';
}

// ============================================================================
// Permission Check Helpers
// ============================================================================

/**
 * Check if flags allow a specific access level
 */
export function hasAccess(flags: PermissionFlags, access: PermissionAccess): boolean {
  switch (access) {
    case 'view':
      return flags.can_view;
    case 'comment':
      return flags.can_comment;
    case 'edit':
      return flags.can_edit;
    case 'manage':
      return flags.can_manage;
  }
}

/**
 * Merge permission flags (for inheritance)
 * 
 * Child flags inherit from parent, but can be more restrictive.
 * Child cannot grant more permissions than parent.
 */
export function mergePermissionFlags(
  parent: PermissionFlags,
  child: PermissionFlags
): PermissionFlags {
  return {
    can_view: parent.can_view && child.can_view,
    can_comment: parent.can_comment && child.can_comment,
    can_edit: parent.can_edit && child.can_edit,
    can_manage: parent.can_manage && child.can_manage,
    detail_level: child.detail_level === 'overview' ? 'overview' : parent.detail_level,
    scope: child.scope === 'this_only' ? 'this_only' : parent.scope,
    is_inherited: true,
    source_context_id: parent.source_context_id,
  };
}

/**
 * Default permission flags (no access)
 */
export const NO_ACCESS_FLAGS: PermissionFlags = {
  can_view: false,
  can_comment: false,
  can_edit: false,
  can_manage: false,
  detail_level: 'overview',
  scope: 'this_only',
};

/**
 * Full access permission flags (owner)
 */
export const FULL_ACCESS_FLAGS: PermissionFlags = {
  can_view: true,
  can_comment: true,
  can_edit: true,
  can_manage: true,
  detail_level: 'detailed',
  scope: 'include_children',
};

