/**
 * Widget Linking Service
 * 
 * Provides utilities to link todos to widgets and navigate between them.
 * Makes the todo widget aware of other widgets in the space.
 */

import type { WidgetType } from './fridgeCanvasTypes';
import type { WidgetWithLayout } from './fridgeCanvasTypes';
import { loadHouseholdWidgets } from './fridgeCanvas';

/**
 * Find a widget by type in a space
 */
export async function findWidgetByType(
  spaceId: string | null,
  widgetType: WidgetType
): Promise<WidgetWithLayout | null> {
  if (!spaceId) return null;

  try {
    const widgets = await loadHouseholdWidgets(spaceId);
    return widgets.find(w => w.widget_type === widgetType) || null;
  } catch (error) {
    console.error('Error finding widget by type:', error);
    return null;
  }
}

/**
 * Get navigation route to a widget
 */
export function getWidgetRoute(spaceId: string | null, widgetId: string): string | null {
  if (!spaceId || !widgetId) return null;
  return `/spaces/${spaceId}/app/${widgetId}`;
}

/**
 * Get all available widgets in a space, grouped by type
 */
export async function getAvailableWidgets(
  spaceId: string | null
): Promise<Map<WidgetType, WidgetWithLayout>> {
  if (!spaceId) return new Map();

  try {
    const widgets = await loadHouseholdWidgets(spaceId);
    const widgetMap = new Map<WidgetType, WidgetWithLayout>();
    
    for (const widget of widgets) {
      // For each widget type, keep the first one found (or most recent)
      if (!widgetMap.has(widget.widget_type)) {
        widgetMap.set(widget.widget_type, widget);
      }
    }
    
    return widgetMap;
  } catch (error) {
    console.error('Error getting available widgets:', error);
    return new Map();
  }
}

/**
 * Check if a widget type is available in a space
 */
export async function isWidgetAvailable(
  spaceId: string | null,
  widgetType: WidgetType
): Promise<boolean> {
  const widget = await findWidgetByType(spaceId, widgetType);
  return widget !== null;
}
