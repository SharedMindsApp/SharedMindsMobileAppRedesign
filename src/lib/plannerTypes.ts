export type PlannerStylePreset =
  | 'classic'
  | 'bold-structured'
  | 'calm-minimal'
  | 'bright-playful'
  | 'high-contrast';

export type PlannerSpacing = 'compact' | 'comfortable';

export interface PlannerTabConfig {
  path: string;
  label: string;
  enabled: boolean;
  side: 'left' | 'right';
  order: number;
}

export interface PlannerComfortSettings {
  spacing: PlannerSpacing;
  hideSecondary: boolean;
  reduceColorIntensity: boolean;
}

export type QuickActionType = 'navigate' | 'callback';

export interface QuickActionConfig {
  id: string;
  label: string;
  description?: string;
  icon: string;
  iconColor?: string;
  color?: string;
  type: QuickActionType;
  path?: string;
  callback?: () => void;
  contextRoutes?: string[]; // Show only on these routes (empty = show everywhere)
  enabled: boolean;
  order: number;
}

export interface PlannerSettings {
  stylePreset: PlannerStylePreset;
  tabConfig: PlannerTabConfig[];
  favouriteTabs: string[]; // Array of paths, max 10
  comfort: PlannerComfortSettings;
  quickActions: QuickActionConfig[];
}

export interface PlannerStylePresetConfig {
  id: PlannerStylePreset;
  name: string;
  description: string;
  colors: {
    bookBorder: string;
    bookBg: string;
    paperBg: string;
    headerGradient: string;
    leftTabs: {
      index: string;
      daily: string;
      weekly: string;
      monthly: string;
      quarterly: string;
      tasks: string;
      settings: string;
    };
    rightTabs: {
      personal: string;
      work: string;
      education: string;
      finance: string;
      budget: string;
      vision: string;
      planning: string;
      household: string;
      selfCare: string;
      travel: string;
      social: string;
      journal: string;
    };
  };
}

