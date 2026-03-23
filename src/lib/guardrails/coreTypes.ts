export type TrackCategory = 'main' | 'side_project' | 'offshoot_idea';
export type TrackStatus = 'active' | 'completed' | 'archived';

export interface Track {
  id: string;
  masterProjectId: string;
  parentTrackId: string | null;
  name: string;
  description: string | null;
  color: string | null;
  orderingIndex: number;

  category: TrackCategory;
  includeInRoadmap: boolean;
  status: TrackStatus;
  templateId: string | null;

  metadata: Record<string, any>;

  createdAt: string;
  updatedAt: string;
}

export interface CreateTrackInput {
  masterProjectId: string;
  parentTrackId?: string | null;
  name: string;
  description?: string;
  color?: string;
  orderingIndex?: number;
  category?: TrackCategory;
  includeInRoadmap?: boolean;
  status?: TrackStatus;
  templateId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTrackInput {
  name?: string;
  description?: string;
  color?: string;
  orderingIndex?: number;
  parentTrackId?: string | null;
  category?: TrackCategory;
  includeInRoadmap?: boolean;
  status?: TrackStatus;
  metadata?: Record<string, any>;
}

export type RoadmapItemStatus = 'not_started' | 'pending' | 'in_progress' | 'blocked' | 'on_hold' | 'completed' | 'archived' | 'cancelled';

export type RoadmapItemType =
  | 'task'
  | 'event'
  | 'note'
  | 'document'
  | 'milestone'
  | 'goal'
  | 'photo'
  | 'grocery_list'
  | 'habit'
  | 'review';

export interface TaskMetadata {
  checklist?: Array<{ id: string; text: string; completed: boolean }>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface EventMetadata {
  location?: string;
  timeStart?: string;
  timeEnd?: string;
  allDay?: boolean;
}

export interface DocumentMetadata {
  url?: string;
  documentType?: 'link' | 'reference' | 'attachment';
}

export interface HabitMetadata {
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    days?: number[];
  };
}

export interface GroceryListMetadata {
  items?: Array<{ id: string; name: string; checked: boolean; category?: string }>;
}

export interface PhotoMetadata {
  assetUrl?: string;
  caption?: string;
}

export interface ReviewMetadata {
  rating?: number;
  feedback?: string;
}

export interface GoalMetadata {
  targetValue?: number;
  currentValue?: number;
  unit?: string;
}

export type RoadmapItemMetadata =
  | TaskMetadata
  | EventMetadata
  | DocumentMetadata
  | HabitMetadata
  | GroceryListMetadata
  | PhotoMetadata
  | ReviewMetadata
  | GoalMetadata
  | Record<string, never>;

export type DeadlineState = 'on_track' | 'due_soon' | 'overdue';

export interface RoadmapItemDeadlineMeta {
  effectiveDeadline?: string;
  originalDeadline?: string;
  hasExtensions: boolean;
  extensionCount: number;
  deadlineState?: DeadlineState;
  daysUntilDeadline?: number;
}

export interface DeadlineExtension {
  id: string;
  roadmapItemId: string;
  previousDeadline: string;
  newDeadline: string;
  reason?: string;
  createdAt: string;
}

export interface GlobalPerson {
  id: string;
  name: string;
  email?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlobalPersonInput {
  name: string;
  email?: string;
}

export interface UpdateGlobalPersonInput {
  name?: string;
  email?: string;
  archived?: boolean;
}

export interface GlobalPersonWithProjects extends GlobalPerson {
  projectCount: number;
  projects?: Array<{
    projectId: string;
    projectName: string;
    role?: string;
  }>;
}

export interface Person {
  id: string;
  masterProjectId: string;
  globalPersonId: string;
  name: string;
  email?: string;
  role?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonWithGlobalIdentity extends Person {
  globalPerson: GlobalPerson;
}

export interface CreatePersonInput {
  masterProjectId: string;
  name: string;
  email?: string;
  role?: string;
  globalPersonId?: string;
}

export interface UpdatePersonInput {
  name?: string;
  email?: string;
  role?: string;
  archived?: boolean;
}

export interface RoadmapItemAssignment {
  id: string;
  roadmapItemId: string;
  personId: string;
  assignedAt: string;
}

export interface RoadmapItemWithAssignees extends RoadmapItem {
  assignedPeople?: Person[];
}

export interface PersonWithAssignments extends Person {
  assignedItems?: RoadmapItem[];
}

export interface RoadmapItem {
  id: string;
  masterProjectId: string;
  trackId: string;
  subtrackId?: string | null;
  type: RoadmapItemType;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string | null;
  status: RoadmapItemStatus;
  parentItemId?: string | null;
  itemDepth: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoadmapItemInput {
  masterProjectId: string;
  trackId: string;
  type: RoadmapItemType;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string | null;
  status?: RoadmapItemStatus;
  parentItemId?: string | null;
  metadata?: Record<string, any>;
}

export interface UpdateRoadmapItemInput {
  type?: RoadmapItemType;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string | null;
  status?: RoadmapItemStatus;
  trackId?: string;
  parentItemId?: string | null;
  metadata?: Record<string, any>;
}

export interface RoadmapItemTreeNode {
  item: RoadmapItem;
  children: RoadmapItemTreeNode[];
  childCount: number;
  descendantCount: number;
}

export interface RoadmapItemRelation {
  parentId: string;
  childId: string;
  depth: number;
}

export interface RoadmapItemPath {
  itemId: string;
  title: string;
  type: RoadmapItemType;
  depth: number;
}

export interface AttachChildItemInput {
  childItemId: string;
  parentItemId: string;
  userId?: string;
}

export interface DetachChildItemInput {
  childItemId: string;
  userId?: string;
}

export type WidgetType = 'text' | 'doc' | 'image' | 'link';

export interface MindMeshWidget {
  id: string;
  masterProjectId: string;
  type: WidgetType;
  title: string;
  content: string;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMindMeshWidgetInput {
  masterProjectId: string;
  type: WidgetType;
  title: string;
  content?: string;
  xPosition: number;
  yPosition: number;
  width?: number;
  height?: number;
}

export interface UpdateMindMeshWidgetInput {
  title?: string;
  content?: string;
  xPosition?: number;
  yPosition?: number;
  width?: number;
  height?: number;
}

export type ConnectionSourceType = 'track' | 'roadmap_item' | 'widget';
export type ConnectionTargetType = 'track' | 'roadmap_item' | 'widget';
export type ConnectionRelationship = 'expands' | 'inspires' | 'depends_on' | 'references' | 'hierarchy' | 'offshoot';

export interface MindMeshConnection {
  id: string;
  masterProjectId: string;

