/**
 * Mind Mesh V2 Core Data Model
 *
 * A visual cognition system where:
 * - Containers hold meaning/content
 * - Nodes represent relationships (no meaning)
 * - Guardrails entities remain authoritative
 *
 * Inspired by ComfyUI-style graph systems.
 */

// ============================================================================
// WORKSPACE
// ============================================================================

/**
 * One workspace per project.
 * Contains all containers, nodes, and ports for a project's Mind Mesh.
 */
export interface MindMeshWorkspace {
  id: string;
  masterProjectId: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMindMeshWorkspaceInput {
  masterProjectId: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// CONTAINER (holds meaning)
// ============================================================================

/**
 * Containers hold meaning/content.
 * Can be nested, can reference Guardrails entities, can be ghosts.
 *
 * Key rules:
 * - Must have title OR body (at least one)
 * - Never hold authority (Guardrails is authoritative)
 * - Can be nested via parentContainerId
 * - isGhost = true means read-only
 */
export interface MindMeshContainer {
  id: string;
  workspaceId: string;

  // Content (must have at least one)
  title: string | null;
  body: string | null;

  // Nesting
  parentContainerId: string | null;

  // Ghost state (read-only container)
  isGhost: boolean;

  // Visual properties (stored, not computed)
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;

  // Metadata
  metadata: Record<string, any>;

  createdAt: string;
  updatedAt: string;
}

export interface CreateMindMeshContainerInput {
  workspaceId: string;
  title?: string | null;
  body?: string | null;
  parentContainerId?: string | null;
  isGhost?: boolean;
  xPosition: number;
  yPosition: number;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
}

export interface UpdateMindMeshContainerInput {
  title?: string | null;
  body?: string | null;
  parentContainerId?: string | null;
  isGhost?: boolean;
  xPosition?: number;
  yPosition?: number;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// CONTAINER REFERENCE (links to Guardrails)
// ============================================================================

/**
 * Explicit references from containers to Guardrails entities.
 *
 * Key rules:
 * - Containers may have multiple references
 * - Exactly one primary reference if any exist
 * - References don't grant authority
 */
export type GuardrailsEntityType =
  | 'track'
  | 'roadmap_item'
  | 'person'
  | 'widget'
  | 'domain'
  | 'project';

export interface MindMeshContainerReference {
  id: string;
  containerId: string;

  // Guardrails entity reference
  entityType: GuardrailsEntityType;
  entityId: string;

  // Primary flag (exactly one primary per container if any)
  isPrimary: boolean;

  // Metadata
  metadata: Record<string, any>;

  createdAt: string;
}

export interface CreateMindMeshContainerReferenceInput {
  containerId: string;
  entityType: GuardrailsEntityType;
  entityId: string;
  isPrimary?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateMindMeshContainerReferenceInput {
  isPrimary?: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// PORT (connection points on containers)
// ============================================================================

/**
 * Ports are connection points on containers.
 *
 * Key concepts:
 * - Free ports: no type constraint
 * - Typed ports: input or output
 * - Multiple ports per container allowed
 */
export type PortType = 'free' | 'input' | 'output';

export interface MindMeshPort {
  id: string;
  containerId: string;

  // Port type
  portType: PortType;

  // Optional label
  label: string | null;

  // Metadata
  metadata: Record<string, any>;

  createdAt: string;
}

export interface CreateMindMeshPortInput {
  containerId: string;
  portType: PortType;
  label?: string | null;
  metadata?: Record<string, any>;
}

export interface UpdateMindMeshPortInput {
  portType?: PortType;
  label?: string | null;
  metadata?: Record<string, any>;
}

// ============================================================================
// NODE (relationship-only, no meaning)
// ============================================================================

/**
 * Nodes represent relationships between containers.
 *
 * Key rules:
 * - Never store content or meaning
 * - Must reference two ports
 * - Multiple nodes between same containers allowed
 * - Auto-delete if orphaned (port deleted)
 */
export type RelationshipType =
  | 'expands'
  | 'inspires'
  | 'depends_on'
  | 'references'
  | 'hierarchy'
  | 'composition'
  | 'generic';

export type RelationshipDirection =
  | 'forward'    // sourcePort → targetPort
  | 'backward'   // sourcePort ← targetPort
  | 'bidirectional';  // sourcePort ↔ targetPort

export interface MindMeshNode {
  id: string;
  workspaceId: string;

  // Connection (two ports)
  sourcePortId: string;
  targetPortId: string;

  // Relationship semantics
  relationshipType: RelationshipType;
  relationshipDirection: RelationshipDirection;

  // Auto-generated flag
  autoGenerated: boolean;

  // Metadata
  metadata: Record<string, any>;

  createdAt: string;
}

export interface CreateMindMeshNodeInput {
  workspaceId: string;
  sourcePortId: string;
  targetPortId: string;
  relationshipType: RelationshipType;
  relationshipDirection?: RelationshipDirection;
  autoGenerated?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateMindMeshNodeInput {
  relationshipType?: RelationshipType;
  relationshipDirection?: RelationshipDirection;
  metadata?: Record<string, any>;
}

// ============================================================================
// CONTAINER VISIBILITY (per-user)
// ============================================================================

/**
 * Per-user visibility settings for containers.
 * Allows users to hide or collapse containers without affecting others.
 */
export type ContainerVisibilityState = 'visible' | 'hidden' | 'collapsed';

export interface MindMeshContainerVisibility {
  id: string;
  containerId: string;
  userId: string;

  visibilityState: ContainerVisibilityState;

  createdAt: string;
  updatedAt: string;
}

export interface SetContainerVisibilityInput {
  containerId: string;
  userId: string;
  visibilityState: ContainerVisibilityState;
}

// ============================================================================
// CANVAS LOCK (workspace-level)
// ============================================================================

/**
 * Workspace-level edit lock.
 * One user at a time can hold the lock.
 * Prevents concurrent editing conflicts.
 */
export interface MindMeshCanvasLock {
  id: string;
  workspaceId: string;
  userId: string;

  // Lock expiry (for automatic unlock)
  expiresAt: string;

  createdAt: string;
}

export interface AcquireLockInput {
  workspaceId: string;
  userId: string;
  durationSeconds?: number;
}

// ============================================================================
// ENRICHED TYPES (for queries)
// ============================================================================

/**
 * Container with its references loaded.
 */
export interface MindMeshContainerWithReferences extends MindMeshContainer {
  references: MindMeshContainerReference[];
  primaryReference?: MindMeshContainerReference;
}

/**
 * Container with its ports loaded.
 */
export interface MindMeshContainerWithPorts extends MindMeshContainer {
  ports: MindMeshPort[];
}

/**
 * Container with full graph context.
 */
export interface MindMeshContainerWithGraph extends MindMeshContainerWithReferences {
  ports: MindMeshPort[];
  children: MindMeshContainer[];
  childCount: number;
}

/**
 * Node with resolved container information.
 */
export interface MindMeshNodeWithContainers extends MindMeshNode {
  sourcePort: MindMeshPort;
  targetPort: MindMeshPort;
  sourceContainer: MindMeshContainer;
  targetContainer: MindMeshContainer;
}

/**
 * Complete workspace graph.
 */
export interface MindMeshWorkspaceGraph {
  workspace: MindMeshWorkspace;
  containers: MindMeshContainer[];
  nodes: MindMeshNode[];
  ports: MindMeshPort[];
  references: MindMeshContainerReference[];
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