export const PLANNER_STYLE_PRESETS: Record<PlannerStylePreset, PlannerStylePresetConfig> = {
  'classic': {
    id: 'classic',
    name: 'Classic Planner',
    description: 'Neutral, soft paper tones with minimal color. Suitable for everyone.',
    colors: {
      bookBorder: 'border-[#9B8774]',
      bookBg: 'from-gray-50 via-white to-gray-50',
      paperBg: 'bg-[#FDFDFB]',
      headerGradient: 'from-gray-100 via-white to-gray-100',
      leftTabs: {
        index: 'bg-gray-500',
        daily: 'bg-gray-600',
        weekly: 'bg-gray-600',
        monthly: 'bg-gray-500',
        quarterly: 'bg-gray-500',
        tasks: 'bg-gray-600',
        settings: 'bg-gray-600',
      },
      rightTabs: {
        personal: 'bg-stone-500',
        work: 'bg-stone-600',
        education: 'bg-stone-500',
        finance: 'bg-stone-600',
        budget: 'bg-stone-500',
        vision: 'bg-stone-600',
        planning: 'bg-stone-500',
        household: 'bg-stone-600',
        selfCare: 'bg-stone-500',
        travel: 'bg-stone-600',
        social: 'bg-stone-500',
        journal: 'bg-stone-600',
      },
    },
  },
  'bold-structured': {
    id: 'bold-structured',
    name: 'Bold & Structured',
    description: 'Darker accents, strong contrast, muted blues and greys. Professional focus.',
    colors: {
      bookBorder: 'border-[#2C3E50]',
      bookBg: 'from-slate-100 via-slate-50 to-slate-100',
      paperBg: 'bg-[#F8F9FA]',
      headerGradient: 'from-slate-200 via-slate-100 to-slate-200',
      leftTabs: {
        index: 'bg-slate-700',
        daily: 'bg-blue-700',
        weekly: 'bg-blue-800',
        monthly: 'bg-slate-700',
        quarterly: 'bg-slate-800',
        tasks: 'bg-slate-600',
        settings: 'bg-slate-600',
      },
      rightTabs: {
        personal: 'bg-slate-600',
        work: 'bg-blue-900',
        education: 'bg-slate-700',
        finance: 'bg-slate-800',
        budget: 'bg-slate-700',
        vision: 'bg-slate-600',
        planning: 'bg-slate-700',
        household: 'bg-slate-600',
        selfCare: 'bg-slate-700',
        travel: 'bg-slate-600',
        social: 'bg-blue-600',
        journal: 'bg-slate-700',
      },
    },
  },
  'calm-minimal': {
    id: 'calm-minimal',
    name: 'Calm & Minimal',
    description: 'Very low saturation, beige and grey tones. Reduced visual noise. ADHD-friendly.',
    colors: {
      bookBorder: 'border-[#B8AFA4]',
      bookBg: 'from-stone-50 via-stone-100 to-stone-50',
      paperBg: 'bg-[#FAF9F7]',
      headerGradient: 'from-stone-100 via-stone-50 to-stone-100',
      leftTabs: {
        index: 'bg-stone-400',
        daily: 'bg-stone-500',
        weekly: 'bg-stone-500',
        monthly: 'bg-stone-400',
        quarterly: 'bg-stone-400',
        tasks: 'bg-stone-500',
        settings: 'bg-stone-500',
      },
      rightTabs: {
        personal: 'bg-neutral-400',
        work: 'bg-neutral-500',
        education: 'bg-neutral-400',
        finance: 'bg-neutral-500',
        budget: 'bg-neutral-400',
        vision: 'bg-neutral-500',
        planning: 'bg-neutral-400',
        household: 'bg-neutral-500',
        selfCare: 'bg-neutral-400',
        travel: 'bg-neutral-500',
        social: 'bg-neutral-400',
        journal: 'bg-neutral-500',
      },
    },
  },
  'bright-playful': {
    id: 'bright-playful',
    name: 'Bright & Playful',
    description: 'Colorful and expressive. Current default style. Suitable for children or creative users.',
    colors: {
      bookBorder: 'border-[#8b7355]',
      bookBg: 'from-[#e8d5c4] via-[#f0e6dc] to-[#e8d5c4]',
      paperBg: 'bg-[#fefdfb]',
      headerGradient: 'from-gray-100 via-white to-gray-100',
      leftTabs: {
        index: 'bg-gray-400',
        daily: 'bg-blue-500',
        weekly: 'bg-green-500',
        monthly: 'bg-amber-500',
        quarterly: 'bg-purple-500',
        tasks: 'bg-purple-500',
        settings: 'bg-indigo-500',
      },
      rightTabs: {
        personal: 'bg-pink-500',
        work: 'bg-indigo-600',
        education: 'bg-cyan-500',
        finance: 'bg-emerald-600',
        budget: 'bg-teal-600',
        vision: 'bg-violet-500',
        planning: 'bg-orange-500',
        household: 'bg-rose-500',
        selfCare: 'bg-fuchsia-500',
        travel: 'bg-sky-500',
        social: 'bg-blue-400',
        journal: 'bg-amber-600',
      },
    },
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Accessibility-focused with clear separation of sections. Maximum readability.',
    colors: {
      bookBorder: 'border-black',
      bookBg: 'from-white via-gray-50 to-white',
      paperBg: 'bg-white',
      headerGradient: 'from-gray-200 via-gray-100 to-gray-200',
      leftTabs: {
        index: 'bg-gray-900',
        daily: 'bg-black',
        weekly: 'bg-gray-800',
        monthly: 'bg-black',
        quarterly: 'bg-gray-900',
        tasks: 'bg-gray-700',
        settings: 'bg-gray-700',
      },
      rightTabs: {
        personal: 'bg-gray-900',
        work: 'bg-black',
        education: 'bg-gray-800',
        finance: 'bg-black',
        budget: 'bg-gray-900',
        vision: 'bg-black',
        planning: 'bg-gray-800',
        household: 'bg-black',
        selfCare: 'bg-gray-900',
        travel: 'bg-black',
        social: 'bg-gray-800',
        journal: 'bg-black',
      },
    },
  },
};

