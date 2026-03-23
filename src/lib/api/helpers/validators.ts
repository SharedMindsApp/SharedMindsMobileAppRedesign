/**
 * Input Validation Utilities
 * 
 * Validates request inputs before service calls.
 * Services also validate, but this provides early feedback to UI.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateNonEmpty(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

export function validateUUID(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return { valid: false, error: `${fieldName} must be a valid ID` };
  }
  
  return { valid: true };
}

export function validateEnum<T extends string>(
  value: string | null | undefined,
  fieldName: string,
  allowedValues: readonly T[]
): ValidationResult {
  if (!value) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (!allowedValues.includes(value as T)) {
    return { valid: false, error: `${fieldName} must be one of: ${allowedValues.join(', ')}` };
  }
  
  return { valid: true };
}

export function validateGroupName(name: string): ValidationResult {
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Group name is required' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Group name must be 100 characters or less' };
  }
  
  return { valid: true };
}
