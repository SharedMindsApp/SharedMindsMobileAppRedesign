export type LayoutMode = 'standard' | 'nd-optimized';
export type UIDensity = 'compact' | 'standard' | 'spacious';
export type FontScale = 's' | 'm' | 'l' | 'xl';
export type ColorTheme = 'default' | 'cream' | 'pastel-yellow' | 'pastel-blue' | 'light-grey' | 'monochrome';
export type ContrastLevel = 'normal' | 'high' | 'reduced';
export type AppTheme = 'light' | 'dark' | 'neon-dark';
export type MeasurementSystem = 'metric' | 'imperial';

export interface NeurotypeProfile {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  default_layout: LayoutMode;
  default_density: UIDensity;
  default_theme: {
    colorTheme: ColorTheme;
    contrastLevel: ContrastLevel;
    fontScale: FontScale;
  };
  is_active: boolean;
  created_at: string;
}

export interface UserUIPreferences {
  id: string;
  user_id: string;
  neurotype_profile_id: string | null;
  layout_mode: LayoutMode;
  ui_density: UIDensity;
  font_scale: FontScale;
  color_theme: ColorTheme;
  contrast_level: ContrastLevel;
  reduced_motion: boolean;
  app_theme: AppTheme;
  measurement_system?: MeasurementSystem;
  recipe_location?: string | null; // User's default location for recipe searches (e.g., "United Kingdom")
  recipe_location_override?: string | null; // Optional temporary override (e.g., when on holiday)
  include_location_in_ai?: boolean; // Whether to include location in AI prompts (default: true)
  custom_overrides: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type WidgetColorToken =
  | 'cyan'
  | 'blue'
  | 'violet'
  | 'pink'
  | 'orange'
  | 'green'
  | 'yellow'
  | 'neutral'
  | 'red'
  | 'teal'
  | 'emerald'
  | 'amber'
  | 'indigo'
  | 'rose'
  | 'sky'
  | 'lime'
  | 'fuchsia'
  | 'slate';

export type WidgetTypeId =
  | 'note'
  | 'reminder'
  | 'calendar'
  | 'goal'
  | 'habit'
  | 'habit_tracker'
  | 'achievements'
  | 'photo'
  | 'insight'
  | 'meal_planner'
  | 'grocery_list'
  | 'todos'
  | 'stack_card'
  | 'files'
  | 'collections'
  | 'tables';

export type WidgetColorPreferences = Record<WidgetTypeId, WidgetColorToken>;

export type NavigationTabId =
  | 'home'
  | 'sessions'
  | 'progress'
  | 'tasks'
  | 'projects'
  | 'calendar'
  | 'pantry'
  | 'journal'
  | 'connections'
  | 'profile'
  | 'settings';

export interface NavigationTab {
  id: NavigationTabId;
  label: string;
  path: string;
  icon: string;
  requiresAdmin?: boolean;
  requiresPantryAccess?: boolean;
}

export const ALL_NAVIGATION_TABS: NavigationTab[] = [
  { id: 'home', label: 'Home', path: '/home', icon: 'Home' },
  { id: 'sessions', label: 'Sessions', path: '/sessions', icon: 'Users' },
  { id: 'progress', label: 'Progress', path: '/progress', icon: 'TrendingUp' },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: 'Target' },
  { id: 'projects', label: 'Projects', path: '/projects', icon: 'Zap' },
  // 'calendar' tab removed — /sessions is the calendar. /calendar redirects to /sessions.
  { id: 'pantry', label: 'Pantry', path: '/pantry', icon: 'Package', requiresAdmin: true },
  { id: 'journal', label: 'Journal', path: '/journal', icon: 'BookOpen', requiresAdmin: true },
  { id: 'connections', label: 'Connections', path: '/connections', icon: 'Link2' },
  { id: 'profile', label: 'Profile', path: '/profile', icon: 'UserRound' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: 'Settings' },
];

export const DEFAULT_FAVOURITE_NAV_TABS: NavigationTabId[] = [
  'home',
  'sessions',
  'connections',
];

