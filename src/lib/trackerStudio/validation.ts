/**
 * Tracker Studio Validation
 * 
 * Validation rules for tracker templates, trackers, and entries.
 * All validation occurs before writes.
 */

import type {
  TrackerFieldSchema,
  TrackerFieldType,
  TrackerEntryGranularity,
  CreateTrackerTemplateInput,
  CreateTrackerFromSchemaInput,
  CreateTrackerEntryInput,
  Tracker,
} from './types';

/**
 * Validation error with detailed context
 */
export class TrackerValidationError extends Error {
  public fieldId?: string;
  public fieldLabel?: string;
  public fieldType?: string;
  public value?: unknown;
  
  constructor(
    message: string,
    context?: {
      fieldId?: string;
      fieldLabel?: string;
      fieldType?: string;
      value?: unknown;
    }
  ) {
    super(message);
    this.name = 'TrackerValidationError';
    
    if (context) {
      this.fieldId = context.fieldId;
      this.fieldLabel = context.fieldLabel;
      this.fieldType = context.fieldType;
      this.value = context.value;
    }
    
    // Log validation error in development
    if (import.meta.env.DEV) {
      console.error('[TrackerValidationError]', {
        message,
        ...context,
      });
    }
  }
}

/**
 * Validate field schema
 */
export function validateFieldSchema(fieldSchema: TrackerFieldSchema[]): void {
  if (!Array.isArray(fieldSchema) || fieldSchema.length === 0) {
    throw new TrackerValidationError('Field schema must be a non-empty array');
  }

  const fieldIds = new Set<string>();
  
  for (const field of fieldSchema) {
    // Validate field ID
    if (!field.id || typeof field.id !== 'string' || field.id.trim() === '') {
      throw new TrackerValidationError(
        'Field ID is required and must be non-empty',
        { fieldId: field.id, fieldLabel: field.label, fieldType: field.type }
      );
    }

    // Check for duplicate field IDs
    if (fieldIds.has(field.id)) {
      throw new TrackerValidationError(
        `Duplicate field ID: ${field.id}`,
        { fieldId: field.id, fieldLabel: field.label, fieldType: field.type }
      );
    }
    fieldIds.add(field.id);

    // Validate label
    if (!field.label || typeof field.label !== 'string' || field.label.trim() === '') {
      throw new TrackerValidationError(
        `Field "${field.id}": label is required and must be non-empty`,
        { fieldId: field.id, fieldLabel: field.label, fieldType: field.type }
      );
    }

    // Validate type
    const validTypes: TrackerFieldType[] = ['text', 'number', 'boolean', 'rating', 'date'];
    if (!validTypes.includes(field.type)) {
      throw new TrackerValidationError(
        `Field "${field.id}" (${field.label}): type must be one of: ${validTypes.join(', ')}. Got: ${field.type}`,
        { fieldId: field.id, fieldLabel: field.label, fieldType: field.type }
      );
    }

    // Validate validation rules
    if (field.validation) {
      validateFieldValidation(field.id, field.type, field.validation);
    }

    // Validate default value
    if (field.default !== undefined) {
      validateFieldValue(field.id, field.type, field.default);
    }
  }
}

/**
 * Validate field validation rules
 */
function validateFieldValidation(
  fieldId: string,
  fieldType: TrackerFieldType,
  validation: { min?: number; max?: number; pattern?: string; minLength?: number; maxLength?: number }
): void {
  if (fieldType === 'number' || fieldType === 'rating') {
    if (validation.min !== undefined && validation.max !== undefined) {
      if (validation.min > validation.max) {
        throw new TrackerValidationError(`Field ${fieldId}: min must be <= max`);
      }
    }
    if (fieldType === 'rating') {
      // Rating should be 1-5 by default
      if (validation.min !== undefined && validation.min < 1) {
        throw new TrackerValidationError(`Field ${fieldId}: rating min must be >= 1`);
      }
      if (validation.max !== undefined && validation.max > 5) {
        throw new TrackerValidationError(`Field ${fieldId}: rating max must be <= 5`);
      }
    }
  }

  if (fieldType === 'text') {
    if (validation.minLength !== undefined && validation.maxLength !== undefined) {
      if (validation.minLength > validation.maxLength) {
        throw new TrackerValidationError(`Field ${fieldId}: minLength must be <= maxLength`);
      }
    }
    if (validation.pattern) {
      try {
        new RegExp(validation.pattern);
      } catch {
        throw new TrackerValidationError(`Field ${fieldId}: pattern must be a valid regex`);
      }
    }
  }
}

