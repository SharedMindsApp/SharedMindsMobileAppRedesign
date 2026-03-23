/**
 * Security Utilities
 * 
 * Provides input sanitization, XSS protection, and security validation
 * according to industry standards (OWASP guidelines).
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Sanitize user input by removing potentially dangerous characters
 */
export function sanitizeInput(input: string, options?: {
  maxLength?: number;
  allowHtml?: boolean;
  allowedTags?: string[];
}): string {
  let sanitized = input.trim();

  // Enforce max length if specified
  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Remove or escape HTML if not allowed
  if (!options?.allowHtml) {
    sanitized = sanitizeHTML(sanitized);
  } else if (options.allowedTags) {
    // Basic tag whitelisting (for simple cases)
    // For production, consider using DOMPurify library
    const allowedPattern = new RegExp(`<(?!\/?(?:${options.allowedTags.join('|')})(?:\s|>))[^>]+>`, 'gi');
    sanitized = sanitized.replace(allowedPattern, '');
  }

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Escape special characters for use in regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate input against a whitelist pattern
 */
export function validateAgainstPattern(input: string, pattern: RegExp): boolean {
  return pattern.test(input);
}

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  // Alphanumeric with spaces, hyphens, underscores
  alphanumeric: /^[a-zA-Z0-9\s\-_]+$/,
  
  // Name: letters, spaces, hyphens, apostrophes
  name: /^[a-zA-Z\s\-']+$/,
  
  // Slug: lowercase letters, numbers, hyphens
  slug: /^[a-z0-9\-]+$/,
  
  // No script tags or javascript: protocol
  safeText: /^(?!.*<script|javascript:)[\s\S]*$/i,
  
  // UUID format
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

/**
 * Check for potential SQL injection patterns (basic check)
 * Note: This is a client-side check. Real protection should be on the server.
 */
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(;|\-\-|#|\/\*|\*\/|xp_|sp_)/i,
    /(\bOR\b.*=.*=|\bAND\b.*=.*=)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for potential XSS patterns
 */
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*["']/gi, // onclick=, onerror=, etc.
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate and sanitize user input with security checks
 */
export function validateAndSanitize(input: string, options?: {
  maxLength?: number;
  pattern?: RegExp;
  required?: boolean;
  checkSQL?: boolean;
  checkXSS?: boolean;
}): { valid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = [];

  // Required check
  if (options?.required && !input.trim()) {
    errors.push('This field is required');
    return { valid: false, sanitized: '', errors };
  }

  // Length check
  if (options?.maxLength && input.length > options.maxLength) {
    errors.push(`Input must be ${options.maxLength} characters or less`);
  }

  // Pattern validation
  if (options?.pattern && !options.pattern.test(input)) {
    errors.push('Input format is invalid');
  }

  // Security checks
  if (options?.checkSQL !== false && containsSQLInjection(input)) {
    errors.push('Input contains potentially unsafe content');
  }

  if (options?.checkXSS !== false && containsXSS(input)) {
    errors.push('Input contains potentially unsafe content');
  }

  // Sanitize
  const sanitized = sanitizeInput(input, {
    maxLength: options?.maxLength,
    allowHtml: false,
  });

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if running in secure context (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || 
         window.location.protocol === 'https:' ||
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

