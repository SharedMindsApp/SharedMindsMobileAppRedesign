import type {
  RoadmapItemType,
  RoadmapItemStatus,
  ValidationError,
  CreateRoadmapItemInput,
  UpdateRoadmapItemInput,
} from './coreTypes';
import { ROADMAP_ITEM_TYPE_RULES } from './coreTypes';

export interface RoadmapItemValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateRoadmapItemType(
  input: CreateRoadmapItemInput | UpdateRoadmapItemInput
): RoadmapItemValidationResult {
  const errors: ValidationError[] = [];

  if (!('type' in input) || !input.type) {
    return { valid: true, errors };
  }

  const rules = ROADMAP_ITEM_TYPE_RULES[input.type];

  if (rules.requiresDates && !input.startDate) {
    errors.push({
      field: 'startDate',
      message: `Item type '${input.type}' requires a start date`,
    });
  }

  if ('status' in input && input.status) {
    if (!rules.allowedStatuses.includes(input.status)) {
      errors.push({
        field: 'status',
        message: `Status '${input.status}' is not allowed for item type '${input.type}'. Allowed: ${rules.allowedStatuses.join(', ')}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateMetadataForType(
  type: RoadmapItemType,
  metadata?: Record<string, any>
): RoadmapItemValidationResult {
  const errors: ValidationError[] = [];

  if (!metadata) {
    return { valid: true, errors };
  }

  switch (type) {
    case 'task':
      if (metadata.checklist) {
        if (!Array.isArray(metadata.checklist)) {
          errors.push({
            field: 'metadata.checklist',
            message: 'Checklist must be an array',
          });
        }
      }
      if (metadata.priority) {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(metadata.priority)) {
          errors.push({
            field: 'metadata.priority',
            message: `Priority must be one of: ${validPriorities.join(', ')}`,
          });
        }
      }
      break;

    case 'event':
      if (metadata.allDay !== undefined && typeof metadata.allDay !== 'boolean') {
        errors.push({
          field: 'metadata.allDay',
          message: 'allDay must be a boolean',
        });
      }
      break;

    case 'habit':
      if (metadata.recurrencePattern) {
        const pattern = metadata.recurrencePattern;
        const validFrequencies = ['daily', 'weekly', 'monthly'];
        if (!validFrequencies.includes(pattern.frequency)) {
          errors.push({
            field: 'metadata.recurrencePattern.frequency',
            message: `Frequency must be one of: ${validFrequencies.join(', ')}`,
          });
        }
      }
      break;

    case 'grocery_list':
      if (metadata.items) {
        if (!Array.isArray(metadata.items)) {
          errors.push({
            field: 'metadata.items',
            message: 'Items must be an array',
          });
        }
      }
      break;

    case 'review':
      if (metadata.rating !== undefined) {
        if (typeof metadata.rating !== 'number' || metadata.rating < 0 || metadata.rating > 5) {
          errors.push({
            field: 'metadata.rating',
            message: 'Rating must be a number between 0 and 5',
          });
        }
      }
      break;

    case 'goal':
      if (metadata.targetValue !== undefined && typeof metadata.targetValue !== 'number') {
        errors.push({
          field: 'metadata.targetValue',
          message: 'Target value must be a number',
        });
      }
      if (metadata.currentValue !== undefined && typeof metadata.currentValue !== 'number') {
        errors.push({
          field: 'metadata.currentValue',
          message: 'Current value must be a number',
        });
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getDefaultStatusForType(type: RoadmapItemType): RoadmapItemStatus {
  return ROADMAP_ITEM_TYPE_RULES[type].defaultStatus;
}

export function canTypeAppearInTimeline(type: RoadmapItemType): boolean {
  return ROADMAP_ITEM_TYPE_RULES[type].canAppearInTimeline;
}

export function typeAllowsDeadlines(type: RoadmapItemType): boolean {
  return ROADMAP_ITEM_TYPE_RULES[type].allowsDeadlines;
}

export function typeRequiresDates(type: RoadmapItemType): boolean {
  return ROADMAP_ITEM_TYPE_RULES[type].requiresDates;
}

export function isStatusValidForType(
  status: RoadmapItemStatus,
  type: RoadmapItemType
): boolean {
  return ROADMAP_ITEM_TYPE_RULES[type].allowedStatuses.includes(status);
}

export function validateFullRoadmapItem(
  input: CreateRoadmapItemInput | UpdateRoadmapItemInput
): RoadmapItemValidationResult {
  const typeValidation = validateRoadmapItemType(input);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  if ('type' in input && input.type && input.metadata) {
    const metadataValidation = validateMetadataForType(input.type, input.metadata);
    if (!metadataValidation.valid) {
      return metadataValidation;
    }
  }

  return { valid: true, errors: [] };
}