/**
 * Validate field value matches field type
 */
export function validateFieldValue(
  fieldId: string,
  fieldType: TrackerFieldType,
  value: unknown
): void {
  switch (fieldType) {
    case 'text':
      if (typeof value !== 'string') {
        throw new TrackerValidationError(
          `Field "${fieldId}": value must be a string, got ${typeof value}${value !== null && value !== undefined ? ` (${JSON.stringify(value).substring(0, 50)})` : ''}`,
          { fieldId, fieldType, value }
        );
      }
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        throw new TrackerValidationError(
          `Field "${fieldId}": value must be a number, got ${typeof value}${value !== null && value !== undefined ? ` (${JSON.stringify(value)})` : ''}`,
          { fieldId, fieldType, value }
        );
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new TrackerValidationError(
          `Field "${fieldId}": value must be a boolean, got ${typeof value}${value !== null && value !== undefined ? ` (${JSON.stringify(value)})` : ''}`,
          { fieldId, fieldType, value }
        );
      }
      break;
    case 'rating':
      if (typeof value !== 'number' || isNaN(value) || value < 1 || value > 5) {
        throw new TrackerValidationError(
          `Field "${fieldId}": value must be a number between 1 and 5, got ${typeof value === 'number' ? value : typeof value}${value !== null && value !== undefined ? ` (${JSON.stringify(value)})` : ''}`,
          { fieldId, fieldType, value }
        );
      }
      break;
    case 'date':
      if (typeof value !== 'string') {
        throw new TrackerValidationError(
          `Field "${fieldId}": value must be a date string, got ${typeof value}${value !== null && value !== undefined ? ` (${JSON.stringify(value).substring(0, 50)})` : ''}`,
          { fieldId, fieldType, value }
        );
      }
      // Validate ISO date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new TrackerValidationError(
          `Field "${fieldId}": value must be a valid date (YYYY-MM-DD), got "${value}"`,
          { fieldId, fieldType, value }
        );
      }
      break;
    default:
      throw new TrackerValidationError(
        `Field "${fieldId}": unknown field type: ${fieldType}`,
        { fieldId, fieldType, value }
      );
  }
}

/**
 * Validate entry granularity
 */
export function validateEntryGranularity(granularity: string): void {
  const validGranularities: TrackerEntryGranularity[] = ['daily', 'session', 'event', 'range'];
  if (!validGranularities.includes(granularity as TrackerEntryGranularity)) {
    throw new TrackerValidationError(`Entry granularity must be one of: ${validGranularities.join(', ')}`);
  }
}

/**
 * Validate template input
 */
export function validateCreateTemplateInput(input: CreateTrackerTemplateInput): void {
  if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
    throw new TrackerValidationError('Template name is required and must be non-empty');
  }

  if (input.entry_granularity) {
    validateEntryGranularity(input.entry_granularity);
  }

  validateFieldSchema(input.field_schema);
}

/**
 * Validate tracker creation from schema
 */
export function validateCreateTrackerFromSchemaInput(input: CreateTrackerFromSchemaInput): void {
  if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
    throw new TrackerValidationError('Tracker name is required and must be non-empty');
  }

  if (input.entry_granularity) {
    validateEntryGranularity(input.entry_granularity);
  }

  validateFieldSchema(input.field_schema);
}

/**
 * Validate entry values against tracker schema
 */
