export type UIMode = 'fridge' | 'mobile';

export type AppType =
  | 'calendar'
  | 'meal_planner'
  | 'grocery_list'
  | 'habits'
  | 'goals'
  | 'reminders'
  | 'insights'
  | 'analytics'
  | 'household_members'
  | 'settings'
  | 'achievements'
  | 'messaging'
  | 'notes'
  | 'photos'
  | 'widget';

export interface MobileAppFolder {
  id: string;
  profile_id: string;
  name: string;
  page: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface MobileAppLayout {
  id: string;
  profile_id: string;
  widget_id: string | null;
  app_type: AppType;
  page: number;
  position: number;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppIconConfig {
  id: string;
  type: AppType;
  name: string;
  icon: string;
  color: string;
  widgetId?: string;
  badge?: number;
  folderId?: string;
}

export interface AppMetadata {
  type: AppType;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const APP_METADATA: Record<AppType, AppMetadata> = {
  calendar: {
    type: 'calendar',
    name: 'Calendar',
    icon: 'Calendar',
    color: 'bg-blue-500',
    description: 'Manage events and schedules'
  },
  meal_planner: {
    type: 'meal_planner',
    name: 'Meals',
    icon: 'UtensilsCrossed',
    color: 'bg-orange-500',
    description: 'Plan your meals'
  },
  grocery_list: {
    type: 'grocery_list',
    name: 'Groceries',
    icon: 'ShoppingCart',
    color: 'bg-green-500',
    description: 'Shopping list'
  },
  habits: {
    type: 'habits',
    name: 'Habits',
    icon: 'Repeat',
    color: 'bg-purple-500',
    description: 'Track daily habits'
  },
  goals: {
    type: 'goals',
    name: 'Goals',
    icon: 'Target',
    color: 'bg-red-500',
    description: 'Set and achieve goals'
  },
  reminders: {
    type: 'reminders',
    name: 'Reminders',
    icon: 'Bell',
    color: 'bg-yellow-500',
    description: 'Task reminders'
  },
  insights: {
    type: 'insights',
    name: 'Insights',
    icon: 'Lightbulb',
    color: 'bg-amber-500',
    description: 'View insights'
  },
  analytics: {
    type: 'analytics',
    name: 'Analytics',
    icon: 'BarChart3',
    color: 'bg-cyan-500',
    description: 'Usage analytics'
  },
  household_members: {
    type: 'household_members',
    name: 'Space',
    icon: 'Users',
    color: 'bg-teal-500',
    description: 'Space members'
  },
  settings: {
    type: 'settings',
    name: 'Settings',
    icon: 'Settings',
    color: 'bg-gray-500',
    description: 'App settings'
  },
  achievements: {
    type: 'achievements',
    name: 'Achievements',
    icon: 'Trophy',
    color: 'bg-yellow-600',
    description: 'Streaks and badges'
  },
  messaging: {
    type: 'messaging',
    name: 'Messages',
    icon: 'MessageCircle',
    color: 'bg-blue-600',
    description: 'Chat with household'
  },
  notes: {
    type: 'notes',
    name: 'Notes',
    icon: 'StickyNote',
    color: 'bg-yellow-400',
    description: 'Quick notes'
  },
  photos: {
    type: 'photos',
    name: 'Photos',
    icon: 'Image',
    color: 'bg-pink-500',
    description: 'Photo gallery'
  },
  widget: {
    type: 'widget',
    name: 'Widget',
    icon: 'Square',
    color: 'bg-gray-400',
    description: 'Custom widget'
  }
};

export const DEFAULT_APPS: AppType[] = [
  'calendar',
  'meal_planner',
  'grocery_list',
  'habits',
  'goals',
  'reminders',
  'insights',
  'achievements',
  'messaging',
  'household_members',
  'notes',
  'photos',
  'settings'
];
