/**
 * Planner Information Architecture (IA) Configuration
 * 
 * Source of truth for Planner navigation structure:
 * - Temporal views (primary navigation)
 * - Life area filters (secondary navigation/contexts)
 * 
 * Architecture: Planner is temporal-first, with life areas as filters
 */

import { Calendar, Clock, CalendarDays, CalendarRange, CalendarCheck, Eye, Briefcase, Heart, Home, DollarSign, Users, Plane } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// Temporal Views (Primary Navigation)
// ============================================================================

export interface TemporalView {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  description?: string;
}

export const TEMPORAL_VIEWS: TemporalView[] = [
  {
    id: 'today',
    label: 'Today',
    icon: Clock,
    route: '/planner/today',
    description: 'Today\'s plan and immediate focus',
  },
  {
    id: 'week',
    label: 'Week',
    icon: Calendar,
    route: '/planner/week',
    description: 'Weekly overview and planning',
  },
  {
    id: 'month',
    label: 'Month',
    icon: CalendarDays,
    route: '/planner/month',
    description: 'Monthly calendar and planning',
  },
  {
    id: 'quarter',
    label: 'Quarter',
    icon: CalendarRange,
    route: '/planner/quarter',
    description: 'Quarterly planning and review',
  },
  {
    id: 'year',
    label: 'Year',
    icon: CalendarCheck,
    route: '/planner/year',
    description: 'Yearly overview and long-term planning',
  },
];

// ============================================================================
// Life Areas (Secondary Navigation / Filters)
// ============================================================================

export interface LifeArea {
  id: string;
  label: string;
  icon?: LucideIcon;
  route?: string; // Optional: if provided, allows direct navigation
  description?: string;
  isEpisodic?: boolean; // If true, only shown when relevant (e.g., Travel)
  color?: string; // For UI styling
}

export const LIFE_AREAS: LifeArea[] = [
  {
    id: 'vision',
    label: 'Vision',
    icon: Eye,
    route: '/planner/vision',
    description: 'Long-term vision and goals',
    color: 'bg-violet-500',
  },
  {
    id: 'work',
    label: 'Work',
    icon: Briefcase,
    route: '/planner/work',
    description: 'Work planning and projects',
    color: 'bg-indigo-600',
  },
  {
    id: 'personal',
    label: 'Personal',
    icon: Heart,
    route: '/planner/personal',
    description: 'Personal development and self-care planning',
    color: 'bg-pink-500',
  },
  {
    id: 'household',
    label: 'Household',
    icon: Home,
    route: '/planner/household',
    description: 'Household management and family planning',
    color: 'bg-rose-500',
  },
  {
    id: 'financial',
    label: 'Financial Planning',
    icon: DollarSign,
    route: '/planner/finance',
    description: 'Financial planning and budgeting',
    color: 'bg-emerald-600',
  },
  {
    id: 'social',
    label: 'Social',
    icon: Users,
    route: '/planner/social',
    description: 'Social connections and relationships',
    color: 'bg-blue-400',
  },
  {
    id: 'travel',
    label: 'Travel',
    icon: Plane,
    route: '/planner/travel/trips',
    description: 'Trip planning and travel',
    isEpisodic: true, // Only shown when upcoming/active trips exist
    color: 'bg-sky-500',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get temporal view by ID
 */
export function getTemporalView(id: string): TemporalView | undefined {
  return TEMPORAL_VIEWS.find(view => view.id === id);
}

/**
 * Get life area by ID
 */
export function getLifeArea(id: string): LifeArea | undefined {
  return LIFE_AREAS.find(area => area.id === id);
}

/**
 * Get all life areas (excluding episodic ones unless specified)
 */
export function getLifeAreas(includeEpisodic: boolean = false): LifeArea[] {
  if (includeEpisodic) {
    return LIFE_AREAS;
  }
  return LIFE_AREAS.filter(area => !area.isEpisodic);
}

/**
 * Check if a life area should be visible (for episodic areas like Travel)
 * 
 * For Travel: Only show if there's an upcoming trip in the next X days (default 90)
 * or if there's a trip currently active (today within trip date range)
 */
export async function shouldShowLifeArea(areaId: string, userId?: string): Promise<boolean> {
  const area = getLifeArea(areaId);
  if (!area) return false;
  
  // Episodic areas need special logic
  if (area.isEpisodic && areaId === 'travel') {
    return hasUpcomingTrip(userId);
  }
  
  // Non-episodic areas are always visible
  return true;
}

/**
 * Check if user has an upcoming or active trip
 * Stub implementation - Phase 1 minimal
 * 
 * @param userId - Optional user ID to check trips for
 * @param daysAhead - Number of days to look ahead (default 90)
 * @returns true if there's an upcoming/active trip, false otherwise
 */
export async function hasUpcomingTrip(userId?: string, daysAhead: number = 90): Promise<boolean> {
  if (!userId) return false;
  
  try {
    // Dynamic import to avoid circular dependencies
    const travelService = await import('../travelService');
    const trips = await travelService.getUserTrips(userId);
    
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    // Check for upcoming or active trips
    const hasRelevantTrip = trips.some(trip => {
      if (!trip.start_date && !trip.end_date) return false;
      
      const startDate = trip.start_date;
      const endDate = trip.end_date;
      
      // Active trip (today is within trip date range)
      if (startDate && endDate && startDate <= today && endDate >= today) {
        return true;
      }
      
      // Upcoming trip (starts within the next X days)
      if (startDate && startDate > today && startDate <= futureDateStr) {
        return true;
      }
      
      return false;
    });
    
    return hasRelevantTrip;
  } catch (error) {
    console.error('[plannerIA] Error checking for upcoming trips:', error);
    // On error, default to false (don't show travel shortcut)
    return false;
  }
}

/**
 * Synchronous version for non-async contexts (returns false for episodic areas)
 * Use shouldShowLifeArea() for async checks when userId is available
 */
export function shouldShowLifeAreaSync(areaId: string): boolean {
  const area = getLifeArea(areaId);
  if (!area) return false;
  
  // Episodic areas return false in sync context (need async check)
  if (area.isEpisodic) {
    return false;
  }
  
  return true;
}

/**
 * Get default route for Planner (temporal-first)
 */
export function getDefaultPlannerRoute(): string {
  return '/planner/today';
}

/**
 * Build route with life area filter
 */
export function buildPlannerRoute(temporalViewId: string, lifeAreaId?: string): string {
  const view = getTemporalView(temporalViewId);
  if (!view) return getDefaultPlannerRoute();
  
  if (lifeAreaId) {
    return `${view.route}?area=${lifeAreaId}`;
  }
  
  return view.route;
}
