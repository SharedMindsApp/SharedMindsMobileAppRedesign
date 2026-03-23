/**
 * Error Mapping Utilities
 * 
 * Maps service errors to user-friendly messages.
 * Services already return user-friendly errors for business logic,
 * but we hide internal errors (database, RLS) from the UI.
 */

export function mapError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    // Service errors that are already user-friendly (pass through)
    if (
      message.includes('not authorized') ||
      message.includes('cannot') ||
      message.includes('must be') ||
      message.includes('not found') ||
      message.includes('already exists') ||
      message.includes('Only') ||
      message.includes('Cannot')
    ) {
      return message;
    }

    // Feature flag errors
    if (message.includes('feature is disabled') || message.includes('Feature is disabled')) {
      return 'This feature is not available';
    }

    // Internal errors (hide details)
    return 'An error occurred. Please try again.';
  }

  return 'An unexpected error occurred';
}
