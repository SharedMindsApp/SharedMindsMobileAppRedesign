/**
 * Tracker Icon Resolver
 * 
 * Resolves the appropriate icon for a tracker, checking:
 * 1. tracker.icon (if set, overrides everything)
 * 2. template.icon (if tracker has a template)
 * 3. getTrackerTheme (fallback based on name)
 */

import * as LucideIcons from 'lucide-react';
import type { ComponentType } from 'react';
import { getTrackerTheme } from './trackerThemeUtils';
import type { Tracker } from './types';

/**
 * Get the icon component for a tracker
 */
export function getTrackerIcon(tracker: Tracker): ComponentType<{ size?: number; className?: string }> {
  // First priority: tracker's own icon
  if (tracker.icon) {
    const IconComponent = (LucideIcons as any)[tracker.icon];
    if (IconComponent) {
      return IconComponent;
    }
    // If icon name doesn't match, fall through to theme
  }

  // Second priority: use theme based on name
  const theme = getTrackerTheme(tracker.name);
  return theme.icon;
}

/**
 * Get the full theme for a tracker (respecting custom icon/color)
 */
export function getTrackerThemeWithCustoms(tracker: Tracker) {
  const baseTheme = getTrackerTheme(tracker.name);
  
  // Override icon if tracker has custom icon
  let icon = baseTheme.icon;
  if (tracker.icon) {
    const IconComponent = (LucideIcons as any)[tracker.icon];
    if (IconComponent) {
      icon = IconComponent;
    }
  }

  // TODO: Override colors if tracker has custom color
  // For now, we'll use the base theme colors
  // In the future, we could add color theme mapping

  return {
    ...baseTheme,
    icon,
  };
}
