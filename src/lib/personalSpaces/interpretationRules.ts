import type {
  PersonalSpaceType,
  GuardrailsSourceType,
  ConsumptionInterpretationRule,
  PersonalConsumptionMode,
  CalendarDerivedState,
  TaskDerivedState,
  HabitDerivedState,
  GoalDerivedState,
  NoteDerivedState,
} from './consumptionTypes';
import type { RoadmapItem, RoadmapItemType } from '../guardrails/coreTypes';
import { computeBasicDerivedState } from './consumptionService';

export const CALENDAR_INTERPRETATION: ConsumptionInterpretationRule = {
  spaceType: 'calendar',
  canConsume: (sourceType: GuardrailsSourceType, itemType?: string) => {
    if (sourceType === 'track') return false;
    if (sourceType === 'roadmap_item') {
      const eligibleTypes: RoadmapItemType[] = ['event', 'milestone', 'task', 'goal'];
      return itemType ? eligibleTypes.includes(itemType as RoadmapItemType) : true;
    }
    return false;
  },
  defaultMode: 'reference',
  supportedModes: ['reference', 'shadowed'],
  derivedFields: ['startDate', 'endDate', 'allDay', 'location', 'visualColor'],
  readOnlyFields: ['title', 'description', 'status', 'startDate', 'endDate'],
};

export const TASKS_INTERPRETATION: ConsumptionInterpretationRule = {
  spaceType: 'tasks',
  canConsume: (sourceType: GuardrailsSourceType, itemType?: string) => {
    if (sourceType === 'track') return false;
    if (sourceType === 'roadmap_item') {
      const eligibleTypes: RoadmapItemType[] = ['task', 'milestone'];
      return itemType ? eligibleTypes.includes(itemType as RoadmapItemType) : true;
    }
    return false;
  },
  defaultMode: 'reference',
  supportedModes: ['reference', 'derived', 'shadowed'],
  derivedFields: ['priority', 'checklist', 'estimatedDuration'],
  readOnlyFields: ['title', 'description', 'status', 'endDate'],
};

export const HABITS_INTERPRETATION: ConsumptionInterpretationRule = {
  spaceType: 'habits',
  canConsume: (sourceType: GuardrailsSourceType, itemType?: string) => {
    if (sourceType === 'track') return false;
    if (sourceType === 'roadmap_item') {
      const eligibleTypes: RoadmapItemType[] = ['habit'];
      return itemType ? eligibleTypes.includes(itemType as RoadmapItemType) : true;
    }
    return false;
  },
  defaultMode: 'derived',
  supportedModes: ['derived', 'shadowed'],
  derivedFields: [
    'currentStreak',
    'longestStreak',
    'completionRate',
    'lastCompletedAt',
    'recurrencePattern',
  ],
  readOnlyFields: ['title', 'description', 'status'],
};

export const GOALS_INTERPRETATION: ConsumptionInterpretationRule = {
  spaceType: 'goals',
  canConsume: (sourceType: GuardrailsSourceType, itemType?: string) => {
    if (sourceType === 'track') return true;
    if (sourceType === 'roadmap_item') {
      const eligibleTypes: RoadmapItemType[] = ['goal'];
      return itemType ? eligibleTypes.includes(itemType as RoadmapItemType) : true;
    }
    return false;
  },
  defaultMode: 'derived',
  supportedModes: ['reference', 'derived', 'shadowed'],
  derivedFields: ['targetValue', 'currentValue', 'unit', 'progressPercentage'],
  readOnlyFields: ['title', 'description', 'status', 'startDate', 'endDate'],
};

export const NOTES_INTERPRETATION: ConsumptionInterpretationRule = {
  spaceType: 'notes',
  canConsume: (sourceType: GuardrailsSourceType, itemType?: string) => {
    if (sourceType === 'track') return false;
    if (sourceType === 'roadmap_item') {
      const eligibleTypes: RoadmapItemType[] = ['note', 'document', 'review'];
      return itemType ? eligibleTypes.includes(itemType as RoadmapItemType) : true;
    }
    return false;
  },
  defaultMode: 'reference',
  supportedModes: ['reference', 'derived', 'shadowed'],
  derivedFields: ['wordCount', 'lastEditedAt', 'tags'],
  readOnlyFields: ['title', 'description'],
};

export const INTERPRETATION_RULES: Record<PersonalSpaceType, ConsumptionInterpretationRule> = {
  calendar: CALENDAR_INTERPRETATION,
  tasks: TASKS_INTERPRETATION,
  habits: HABITS_INTERPRETATION,
  goals: GOALS_INTERPRETATION,
  notes: NOTES_INTERPRETATION,
};

export function getInterpretationRule(spaceType: PersonalSpaceType): ConsumptionInterpretationRule {
  return INTERPRETATION_RULES[spaceType];
}

