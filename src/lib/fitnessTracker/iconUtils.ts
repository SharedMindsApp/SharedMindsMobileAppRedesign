/**
 * Icon Utilities
 * 
 * Utilities for mapping icon names to Lucide React components
 */

import * as LucideIcons from 'lucide-react';

/**
 * Get icon component by name
 */
export function getIconComponent(iconName: string): React.ComponentType<{ size?: number; className?: string; style?: any }> {
  const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string; style?: any }>> = {
    // Base activity icons
    Dumbbell: LucideIcons.Dumbbell,
    Footprints: LucideIcons.Footprints,
    Bike: LucideIcons.Bike,
    Waves: LucideIcons.Waves,
    Users: LucideIcons.Users,
    Target: LucideIcons.Target,
    Sword: LucideIcons.Sword,
    Flower2: LucideIcons.Flower2,
    Heart: LucideIcons.Heart,
    Activity: LucideIcons.Activity,
    
    // Martial arts icons
    Shield: LucideIcons.Shield, // BJJ and default
    Hand: LucideIcons.Hand, // Boxing
    Zap: LucideIcons.Zap, // Judo, tempo runs/rides
    
    // Sports icons
    Circle: LucideIcons.Circle, // Ball sports (football, basketball, etc.)
    CircleDot: LucideIcons.CircleDot, // Tennis, golf
    Mountain: (LucideIcons as any).Mountain || LucideIcons.Activity, // Skiing, climbing (fallback if not available)
    
    // Gym subcategory icons
    ArrowUp: LucideIcons.ArrowUp, // Upper body
    ArrowDown: LucideIcons.ArrowDown, // Lower body
    Move: LucideIcons.Move, // Full body
    
    // Running/Cycling subcategory icons
    TrendingUp: LucideIcons.TrendingUp, // Long runs/rides
    Trophy: LucideIcons.Trophy, // Competition/race
  };
  
  // Fallback: try to find icon directly in LucideIcons if not in map
  if (!iconMap[iconName]) {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return IconComponent;
    }
  }
  
  return iconMap[iconName] || LucideIcons.Activity;
}
