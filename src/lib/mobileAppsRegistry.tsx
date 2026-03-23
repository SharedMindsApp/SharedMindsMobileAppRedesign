import {
  Calendar,
  CheckSquare,
  Target,
  TrendingUp,
  ShoppingCart,
  Bell,
  MessageCircle,
  Users,
  Settings,
  Award,
  BarChart3,
  Lightbulb,
  StickyNote,
  Image
} from 'lucide-react';
import type { ReactNode } from 'react';
import { MobileCalendarApp } from '../components/mobile/apps/MobileCalendarApp';
import { MobileRemindersApp } from '../components/mobile/apps/MobileRemindersApp';
import { MobileGoalsApp } from '../components/mobile/apps/MobileGoalsApp';
import { MobileHabitsApp } from '../components/mobile/apps/MobileHabitsApp';
import { MobileMealPlannerApp } from '../components/mobile/apps/MobileMealPlannerApp';
import { MobileGroceryListApp } from '../components/mobile/apps/MobileGroceryListApp';
import { MobileInsightsApp } from '../components/mobile/apps/MobileInsightsApp';
import { MobileAnalyticsApp } from '../components/mobile/apps/MobileAnalyticsApp';
import { MobileAchievementsApp } from '../components/mobile/apps/MobileAchievementsApp';
import { MobileMessagingApp } from '../components/mobile/apps/MobileMessagingApp';
import { MobileHouseholdMembersApp } from '../components/mobile/apps/MobileHouseholdMembersApp';
import { MobileSettingsApp } from '../components/mobile/apps/MobileSettingsApp';
import { MobileNotesApp } from '../components/mobile/apps/MobileNotesApp';
import { MobilePhotosApp } from '../components/mobile/apps/MobilePhotosApp';

export type MobileAppId =
  | 'calendar'
  | 'reminders'
  | 'goals'
  | 'habits'
  | 'meal_planner'
  | 'grocery_list'
  | 'insights'
  | 'analytics'
  | 'achievements'
  | 'messaging'
  | 'household_members'
  | 'notes'
  | 'photos'
  | 'settings';

export interface MobileAppProps {
  householdId?: string;
  widgetId?: string;
  onClose: () => void;
  openApp: (appId: MobileAppId, widgetId?: string) => void;
}

export interface MobileAppConfig {
  id: MobileAppId;
  name: string;
  icon: ReactNode;
  color: string;
  category: 'planning' | 'health' | 'social' | 'system';
  needsHousehold: boolean;
  component: React.ComponentType<MobileAppProps>;
}

export const MOBILE_APPS: Record<MobileAppId, Omit<MobileAppConfig, 'id'>> = {
  calendar: {
    name: 'Calendar',
    icon: <Calendar size={28} />,
    color: 'bg-red-500',
    category: 'planning',
    needsHousehold: true,
    component: MobileCalendarApp
  },
  reminders: {
    name: 'Reminders',
    icon: <Bell size={28} />,
    color: 'bg-orange-500',
    category: 'planning',
    needsHousehold: false,
    component: MobileRemindersApp
  },
  goals: {
    name: 'Goals',
    icon: <Target size={28} />,
    color: 'bg-blue-500',
    category: 'planning',
    needsHousehold: false,
    component: MobileGoalsApp
  },
  habits: {
    name: 'Habits',
    icon: <CheckSquare size={28} />,
    color: 'bg-green-500',
    category: 'health',
    needsHousehold: false,
    component: MobileHabitsApp
  },
  meal_planner: {
    name: 'Meals',
    icon: <TrendingUp size={28} />,
    color: 'bg-yellow-500',
    category: 'health',
    needsHousehold: true,
    component: MobileMealPlannerApp
  },
  grocery_list: {
    name: 'Groceries',
    icon: <ShoppingCart size={28} />,
    color: 'bg-cyan-500',
    category: 'planning',
    needsHousehold: true,
    component: MobileGroceryListApp
  },
  insights: {
    name: 'Insights',
    icon: <Lightbulb size={28} />,
    color: 'bg-purple-500',
    category: 'health',
    needsHousehold: false,
    component: MobileInsightsApp
  },
  analytics: {
    name: 'Analytics',
    icon: <BarChart3 size={28} />,
    color: 'bg-teal-500',
    category: 'health',
    needsHousehold: false,
    component: MobileAnalyticsApp
  },
  achievements: {
    name: 'Achievements',
    icon: <Award size={28} />,
    color: 'bg-amber-500',
    category: 'social',
    needsHousehold: false,
    component: MobileAchievementsApp
  },
  messaging: {
    name: 'Messages',
    icon: <MessageCircle size={28} />,
    color: 'bg-blue-600',
    category: 'social',
    needsHousehold: true,
    component: MobileMessagingApp
  },
  household_members: {
    name: 'Space',
    icon: <Users size={28} />,
    color: 'bg-indigo-500',
    category: 'social',
    needsHousehold: true,
    component: MobileHouseholdMembersApp
  },
  notes: {
    name: 'Notes',
    icon: <StickyNote size={28} />,
    color: 'bg-yellow-400',
    category: 'planning',
    needsHousehold: true,
    component: MobileNotesApp
  },
  photos: {
    name: 'Photos',
    icon: <Image size={28} />,
    color: 'bg-pink-500',
    category: 'social',
    needsHousehold: true,
    component: MobilePhotosApp
  },
  settings: {
    name: 'Settings',
    icon: <Settings size={28} />,
    color: 'bg-gray-600',
    category: 'system',
    needsHousehold: false,
    component: MobileSettingsApp
  }
};

export function getMobileAppConfig(appId: MobileAppId): MobileAppConfig | undefined {
  const config = MOBILE_APPS[appId];
  if (!config) return undefined;

  return {
    id: appId,
    ...config
  };
}

export function getAllMobileApps(): MobileAppConfig[] {
  return Object.entries(MOBILE_APPS).map(([id, config]) => ({
    id: id as MobileAppId,
    ...config
  }));
}

export function getMobileAppsByCategory(category: string): MobileAppConfig[] {
  return getAllMobileApps().filter(app => app.category === category);
}
