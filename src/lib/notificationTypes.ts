/**
 * Notification Types and Interfaces
 * 
 * Core notification data model for the global notification system.
 * This model is delivery-agnostic (works for in-app and push).
 */

export type NotificationType = 
  | 'system' 
  | 'calendar' 
  | 'guardrails' 
  | 'planner' 
  | 'social';

export type NotificationSourceType = 
  | 'project' 
  | 'event' 
  | 'task' 
  | 'system' 
  | 'alignment' 
  | 'goal' 
  | 'habit'
  | 'tracker'
  | 'routine'
  | 'sleep';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  source_type: NotificationSourceType | null;
  source_id: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  
  // Global toggles
  notifications_enabled: boolean;
  push_enabled: boolean;
  do_not_disturb: boolean;
  
  // Category preferences (in-app)
  calendar_reminders: boolean;
  guardrails_updates: boolean;
  planner_alerts: boolean;
  system_messages: boolean;
  tracker_reminders: boolean;
  habit_reminders: boolean;
  sleep_reminders: boolean;
  routine_reminders: boolean;
  
  // Category preferences (push)
  calendar_reminders_push: boolean;
  guardrails_updates_push: boolean;
  planner_alerts_push: boolean;
  system_messages_push: boolean;
  tracker_reminders_push: boolean;
  habit_reminders_push: boolean;
  sleep_reminders_push: boolean;
  routine_reminders_push: boolean;
  
  updated_at: string;
}

export interface PushToken {
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  created_at: string;
  last_used_at: string;
}

// Client-side types
export interface NotificationGroup {
  today: Notification[];
  earlier: Notification[];
}

export interface NotificationStats {
  total: number;
  unread: number;
}
