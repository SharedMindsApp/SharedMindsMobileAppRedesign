/**
 * useEventTypeColors Hook
 * 
 * Manages user-customized colors for calendar event types.
 * Falls back to defaults if user hasn't customized.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../core/auth/AuthProvider';
import type { CalendarEventType } from '../lib/personalSpaces/calendarService';

// Default color map (hardcoded baseline)
export const DEFAULT_EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  event: '#3B82F6',        // blue
  meeting: '#6366F1',      // indigo
  appointment: '#10B981',  // green
  time_block: '#6B7280',   // gray
  goal: '#F59E0B',         // amber
  habit: '#22C55E',        // emerald
  meal: '#F97316',         // orange
  task: '#8B5CF6',         // violet
  reminder: '#EF4444',     // red
  travel_segment: '#0EA5E9', // sky
  milestone: '#EC4899',    // pink
};

export interface EventTypeColorSettings {
  eventType: CalendarEventType;
  color: string;
  isCustom: boolean;
}

export interface UseEventTypeColorsResult {
  colors: Record<CalendarEventType, string>;
  customColors: Record<CalendarEventType, string>;
  updateColor: (eventType: CalendarEventType, color: string) => Promise<void>;
  resetColor: (eventType: CalendarEventType) => Promise<void>;
  resetAll: () => Promise<void>;
  isLoading: boolean;
  hasDuplicates: boolean;
  duplicateGroups: CalendarEventType[][];
}

export function useEventTypeColors(): UseEventTypeColorsResult {
  const { user } = useAuth();
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load user's custom colors
  const loadColors = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('calendar_event_type_colors')
        .select('event_type, color')
        .eq('user_id', user.id);

      if (error) {
        // If table doesn't exist yet (migration not run), gracefully handle it
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist') || (error as any)?.status === 404) {
          console.warn('[useEventTypeColors] Table calendar_event_type_colors does not exist yet. Migration may need to be run.');
          setCustomColors({});
          setIsLoading(false);
          return;
        }
        throw error;
      }

      const custom: Record<string, string> = {};
      (data || []).forEach(row => {
        custom[row.event_type] = row.color;
      });

      setCustomColors(custom);
    } catch (error) {
      console.error('[useEventTypeColors] Error loading colors:', error);
      // On error, use empty custom colors (fallback to defaults)
      setCustomColors({});
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadColors();
  }, [loadColors]);

  // Resolved colors (custom or default)
  const colors = useMemo(() => {
    const resolved: Record<CalendarEventType, string> = { ...DEFAULT_EVENT_TYPE_COLORS };
    Object.entries(customColors).forEach(([type, color]) => {
      if (type in DEFAULT_EVENT_TYPE_COLORS) {
        resolved[type as CalendarEventType] = color;
      }
    });
    return resolved;
  }, [customColors]);

  // Detect duplicate colors
  const { hasDuplicates, duplicateGroups } = useMemo(() => {
    const colorToTypes = new Map<string, CalendarEventType[]>();

    Object.entries(colors).forEach(([type, color]) => {
      if (!colorToTypes.has(color)) {
        colorToTypes.set(color, []);
      }
      colorToTypes.get(color)!.push(type as CalendarEventType);
    });

    const duplicates = Array.from(colorToTypes.values())
      .filter(types => types.length > 1);

    return {
      hasDuplicates: duplicates.length > 0,
      duplicateGroups: duplicates,
    };
  }, [colors]);

  // Update color
  const updateColor = useCallback(async (eventType: CalendarEventType, color: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('calendar_event_type_colors')
        .upsert({
          user_id: user.id,
          event_type: eventType,
          color: color,
        }, {
          onConflict: 'user_id,event_type',
        });

      if (error) {
        // If table doesn't exist yet, show helpful error
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist') || (error as any)?.status === 404) {
          throw new Error('Calendar event type colors table does not exist. Please run the database migration: 20260109143402_create_calendar_event_type_colors.sql');
        }
        throw error;
      }

      setCustomColors(prev => ({
        ...prev,
        [eventType]: color,
      }));
    } catch (error) {
      console.error('[useEventTypeColors] Error updating color:', error);
      throw error;
    }
  }, [user]);

  // Reset color to default
  const resetColor = useCallback(async (eventType: CalendarEventType) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('calendar_event_type_colors')
        .delete()
        .eq('user_id', user.id)
        .eq('event_type', eventType);

      if (error) {
        // If table doesn't exist yet, just update local state
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist') || (error as any)?.status === 404) {
          setCustomColors(prev => {
            const next = { ...prev };
            delete next[eventType];
            return next;
          });
          return;
        }
        throw error;
      }

      setCustomColors(prev => {
        const next = { ...prev };
        delete next[eventType];
        return next;
      });
    } catch (error) {
      console.error('[useEventTypeColors] Error resetting color:', error);
      throw error;
    }
  }, [user]);

  // Reset all colors to defaults
  const resetAll = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('calendar_event_type_colors')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        // If table doesn't exist yet, just update local state
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist') || (error as any)?.status === 404) {
          setCustomColors({});
          return;
        }
        throw error;
      }

      setCustomColors({});
    } catch (error) {
      console.error('[useEventTypeColors] Error resetting all colors:', error);
      throw error;
    }
  }, [user]);

  return {
    colors,
    customColors,
    updateColor,
    resetColor,
    resetAll,
    isLoading,
    hasDuplicates,
    duplicateGroups,
  };
}

/**
 * Resolve event color from event type
 * Uses user's custom colors if available, otherwise falls back to defaults
 */
export function resolveEventColor(
  eventType: CalendarEventType | undefined,
  customColors?: Record<string, string>
): string {
  if (!eventType) {
    return DEFAULT_EVENT_TYPE_COLORS.event;
  }

  if (customColors && customColors[eventType]) {
    return customColors[eventType];
  }

  return DEFAULT_EVENT_TYPE_COLORS[eventType] || DEFAULT_EVENT_TYPE_COLORS.event;
}
