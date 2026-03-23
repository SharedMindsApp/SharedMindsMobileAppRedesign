/**
 * Habit Predictive Analysis Service
 * 
 * Analyzes patterns to provide proactive suggestions, alerts, and contextual prompts.
 * Predicts when users are likely to log habits and warns about risk patterns.
 */

import type { TrackerEntry } from './types';
import { type HabitPattern as HabitPatternType } from './habitPatternAnalysis';
import type { HabitStreak } from './habitStreakAnalysis';

export interface PredictiveSuggestion {
  habitName: string;
  type: 'pattern' | 'time_based' | 'day_based' | 'missing' | 'streak_risk';
  message: string;
  confidence: number; // 0-1, how confident we are this suggestion is relevant
  priority: 'low' | 'medium' | 'high';
  actionLabel?: string; // e.g., "Log it now"
}

export interface PatternAlert {
  habitName: string;
  type: 'weekend_miss' | 'day_pattern' | 'time_pattern' | 'declining_frequency';
  message: string;
  pattern: string; // Description of the pattern detected
  suggestion?: string; // Optional suggestion to improve
}

export interface ContextualPrompt {
  habitName: string;
  prompt: string;
  timeOfDay?: string; // e.g., "morning", "afternoon", "evening"
  dayOfWeek?: string; // e.g., "Monday", "weekend"
  confidence: number;
}

/**
 * Generate predictive suggestions based on patterns
 */
export function generatePredictiveSuggestions(
  patterns: Map<string, HabitPatternType>,
  currentDate: Date,
  streaks?: Map<string, HabitStreak>
): PredictiveSuggestion[] {
  const suggestions: PredictiveSuggestion[] = [];
  const currentDayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
  const currentHour = currentDate.getHours();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6;

  for (const pattern of patterns.values()) {
    const streak = streaks?.get(pattern.habitName);

    // Day-based suggestion: "You usually log this on Mondays"
    if (pattern.commonDays.length > 0 && pattern.commonDays.length < 7) {
      const dayLabels = pattern.commonDays.map(d => dayNames[d]);
      const isCommonDay = pattern.commonDays.includes(currentDayOfWeek);
      
      if (isCommonDay) {
        suggestions.push({
          habitName: pattern.habitName,
          type: 'day_based',
          message: `You usually log "${pattern.habitName}" on ${dayLabels.join('s, ')}. Want to log it now?`,
          confidence: 0.8,
          priority: 'high',
          actionLabel: 'Log it now',
        });
      }
    }

    // Missing pattern: "It's been X days since you last logged"
    if (pattern.lastLoggedDate) {
      const lastDate = new Date(pattern.lastLoggedDate);
      const daysSince = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince >= 2 && daysSince <= 7) {
        suggestions.push({
          habitName: pattern.habitName,
          type: 'missing',
          message: `It's been ${daysSince} day${daysSince > 1 ? 's' : ''} since you last logged "${pattern.habitName}". Ready to continue?`,
          confidence: 0.7,
          priority: daysSince >= 4 ? 'high' : 'medium',
          actionLabel: 'Log it now',
        });
      }
    }

    // Streak risk: If on a streak but pattern suggests risk
    if (streak && streak.streakType === 'active' && streak.currentStreak > 0) {
      // Check if user tends to miss on weekends and today is weekend
      const weekendEntries = pattern.recentEntries.filter(e => {
        const date = new Date(e.entry_date);
        const day = date.getDay();
        return day === 0 || day === 6;
      });
      const weekdayEntries = pattern.recentEntries.filter(e => {
        const date = new Date(e.entry_date);
        const day = date.getDay();
        return day >= 1 && day <= 5;
      });

      if (isWeekend && weekendEntries.length < weekdayEntries.length * 0.5 && streak.currentStreak >= 3) {
        suggestions.push({
          habitName: pattern.habitName,
          type: 'streak_risk',
          message: `You're on a ${streak.currentStreak}-day streak! Don't let the weekend break it.`,
          confidence: 0.9,
          priority: 'high',
          actionLabel: 'Keep the streak going',
        });
      }
    }
  }

  // Sort by priority and confidence
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.confidence - a.confidence;
  });
}

/**
 * Detect pattern alerts (negative patterns to warn about)
 */
