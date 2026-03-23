import type { RoadmapItemStatus } from '../guardrails/coreTypes';

export type PersonalConsumptionMode =
  | 'reference'
  | 'derived'
  | 'shadowed';

export type PersonalVisibilityState =
  | 'visible'
  | 'hidden'
  | 'muted'
  | 'pinned';

export type PersonalSpaceType =
  | 'calendar'
  | 'tasks'
  | 'habits'
  | 'notes'
  | 'goals';

export type GuardrailsSourceType = 'track' | 'roadmap_item';

export type DeadlineState = 'on_track' | 'due_soon' | 'overdue' | 'none';

export interface PersonalLink {
  id: string;
  userId: string;
  masterProjectId: string;
  sourceType: GuardrailsSourceType;
  sourceId: string;
  targetSpaceType: PersonalSpaceType;
  targetEntityId: string | null;
  isActive: boolean;
  consumptionMode: PersonalConsumptionMode;
  visibilityState: PersonalVisibilityState;
  derivedMetadata: Record<string, any>;
  lastConsumedAt: string | null;
  consumptionCount: number;
  createdAt: string;
  revokedAt: string | null;
}

export interface PersonalDerivedState {
  sourceStatus: RoadmapItemStatus;
  deadlineState: DeadlineState;
  lastSyncedAt: string;
  isCompleted: boolean;
  isOverdue: boolean;
}

export interface CalendarDerivedState extends PersonalDerivedState {
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  visualColor: string;
}

export interface TaskDerivedState extends PersonalDerivedState {
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  checklist?: Array<{ id: string; text: string; completed: boolean }>;
  estimatedDuration?: number;
}

export interface HabitDerivedState extends PersonalDerivedState {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  lastCompletedAt: string | null;
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    days?: number[];
  };
}

export interface GoalDerivedState extends PersonalDerivedState {
  targetValue: number;
  currentValue: number;
  unit: string;
  progressPercentage: number;
}

export interface NoteDerivedState extends PersonalDerivedState {
  wordCount: number;
  lastEditedAt: string | null;
  tags?: string[];
}

export type SpaceDerivedState =
  | CalendarDerivedState
  | TaskDerivedState
  | HabitDerivedState
  | GoalDerivedState
  | NoteDerivedState;

export interface ConsumptionInterpretationRule {
  spaceType: PersonalSpaceType;
  canConsume: (sourceType: GuardrailsSourceType, itemType?: string) => boolean;
  defaultMode: PersonalConsumptionMode;
  supportedModes: PersonalConsumptionMode[];
  derivedFields: string[];
  readOnlyFields: string[];
}

export interface ConsumptionQuery {
  userId: string;
  spaceType?: PersonalSpaceType;
  sourceType?: GuardrailsSourceType;
  visibilityState?: PersonalVisibilityState[];
  consumptionMode?: PersonalConsumptionMode[];
  includeInactive?: boolean;
}

export interface ConsumptionAnalytics {
  totalLinks: number;
  activeLinks: number;
  linksBySpace: Record<PersonalSpaceType, number>;
  linksByMode: Record<PersonalConsumptionMode, number>;
  linksByVisibility: Record<PersonalVisibilityState, number>;
  staleLinks: number;
  orphanedLinks: number;
  averageConsumptionCount: number;
}

export interface UpdateConsumptionInput {
  consumptionMode?: PersonalConsumptionMode;
  visibilityState?: PersonalVisibilityState;
  derivedMetadata?: Record<string, any>;
}

export interface ConsumptionTrackingEvent {
  linkId: string;
  eventType: 'query' | 'update' | 'revoke';
  timestamp: string;
}