export const DEFAULT_PLANNER_SETTINGS: PlannerSettings = {
  stylePreset: 'bright-playful',
  tabConfig: [
    // Left tabs - Temporal views (primary navigation)
    { path: '/planner/today', label: 'Today', enabled: true, side: 'left', order: 0 },
    { path: '/planner/week', label: 'Week', enabled: true, side: 'left', order: 1 },
    { path: '/planner/month', label: 'Month', enabled: true, side: 'left', order: 2 },
    { path: '/planner/quarter', label: 'Quarter', enabled: true, side: 'left', order: 3 },
    { path: '/planner/year', label: 'Year', enabled: true, side: 'left', order: 4 },
    { path: '/planner/tasks', label: 'Tasks', enabled: true, side: 'left', order: 5 },
    { path: '/settings', label: 'Settings', enabled: true, side: 'left', order: 6 },
    // Right tabs - Life area filters (secondary navigation, deprecated - kept for backward compat)
    // Note: Life areas are now filters within temporal views, not primary navigation
    { path: '/planner/today?area=vision', label: 'Vision', enabled: false, side: 'right', order: 0 },
    { path: '/planner/today?area=work', label: 'Work', enabled: false, side: 'right', order: 1 },
    { path: '/planner/today?area=personal', label: 'Personal', enabled: false, side: 'right', order: 2 },
    { path: '/planner/today?area=household', label: 'Household', enabled: false, side: 'right', order: 3 },
    { path: '/planner/today?area=financial', label: 'Financial', enabled: false, side: 'right', order: 4 },
    { path: '/planner/today?area=social', label: 'Social', enabled: false, side: 'right', order: 5 },
    { path: '/planner/today?area=travel', label: 'Travel', enabled: false, side: 'right', order: 6 },
  ],
  favouriteTabs: [
    '/planner/today',
    '/planner/week',
    '/planner/month',
    '/planner/quarter',
  ],
  comfort: {
    spacing: 'comfortable',
    hideSecondary: false,
    reduceColorIntensity: false,
  },
  quickActions: [
    {
      id: 'add-event',
      label: 'Add Event',
      description: 'Create a new calendar event',
      icon: 'Calendar',
      iconColor: 'text-blue-600',
      color: 'bg-blue-100',
      type: 'navigate',
      path: '/planner/calendar?view=day',
      enabled: true,
      order: 0,
    },
    {
      id: 'add-goal',
      label: 'Add Goal',
      description: 'Create a new goal',
      icon: 'Target',
      iconColor: 'text-green-600',
      color: 'bg-green-100',
      type: 'navigate',
      path: '/planner/personal',
      enabled: true,
      order: 1,
    },
    {
      id: 'add-task',
      label: 'Add Task',
      description: 'Create a new task',
      icon: 'CheckSquare',
      iconColor: 'text-purple-600',
      color: 'bg-purple-100',
      type: 'navigate',
      path: '/planner/planning/todos',
      enabled: true,
      order: 2,
    },
    {
      id: 'journal-entry',
      label: 'Journal Entry',
      description: 'Write a journal entry',
      icon: 'BookOpen',
      iconColor: 'text-amber-600',
      color: 'bg-amber-100',
      type: 'navigate',
      path: '/planner/journal',
      contextRoutes: [],
      enabled: true,
      order: 3,
    },
    {
      id: 'quick-note',
      label: 'Quick Note',
      description: 'Add a quick note',
      icon: 'FileText',
      iconColor: 'text-gray-600',
      color: 'bg-gray-100',
      type: 'navigate',
      path: '/planner',
      enabled: true,
      order: 4,
    },
  ],
};
