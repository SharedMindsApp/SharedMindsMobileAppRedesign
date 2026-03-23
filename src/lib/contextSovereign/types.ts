/**
 * Context-Sovereign Calendar & Travel System - Type Definitions
 * 
 * ⚠️ EXPERIMENTAL: This is a parallel system that does NOT replace existing calendars.
 * 
 * Architecture Principles:
 * 1. Contexts own events (not calendars)
 * 2. Calendars are read models (aggregation layers)
 * 3. Visibility is explicit and revocable (projection-based)
 * 4. Nothing auto-appears (opt-in only)
 * 5. Linking contexts ≠ sharing data
 * 
 * What This Is NOT:
 * - NOT a replacement for household calendar (calendar_events)
 * - NOT a replacement for existing membership systems
 * - NOT auto-synced to existing calendars
 * - NOT visible without explicit projection acceptance
 * 
 * What This IS:
 * - A parallel ownership model for events
 * - An explicit projection system for visibility control
 * - A foundation for context-sovereign features
 * - An incremental adoption path
 */

// ============================================================================
// Enums (matching database types)
// ============================================================================

export type ContextType = 'personal' | 'project' | 'trip' | 'shared_space';

export type ContextRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type ContextMemberStatus = 'pending' | 'accepted' | 'declined' | 'removed';

export type ContextEventType =
  | 'meeting'
  | 'travel'
  | 'milestone'
  | 'deadline'
  | 'reminder'
  | 'block'
  | 'social'
  | 'personal';

export type EventTimeScope = 'timed' | 'all_day' | 'abstract';

export type EventScope = 'container' | 'item';

export type ProjectionScope = 'date_only' | 'title' | 'full';

export type ProjectionStatus = 'suggested' | 'pending' | 'accepted' | 'declined' | 'revoked';

// ============================================================================
// Context
// ============================================================================

/**
 * Context - A container that owns events and has members
 * 
 * Contexts exist in PARALLEL to existing systems:
 * - They do NOT replace households, projects, trips, or spaces
 * - They provide a unified ownership model
 * - They can optionally link to existing entities (linked_*_id fields)
 */
export interface Context {
  id: string;
  type: ContextType;
  owner_user_id: string;
  
  // Metadata
  name: string;
  description: string;
  metadata: Record<string, any>;
  
  // Optional links to existing systems
  linked_project_id: string | null;
  linked_trip_id: string | null;
  linked_space_id: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Context with expanded data (includes member count, event count, etc.)
 */
export interface ContextWithStats extends Context {
  member_count: number;
  event_count: number;
  pending_projection_count: number;
}

/**
 * Input for creating a new context
 */
export interface CreateContextInput {
  type: ContextType;
  owner_user_id: string;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  
  // Optional: Link to existing entity
  linked_project_id?: string;
  linked_trip_id?: string;
  linked_space_id?: string;
}

/**
 * Input for updating a context
 */
export interface UpdateContextInput {
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Context Members
// ============================================================================

/**
 * Context Member - User membership in a context
 * 
 * This is PARALLEL to existing membership systems:
 * - household_members
 * - project_users
 * - trip_collaborators
 * - space_members
 * 
 * It does NOT replace them. Used only for context-owned features.
 */
export interface ContextMember {
  id: string;
  context_id: string;
  user_id: string;
  
  // Role and status
  role: ContextRole;
  status: ContextMemberStatus;
  
  // Invitation metadata
  invited_by: string | null;
  invited_at: string;
  responded_at: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Context Member with user profile data
 */
export interface ContextMemberWithProfile extends ContextMember {
  profile: {
    id: string;
    email: string;
    name: string | null;
  };
}

/**
 * Input for adding a member to a context
 */
export interface AddContextMemberInput {
  context_id: string;
  user_id: string;
  role: ContextRole;
  invited_by: string;
}

/**
 * Input for updating a member's role or status
 */
export interface UpdateContextMemberInput {
  role?: ContextRole;
  status?: ContextMemberStatus;
  responded_at?: string;
}

// ============================================================================
// Context Events
// ============================================================================

/**
 * Context Event - An event owned by a context
 * 
 * These events are SEPARATE from calendar_events (household calendar).
 * They are invisible until explicitly projected to a user's calendar.
 * 
 * Key differences from calendar_events:
 * - Owned by contexts (not households)
 * - Not visible by default (require projection)
 * - Context permission model (not household membership)
 * - Revocable visibility (projections can be revoked)
 * 
 * Nesting support:
 * - Container events: Macro time blocks (e.g., "Trip to Amsterdam" Feb 2-9)
 * - Nested events: Micro detail items (e.g., "Flight", "Hotel") inside containers
 * - Max nesting depth = 1 (container → item only)
 */
export interface ContextEvent {
  id: string;
  context_id: string;
  created_by: string;
  
