/**
 * Option Icons Mapping
 * 
 * Maps domain options to icons for better visual recognition
 * Designed for neurodivergent users with clear visual cues
 */

import * as LucideIcons from 'lucide-react';

type IconName = keyof typeof LucideIcons;

export const OPTION_ICONS: Record<string, IconName> = {
  // Gym options
  'Cardio machines': 'Activity',
  'Free weights': 'Dumbbell',
  'Machines': 'Settings',
  'Classes': 'Users',
  'Mixed / varies': 'Layers',
  
  // Running options
  'Casual walking': 'Footprints',
  'Running (easy pace)': 'TrendingUp',
  'Running (structured training)': 'Target',
  'Trail running': 'Mountain',
  'Mixed': 'Shuffle',
  
  // Team Sports - Using more distinctive combinations
  'Football / Soccer': 'Circle', // ⚽ emoji alternative
  'American Football': 'CircleDot', // Different from soccer
  'Basketball': 'CircleDot',
  'Volleyball': 'CircleDot',
  'Beach Volleyball': 'CircleDot',
  'Handball': 'Circle',
  'Water Polo': 'Waves',
  'Rugby Union': 'Circle',
  'Rugby League': 'Circle',
  'Australian Rules Football': 'Circle',
  'Gaelic Football': 'Circle',
  'Ice Hockey': 'Zap',
  'Field Hockey': 'Zap',
  'Roller Hockey': 'Zap',
  'Baseball': 'Circle',
  'Softball': 'Circle',
  'Cricket': 'Circle',
  'Ultimate Frisbee': 'Circle',
  'Lacrosse': 'Circle',
  'Polo': 'Circle',
  'Netball': 'CircleDot',
  'Dodgeball': 'Circle',
  'Rowing (Team)': 'Waves',
  'Other': 'MoreHorizontal',
  
  // Individual Sports - Racket Sports
  'Tennis': 'CircleDot',
  'Table Tennis': 'CircleDot',
  'Badminton': 'CircleDot',
  'Squash': 'CircleDot',
  'Racquetball': 'CircleDot',
  'Padel': 'CircleDot',
  'Pickleball': 'CircleDot',
  
  // Individual Sports - Golf & Target
  'Golf': 'CircleDot',
  'Archery': 'Target',
  'Shooting': 'Crosshair',
  'Darts': 'Target',
  
  // Individual Sports - Track & Field
  'Track & Field': 'Move',
  'Sprinting': 'Zap',
  'Long Distance Running': 'TrendingUp',
  'High Jump': 'ArrowUp',
  'Long Jump': 'ArrowRight',
  'Pole Vault': 'ArrowUp',
  
  // Individual Sports - Water Sports
  'Diving': 'Waves',
  'Surfing': 'Waves',
  'Bodyboarding': 'Waves',
  'Wakeboarding': 'Waves',
  'Kitesurfing': 'Wind',
  'Stand Up Paddleboarding (SUP)': 'Waves',
  
  // Individual Sports - Winter Sports
  'Alpine Skiing': 'Mountain',
  'Cross-Country Skiing': 'Mountain',
  'Snowboarding': 'Mountain',
  'Figure Skating': 'Snowflake',
  
  // Individual Sports - Cycling
  'Road Cycling': 'Bike',
  'Mountain Biking': 'Bike',
  'BMX': 'Bike',
  
  // Individual Sports - Equestrian
  'Equestrian': 'Zap',
  'Riding': 'Zap',
  
  // Individual Sports - Other
  'Rock Climbing': 'Mountain',
  'Bouldering': 'Mountain',
  'Weightlifting': 'Dumbbell',
  'Powerlifting': 'Dumbbell',
  'CrossFit': 'Activity',
  'Calisthenics': 'Move',
  'Marathon Running': 'Trophy',
  'Trail Running': 'Mountain',
  'Triathlon': 'Zap',
  
  // Martial Arts
  'Brazilian Jiu-Jitsu (BJJ)': 'Shield',
  'Boxing': 'Hand',
  'Wrestling': 'Move',
  'Muay Thai': 'Zap',
  'Kickboxing': 'Zap',
  'Judo': 'Shield',
  'Mixed / MMA': 'Sword',
};

/**
 * Get icon component for an option
 */
export function getOptionIcon(option: string): IconName {
  return OPTION_ICONS[option] || 'Circle';
}

/**
 * Get icon color for a domain
 */
export function getOptionIconColor(domain: string, option: string): string {
  // Domain-specific colors for visual distinction
  const domainColors: Record<string, string> = {
    'gym': '#DC2626', // Red
    'running': '#EA580C', // Orange
    'cycling': '#059669', // Green
    'swimming': '#0284C7', // Blue
    'team_sports': '#7C3AED', // Purple
    'individual_sports': '#C026D3', // Fuchsia
    'martial_arts': '#DC2626', // Red
    'yoga': '#7C3AED', // Purple
    'rehab': '#10B981', // Green
  };
  
  return domainColors[domain] || '#6B7280';
}
