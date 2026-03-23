/**
 * Tracker Theme Utilities
 * 
 * Provides consistent theming for trackers based on their name/type.
 * Used across tracker UI components for visual consistency.
 */

import {
  Moon, Activity, UtensilsCrossed, Brain, Bed, TrendingUp, Heart, BookOpen, DollarSign,
  Smile, Zap, Droplet, Pill, AlertCircle, Wind, Users, Sun, CheckSquare, FileText,
  Smartphone, Target, Flag, Monitor, Trees
} from 'lucide-react';

export type TrackerTheme = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  hoverBorderColor: string;
  buttonBg: string;
  buttonHover: string;
  accentBg: string;
  accentText: string;
};

export function getTrackerTheme(trackerName: string): TrackerTheme {
  // Safety check: ensure trackerName is a string
  if (!trackerName || typeof trackerName !== 'string') {
    trackerName = '';
  }
  const name = trackerName.toLowerCase();
  
  // Sleep & Rest
  if (name.includes('sleep')) {
    return {
      icon: Moon,
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      hoverBorderColor: 'hover:border-indigo-400',
      buttonBg: 'bg-indigo-600',
      buttonHover: 'hover:bg-indigo-700',
      accentBg: 'bg-indigo-50',
      accentText: 'text-indigo-700',
    };
  }
  
  if (name.includes('rest') || name.includes('recovery')) {
    return {
      icon: Bed,
      gradient: 'from-blue-400 via-cyan-400 to-teal-400',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-400',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
      accentBg: 'bg-blue-50',
      accentText: 'text-blue-700',
    };
  }
  
  // Fitness Tracker (specific check first)
  if (name.includes('fitness')) {
    return {
      icon: Activity,
      gradient: 'from-blue-500 via-cyan-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-400',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
      accentBg: 'bg-blue-50',
      accentText: 'text-blue-700',
    };
  }
  
  // Physical Activity
  if (name.includes('exercise') || name.includes('activity')) {
    return {
      icon: Activity,
      gradient: 'from-red-500 via-orange-500 to-yellow-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      hoverBorderColor: 'hover:border-red-400',
      buttonBg: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
      accentBg: 'bg-red-50',
      accentText: 'text-red-700',
    };
  }
  
  // Nutrition & Hydration Tracker (unified food + hydration tracking)
  // Check for "nutrition & hydration" or "nutrition hydration" before generic nutrition
  if ((name.includes('nutrition') && name.includes('hydration')) || 
      (name.includes('nutrition') && name.includes('&'))) {
    return {
      icon: UtensilsCrossed,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      hoverBorderColor: 'hover:border-green-400',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
      accentBg: 'bg-green-50',
      accentText: 'text-green-700',
    };
  }
  
  // Nutrition
  if (name.includes('nutrition') || name.includes('food') || name.includes('meal')) {
    return {
      icon: UtensilsCrossed,
      gradient: 'from-orange-400 via-amber-400 to-yellow-400',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
      hoverBorderColor: 'hover:border-orange-400',
      buttonBg: 'bg-orange-600',
      buttonHover: 'hover:bg-orange-700',
      accentBg: 'bg-orange-50',
      accentText: 'text-orange-700',
    };
  }
  
  // Mindfulness & Mental Health
  if (name.includes('mindfulness') || name.includes('meditation')) {
    return {
      icon: Brain,
      gradient: 'from-purple-500 via-pink-500 to-rose-500',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      hoverBorderColor: 'hover:border-purple-400',
      buttonBg: 'bg-purple-600',
      buttonHover: 'hover:bg-purple-700',
      accentBg: 'bg-purple-50',
      accentText: 'text-purple-700',
    };
  }
  
  if (name.includes('mood')) {
    return {
      icon: Smile,
      gradient: 'from-pink-400 via-rose-400 to-red-400',
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
      borderColor: 'border-pink-200',
      hoverBorderColor: 'hover:border-pink-400',
      buttonBg: 'bg-pink-600',
      buttonHover: 'hover:bg-pink-700',
      accentBg: 'bg-pink-50',
      accentText: 'text-pink-700',
    };
  }
  
  if (name.includes('stress')) {
    return {
      icon: Wind,
      gradient: 'from-gray-500 via-slate-500 to-zinc-500',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      borderColor: 'border-gray-200',
      hoverBorderColor: 'hover:border-gray-400',
      buttonBg: 'bg-gray-600',
      buttonHover: 'hover:bg-gray-700',
      accentBg: 'bg-gray-50',
      accentText: 'text-gray-700',
    };
  }
  
  // Growth & Development
  if (name.includes('growth')) {
    return {
      icon: TrendingUp,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      hoverBorderColor: 'hover:border-green-400',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
      accentBg: 'bg-green-50',
      accentText: 'text-green-700',
    };
  }
  
  // Journaling
  if (name.includes('gratitude')) {
    return {
      icon: Heart,
      gradient: 'from-rose-400 via-pink-400 to-fuchsia-400',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      borderColor: 'border-rose-200',
      hoverBorderColor: 'hover:border-rose-400',
      buttonBg: 'bg-rose-600',
      buttonHover: 'hover:bg-rose-700',
      accentBg: 'bg-rose-50',
      accentText: 'text-rose-700',
    };
  }
  
  if (name.includes('journal') || name.includes('personal')) {
    return {
      icon: BookOpen,
      gradient: 'from-amber-500 via-yellow-500 to-orange-500',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      hoverBorderColor: 'hover:border-amber-400',
      buttonBg: 'bg-amber-600',
      buttonHover: 'hover:bg-amber-700',
      accentBg: 'bg-amber-50',
      accentText: 'text-amber-700',
    };
  }
  
  // Finance
  if (name.includes('income') || name.includes('cash') || name.includes('finance')) {
    return {
      icon: DollarSign,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      hoverBorderColor: 'hover:border-emerald-400',
      buttonBg: 'bg-emerald-600',
      buttonHover: 'hover:bg-emerald-700',
      accentBg: 'bg-emerald-50',
      accentText: 'text-emerald-700',
    };
  }
  
  // Health & Wellness
  if (name.includes('energy')) {
    return {
      icon: Zap,
      gradient: 'from-yellow-400 via-amber-400 to-orange-400',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
      hoverBorderColor: 'hover:border-yellow-400',
      buttonBg: 'bg-yellow-600',
      buttonHover: 'hover:bg-yellow-700',
      accentBg: 'bg-yellow-50',
      accentText: 'text-yellow-700',
    };
  }
  
  if (name.includes('water') || name.includes('hydration')) {
    return {
      icon: Droplet,
      gradient: 'from-cyan-400 via-blue-400 to-indigo-400',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      borderColor: 'border-cyan-200',
      hoverBorderColor: 'hover:border-cyan-400',
      buttonBg: 'bg-cyan-600',
      buttonHover: 'hover:bg-cyan-700',
      accentBg: 'bg-cyan-50',
      accentText: 'text-cyan-700',
    };
  }
  
  // Health Tracker (unified medication + symptom tracking)
  if (name.includes('health') && !name.includes('mental health')) {
    return {
      icon: Heart,
      gradient: 'from-red-500 via-rose-500 to-pink-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      hoverBorderColor: 'hover:border-red-400',
      buttonBg: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
      accentBg: 'bg-red-50',
      accentText: 'text-red-700',
    };
  }

  if (name.includes('medication')) {
    return {
      icon: Pill,
      gradient: 'from-violet-400 via-purple-400 to-fuchsia-400',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      borderColor: 'border-violet-200',
      hoverBorderColor: 'hover:border-violet-400',
      buttonBg: 'bg-violet-600',
      buttonHover: 'hover:bg-violet-700',
      accentBg: 'bg-violet-50',
      accentText: 'text-violet-700',
    };
  }

  if (name.includes('symptom')) {
    return {
      icon: AlertCircle,
      gradient: 'from-red-400 via-rose-400 to-pink-400',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      hoverBorderColor: 'hover:border-red-400',
      buttonBg: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
      accentBg: 'bg-red-50',
      accentText: 'text-red-700',
    };
  }
  
  // Social & Environment
  if (name.includes('social') || name.includes('connection')) {
    return {
      icon: Users,
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-400',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
      accentBg: 'bg-blue-50',
      accentText: 'text-blue-700',
    };
  }
  
  // Environmental Impact Tracker (behavior-focused environmental actions)
  // Check for "environmental impact" before generic environment/weather
  if (name.includes('environmental impact') || (name.includes('environmental') && name.includes('impact'))) {
    return {
      icon: Trees,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      hoverBorderColor: 'hover:border-green-400',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
      accentBg: 'bg-green-50',
      accentText: 'text-green-700',
    };
  }
  
  if (name.includes('weather') || name.includes('environment')) {
    return {
      icon: Sun,
      gradient: 'from-yellow-300 via-amber-300 to-orange-300',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
      hoverBorderColor: 'hover:border-yellow-400',
      buttonBg: 'bg-yellow-600',
      buttonHover: 'hover:bg-yellow-700',
      accentBg: 'bg-yellow-50',
      accentText: 'text-yellow-700',
    };
  }
  
  // Productivity & Habits
  if (name.includes('productivity') || name.includes('focus')) {
    return {
      icon: TrendingUp,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-400',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
      accentBg: 'bg-blue-50',
      accentText: 'text-blue-700',
    };
  }

  if (name.includes('habit')) {
    return {
      icon: CheckSquare,
      gradient: 'from-green-400 via-emerald-400 to-teal-400',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      hoverBorderColor: 'hover:border-green-400',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
      accentBg: 'bg-green-50',
      accentText: 'text-green-700',
    };
  }

  // Digital Wellness & Screen Time (Digital Wellness Tracker evolved from Screen Time Tracker)
  if (name.includes('digital wellness') || name.includes('digital-wellness') ||
      name.includes('screen time') || name.includes('screen-time') || 
      name.includes('phone usage') || name.includes('app usage')) {
    return {
      icon: Smartphone,
      gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      borderColor: 'border-violet-200',
      hoverBorderColor: 'hover:border-violet-400',
      buttonBg: 'bg-violet-600',
      buttonHover: 'hover:bg-violet-700',
      accentBg: 'bg-violet-50',
      accentText: 'text-violet-700',
    };
  }

  // Goals & Targets
  if (name.includes('goal') || name.includes('target') || name.includes('objective')) {
    return {
      icon: Target,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      hoverBorderColor: 'hover:border-emerald-400',
      buttonBg: 'bg-emerald-600',
      buttonHover: 'hover:bg-emerald-700',
      accentBg: 'bg-emerald-50',
      accentText: 'text-emerald-700',
    };
  }

  // Default theme
  return {
    icon: FileText,
    gradient: 'from-gray-400 via-slate-400 to-zinc-400',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    hoverBorderColor: 'hover:border-gray-400',
    buttonBg: 'bg-gray-600',
    buttonHover: 'hover:bg-gray-700',
    accentBg: 'bg-gray-50',
    accentText: 'text-gray-700',
  };
}
