/**
 * Mind Mesh V2 Container Capability System
 *
 * Defines what each container type can do, what fields it exposes,
 * what children it can contain, and how it appears visually.
 *
 * This is a declarative configuration - behavioral enforcement
 * is handled by the intent system and UI components.
 */

import type { GuardrailsEntityType } from './types';

/**
 * Container types recognized by the system.
 * Derived from entity_type or inferred for local-only containers.
 */
export type ContainerType =
  | 'track'
  | 'subtrack'
  | 'task'
  | 'event'
  | 'note'
  | 'idea';

/**
 * Editable field configuration per container type.
 */
export interface EditableFields {
  title: boolean;
  body: boolean;
  status: boolean;
  startDate: boolean;
  endDate: boolean;
  dueDate: boolean;
}

/**
 * Hierarchy rules for what children a container can contain.
 */
export interface HierarchyRules {
  allowedChildTypes: ContainerType[];
  supportsCollapse: boolean;
  allowsDeepNesting: boolean;
}

/**
 * Behavioral flags for container capabilities.
 */
export interface BehavioralFlags {
  supportsInlineEditing: boolean;
  supportsInspectorEditing: boolean;
  showsStatusBadge: boolean;
  participatesInCalendarSync: boolean;
}

/**
 * Authority and sync expectations (declarative only).
 */
export type AuthorityType = 'local_only' | 'integrated';

/**
 * Visual treatment configuration.
 */
export interface VisualTreatment {
  primaryColor: string;
  borderColor: string;
  backgroundColor: string;
  badgeIcon: string;
  badgeLabel: string;
}

/**
 * Complete capability profile for a container type.
 */
export interface ContainerCapabilityProfile {
  type: ContainerType;
  editableFields: EditableFields;
  hierarchyRules: HierarchyRules;
  behavioralFlags: BehavioralFlags;
  defaultAuthority: AuthorityType;
  visualTreatment: VisualTreatment;
}

/**
 * Central registry of container capability profiles.
 */