export function canSpaceConsumeSource(
  spaceType: PersonalSpaceType,
  sourceType: GuardrailsSourceType,
  itemType?: string
): boolean {
  const rule = getInterpretationRule(spaceType);
  return rule.canConsume(sourceType, itemType);
}

export function getDefaultModeForSpace(spaceType: PersonalSpaceType): PersonalConsumptionMode {
  return getInterpretationRule(spaceType).defaultMode;
}

export function isModeSupported(
  spaceType: PersonalSpaceType,
  mode: PersonalConsumptionMode
): boolean {
  const rule = getInterpretationRule(spaceType);
  return rule.supportedModes.includes(mode);
}

export function deriveCalendarState(item: RoadmapItem): CalendarDerivedState {
  const base = computeBasicDerivedState(item);

  const allDay = item.metadata?.allDay || false;
  const location = item.metadata?.location;
  const visualColor = determineVisualColor(item);

  return {
    ...base,
    startDate: item.startDate,
    endDate: item.endDate || item.startDate,
    allDay,
    location,
    visualColor,
  };
}

export function deriveTaskState(item: RoadmapItem): TaskDerivedState {
  const base = computeBasicDerivedState(item);

  const priority = item.metadata?.priority;
  const checklist = item.metadata?.checklist;
  const estimatedDuration = item.metadata?.estimatedDuration;

  return {
    ...base,
    priority,
    checklist,
    estimatedDuration,
  };
}

export function deriveHabitState(item: RoadmapItem, existingMetadata?: any): HabitDerivedState {
  const base = computeBasicDerivedState(item);

  const currentStreak = existingMetadata?.currentStreak || 0;
  const longestStreak = existingMetadata?.longestStreak || 0;
  const completionRate = existingMetadata?.completionRate || 0;
  const lastCompletedAt = existingMetadata?.lastCompletedAt || null;
  const recurrencePattern = item.metadata?.recurrencePattern;

  return {
    ...base,
    currentStreak,
    longestStreak,
    completionRate,
    lastCompletedAt,
    recurrencePattern,
  };
}

export function deriveGoalState(item: RoadmapItem, existingMetadata?: any): GoalDerivedState {
  const base = computeBasicDerivedState(item);

  const targetValue = item.metadata?.targetValue || 100;
  const currentValue = existingMetadata?.currentValue || 0;
  const unit = item.metadata?.unit || '%';
  const progressPercentage = Math.min(100, (currentValue / targetValue) * 100);

  return {
    ...base,
    targetValue,
    currentValue,
    unit,
    progressPercentage,
  };
}

export function deriveNoteState(item: RoadmapItem, existingMetadata?: any): NoteDerivedState {
  const base = computeBasicDerivedState(item);

  const description = item.description || '';
  const wordCount = description.split(/\s+/).filter((w) => w.length > 0).length;
  const lastEditedAt = existingMetadata?.lastEditedAt || item.updatedAt;
  const tags = existingMetadata?.tags;

  return {
    ...base,
    wordCount,
    lastEditedAt,
    tags,
  };
}

function determineVisualColor(item: RoadmapItem): string {
  if (item.status === 'completed') return '#10b981';
  if (item.status === 'blocked') return '#ef4444';
  if (item.status === 'in_progress') return '#3b82f6';

  switch (item.type) {
    case 'event':
      return '#8b5cf6';
    case 'milestone':
      return '#f59e0b';
    case 'task':
      return '#06b6d4';
    case 'goal':
      return '#ec4899';
    default:
      return '#6b7280';
  }
}

export const SPACE_ELIGIBILITY_MATRIX: Record<
  PersonalSpaceType,
  { roadmapItemTypes: RoadmapItemType[]; allowsTracks: boolean }
> = {
  calendar: {
    roadmapItemTypes: ['event', 'milestone', 'task', 'goal'],
    allowsTracks: false,
  },
  tasks: {
    roadmapItemTypes: ['task', 'milestone'],
    allowsTracks: false,
  },
  habits: {
    roadmapItemTypes: ['habit'],
    allowsTracks: false,
  },
  goals: {
    roadmapItemTypes: ['goal'],
    allowsTracks: true,
  },
  notes: {
    roadmapItemTypes: ['note', 'document', 'review'],
    allowsTracks: false,
  },
};

export function getEligibleItemTypesForSpace(spaceType: PersonalSpaceType): RoadmapItemType[] {
  return SPACE_ELIGIBILITY_MATRIX[spaceType].roadmapItemTypes;
}

export function doesSpaceAllowTracks(spaceType: PersonalSpaceType): boolean {
  return SPACE_ELIGIBILITY_MATRIX[spaceType].allowsTracks;
}
