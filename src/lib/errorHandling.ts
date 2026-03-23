// Phase 3C: Error & Offline Grace
// Handles network failures gracefully without offline-first logic
// Ensures app never crashes or shows blank screens

import { logError } from './errorLogger';

/**
 * Phase 3C: Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror')
    );
  }
  return false;
}

/**
 * Phase 3C: Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('timed out');
  }
  return false;
}

/**
 * Phase 3C: Get user-friendly error message
 * Returns clear, actionable error messages without technical jargon
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Connection issue. Please check your internet and try again.';
  }
  
  if (isTimeoutError(error)) {
    return 'Request took too long. Please try again.';
  }

  if (error instanceof Error) {
    // Phase 3C: Return generic message for unknown errors
    // Don't expose technical details to users
    return 'Something went wrong. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Phase 3C: Handle API error gracefully
 * Phase 11: Logs error for mobile debugging
 * Logs error for debugging but returns user-friendly message
 */
export function handleAPIError(error: unknown, context?: string): string {
  const userMessage = getUserFriendlyErrorMessage(error);
  
  // Phase 11: Always log errors for mobile debugging
  logError(
    `API Error${context ? ` in ${context}` : ''}`,
    error instanceof Error ? error : new Error(String(error)),
    {
      component: 'ErrorHandling',
      action: 'handleAPIError',
      context: context || 'unknown',
      userMessage,
    }
  );
  
  return userMessage;
}



