/**
 * Stage 3.3: Foreground Context Trigger Types
 *
 * CRITICAL: These are UI navigation events, NOT analytics events.
 * They only fire when the app is open and user takes action.
 */

export type ForegroundContextEvent =
  | 'project_opened'
  | 'focus_mode_started'
  | 'task_created'
  | 'task_completed';

export interface ForegroundContextPayload {
  event: ForegroundContextEvent;
  contextData?: {
    projectId?: string;
    trackId?: string;
    taskId?: string;
    [key: string]: any;
  };
}
