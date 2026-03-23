export type WidgetType =
  | 'note'
  | 'task'
  | 'calendar'
  | 'goal'
  | 'habit'
  | 'photo'
  | 'insight'
  | 'reminder'
  | 'agreement'
  | 'custom';

export type SizeMode = 'icon' | 'mini' | 'full';

export interface NoteContent {
  text: string;
  fontSize?: string;
}

export interface TaskContent {
  description: string;
  completed: boolean;
  dueDate?: string;
}

export interface CalendarContent {
  eventCount: number;
  nextEvent?: {
    title: string;
    date: string;
  };
}

export interface GoalContent {
  progress: number;
  targetDate?: string;
  description?: string;
}

export interface HabitContent {
  streak: number;
  lastCompleted?: string;
  frequency: string;
}

export interface PhotoContent {
  imageUrl: string;
  caption?: string;
}

export interface InsightContent {
  summary: string;
  category: string;
}

export interface ReminderContent {
  message: string;
  time?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AgreementContent {
  rules: string[];
  agreedBy: string[];
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
  | PhotoContent
  | InsightContent
  | ReminderContent
  | AgreementContent
  | CustomContent;

export interface FridgeWidget {
  id: string;
  household_id: string;
  created_by: string | null;
  widget_type: WidgetType;
  title: string;
  content: WidgetContent;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface WidgetLayout {
  id: string;
  widget_id: string;
  member_id: string;
  position_x: number;
  position_y: number;
  size_mode: SizeMode;
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
  full: { width: 300, height: 300 },
};