const CAPABILITY_PROFILES: Record<ContainerType, ContainerCapabilityProfile> = {
  track: {
    type: 'track',
    editableFields: {
      title: true,
      body: true,
      status: false,
      startDate: false,
      endDate: false,
      dueDate: false,
    },
    hierarchyRules: {
      allowedChildTypes: ['subtrack', 'task', 'event'],
      supportsCollapse: true,
      allowsDeepNesting: false,
    },
    behavioralFlags: {
      supportsInlineEditing: true,
      supportsInspectorEditing: true,
      showsStatusBadge: false,
      participatesInCalendarSync: false,
    },
    defaultAuthority: 'integrated',
    visualTreatment: {
      primaryColor: '#3B82F6',
      borderColor: '#93C5FD',
      backgroundColor: '#EFF6FF',
      badgeIcon: '🎯',
      badgeLabel: 'Track',
    },
  },

  subtrack: {
    type: 'subtrack',
    editableFields: {
      title: true,
      body: true,
      status: false,
      startDate: false,
      endDate: false,
      dueDate: false,
    },
    hierarchyRules: {
      allowedChildTypes: ['subtrack', 'task', 'event'],
      supportsCollapse: true,
      allowsDeepNesting: true,
    },
    behavioralFlags: {
      supportsInlineEditing: true,
      supportsInspectorEditing: true,
      showsStatusBadge: false,
      participatesInCalendarSync: false,
    },
    defaultAuthority: 'integrated',
    visualTreatment: {
      primaryColor: '#8B5CF6',
      borderColor: '#C4B5FD',
      backgroundColor: '#F5F3FF',
      badgeIcon: '📋',
      badgeLabel: 'Subtrack',
    },
  },

  task: {
    type: 'task',
    editableFields: {
      title: true,
      body: true,
      status: true,
      startDate: false,
      endDate: false,
      dueDate: true,
    },
    hierarchyRules: {
      allowedChildTypes: [],
      supportsCollapse: false,
      allowsDeepNesting: false,
    },
    behavioralFlags: {
      supportsInlineEditing: true,
      supportsInspectorEditing: true,
      showsStatusBadge: true,
      participatesInCalendarSync: true,
    },
    defaultAuthority: 'integrated',
    visualTreatment: {
      primaryColor: '#10B981',
      borderColor: '#86EFAC',
      backgroundColor: '#F0FDF4',
      badgeIcon: '✓',
      badgeLabel: 'Task',
    },
  },

  event: {
    type: 'event',
    editableFields: {
      title: true,
      body: true,
      status: false,
      startDate: true,
      endDate: true,
      dueDate: false,
    },
    hierarchyRules: {
      allowedChildTypes: [],
      supportsCollapse: false,
      allowsDeepNesting: false,
    },
    behavioralFlags: {
      supportsInlineEditing: true,
      supportsInspectorEditing: true,
      showsStatusBadge: true,
      participatesInCalendarSync: true,
    },
    defaultAuthority: 'integrated',
    visualTreatment: {
      primaryColor: '#F59E0B',
      borderColor: '#FCD34D',
      backgroundColor: '#FFFBEB',
      badgeIcon: '📅',
      badgeLabel: 'Event',
    },
  },

  note: {
    type: 'note',
    editableFields: {
      title: true,
      body: true,
      status: false,
      startDate: false,
      endDate: false,
      dueDate: false,
    },
    hierarchyRules: {
      allowedChildTypes: [],
      supportsCollapse: false,
      allowsDeepNesting: false,
    },
    behavioralFlags: {
      supportsInlineEditing: true,
      supportsInspectorEditing: true,
      showsStatusBadge: false,
      participatesInCalendarSync: false,
    },
    defaultAuthority: 'local_only',
    visualTreatment: {
      primaryColor: '#06B6D4',
      borderColor: '#67E8F9',
      backgroundColor: '#ECFEFF',
      badgeIcon: '📝',
      badgeLabel: 'Note',
    },
  },

  idea: {
    type: 'idea',
    editableFields: {
      title: true,
      body: true,
      status: false,
      startDate: false,
      endDate: false,
      dueDate: false,
    },
    hierarchyRules: {
      allowedChildTypes: [],
      supportsCollapse: false,
      allowsDeepNesting: false,
    },
    behavioralFlags: {
      supportsInlineEditing: true,
      supportsInspectorEditing: true,
      showsStatusBadge: false,
      participatesInCalendarSync: false,
    },
    defaultAuthority: 'local_only',
    visualTreatment: {
      primaryColor: '#6B7280',
      borderColor: '#D1D5DB',
      backgroundColor: '#F9FAFB',
      badgeIcon: '💡',
      badgeLabel: 'Idea',
    },
  },
};

/**
 * Maps Guardrails entity types to container types.
 */
const ENTITY_TYPE_TO_CONTAINER_TYPE: Record<string, ContainerType> = {
  track: 'track',
  roadmap_item_track: 'subtrack',
  roadmap_item_task: 'task',
  roadmap_item_event: 'event',
  side_project: 'idea',
  offshoot: 'idea',
};

/**
 * Infers container type from entity_type and metadata.
 *
 * For roadmap_item, checks the item type in metadata.
 * For local-only containers, returns 'note' as default.
 */
export function inferContainerType(
  entityType: GuardrailsEntityType | null | undefined,
  metadata: any = null
): ContainerType {
  if (!entityType) {
    return 'note';
  }

  if (entityType === 'track') {
    const isSubtrack = metadata?.parent_track_id || metadata?.parentTrackId;
    return isSubtrack ? 'subtrack' : 'track';
  }

  if (entityType === 'roadmap_item') {
    const itemType = metadata?.type || metadata?.item_type;
    if (itemType === 'task') return 'task';
    if (itemType === 'event') return 'event';
    return 'task';
  }

  const mapped = ENTITY_TYPE_TO_CONTAINER_TYPE[entityType];
  return mapped || 'note';
}

/**
 * Gets the capability profile for a container type.
 */
export function getCapabilityProfile(type: ContainerType): ContainerCapabilityProfile {
  return CAPABILITY_PROFILES[type];
}

/**
 * Gets the visual treatment for a container type.
 */
export function getVisualTreatment(type: ContainerType): VisualTreatment {
  return CAPABILITY_PROFILES[type].visualTreatment;
}

