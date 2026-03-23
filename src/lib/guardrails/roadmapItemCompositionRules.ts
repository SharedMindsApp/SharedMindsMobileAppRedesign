import type { RoadmapItemType } from './coreTypes';

export const MAX_ITEM_DEPTH = 2;

export const TIMELINE_ELIGIBLE_ONLY_TOP_LEVEL = true;

export const TASKFLOW_SYNC_CHILD_ITEMS = false;

export type ParentChildTypeMatrix = Record<RoadmapItemType, RoadmapItemType[]>;

export const PARENT_CHILD_TYPE_MATRIX: ParentChildTypeMatrix = {
  event: [
    'task',
    'note',
    'document',
    'photo',
    'grocery_list',
    'review',
    'milestone',
    'goal',
    'habit',
  ],
  task: [
    'task',
    'note',
    'document',
    'photo',
    'grocery_list',
    'review',
    'habit',
    'goal',
  ],
  goal: ['task', 'habit', 'review', 'note', 'document', 'photo'],
  milestone: ['task', 'note', 'document', 'photo', 'review'],
  habit: ['review', 'note'],
  note: [],
  document: [],
  photo: [],
  review: [],
  grocery_list: [],
};

export function canParentContainChild(
  parentType: RoadmapItemType,
  childType: RoadmapItemType
): boolean {
  const allowedChildren = PARENT_CHILD_TYPE_MATRIX[parentType];
  return allowedChildren.includes(childType);
}

export function isDepthWithinLimit(depth: number): boolean {
  return depth <= MAX_ITEM_DEPTH;
}

export function canItemHaveChildren(itemType: RoadmapItemType): boolean {
  return PARENT_CHILD_TYPE_MATRIX[itemType].length > 0;
}

export function getAllowedChildTypesForParent(
  parentType: RoadmapItemType
): RoadmapItemType[] {
  return PARENT_CHILD_TYPE_MATRIX[parentType];
}

export interface CompositionValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateComposition(
  parentType: RoadmapItemType,
  childType: RoadmapItemType,
  childDepth: number
): CompositionValidationResult {
  const errors: string[] = [];

  if (!canParentContainChild(parentType, childType)) {
    errors.push(
      `Type '${parentType}' cannot contain child of type '${childType}'. Allowed types: ${PARENT_CHILD_TYPE_MATRIX[parentType].join(', ')}`
    );
  }

  if (!isDepthWithinLimit(childDepth)) {
    errors.push(
      `Child depth (${childDepth}) exceeds maximum allowed depth (${MAX_ITEM_DEPTH})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const COMPOSITION_RULES_DESCRIPTION = {
  MAX_ITEM_DEPTH: `Maximum nesting depth for roadmap items. ${MAX_ITEM_DEPTH} means Track → Item → Child Item.`,
  TIMELINE_ELIGIBLE_ONLY_TOP_LEVEL: TIMELINE_ELIGIBLE_ONLY_TOP_LEVEL
    ? 'Only top-level items (parent_item_id = null) appear on the Infinite Roadmap timeline.'
    : 'All items appear on timeline regardless of nesting.',
  TASKFLOW_SYNC_CHILD_ITEMS: TASKFLOW_SYNC_CHILD_ITEMS
    ? 'Child items sync to Task Flow if their type is eligible.'
    : 'Only top-level items sync to Task Flow. Child items are execution-only.',
  PARENT_CHILD_MATRIX:
    'Defines which item types can contain which child types. Enforces organizational structure.',
};

export function getCompositionRulesForDisplay(): Array<{
  rule: string;
  description: string;
}> {
  return [
    {
      rule: 'Maximum Depth',
      description: COMPOSITION_RULES_DESCRIPTION.MAX_ITEM_DEPTH,
    },
    {
      rule: 'Timeline Eligibility',
      description: COMPOSITION_RULES_DESCRIPTION.TIMELINE_ELIGIBLE_ONLY_TOP_LEVEL,
    },
    {
      rule: 'Task Flow Sync',
      description: COMPOSITION_RULES_DESCRIPTION.TASKFLOW_SYNC_CHILD_ITEMS,
    },
    {
      rule: 'Type Compatibility',
      description: COMPOSITION_RULES_DESCRIPTION.PARENT_CHILD_MATRIX,
    },
  ];
}

export interface ParentEnvelopeRule {
  enforceParentDateBoundaries: boolean;
  allowChildWithoutDates: boolean;
}

export const PARENT_ENVELOPE_RULES: ParentEnvelopeRule = {
  enforceParentDateBoundaries: false,
  allowChildWithoutDates: true,
};

export function validateParentEnvelope(
  parentStartDate: string | null | undefined,
  parentEndDate: string | null | undefined,
  childStartDate: string | null | undefined,
  childEndDate: string | null | undefined
): {
  isWithinParentWindow: boolean;
  violation?: string;
} {
  if (!PARENT_ENVELOPE_RULES.enforceParentDateBoundaries) {
    return { isWithinParentWindow: true };
  }

  if (!childStartDate && !childEndDate) {
    return {
      isWithinParentWindow: PARENT_ENVELOPE_RULES.allowChildWithoutDates,
      violation: PARENT_ENVELOPE_RULES.allowChildWithoutDates
        ? undefined
        : 'Child has no dates',
    };
  }

  if (!parentStartDate || !parentEndDate) {
    return { isWithinParentWindow: true };
  }

  const parentStart = new Date(parentStartDate);
  const parentEnd = new Date(parentEndDate);

  if (childStartDate) {
    const childStart = new Date(childStartDate);
    if (childStart < parentStart || childStart > parentEnd) {
      return {
        isWithinParentWindow: false,
        violation: 'Child start date is outside parent date range',
      };
    }
  }

  if (childEndDate) {
    const childEnd = new Date(childEndDate);
    if (childEnd < parentStart || childEnd > parentEnd) {
      return {
        isWithinParentWindow: false,
        violation: 'Child end date is outside parent date range',
      };
    }
  }

  return { isWithinParentWindow: true };
}

export const COMPOSITION_ERROR_MESSAGES = {
  CYCLE_DETECTED: 'Cannot attach item: would create a circular relationship',
  MAX_DEPTH_EXCEEDED: `Cannot attach item: would exceed maximum depth of ${MAX_ITEM_DEPTH}`,
  INVALID_TYPE_COMBINATION: (parentType: string, childType: string) =>
    `Cannot attach ${childType} to ${parentType}: type combination not allowed`,
  DIFFERENT_SECTION: 'Cannot attach item: parent and child must be in same section',
  DIFFERENT_PROJECT: 'Cannot attach item: parent and child must be in same project',
  PARENT_NOT_FOUND: 'Parent item not found',
  CHILD_NOT_FOUND: 'Child item not found',
  SELF_REFERENCE: 'Cannot attach item to itself',
  ALREADY_HAS_PARENT: 'Child item already has a parent',
  PARENT_ENVELOPE_VIOLATION: (violation: string) =>
    `Date validation failed: ${violation}`,
};
