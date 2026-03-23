/**
 * Permission Enforcement Helpers
 * 
 * Service-layer helpers for enforcing permissions.
 * These functions are used in services, NOT in UI.
 * 
 * Rules:
 * - Filter out entities if can_view === false
 * - Strip details if detail_level === 'overview'
 * - Block mutations if can_edit === false
 */

import type { PermissionFlags } from './types';

/**
 * Permission Error
 * 
 * Thrown when a permission check fails.
 */
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Enforce Visibility
 * 
 * Filters out entities if can_view === false.
 * Returns null if entity should be hidden.
 */
export function enforceVisibility<T extends { id: string }>(
  entity: T | null,
  flags: PermissionFlags | null | undefined
): T | null {
  if (!entity) return null;
  
  if (!flags || !flags.can_view) {
    return null; // Entity is hidden
  }
  
  return entity;
}

/**
 * Redact Details
 * 
 * Strips detail fields if detail_level === 'overview'.
 * Titles and time bounds remain visible.
 */
export function redactDetails<T extends Record<string, any>>(
  entity: T,
  flags: PermissionFlags | null | undefined
): T {
  if (!flags || flags.detail_level === 'detailed') {
    return entity; // Full details allowed
  }
  
  // Create a copy and strip detail fields
  const redacted = { ...entity };
  
  // Strip description
  if ('description' in redacted) {
    redacted.description = null;
  }
  
  // Strip location
  if ('location' in redacted) {
    redacted.location = null;
  }
  
  // Strip itinerary detail (for trips)
  if ('itinerary' in redacted && Array.isArray(redacted.itinerary)) {
    redacted.itinerary = []; // Hide itinerary items
  }
  
  // Strip nested events (for container events)
  if ('nested_events' in redacted && Array.isArray(redacted.nested_events)) {
    redacted.nested_events = []; // Hide nested events
  }
  
  // Strip metadata
  if ('metadata' in redacted) {
    redacted.metadata = null;
  }
  
  return redacted;
}

/**
 * Assert Can Edit
 * 
 * Throws PermissionError if can_edit === false.
 * Use this before any mutation operations.
 */
export function assertCanEdit(flags: PermissionFlags | null | undefined): void {
  if (!flags || !flags.can_edit) {
    throw new PermissionError('You do not have permission to edit this entity');
  }
}

/**
 * Filter Nested Events by Scope
 * 
 * Filters nested events based on scope.
 * - 'this_only': Returns empty array
 * - 'include_children': Returns nested events (if permitted)
 */
export function filterNestedByScope<T extends { id: string }>(
  nested: T[],
  flags: PermissionFlags | null | undefined
): T[] {
  if (!flags || flags.scope === 'this_only') {
    return []; // Hide nested items
  }
  
  return nested; // Include nested items
}

/**
 * Get Effective Permission Flags
 * 
 * Computes effective permissions for an entity.
 * Handles inheritance and defaults.
 */
export function getEffectiveFlags(
  flags: PermissionFlags | null | undefined,
  isOwner: boolean
): PermissionFlags {
  if (!flags) {
    // Default: private, no access
    return {
      can_view: false,
      can_comment: false,
      can_edit: false,
      can_manage: false,
      detail_level: 'overview',
      scope: 'this_only',
    };
  }
  
  // Owner always has full permissions
  if (isOwner) {
    return {
      ...flags,
      can_edit: true,
      can_manage: true,
      detail_level: 'detailed',
      scope: 'include_children',
    };
  }
  
  return flags;
}