/**
 * Checks if a container type can have children.
 */
export function canHaveChildren(type: ContainerType): boolean {
  return CAPABILITY_PROFILES[type].hierarchyRules.allowedChildTypes.length > 0;
}

/**
 * Checks if a container type can contain another type as a child.
 */
export function canContainChildType(parentType: ContainerType, childType: ContainerType): boolean {
  return CAPABILITY_PROFILES[parentType].hierarchyRules.allowedChildTypes.includes(childType);
}

/**
 * Checks if a container type supports collapse/expand.
 */
export function supportsCollapse(type: ContainerType): boolean {
  return CAPABILITY_PROFILES[type].hierarchyRules.supportsCollapse;
}

/**
 * Checks if a field is editable for a container type.
 */
export function isFieldEditable(type: ContainerType, field: keyof EditableFields): boolean {
  return CAPABILITY_PROFILES[type].editableFields[field];
}

/**
 * Checks if a container type shows a status badge.
 */
export function showsStatusBadge(type: ContainerType): boolean {
  return CAPABILITY_PROFILES[type].behavioralFlags.showsStatusBadge;
}

/**
 * Checks if a container type participates in calendar sync.
 */
export function participatesInCalendarSync(type: ContainerType): boolean {
  return CAPABILITY_PROFILES[type].behavioralFlags.participatesInCalendarSync;
}

/**
 * Port definitions for containers that support connections.
 */
export type PortType = 'input' | 'output';

export interface PortDefinition {
  id: string;
  type: PortType;
  position: 'left' | 'right' | 'top' | 'bottom';
  label: string;
  color: string;
}

/**
 * Checks if a container type can have ports (connections to other containers).
 *
 * All container types support ports for flexible node-based connections.
 */
export function canHavePorts(type: ContainerType): boolean {
  return true; // All containers can have ports
}

/**
 * Gets port definitions for a container type that supports ports.
 * All container types have standard input/output ports.
 */
export function getPortDefinitions(type: ContainerType): PortDefinition[] | null {
  // Standard 4-port configuration for all container types
  // Two input ports on left, two output ports on right

  const portConfig: Record<ContainerType, { inputColor: string; outputColor: string; inputLabel: string; outputLabel: string }> = {
    track: {
      inputColor: '#3B82F6',
      outputColor: '#3B82F6',
      inputLabel: 'Depends On',
      outputLabel: 'Flows To',
    },
    subtrack: {
      inputColor: '#8B5CF6',
      outputColor: '#8B5CF6',
      inputLabel: 'Depends On',
      outputLabel: 'Flows To',
    },
    task: {
      inputColor: '#10B981',
      outputColor: '#10B981',
      inputLabel: 'Dependencies',
      outputLabel: 'Downstream',
    },
    event: {
      inputColor: '#F59E0B',
      outputColor: '#F59E0B',
      inputLabel: 'Prerequisites',
      outputLabel: 'Subsequent',
    },
    note: {
      inputColor: '#6B7280',
      outputColor: '#6B7280',
      inputLabel: 'References',
      outputLabel: 'Referenced By',
    },
    idea: {
      inputColor: '#EC4899',
      outputColor: '#EC4899',
      inputLabel: 'Inspired By',
      outputLabel: 'Inspires',
    },
  };

  const config = portConfig[type];

  return [
    {
      id: 'input-left-top',
      type: 'input',
      position: 'left',
      label: config.inputLabel,
      color: config.inputColor,
    },
    {
      id: 'input-left-bottom',
      type: 'input',
      position: 'left',
      label: config.inputLabel,
      color: config.inputColor,
    },
    {
      id: 'output-right-top',
      type: 'output',
      position: 'right',
      label: config.outputLabel,
      color: config.outputColor,
    },
    {
      id: 'output-right-bottom',
      type: 'output',
      position: 'right',
      label: config.outputLabel,
      color: config.outputColor,
    },
    {
      id: 'input-top',
      type: 'input',
      position: 'top',
      label: config.inputLabel,
      color: config.inputColor,
    },
    {
      id: 'output-bottom',
      type: 'output',
      position: 'bottom',
      label: config.outputLabel,
      color: config.outputColor,
    },
  ];
}