export interface UIPreferencesConfig {
  layoutMode: LayoutMode;
  uiDensity: UIDensity;
  fontScale: FontScale;
  colorTheme: ColorTheme;
  contrastLevel: ContrastLevel;
  reducedMotion: boolean;
  appTheme: AppTheme;
  measurementSystem?: MeasurementSystem;
  recipeLocation?: string | null; // User's default location for recipe searches
  recipeLocationOverride?: string | null; // Optional temporary override (e.g., when on holiday)
  includeLocationInAI?: boolean; // Whether to include location in AI prompts (default: true)
  widgetColors?: WidgetColorPreferences;
  favouriteNavTabs?: NavigationTabId[];
}

export const FONT_SCALE_MAP: Record<FontScale, number> = {
  s: 0.875,
  m: 1,
  l: 1.125,
  xl: 1.25,
};

export const DENSITY_SPACING_MAP: Record<UIDensity, string> = {
  compact: 'gap-3',
  standard: 'gap-4',
  spacious: 'gap-6',
};

export const COLOR_THEMES: Record<ColorTheme, { bg: string; text: string; cardBg: string; description: string }> = {
  default: {
    bg: 'bg-[#f7f7f9]',
    text: 'text-gray-900',
    cardBg: 'bg-white',
    description: 'Default theme with standard colors',
  },
  cream: {
    bg: 'bg-[#F8F3E6]',
    text: 'text-gray-900',
    cardBg: 'bg-[#FEFBF3]',
    description: 'Warm cream background for reduced eye strain',
  },
  'pastel-yellow': {
    bg: 'bg-[#FFF7CC]',
    text: 'text-gray-900',
    cardBg: 'bg-[#FFFEF0]',
    description: 'Soft yellow tint for dyslexia support',
  },
  'pastel-blue': {
    bg: 'bg-[#DDEEFF]',
    text: 'text-gray-900',
    cardBg: 'bg-[#F0F8FF]',
    description: 'Calming blue tone for anxiety reduction',
  },
  'light-grey': {
    bg: 'bg-gray-100',
    text: 'text-gray-900',
    cardBg: 'bg-white',
    description: 'Neutral grey for minimal distraction',
  },
  monochrome: {
    bg: 'bg-white',
    text: 'text-gray-900',
    cardBg: 'bg-gray-50',
    description: 'High contrast monochrome mode',
  },
};

export const WIDGET_COLOR_TOKENS: Record<WidgetColorToken, { rgb: string; label: string }> = {
  cyan: { rgb: '34, 211, 238', label: 'Cyan' },
  blue: { rgb: '59, 130, 246', label: 'Blue' },
  violet: { rgb: '139, 92, 246', label: 'Violet' },
  pink: { rgb: '236, 72, 153', label: 'Pink' },
  orange: { rgb: '251, 146, 60', label: 'Orange' },
  green: { rgb: '34, 197, 94', label: 'Green' },
  yellow: { rgb: '234, 179, 8', label: 'Yellow' },
  neutral: { rgb: '148, 163, 184', label: 'Neutral' },
  red: { rgb: '239, 68, 68', label: 'Red' },
  teal: { rgb: '20, 184, 166', label: 'Teal' },
  emerald: { rgb: '16, 185, 129', label: 'Emerald' },
  amber: { rgb: '245, 158, 11', label: 'Amber' },
  indigo: { rgb: '99, 102, 241', label: 'Indigo' },
  rose: { rgb: '244, 63, 94', label: 'Rose' },
  sky: { rgb: '14, 165, 233', label: 'Sky' },
  lime: { rgb: '132, 204, 22', label: 'Lime' },
  fuchsia: { rgb: '217, 70, 239', label: 'Fuchsia' },
  slate: { rgb: '100, 116, 139', label: 'Slate' },
};

export const DEFAULT_WIDGET_COLORS: WidgetColorPreferences = {
  note: 'yellow',
  reminder: 'pink',
  calendar: 'blue',
  goal: 'green',
  habit: 'orange',
  habit_tracker: 'cyan',
  achievements: 'yellow',
  photo: 'neutral',
  insight: 'violet',
  meal_planner: 'orange',
  grocery_list: 'cyan',
  stack_card: 'blue',
  files: 'neutral',
  collections: 'blue',
  tables: 'cyan',
};