  sourceType: ConnectionSourceType;
  sourceId: string;

  targetType: ConnectionTargetType;
  targetId: string;

  relationship: ConnectionRelationship;
  autoGenerated: boolean;

  createdAt: string;
}

export interface CreateMindMeshConnectionInput {
  masterProjectId: string;
  sourceType: ConnectionSourceType;
  sourceId: string;
  targetType: ConnectionTargetType;
  targetId: string;
  relationship: ConnectionRelationship;
  autoGenerated?: boolean;
}

export interface TrackDeadlineStats {
  nextDeadline?: string;
  overdueItems: number;
  dueSoonItems: number;
  extendedItems: number;
}

export interface TrackWithChildren extends Track {
  children: TrackWithChildren[];
  depth: number;
}

export interface CategoryRules {
  canHaveSubtracks: boolean;
  canAppearInRoadmap: boolean;
  canPromoteToMaster: boolean;
  maxDepth: number | null;
  allowedConversions: TrackCategory[];
}

export const CATEGORY_RULES: Record<TrackCategory, CategoryRules> = {
  main: {
    canHaveSubtracks: true,
    canAppearInRoadmap: true,
    canPromoteToMaster: false,
    maxDepth: null,
    allowedConversions: ['side_project', 'offshoot_idea'],
  },
  side_project: {
    canHaveSubtracks: true,
    canAppearInRoadmap: true,
    canPromoteToMaster: true,
    maxDepth: 3,
    allowedConversions: ['main'],
  },
  offshoot_idea: {
    canHaveSubtracks: false,
    canAppearInRoadmap: false,
    canPromoteToMaster: false,
    maxDepth: 0,
    allowedConversions: ['side_project'],
  },
};

export interface ValidationError {
  field: string;
  message: string;
}

export interface TrackValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export const TRACK_COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6',
  orange: '#F97316',
  gray: '#6B7280',
} as const;

export type TrackColorKey = keyof typeof TRACK_COLORS;

export interface RoadmapItemTypeRules {
  requiresDates: boolean;
  allowsDeadlines: boolean;
  canAppearInTimeline: boolean;
  defaultStatus: RoadmapItemStatus;
  allowedStatuses: RoadmapItemStatus[];
}

export const ROADMAP_ITEM_TYPE_RULES: Record<RoadmapItemType, RoadmapItemTypeRules> = {
  task: {
    requiresDates: false,
    allowsDeadlines: true,
    canAppearInTimeline: true,
    defaultStatus: 'not_started',
    allowedStatuses: ['not_started', 'in_progress', 'blocked', 'on_hold', 'completed', 'cancelled'],
  },
  event: {
    requiresDates: true,
    allowsDeadlines: true,
    canAppearInTimeline: true,
    defaultStatus: 'not_started',
    allowedStatuses: ['not_started', 'in_progress', 'completed', 'cancelled'],
  },
  milestone: {
    requiresDates: true,
    allowsDeadlines: true,
    canAppearInTimeline: true,
    defaultStatus: 'not_started',
    allowedStatuses: ['not_started', 'in_progress', 'completed', 'cancelled'],
  },
  goal: {
    requiresDates: false,
    allowsDeadlines: true,
    canAppearInTimeline: true,
    defaultStatus: 'not_started',
    allowedStatuses: ['not_started', 'in_progress', 'blocked', 'on_hold', 'completed', 'cancelled'],
  },
  note: {
    requiresDates: false,
    allowsDeadlines: false,
    canAppearInTimeline: false,
    defaultStatus: 'not_started',
    allowedStatuses: ['not_started'],
  },
  document: {
    requiresDates: false,
    allowsDeadlines: false,
    canAppearInTimeline: false,
    defaultStatus: 'not_started',
    allowedStatuses: ['not_started'],
  },
  photo: {
    requiresDates: false,
    allowsDeadlines: false,
    canAppearInTimeline: false,
    defaultStatus: 'not_started',
    allowedStatuses: ['not_started'],
  },
  grocery_list: {
    requiresDates: false,
    allowsDeadlines: false,
    canAppearInTimeline: false,
    defaultStatus: 'not_started',
    allowedStatuses: ['not_started', 'completed'],
  },
  habit: {
    requiresDates: false,
    allowsDeadlines: false,
    canAppearInTimeline: true,
    defaultStatus: 'not_started',
    allowedStatuses: ['not_started', 'in_progress', 'on_hold', 'archived'],
  },
  review: {
    requiresDates: false,
    allowsDeadlines: false,
    canAppearInTimeline: false,
    defaultStatus: 'completed',
    allowedStatuses: ['completed'],
  },
};

export type GuardrailsSourceType = 'track' | 'roadmap_item';
export type PersonalSpaceType = 'calendar' | 'tasks' | 'habits' | 'notes' | 'goals';

export interface PersonalLink {
  id: string;
  userId: string;
  masterProjectId: string;
  sourceType: GuardrailsSourceType;
  sourceId: string;
  targetSpaceType: PersonalSpaceType;
  targetEntityId?: string;
  isActive: boolean;
  createdAt: string;
  revokedAt?: string;
}

export interface CreatePersonalLinkInput {
  userId: string;
  masterProjectId: string;
  sourceType: GuardrailsSourceType;
  sourceId: string;
  targetSpaceType: PersonalSpaceType;
  targetEntityId?: string;
}

export interface UpdatePersonalLinkInput {
  targetEntityId?: string;
  isActive?: boolean;
}

export interface PersonalLinkEligibility {
  calendar: boolean;
  tasks: boolean;
  habits: boolean;
  notes: boolean;
  goals: boolean;
}

export const ROADMAP_ITEM_PERSONAL_SPACE_ELIGIBILITY: Record<RoadmapItemType, PersonalLinkEligibility> = {
  task: {
    calendar: false,
    tasks: true,
    habits: false,
    notes: true,
    goals: false,
  },
  event: {
    calendar: true,
    tasks: false,
    habits: false,
    notes: true,
    goals: false,
  },
  milestone: {
    calendar: true,
    tasks: false,
    habits: false,
    notes: true,
    goals: false,
  },
  goal: {
    calendar: false,
    tasks: false,
    habits: false,
    notes: false,
    goals: true,
  },
  habit: {
    calendar: false,
    tasks: false,
    habits: true,
    notes: false,
    goals: false,
  },
  note: {
    calendar: false,
    tasks: false,
    habits: false,
    notes: true,
    goals: false,
  },
  document: {
    calendar: false,
    tasks: false,
    habits: false,
    notes: true,
    goals: false,
  },
  review: {
    calendar: false,
    tasks: false,
    habits: false,
    notes: true,
    goals: false,
  },
  grocery_list: {
    calendar: false,
    tasks: false,
    habits: false,
    notes: false,
    goals: false,
  },
  photo: {
    calendar: false,
    tasks: false,
    habits: false,
    notes: true,
    goals: false,
  },
};

export const TRACK_PERSONAL_SPACE_ELIGIBILITY: PersonalLinkEligibility = {
  calendar: false,
  tasks: false,
  habits: false,
  notes: true,
  goals: false,
};

export type ProjectUserRole = 'owner' | 'editor' | 'viewer';

export interface ProjectUser {
  id: string;
  userId: string;
  masterProjectId: string;
  role: ProjectUserRole;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CreateProjectUserInput {
  userId: string;
  masterProjectId: string;
  role: ProjectUserRole;
}

export interface UpdateProjectUserInput {
  role?: ProjectUserRole;
}

export interface UserWithProjects {
  userId: string;
  projects: Array<{
    projectId: string;
    role: ProjectUserRole;
    createdAt: string;
  }>;
}

export interface ProjectWithUsers {
  projectId: string;
  users: Array<{
    userId: string;
    role: ProjectUserRole;
    createdAt: string;
  }>;
}

export interface UserProjectPermission {
  userId: string;
  projectId: string;
  canView: boolean;
  canEdit: boolean;
  canManageUsers: boolean;
  role: ProjectUserRole;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  role?: ProjectUserRole;
}

export const PROJECT_USER_ROLE_CAPABILITIES = {
  owner: {
    canView: true,
    canEdit: true,
    canManageUsers: true,
  },
  editor: {
    canView: true,
    canEdit: true,
    canManageUsers: false,
  },
  viewer: {
    canView: true,
    canEdit: false,
    canManageUsers: false,
  },
} as const;
