/**
 * Context-Sovereign Calendar & Travel System - Public API
 * 
 * ⚠️ EXPERIMENTAL: This is a parallel system that does NOT replace existing calendars.
 * 
 * Usage:
 * ```typescript
 * import { createContext, createContextEvent, createProjection } from '@/lib/contextSovereign';
 * ```
 * 
 * Architecture:
 * - Contexts own events (not calendars)
 * - Calendars are read models (aggregation layers)
 * - Visibility is explicit and revocable (projection-based)
 * - Nothing auto-appears (opt-in only)
 * 
 * Feature Flags:
 * All features are disabled by default. Enable via feature flags in types.ts
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Enums
  ContextType,
  ContextRole,
  ContextMemberStatus,
  ContextEventType,
  EventTimeScope,
  ProjectionScope,
  ProjectionStatus,
  
  // Context
  Context,
  ContextWithStats,
  CreateContextInput,
  UpdateContextInput,
  
  // Context Members
  ContextMember,
  ContextMemberWithProfile,
  AddContextMemberInput,
  UpdateContextMemberInput,
  
  // Context Events
  ContextEvent,
  ContextEventWithContext,
  ContextEventWithProjection,
  CreateContextEventInput,
  UpdateContextEventInput,
  
  // Calendar Projections
  CalendarProjection,
  CalendarProjectionWithEvent,
  CreateProjectionInput,
  UpdateProjectionInput,
  
  // Personal Calendar
  PersonalCalendarItem,
  PersonalCalendarFilters,
  
  // Utilities
  PermissionCheck,
  ServiceResponse,
  ListResponse,
  ContextFeatureFlags,
} from './types';

export {
  DEFAULT_FEATURE_FLAGS,
  isContextEvent,
  isCalendarProjection,
  isContext,
} from './types';

// ============================================================================
// Context Service
// ============================================================================

export {
  // Context CRUD
  createContext,
  getContext,
  getUserContexts,
  updateContext,
  deleteContext,
  
  // Context Members
  getContextMembers,
  addContextMember,
  updateContextMember,
  removeContextMember,
  
  // Permissions
  checkContextPermissions,
  canUserViewContext,
  canUserEditContext,
} from './contextService';

// ============================================================================
// Context Events Service
// ============================================================================

export {
  // Event CRUD
  createContextEvent,
  getContextEvent,
  getContextEvents,
  getUserCreatedEvents,
  updateContextEvent,
  deleteContextEvent,
  
  // Bulk Operations
  createContextEventsBulk,
  deleteAllContextEvents,
  
  // Query Helpers
  getUserEvents,
  getUpcomingContextEvents,
  getContextEventCount,
} from './contextEventsService';

// ============================================================================
// Projections Service
// ============================================================================

export {
  // Projection CRUD
  createProjection,
  getProjection,
  getUserProjections,
  getEventProjections,
  updateProjection,
  deleteProjection,
  
  // User Actions
  acceptProjection,
  declineProjection,
  revokeProjection,
  
  // Bulk Operations
  projectToAllMembers,
  revokeAllProjections,
  acceptAllPendingProjections,
  
  // Query Helpers
  getPendingProjectionCount,
  hasAcceptedProjection,
} from './projectionsService';

// ============================================================================
// Personal Calendar Service
// ============================================================================

export {
  // Read Model Queries
  getPersonalCalendarItems,
  getUpcomingPersonalItems,
  getTodayPersonalItems,
  getWeekPersonalItems,
  getMonthPersonalItems,
  
  // Query Helpers
  countPersonalCalendarItems,
  hasPersonalCalendarItems,
  
  // Utilities
  getEventColorClass,
} from './personalCalendarService';