  // Event classification
  event_type: ContextEventType;
  time_scope: EventTimeScope;
  event_scope: EventScope;  // 'container' or 'item'
  
  // Nesting (for nested items)
  parent_context_event_id: string | null;  // NULL for containers, required for items
  
  // Event data
  title: string;
  description: string;
  location: string;
  
  // Time fields
  start_at: string;
  end_at: string;
  timezone: string;
  
  // Metadata (event-specific data)
  metadata: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Context Event with context data
 */
export interface ContextEventWithContext extends ContextEvent {
  context: Context;
}

/**
 * Container Event - Macro time block
 * 
 * Represents a bounded period of time (e.g., trip, project phase).
 * Can be projected to calendars as a single block.
 * Carries NO internal detail by default.
 */
export interface ContainerEvent extends ContextEvent {
  event_scope: 'container';
  parent_context_event_id: null;
}

/**
 * Nested Event - Micro detail inside a container
 * 
 * Owned by a container event.
 * Examples: Flight, Hotel check-in, Meeting, Deadline.
 * Can be selectively projected.
 * Never auto-leaks when container is shared.
 */
export interface NestedEvent extends ContextEvent {
  event_scope: 'item';
  parent_context_event_id: string;  // Required: must reference a container
}

/**
 * Context Event with nested children
 */
export interface ContextEventWithChildren extends ContextEvent {
  nested_events: NestedEvent[];
}

/**
 * Context Event with projection data (for personal calendar view)
 */
export interface ContextEventWithProjection extends ContextEvent {
  projection: {
    id: string;
    scope: ProjectionScope;
    status: ProjectionStatus;
    accepted_at: string | null;
  } | null;
}

/**
 * Input for creating a context event
 */
export interface CreateContextEventInput {
  context_id: string;
  created_by: string;
  event_type: ContextEventType;
  time_scope: EventTimeScope;
  event_scope?: EventScope;  // Defaults to 'item' for backward compatibility
  parent_context_event_id?: string | null;  // Required if event_scope = 'item'
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

/**
 * Input for creating a container event (macro time block)
 */
export interface CreateContainerEventInput {
  context_id: string;
  created_by: string;
  event_type: ContextEventType;
  time_scope: EventTimeScope;
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

/**
 * Input for creating a nested event (micro detail inside container)
 */
export interface CreateNestedEventInput {
  context_id: string;
  created_by: string;
  parent_context_event_id: string;  // Required: must reference a container
  event_type: ContextEventType;
  time_scope: EventTimeScope;
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

/**
 * Input for updating a context event
 */
export interface UpdateContextEventInput {
  event_type?: ContextEventType;
  time_scope?: EventTimeScope;
  event_scope?: EventScope;
  parent_context_event_id?: string | null;
  title?: string;
  description?: string;
  location?: string;
  start_at?: string;
  end_at?: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Calendar Projections
// ============================================================================

/**
 * Calendar Projection - Explicit event visibility control
 * 
 * This is the CORE INNOVATION of the system:
 * - Events do NOT appear in calendars without projections
 * - Users must ACCEPT projections (opt-in)
 * - Projections can be REVOKED (immediate hiding)
 * - No auto-sync (all projection is explicit)
 * 
 * ⚠️ PERMISSION SOVEREIGNTY:
 * - Permissions come ONLY from projection metadata
 * - Calendar views do NOT define permissions
 * - Shared calendars are NOT inherently read-only
 * - Personal calendars can be read-only for others
 * 
 * Projection lifecycle:
 * 1. suggested → System suggests (user hasn't seen)
 * 2. pending → Explicitly offered (awaiting user action)
 * 3. accepted → User accepted (visible in calendar)
 * 4. declined → User declined (hidden)
 * 5. revoked → Owner revoked (immediately hidden)
 */
export interface CalendarProjection {
  id: string;
  event_id: string;
  target_user_id: string;
  target_space_id: string | null;
  
