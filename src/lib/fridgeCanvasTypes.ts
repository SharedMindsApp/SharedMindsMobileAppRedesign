// lib/fridgeCanvasTypes.ts

export type WidgetType =
  | 'note'
  | 'task'
  | 'calendar'
  | 'achievements'
  | 'photo'
  | 'insight'
  | 'reminder'
  | 'agreement'
  | 'meal_planner'
  | 'grocery_list'
  | 'pantry'
  | 'stack_card'
  | 'files'
  | 'collections'
  | 'tables'
  | 'todos'
  | 'tracker_app'
  | 'tracker_quicklink'
  | 'journal'
  | 'workspace'
  | 'custom';

export type SizeMode = 'icon' | 'mini' | 'large' | 'xlarge';
export type WidgetViewMode = SizeMode;
export type WidgetRenderMode = 'fridge' | 'mobile';

// ---- Content Types ----

export interface NoteContent {
  text: string;
  fontSize?: string;
  color?: string;   // used by NoteWidget
  author?: string;  // used by NoteWidget
}

export interface TaskContent {
  description: string;
  completed: boolean;
  dueDate?: string;
}

export interface CalendarEvent {
  title: string;
  date: string;
  time?: string;
  description?: string;
}

export interface CalendarContent {
  eventCount: number;
  nextEvent?: {
    title: string;
    date: string;
  };
  events?: CalendarEvent[];
}

export interface GoalContent {
  title?: string;
  progress: number;
  target?: number;
  targetDate?: string;
  description?: string;
  participants?: string[];
}

export interface HabitContent {
  title?: string;
  streak: number;
  completedToday?: boolean;
  lastCompleted?: string;
  frequency: string;
  participants?: string[];
}

export interface PhotoContent {
  imageUrl?: string;
  url?: string;
  caption?: string;
  uploadedBy?: string;
}

export interface InsightContent {
  title?: string;
  summary?: string;
  description?: string;
  category: string;
}

export interface ReminderContent {
  message?: string;
  title?: string;
  time?: string;
  dueDate?: string;
  completed?: boolean;
  assignedTo?: string[];
  priority?: 'low' | 'medium' | 'high';
}

export interface AgreementContent {
  rules: string[];
  agreedBy: string[];
}

export interface HabitTrackerContent {
  totalHabits: number;
  completedToday: number;
  totalStreak: number;
  totalCompletions: number;
}

export interface AchievementsContent {
  totalAchievements: number;
  unlockedCount: number;
  recentAchievement?: string;
  progressPercentage: number;
}

export interface MealEntry {
  name: string;
  type: 'meal' | 'takeaway';
  takeawayCategory?: 'pizza' | 'indian' | 'chinese' | 'burgers';
}

export interface MealPlannerContent {
  selectedMeal?: {
    id: string;
    name: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    dayOfWeek: string;
    prepTime?: number;
    restrictions?: string[];
  };
  weekPlan?: {
    [day: string]: {
      breakfast?: MealEntry;
      lunch?: MealEntry;
      dinner?: MealEntry;
    };
  };
}

export interface GroceryListContent {
  items: Array<{
    id: string;
    name: string;
    checked: boolean;
    quantity?: string;
    category?: string;
  }>;
}

export interface StackCardContent {
  stackId: string;
  title: string;
  cardCount: number;
  colorScheme: string;
}

export interface FilesContent {
  spaceId: string | null;
  spaceType: 'personal' | 'shared';
  fileCount: number;
}

export interface TablesContent {
  tableId: string;
  tableName: string;
  rowCount: number;
  columnCount: number;
}

export interface TrackerContent {
  tracker_id: string;
}

export interface TrackerAppContent {
  tracker_id: string;
}

export interface TrackerQuickLinkContent {
  // No content needed - shows all trackers
}

export interface JournalContent {
  // No content needed - journal app manages its own state
  // space_id is passed via householdId prop
}

export interface WorkspaceContent {
  workspace_id?: string; // Legacy: kept for backward compatibility
  page_id?: string; // Page ID for page-centric model
}

export interface CustomContent {
  [key: string]: unknown;
}

export type WidgetContent =
  | NoteContent
  | TaskContent
  | CalendarContent
  | GoalContent
  | HabitContent
  | HabitTrackerContent
  | AchievementsContent
  | PhotoContent
  | InsightContent
  | ReminderContent
  | AgreementContent
  | MealPlannerContent
  | GroceryListContent
  | StackCardContent
  | FilesContent
  | TablesContent
  | TrackerContent
  | TrackerAppContent
  | TrackerQuickLinkContent
  | JournalContent
  | WorkspaceContent
  | CustomContent;

export type { CalendarEvent };

// ---- Core Widget Types ----

export interface FridgeWidget {
  id: string;
  space_id: string;
  created_by: string | null;
  widget_type: WidgetType;
  title: string;
  content: WidgetContent;
  color: string; // tailwind token key like "yellow", "blue" etc.
  icon: string;  // name of lucide icon or emoji
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  group_id: string | null;
}

export interface FridgeGroup {
  id: string;
  space_id: string;
  created_by: string | null;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface WidgetLayout {
  id: string;
  widget_id: string;
  member_id: string;     // usually the user's id or household_member id
  position_x: number | null; // canvas coordinates only - DO NOT use for launcher ordering
  position_y: number | null; // canvas coordinates only - DO NOT use for launcher ordering
  launcher_order: number | null; // launcher ordering only - DO NOT use for canvas layout
  size_mode: SizeMode;
  custom_width: number | null;
  custom_height: number | null;
  z_index: number;
  rotation: number;
  is_collapsed: boolean;
  group_id: string | null;
  updated_at: string;
}

export interface WidgetWithLayout extends FridgeWidget {
  layout: WidgetLayout;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  widgetId: string | null;
}

export interface GridConfig {
  cellSize: number;
  snapThreshold: number;
  columns: number;
  rows: number;
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  cellSize: 50,
  snapThreshold: 25,
  columns: 20,
  rows: 20,
};

export const WIDGET_COLORS = {
  yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-900' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-900' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900' },
  green: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-900' },
  orange: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-900' },
  purple: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900' },
  rose: { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-900' },
  cyan: { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-900' },
};

export const WIDGET_DIMENSIONS = {
  icon: { width: 60, height: 60 },
  mini: { width: 150, height: 150 },
  large: { width: 300, height: 300 },
  xlarge: { width: 500, height: 500 },
};