export function detectPatternAlerts(
  patterns: Map<string, HabitPatternType>,
  currentDate: Date
): PatternAlert[] {
  const alerts: PatternAlert[] = [];
  const currentDayOfWeek = currentDate.getDay();
  const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6;

  for (const pattern of patterns.values()) {
    // Weekend miss pattern
    if (isWeekend && pattern.commonDays.length > 0) {
      const hasWeekendDays = pattern.commonDays.some(d => d === 0 || d === 6);
      const hasWeekdayDays = pattern.commonDays.some(d => d >= 1 && d <= 5);
      
      if (!hasWeekendDays && hasWeekdayDays && pattern.frequency >= 10) {
        // User logs on weekdays but not weekends
        alerts.push({
          habitName: pattern.habitName,
          type: 'weekend_miss',
          message: `You tend to miss "${pattern.habitName}" on weekends. Consider keeping it consistent!`,
          pattern: 'Logged on weekdays but not weekends',
          suggestion: 'Try a shorter or different version on weekends',
        });
      }
    }

    // Declining frequency pattern
    if (pattern.recentEntries.length >= 10) {
      const recent10 = pattern.recentEntries.slice(0, 10);
      const older10 = pattern.recentEntries.slice(10, 20);
      
      if (older10.length === 10) {
        const recentFreq = recent10.length / 10; // Per entry
        const olderFreq = older10.length / 10;
        
        if (recentFreq < olderFreq * 0.7) {
          // Frequency declined by more than 30%
          alerts.push({
            habitName: pattern.habitName,
            type: 'declining_frequency',
            message: `Your logging frequency for "${pattern.habitName}" has decreased recently.`,
            pattern: `Was logging ${olderFreq.toFixed(1)}x per entry, now ${recentFreq.toFixed(1)}x`,
            suggestion: 'Consider making it easier or adjusting your routine',
          });
        }
      }
    }
  }

  return alerts;
}

/**
 * Generate contextual prompts based on time and patterns
 */
export function generateContextualPrompts(
  patterns: Map<string, HabitPatternType>,
  currentDate: Date,
  streaks?: Map<string, HabitStreak>
): ContextualPrompt[] {
  const prompts: ContextualPrompt[] = [];
  const currentHour = currentDate.getHours();
  const currentDayOfWeek = currentDate.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let timeOfDay: 'morning' | 'afternoon' | 'evening' | null = null;
  if (currentHour >= 5 && currentHour < 12) {
    timeOfDay = 'morning';
  } else if (currentHour >= 12 && currentHour < 17) {
    timeOfDay = 'afternoon';
  } else if (currentHour >= 17 || currentHour < 5) {
    timeOfDay = 'evening';
  }

  // For habits that are commonly logged but not today yet
  for (const pattern of patterns.values()) {
    const streak = streaks?.get(pattern.habitName);
    
    // High frequency habits that haven't been logged today
    const lastLoggedDate = pattern.lastLoggedDate ? new Date(pattern.lastLoggedDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (pattern.frequency >= 7 && !lastLoggedDate) {
      // First time ever - encourage
      prompts.push({
        habitName: pattern.habitName,
        prompt: `Start tracking "${pattern.habitName}" today!`,
        confidence: 0.6,
      });
    } else if (lastLoggedDate) {
      const lastDateOnly = new Date(lastLoggedDate);
      lastDateOnly.setHours(0, 0, 0, 0);
      
      if (lastDateOnly.getTime() < today.getTime()) {
        // Not logged today yet
        if (pattern.frequency >= 10) {
          // Common habit, prompt based on time of day
          if (timeOfDay === 'morning' && pattern.commonDays.includes(currentDayOfWeek)) {
            prompts.push({
              habitName: pattern.habitName,
              prompt: `Good morning! Ready to log "${pattern.habitName}"?`,
              timeOfDay: 'morning',
              dayOfWeek: dayNames[currentDayOfWeek],
              confidence: 0.8,
            });
          } else if (pattern.commonDays.includes(currentDayOfWeek)) {
            prompts.push({
              habitName: pattern.habitName,
              prompt: `Don't forget "${pattern.habitName}" today!`,
              dayOfWeek: dayNames[currentDayOfWeek],
              confidence: 0.7,
            });
          }
        }

        // Streak protection prompt
        if (streak && streak.streakType === 'active' && streak.currentStreak >= 5) {
          prompts.push({
            habitName: pattern.habitName,
            prompt: `Protect your ${streak.currentStreak}-day streak! Log "${pattern.habitName}" today.`,
            confidence: 0.9,
          });
        }
      }
    }
  }

  return prompts.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get top predictive suggestions for display
 */
export function getTopPredictiveSuggestions(
  suggestions: PredictiveSuggestion[],
  maxCount: number = 3
): PredictiveSuggestion[] {
  return suggestions.slice(0, maxCount);
}

/**
 * Check if there are high-priority suggestions
 */
export function hasHighPrioritySuggestions(suggestions: PredictiveSuggestion[]): boolean {
  return suggestions.some(s => s.priority === 'high' && s.confidence >= 0.7);
}
