/**
 * Notification Capabilities
 * 
 * Feature-level declaration of notification-capable signals.
 * These are capabilities, not actions. Users decide if they're activated.
 */

export type NotificationFeature = 
  | 'calendar' 
  | 'guardrails' 
  | 'planner' 
  | 'tracker' 
  | 'habit' 
  | 'sleep' 
  | 'routine' 
  | 'social' 
  | 'system';

export type NotificationSignalType = 
  | 'reminder' 
  | 'missed_action' 
  | 'upcoming_scheduled' 
  | 'daily_summary' 
  | 'streak_broken' 
  | 'update' 
  | 'alert' 
  | 'milestone'
  | 'meal_upcoming'
  | 'meal_cook_start'
  | 'meal_check_in'
  | 'meal_missed';

export interface NotificationCapability {
  feature: NotificationFeature;
  signalType: NotificationSignalType;
  description: string;
  supportsInApp: boolean;
  supportsPush: boolean;
}

/**
 * Registry of all notification capabilities across features.
 * Features declare what they CAN notify about, not what they WILL notify about.
 */
export const NOTIFICATION_CAPABILITIES: Record<NotificationFeature, NotificationCapability[]> = {
  calendar: [
    {
      feature: 'calendar',
      signalType: 'reminder',
      description: 'Reminders for upcoming events',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'calendar',
      signalType: 'upcoming_scheduled',
      description: 'Notifications for scheduled items starting soon',
      supportsInApp: true,
      supportsPush: true,
    },
  ],
  guardrails: [
    {
      feature: 'guardrails',
      signalType: 'update',
      description: 'Project progress and task updates',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'guardrails',
      signalType: 'milestone',
      description: 'Project milestones and achievements',
      supportsInApp: true,
      supportsPush: true,
    },
  ],
  planner: [
    {
      feature: 'planner',
      signalType: 'reminder',
      description: 'Reminders for tasks and planning activities',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'planner',
      signalType: 'upcoming_scheduled',
      description: 'Upcoming scheduled items',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'planner',
      signalType: 'meal_upcoming',
      description: 'Reminders for upcoming meals',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'planner',
      signalType: 'meal_cook_start',
      description: 'Prompts to start cooking',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'planner',
      signalType: 'meal_check_in',
      description: 'Check-in prompts after meal time',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'planner',
      signalType: 'meal_missed',
      description: 'Notifications for missed meals (opt-in)',
      supportsInApp: true,
      supportsPush: true,
    },
  ],
  tracker: [
    {
      feature: 'tracker',
      signalType: 'reminder',
      description: 'Reminders to log tracker entries',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'tracker',
      signalType: 'missed_action',
      description: 'Notifications when tracker entries are missed',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'tracker',
      signalType: 'daily_summary',
      description: 'Daily tracker summaries',
      supportsInApp: true,
      supportsPush: true,
    },
  ],
  habit: [
    {
      feature: 'habit',
      signalType: 'reminder',
      description: 'Reminders to complete habits',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'habit',
      signalType: 'missed_action',
      description: 'Notifications when habits are missed',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'habit',
      signalType: 'streak_broken',
      description: 'Notifications when habit streaks are broken',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'habit',
      signalType: 'update',
      description: 'Habit invitations and updates',
      supportsInApp: true,
      supportsPush: true,
    },
  ],
  sleep: [
    {
      feature: 'sleep',
      signalType: 'reminder',
      description: 'Bedtime and wake-up reminders',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'sleep',
      signalType: 'daily_summary',
      description: 'Daily sleep summaries',
      supportsInApp: true,
      supportsPush: true,
    },
  ],
  routine: [
    {
      feature: 'routine',
      signalType: 'reminder',
      description: 'Routine start and completion reminders',
      supportsInApp: true,
      supportsPush: true,
    },
    {
      feature: 'routine',
      signalType: 'missed_action',
      description: 'Notifications when routines are missed',
      supportsInApp: true,
      supportsPush: true,
    },
  ],
  social: [
    {
      feature: 'social',
      signalType: 'update',
      description: 'Social updates and interactions',
      supportsInApp: true,
      supportsPush: true,
    },
  ],
  system: [
    {
      feature: 'system',
      signalType: 'alert',
      description: 'Important system updates and announcements',
      supportsInApp: true,
      supportsPush: true,
    },
  ],
};

/**
 * Get capabilities for a specific feature
 */
export function getCapabilitiesForFeature(feature: NotificationFeature): NotificationCapability[] {
  return NOTIFICATION_CAPABILITIES[feature] || [];
}

/**
 * Get all capabilities
 */
export function getAllCapabilities(): NotificationCapability[] {
  return Object.values(NOTIFICATION_CAPABILITIES).flat();
}