  // Projection settings
  scope: ProjectionScope;
  status: ProjectionStatus;
  
  /**
   * Permission metadata (stored in projection)
   * These define what the target user can do with this event
   * 
   * Defaults (if not specified):
   * - can_view: true (if status === 'accepted')
   * - can_edit: false (projected events are read-only by default)
   * - detail_level: 'overview' (if scope === 'date_only' or 'title'), 'detailed' (if scope === 'full')
   * - scope: 'container' (for container events), 'container+items' (if nested events also projected)
   */
  can_edit?: boolean;  // Default: false
  detail_level?: 'overview' | 'detailed';  // Default: derived from scope
  nested_scope?: 'container' | 'container+items';  // Default: 'container'
  
  // Metadata
  created_by: string;
  
  // Timestamps
  created_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  revoked_at: string | null;
}

/**
 * Calendar Projection with event data
 */
export interface CalendarProjectionWithEvent extends CalendarProjection {
  event: ContextEvent;
  context: Context;
}

/**
 * Input for creating a projection
 */
export interface CreateProjectionInput {
  event_id: string;
  target_user_id: string;
  target_space_id?: string | null;
  scope: ProjectionScope;
  status?: ProjectionStatus;
  created_by: string;
  
  /**
   * Permission settings (optional, defaults applied if not specified)
   */
  can_edit?: boolean;  // Default: false
  detail_level?: 'overview' | 'detailed';  // Default: derived from scope
  nested_scope?: 'container' | 'container+items';  // Default: 'container'
}

/**
 * Input for updating a projection
 */
export interface UpdateProjectionInput {
  scope?: ProjectionScope;
  status?: ProjectionStatus;
  can_edit?: boolean;
  detail_level?: 'overview' | 'detailed';
  nested_scope?: 'container' | 'container+items';
  accepted_at?: string | null;
  declined_at?: string | null;
  revoked_at?: string | null;
}

// ============================================================================
// Calendar Projection Permissions (Re-export from canonical types)
// ============================================================================

/**
 * Calendar Projection Permissions
 * 
 * ⚠️ CRITICAL: Permissions come ONLY from projection metadata.
 * Calendar views do NOT define permissions.
 * Users define permissions via projections.
 * 
 * This is now an alias for the canonical PermissionFlags type.
 * Use PermissionFlags from src/lib/permissions/types.ts everywhere.
 */
import type { PermissionFlags, DetailLevel, ShareScope } from '../permissions/types';

export type CalendarProjectionPermissions = PermissionFlags;

// Legacy type aliases for backward compatibility
export type { DetailLevel, ShareScope };

// ============================================================================
// Calendar View Modes
// ============================================================================

/**
 * Calendar view mode
 * 
 * Determines which calendar is being viewed.
 * Does NOT determine permissions - permissions come from projections.
 */
export type CalendarViewMode = 'personal' | 'shared';

/**
 * Container Calendar Block
 * 
 * Represents a container event in calendar view.
 * Used for both personal and shared calendars.
 * 
 * ⚠️ Permissions come from projection metadata, not calendar type.
 */
export interface ContainerCalendarBlock {
  id: string;
  title: string;
  description: string;  // May be stripped if detail_level === 'overview'
  location: string;  // May be stripped if detail_level === 'overview'
  start_at: string;
  end_at: string;
  timezone: string;
  context_id: string;
  context_name: string;
  context_type: ContextType;
  event_type: ContextEventType;
  time_scope: EventTimeScope;
  projection_id: string | null;
  is_own_event: boolean;
  
  /**
   * Explicit permissions from projection metadata
   * Service layer enforces these - UI should never infer permissions
   */
  permissions: CalendarProjectionPermissions;
}

/**
 * Nested Calendar Item
 * 
 * Represents a nested event in calendar view.
 * 
 * ⚠️ Can appear in shared calendars IF permission allows.
 * Visibility determined by projection scope, not calendar type.
 */
export interface NestedCalendarItem {
  id: string;
  title: string;
  description: string;  // May be stripped if detail_level === 'overview'
  location: string;  // May be stripped if detail_level === 'overview'
  start_at: string;
  end_at: string;
  timezone: string;
  parent_event_id: string;
  parent_event_title: string;
  context_id: string;
  context_name: string;
  context_type: ContextType;
  event_type: ContextEventType;
  time_scope: EventTimeScope;
  projection_id: string | null;
  is_own_event: boolean;
  
