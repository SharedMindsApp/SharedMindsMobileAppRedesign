/**
 * SpacesOS Widget Registry
 * 
 * Central registry of available widgets for SpacesOS.
 * Used by widget menus, launchers, and quick access panels.
 */

import {
  StickyNote,
  Bell,
  Calendar,
  Target,
  Zap,
  CheckCircle2,
  Trophy,
  Image,
  Sparkles,
  UtensilsCrossed,
  ShoppingCart,
  Layers,
  FileText,
  Folder,
  Table,
  ImagePlus,
  Activity,
  BookOpen,
} from 'lucide-react';
import type { WidgetType } from '../../lib/fridgeCanvasTypes';

export interface WidgetRegistryItem {
  id: WidgetType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  iconColor: string;
  category: 'Content' | 'Planning' | 'Tracking' | 'Media' | 'Organization';
  description: string;
  route?: string; // Optional route for widget app view
}

export const widgetRegistry: WidgetRegistryItem[] = [
  {
    id: 'note',
    label: 'Note',
    icon: StickyNote,
    color: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    category: 'Content',
    description: 'Quick notes and memos',
  },
  {
    id: 'reminder',
    label: 'Reminder',
    icon: Bell,
    color: 'bg-rose-50',
    iconColor: 'text-rose-600',
    category: 'Planning',
    description: 'Set reminders and alerts',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    category: 'Planning',
    description: 'View upcoming events',
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: Trophy,
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
    category: 'Tracking',
    description: 'View milestones and wins',
  },
  {
    id: 'photo',
    label: 'Photo',
    icon: Image,
    color: 'bg-gray-50',
    iconColor: 'text-gray-600',
    category: 'Media',
    description: 'Add photos and images',
  },
  {
    id: 'insight',
    label: 'Insight',
    icon: Sparkles,
    color: 'bg-violet-50',
    iconColor: 'text-violet-600',
    category: 'Content',
    description: 'Important insights',
  },
  {
    id: 'meal_planner',
    label: 'Meal Planner',
    icon: UtensilsCrossed,
    color: 'bg-orange-50',
    iconColor: 'text-orange-600',
    category: 'Planning',
    description: 'Plan weekly meals',
  },
  {
    id: 'grocery_list',
    label: 'Grocery List',
    icon: ShoppingCart,
    color: 'bg-teal-50',
    iconColor: 'text-teal-600',
    category: 'Planning',
    description: 'Shopping list',
  },
  {
    id: 'todos',
    label: 'To-Do List',
    icon: CheckCircle2,
    color: 'bg-green-50',
    iconColor: 'text-green-600',
    category: 'Planning',
    description: 'Task management',
  },
  {
    id: 'stack_card',
    label: 'Stack Cards',
    icon: Layers,
    color: 'bg-sky-50',
    iconColor: 'text-sky-600',
    category: 'Organization',
    description: 'Organize with cards',
  },
  {
    id: 'files',
    label: 'Files',
    icon: FileText,
    color: 'bg-slate-50',
    iconColor: 'text-slate-600',
    category: 'Organization',
    description: 'Manage your files',
  },
  {
    id: 'collections',
    label: 'Collections',
    icon: Folder,
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    category: 'Organization',
    description: 'Curate and organize references',
  },
  {
    id: 'tables',
    label: 'Tables',
    icon: Table,
    color: 'bg-sky-50',
    iconColor: 'text-sky-600',
    category: 'Organization',
    description: 'Spreadsheet-style data tables',
  },
  {
    id: 'graphics',
    label: 'Graphics',
    icon: ImagePlus,
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    category: 'Media',
    description: 'Upload and place SVG graphics',
  },
  {
    id: 'tracker_app',
    label: 'Tracker App',
    icon: Activity,
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    category: 'Tracking',
    description: 'Full-featured tracker app in Spaces',
  },
  {
    id: 'tracker_quicklink',
    label: 'Tracker Quick Links',
    icon: Activity,
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    category: 'Tracking',
    description: 'Quick access to all your trackers',
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: BookOpen,
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
    category: 'Content',
    description: 'Personal journal and gratitude entries',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: FileText,
    color: 'bg-slate-50',
    iconColor: 'text-slate-600',
    category: 'Content',
    description: 'Structured thinking and reference surface',
  },
];

export const widgetCategories = ['All', 'Content', 'Planning', 'Tracking', 'Media', 'Organization'] as const;

export function getWidgetsByCategory(category: string): WidgetRegistryItem[] {
  if (category === 'All') {
    return widgetRegistry;
  }
  return widgetRegistry.filter(widget => widget.category === category);
}
