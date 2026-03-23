/**
 * Task & Event View Model
 *
 * Shared interpretation layer for tasks and events across all UI surfaces.
 *
 * CRITICAL CONSTRAINTS:
 * - Read-only derivation from authoritative data
 * - No state storage
 * - No business logic
 * - No mutations
 * - Single source of interpretation
 *
 * Used by:
 * - Mind Mesh (visual badges, inspector)
 * - Calendar (event status)
 * - Task Flow (task status)
 * - Personal Spaces (references)
 * - Daily Alignment (planning)
 */

/**
 * Task Status
 *
 * Derived from roadmap_items.status field.
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

/**
 * Event Status
 *
 * Derived temporally from start/end times.
 */
export type EventStatus = 'upcoming' | 'in_progress' | 'completed';

/**
 * Task/Event Type
 */
export type TaskEventType = 'task' | 'event';

/**
 * Source Context
 *
 * Where was this entity created?
 */
export type SourceContext = 'mindmesh' | 'roadmap' | 'taskflow';

/**
 * Task View Model
 *
 * Enriched view of a task with derived presentation fields.
 */
export interface TaskViewModel {
  id: string;
  type: 'task';
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string | null;
  projectId: string;
  projectName: string;
  trackId: string;
  trackName: string;
  trackColor: string | null;
  createdInMindMesh: boolean;
  hasMindMeshContainer: boolean;
  mindMeshContainerId: string | null;
}

/**
 * Event View Model
 *
 * Enriched view of an event with derived presentation fields.
 */
export interface EventViewModel {
  id: string;
  type: 'event';
  title: string;
  description: string | null;
  status: EventStatus;
  startsAt: string;
  endsAt: string | null;
  projectId: string;
  projectName: string;
  trackId: string;
  trackName: string;
  trackColor: string | null;
  createdInMindMesh: boolean;
  hasMindMeshContainer: boolean;
  mindMeshContainerId: string | null;
}

/**
 * Unified Task/Event View Model
 */
export type TaskEventViewModel = TaskViewModel | EventViewModel;

/**
 * Derives task status from roadmap_items.status field.
 *
 * Maps Guardrails status to presentation status.
 */
export function deriveTaskStatus(status: string | null | undefined): TaskStatus {
  const normalized = (status || 'pending').toLowerCase().trim();

  if (normalized === 'completed' || normalized === 'done') {
    return 'completed';
  }

  if (normalized === 'in_progress' || normalized === 'in progress' || normalized === 'active') {
    return 'in_progress';
  }

  if (normalized === 'blocked') {
    return 'blocked';
  }

  return 'pending';
}

/**
 * Derives event status from temporal position.
 *
 * Compares current time against start/end times.
 */
export function deriveEventStatus(
  startsAt: string,
  endsAt: string | null
): EventStatus {
  const now = new Date();
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;

  // If end time exists and has passed, event is completed
  if (end && now > end) {
    return 'completed';
  }

  // If no end time but start time has passed, treat as completed after 24 hours
  if (!end && now > start) {
    const hoursSinceStart = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (hoursSinceStart > 24) {
      return 'completed';
    }
    return 'in_progress';
  }

  // If currently between start and end, event is in progress
  if (now >= start && (!end || now <= end)) {
    return 'in_progress';
  }

  // Otherwise, event is upcoming
  return 'upcoming';
}

/**
 * Status Display Configuration
 *
 * Provides consistent styling and labels across all surfaces.
 */
export interface StatusDisplay {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

/**
 * Gets display configuration for task status.
 */
export function getTaskStatusDisplay(status: TaskStatus): StatusDisplay {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        icon: '✓',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        icon: '▶',
      };
    case 'blocked':
      return {
        label: 'Blocked',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        icon: '⊗',
      };
    case 'pending':
    default:
      return {
        label: 'Pending',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        icon: '○',
      };
  }
}

/**
 * Gets display configuration for event status.
 */
export function getEventStatusDisplay(status: EventStatus): StatusDisplay {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        icon: '✓',
      };
    case 'in_progress':
      return {
        label: 'Happening Now',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        icon: '●',
      };
    case 'upcoming':
    default:
      return {
        label: 'Upcoming',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        icon: '◷',
      };
  }
}

/**
 * Type Display Configuration
 */
export interface TypeDisplay {
  label: string;
  icon: string;
  color: string;
}

/**
 * Gets display configuration for task/event type.
 */
export function getTypeDisplay(type: TaskEventType): TypeDisplay {
  switch (type) {
    case 'task':
      return {
        label: 'Task',
        icon: '✓',
        color: 'text-green-600',
      };
    case 'event':
      return {
        label: 'Event',
        icon: '📅',
        color: 'text-orange-600',
      };
  }
}

/**
 * Formats due date/time for display.
 *
 * Provides human-readable relative time.
 */
export function formatDueDate(dueAt: string | null): string | null {
  if (!dueAt) return null;

  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMs < 0) {
    return 'Overdue';
  }

  if (diffDays === 0) {
    if (diffHours === 0) {
      return 'Due now';
    }
    return `Due in ${diffHours}h`;
  }

  if (diffDays === 1) {
    return 'Due tomorrow';
  }

  if (diffDays < 7) {
    return `Due in ${diffDays} days`;
  }

  return due.toLocaleDateString();
}

/**
 * Formats event time window for display.
 */
export function formatEventTimeWindow(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;

  const startDate = start.toLocaleDateString();
  const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!end) {
    return `${startDate} at ${startTime}`;
  }

  const endDate = end.toLocaleDateString();
  const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (startDate === endDate) {
    return `${startDate}, ${startTime} - ${endTime}`;
  }

  return `${startDate} ${startTime} - ${endDate} ${endTime}`;
}

/**
 * Checks if a task is due today.
 */
export function isDueToday(dueAt: string | null): boolean {
  if (!dueAt) return false;

  const due = new Date(dueAt);
  const now = new Date();

  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

/**
 * Checks if an event is happening today.
 */
export function isHappeningToday(startsAt: string, endsAt: string | null): boolean {
  const now = new Date();
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Event starts today
  if (start >= today && start < tomorrow) {
    return true;
  }

  // Event ends today
  if (end && end >= today && end < tomorrow) {
    return true;
  }

  // Event spans today
  if (start < today && (!end || end >= today)) {
    return true;
  }

  return false;
}

/**
 * Gets authoritative surface for editing.
 *
 * Tells users where to make changes.
 */
export function getAuthoritativeSurface(type: TaskEventType): {
  name: string;
  path: string;
} {
  switch (type) {
    case 'task':
      return {
        name: 'Task Flow',
        path: '/guardrails/taskflow',
      };
    case 'event':
      return {
        name: 'Calendar',
        path: '/calendar',
      };
  }
}

/**
 * Source Context Display
 */
export function getSourceLabel(createdInMindMesh: boolean): string {
  return createdInMindMesh ? 'Created in Mind Mesh' : 'Created in Roadmap';
}