  /**
   * Explicit permissions from projection metadata
   * Service layer enforces these - UI should never infer permissions
   */
  permissions: CalendarProjectionPermissions;
}

/**
 * Projection Permission State
 * 
 * Tracks projection status for container and nested events.
 */
export interface ProjectionPermissionState {
  container_projection: {
    id: string | null;
    status: ProjectionStatus;
    scope: ProjectionScope;
  } | null;
  nested_projections: Array<{
    event_id: string;
    projection_id: string | null;
    status: ProjectionStatus;
    scope: ProjectionScope;
  }>;
}

// ============================================================================
// Personal Calendar (Read Model)
// ============================================================================

/**
 * Personal Calendar Item - Aggregated view for user's calendar
 * 
 * This is a READ MODEL (not a table). It aggregates:
 * - Accepted projections from context events
 * - User's own context events
 * - (Future) Integrated with existing household calendar
 * 
 * This is NOT stored in database. It's computed on-demand.
 */
export interface PersonalCalendarItem {
  // Event data (from context_events)
  id: string;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  timezone: string;
  
  // Event classification
  event_type: ContextEventType;
  time_scope: EventTimeScope;
  
  // Context attribution
  context_id: string;
  context_name: string;
  context_type: ContextType;
  
  // Projection info
  projection_id: string;
  projection_scope: ProjectionScope;
  is_own_event: boolean;  // User is event creator
  
  // Computed fields
  color: string;  // Computed from event_type or context
  can_edit: boolean;  // User has edit permission in context
}

/**
 * Personal Calendar Query Filters
 */
export interface PersonalCalendarFilters {
  start_date?: string;
  end_date?: string;
  context_types?: ContextType[];
  context_ids?: string[];
  event_types?: ContextEventType[];
  only_own_events?: boolean;
}

// ============================================================================
// Permission Check Results
// ============================================================================

/**
 * Permission check result
 */
export interface PermissionCheck {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  reason?: string;
}

// ============================================================================
// Service Response Types
// ============================================================================

/**
 * Standard service response
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * List response with pagination
 */
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================================
// Feature Flags (for gradual rollout)
// ============================================================================

/**
 * Context-sovereign feature flags
 * 
 * These control gradual adoption:
 * - All start disabled (existing behavior preserved)
 * - Enable per-user or per-context
 * - Can be rolled back by disabling
 */
export interface ContextFeatureFlags {
  // Core features
  enable_context_system: boolean;              // Master switch
  enable_context_events: boolean;              // Context-owned events
  enable_projections: boolean;                 // Projection system
  enable_personal_calendar_aggregation: boolean;  // Personal calendar read model
  
  // Context types
  enable_personal_contexts: boolean;           // User personal contexts
  enable_project_contexts: boolean;            // Guardrails projects as contexts
  enable_trip_contexts: boolean;               // Travel trips as contexts
  enable_space_contexts: boolean;              // Shared spaces as contexts
  
  // Integration (future)
  enable_legacy_household_integration: boolean;  // Show household events alongside
  enable_trip_itinerary_projection: boolean;     // Project trip itinerary to calendar
}

/**
 * Default feature flags (all disabled for safety)
 */
export const DEFAULT_FEATURE_FLAGS: ContextFeatureFlags = {
  enable_context_system: false,
  enable_context_events: false,
  enable_projections: false,
  enable_personal_calendar_aggregation: false,
  enable_personal_contexts: false,
  enable_project_contexts: false,
  enable_trip_contexts: false,
  enable_space_contexts: false,
  enable_legacy_household_integration: false,
  enable_trip_itinerary_projection: false,
};

// ============================================================================
// Type Guards
// ============================================================================

export function isContextEvent(obj: any): obj is ContextEvent {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.context_id === 'string' &&
    typeof obj.event_type === 'string' &&
    typeof obj.time_scope === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.start_at === 'string' &&
    typeof obj.end_at === 'string'
  );
}

export function isCalendarProjection(obj: any): obj is CalendarProjection {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.event_id === 'string' &&
    typeof obj.target_user_id === 'string' &&
    typeof obj.scope === 'string' &&
    typeof obj.status === 'string'
  );
}

export function isContext(obj: any): obj is Context {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.owner_user_id === 'string' &&
    typeof obj.name === 'string'
  );
}