export function validateEntryValues(tracker: Tracker, fieldValues: Record<string, unknown>): void {
  const schemaMap = new Map<string, TrackerFieldSchema>();
  for (const field of tracker.field_schema_snapshot) {
    schemaMap.set(field.id, field);
  }

  // Check that all required fields are present
  for (const field of tracker.field_schema_snapshot) {
    if (field.validation?.required && !(field.id in fieldValues)) {
      throw new TrackerValidationError(
        `Required field "${field.label}" (${field.id}) is missing`,
        { fieldId: field.id, fieldLabel: field.label, fieldType: field.type }
      );
    }
  }

  // Validate all provided values
  for (const [fieldId, value] of Object.entries(fieldValues)) {
    // Allow metadata fields (starting with _) without schema validation
    // These are used for analytics and special processing (e.g., _emotion_words)
    if (fieldId.startsWith('_')) {
      continue;
    }
    
    const field = schemaMap.get(fieldId);
    if (!field) {
      throw new TrackerValidationError(
        `Unknown field: ${fieldId}. Available fields: ${Array.from(schemaMap.keys()).join(', ')}`,
        { fieldId, value }
      );
    }

    // Allow null for optional fields
    if (value === null && !field.validation?.required) {
      continue;
    }

    if (value === null && field.validation?.required) {
      throw new TrackerValidationError(
        `Required field "${field.label}" (${fieldId}) cannot be null`,
        { fieldId, fieldLabel: field.label, fieldType: field.type, value: null }
      );
    }

    // Validate type
    try {
      validateFieldValue(fieldId, field.type, value);
    } catch (err) {
      // Re-throw with field label context
      if (err instanceof TrackerValidationError) {
        throw new TrackerValidationError(
          err.message.replace(`Field "${fieldId}"`, `Field "${field.label}" (${fieldId})`),
          { fieldId, fieldLabel: field.label, fieldType: field.type, value }
        );
      }
      throw err;
    }

    // Validate constraints
    if (field.validation) {
      try {
        validateFieldConstraints(fieldId, field.type, field.validation, value);
      } catch (err) {
        // Re-throw with field label context
        if (err instanceof TrackerValidationError) {
          throw new TrackerValidationError(
            err.message.replace(`Field ${fieldId}`, `Field "${field.label}" (${fieldId})`),
            { fieldId, fieldLabel: field.label, fieldType: field.type, value }
          );
        }
        throw err;
      }
    }
  }
}

/**
 * Validate field constraints
 */
function validateFieldConstraints(
  fieldId: string,
  fieldType: TrackerFieldType,
  validation: { min?: number; max?: number; pattern?: string; minLength?: number; maxLength?: number },
  value: unknown
): void {
  if (fieldType === 'number' || fieldType === 'rating') {
    const numValue = value as number;
    if (validation.min !== undefined && numValue < validation.min) {
      throw new TrackerValidationError(
        `Field "${fieldId}": value ${numValue} must be >= ${validation.min}`,
        { fieldId, fieldType, value: numValue }
      );
    }
    if (validation.max !== undefined && numValue > validation.max) {
      throw new TrackerValidationError(
        `Field "${fieldId}": value ${numValue} must be <= ${validation.max}`,
        { fieldId, fieldType, value: numValue }
      );
    }
  }

  if (fieldType === 'text') {
    const strValue = value as string;
    if (validation.minLength !== undefined && strValue.length < validation.minLength) {
      throw new TrackerValidationError(
        `Field "${fieldId}": length ${strValue.length} must be >= ${validation.minLength} characters`,
        { fieldId, fieldType, value: strValue.substring(0, 50) }
      );
    }
    if (validation.maxLength !== undefined && strValue.length > validation.maxLength) {
      throw new TrackerValidationError(
        `Field "${fieldId}": length ${strValue.length} must be <= ${validation.maxLength} characters`,
        { fieldId, fieldType, value: strValue.substring(0, 50) }
      );
    }
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(strValue)) {
        throw new TrackerValidationError(
          `Field "${fieldId}": value does not match required pattern ${validation.pattern}`,
          { fieldId, fieldType, value: strValue.substring(0, 50) }
        );
      }
    }
  }
}

/**
 * Validate entry date
 */
export function validateEntryDate(dateString: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new TrackerValidationError('Entry date must be in format YYYY-MM-DD');
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new TrackerValidationError('Entry date must be a valid date');
  }
}
