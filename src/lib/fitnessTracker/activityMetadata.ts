/**
 * Activity Metadata
 * 
 * Maps movement domains to display information, icons, and visual themes
 * for the activity-based UI design
 */

import type { MovementDomain } from './types';
import * as Icons from 'lucide-react';

export interface ActivityMetadata {
  id: MovementDomain;
  displayName: string; // Short name: "Gym", "Running", "Tennis"
  description: string; // Subtitle: "Strength & Conditioning"
  icon: keyof typeof Icons; // Deprecated - kept for backwards compatibility
  emoji: string; // Emoji for the activity
  color: string; // Primary color
  gradient: string; // Tailwind gradient classes
  lightGradient: string; // Lighter variant for cards
}

export const ACTIVITY_METADATA: Record<MovementDomain, ActivityMetadata> = {
  gym: {
    id: 'gym',
    displayName: 'Gym',
    description: 'Strength & Conditioning',
    icon: 'Dumbbell',
    emoji: '💪',
    color: '#DC2626',
    gradient: 'from-red-600 via-red-500 to-orange-600',
    lightGradient: 'from-red-50 via-orange-50 to-red-50',
  },
  running: {
    id: 'running',
    displayName: 'Running',
    description: 'Cardio & Endurance',
    icon: 'Footprints',
    emoji: '🏃',
    color: '#EA580C',
    gradient: 'from-orange-600 via-orange-500 to-red-600',
    lightGradient: 'from-orange-50 via-red-50 to-orange-50',
  },
  cycling: {
    id: 'cycling',
    displayName: 'Cycling',
    description: 'Road & Endurance',
    icon: 'Bike',
    emoji: '🚴',
    color: '#059669',
    gradient: 'from-green-600 via-emerald-500 to-green-600',
    lightGradient: 'from-green-50 via-emerald-50 to-green-50',
  },
  swimming: {
    id: 'swimming',
    displayName: 'Swimming',
    description: 'Pool & Open Water',
    icon: 'Waves',
    emoji: '🏊',
    color: '#0284C7',
    gradient: 'from-blue-600 via-cyan-500 to-blue-600',
    lightGradient: 'from-blue-50 via-cyan-50 to-blue-50',
  },
  team_sports: {
    id: 'team_sports',
    displayName: 'Team Sports',
    description: 'Football, Basketball, etc.',
    icon: 'Users',
    emoji: '👥',
    color: '#7C3AED',
    gradient: 'from-purple-600 via-violet-500 to-purple-600',
    lightGradient: 'from-purple-50 via-violet-50 to-purple-50',
  },
  individual_sports: {
    id: 'individual_sports',
    displayName: 'Individual Sports',
    description: 'Tennis, Golf, etc.',
    icon: 'Target',
    emoji: '🎯',
    color: '#C026D3',
    gradient: 'from-fuchsia-600 via-pink-500 to-fuchsia-600',
    lightGradient: 'from-fuchsia-50 via-pink-50 to-fuchsia-50',
  },
  martial_arts: {
    id: 'martial_arts',
    displayName: 'Martial Arts',
    description: 'BJJ, Boxing, etc.',
    icon: 'Sword',
    emoji: '🥋',
    color: '#DC2626',
    gradient: 'from-red-600 via-rose-600 to-red-700',
    lightGradient: 'from-red-50 via-rose-50 to-red-50',
  },
  yoga: {
    id: 'yoga',
    displayName: 'Yoga',
    description: 'Mobility & Flexibility',
    icon: 'Flower2',
    emoji: '🧘',
    color: '#7C3AED',
    gradient: 'from-purple-600 via-indigo-500 to-purple-600',
    lightGradient: 'from-purple-50 via-indigo-50 to-purple-50',
  },
  rehab: {
    id: 'rehab',
    displayName: 'Rehab',
    description: 'Physio & Recovery',
    icon: 'Heart',
    emoji: '❤️',
    color: '#10B981',
    gradient: 'from-emerald-600 via-green-500 to-emerald-600',
    lightGradient: 'from-emerald-50 via-green-50 to-emerald-50',
  },
  other: {
    id: 'other',
    displayName: 'Other',
    description: 'Movement & Activity',
    icon: 'Activity',
    emoji: '➕',
    color: '#6B7280',
    gradient: 'from-gray-600 via-slate-500 to-gray-600',
    lightGradient: 'from-gray-50 via-slate-50 to-gray-50',
  },
};

/**
 * Get metadata for a movement domain
 * For martial arts, can optionally pass selected disciplines to customize display
 */
export function getActivityMetadata(
  domain: MovementDomain,
  disciplines?: string[]
): ActivityMetadata {
  const baseMetadata = ACTIVITY_METADATA[domain];
  
  // For martial arts, customize based on selected disciplines
  if (domain === 'martial_arts' && disciplines && disciplines.length > 0) {
    const disciplineList = disciplines.join(', ');
    const displayName = disciplines.length === 1 
      ? disciplines[0] // Show just "BJJ" if only one
      : disciplineList; // Show "BJJ, Boxing" if multiple
    
    // Get appropriate icon based on disciplines
    const icon = disciplines.length === 1 
      ? getMartialArtsIcon(disciplines[0])
      : 'Shield'; // Default for multiple
    
    return {
      ...baseMetadata,
      displayName,
      description: '', // Remove "BJJ, Boxing, etc." when disciplines are specified
      icon,
      // Keep emoji from base metadata (🥋)
    };
  }
  
  return baseMetadata;
}

/**
 * Get icon for martial arts discipline
 */
function getMartialArtsIcon(discipline: string): keyof typeof Icons {
  const disciplineLower = discipline.toLowerCase();
  
  // Map disciplines to appropriate icons (sport-specific, not weapons)
  if (disciplineLower.includes('bjj') || disciplineLower.includes('brazilian jiu-jitsu') || disciplineLower.includes('jiu-jitsu')) {
    return 'Shield'; // BJJ - ground grappling/defense
  } else if (disciplineLower.includes('boxing')) {
    return 'Hand'; // Boxing - hands/gloves
  } else if (disciplineLower.includes('wrestling')) {
    return 'Users'; // Wrestling - grappling
  } else if (disciplineLower.includes('muay thai') || disciplineLower.includes('muaythai') || disciplineLower.includes('kickboxing')) {
    return 'Footprints'; // Muay Thai - kicks
  } else if (disciplineLower.includes('karate') || disciplineLower.includes('taekwondo') || disciplineLower.includes('tkd')) {
    return 'Target'; // Karate/TKD - strikes/kicks
  } else if (disciplineLower.includes('judo')) {
    return 'Zap'; // Judo - throws/momentum
  } else if (disciplineLower.includes('mma') || disciplineLower.includes('mixed martial')) {
    return 'Activity'; // MMA - mixed disciplines
  } else {
    return 'Shield'; // Default - defensive/sport icon
  }
}

/**
 * Get display name for a domain
 */
export function getActivityDisplayName(domain: MovementDomain): string {
  return ACTIVITY_METADATA[domain]?.displayName || domain;
}

/**
 * Get icon component name for a domain
 */
export function getActivityIcon(domain: MovementDomain): keyof typeof Icons {
  return ACTIVITY_METADATA[domain]?.icon || 'Activity';
}