/**
 * Container position data for dynamic port calculations
 */
export interface ContainerPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Connection data for determining port positions
 */
export interface ConnectionData {
  sourceContainerId: string;
  targetContainerId: string;
  sourcePortId: string;
  targetPortId: string;
}

/**
 * Determines which ports on a container are available for connection to a target container
 * based on relative positions. Top ports connect to containers above, bottom ports to containers below.
 */
export function getAvailablePortsForTarget(
  sourceContainerPos: ContainerPosition,
  targetContainerPos: ContainerPosition,
  sourceType: ContainerType
): string[] {
  const availablePorts: string[] = [];

  // Calculate vertical relationship
  const sourceCenterY = sourceContainerPos.y + sourceContainerPos.height / 2;
  const targetCenterY = targetContainerPos.y + targetContainerPos.height / 2;
  const isTargetAbove = targetCenterY < sourceCenterY;
  const isTargetBelow = targetCenterY > sourceCenterY;

  // Calculate horizontal relationship
  const sourceCenterX = sourceContainerPos.x + sourceContainerPos.width / 2;
  const targetCenterX = targetContainerPos.x + targetContainerPos.width / 2;
  const isTargetLeft = targetCenterX < sourceCenterX;
  const isTargetRight = targetCenterX > sourceCenterX;

  // Top port available if target is above
  if (isTargetAbove) {
    availablePorts.push('input-top');
  }

  // Bottom port available if target is below
  if (isTargetBelow) {
    availablePorts.push('output-bottom');
  }

  // Left ports available if target is to the left
  if (isTargetLeft) {
    availablePorts.push('input-left-top', 'input-left-bottom');
  }

  // Right ports available if target is to the right
  if (isTargetRight) {
    availablePorts.push('output-right-top', 'output-right-bottom');
  }

  return availablePorts;
}

/**
 * Gets dynamic port definitions that adjust based on connected container positions.
 * Ports automatically move to the appropriate side based on spatial relationships.
 */
export function getDynamicPortDefinitions(
  type: ContainerType,
  containerId: string,
  containerPosition: ContainerPosition,
  allContainers: ContainerPosition[],
  connections: ConnectionData[]
): PortDefinition[] | null {
  const baseDefinitions = getPortDefinitions(type);
  if (!baseDefinitions) return null;

  // Find connections involving this container
  const containerConnections = connections.filter(
    conn => conn.sourceContainerId === containerId || conn.targetContainerId === containerId
  );

  if (containerConnections.length === 0) {
    // No connections, use default positions
    return baseDefinitions;
  }

  // Calculate center point of this container
  const thisCenterX = containerPosition.x + containerPosition.width / 2;
  const thisCenterY = containerPosition.y + containerPosition.height / 2;

  // For each connection, determine optimal port side based on connected container position
  const portSideOverrides = new Map<string, 'left' | 'right' | 'top' | 'bottom'>();

  for (const conn of containerConnections) {
    const isSource = conn.sourceContainerId === containerId;
    const connectedContainerId = isSource ? conn.targetContainerId : conn.sourceContainerId;
    const portId = isSource ? conn.sourcePortId : conn.targetPortId;

    // Find connected container position
    const connectedContainer = allContainers.find(c => c.id === connectedContainerId);
    if (!connectedContainer) continue;

    // Calculate center of connected container
    const otherCenterX = connectedContainer.x + connectedContainer.width / 2;
    const otherCenterY = connectedContainer.y + connectedContainer.height / 2;

    // Calculate relative position
    const deltaX = otherCenterX - thisCenterX;
    const deltaY = otherCenterY - thisCenterY;

    // Determine which side the port should be on based on the direction
    // Use absolute differences to determine primary axis
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal positioning dominates
      portSideOverrides.set(portId, deltaX > 0 ? 'right' : 'left');
    } else {
      // Vertical positioning dominates
      portSideOverrides.set(portId, deltaY > 0 ? 'bottom' : 'top');
    }
  }

  // Apply overrides to port definitions
  return baseDefinitions.map(port => {
    const overrideSide = portSideOverrides.get(port.id);
    if (overrideSide) {
      return {
        ...port,
        position: overrideSide,
      };
    }
    return port;
  });
}
