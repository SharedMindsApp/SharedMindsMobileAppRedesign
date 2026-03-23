/**
 * Intelligent Habit Suggestion Engine
 * 
 * Context-aware habit suggestions based on:
 * - Time of day
 * - Existing habits
 * - Stalled goals
 * - Under-practiced skills
 * - Recently abandoned habits
 * 
 * Rules:
 * - Suggestions are optional
 * - Never block the user
 * - Never replace existing habits
 * - Never auto-create anything
 * - Surface as one-click actions
 * - Dismissible
 * - Non-persistent
 */

import { listHabits } from './habitsService';
import { listGoals } from '../goals/goalsService';
import { skillsService } from '../skillsService';
import { getHabitSummary } from './habitsService';
import { getHabitsForGoal } from '../goals/goalContextHelpers';
import { getCurrentOrientationSignals } from '../trackerContext/orientationHelpers';

// ============================================================================
// Types
// ============================================================================

export interface HabitSuggestion {
  title: string;
  description: string;
  reason: string; // Why this is suggested (e.g., "Supports your goal: Exercise regularly")
  confidence: 'high' | 'medium' | 'low';
  source: 'time_of_day' | 'stalled_goal' | 'under_practiced_skill' | 'recently_abandoned' | 'general';
  metadata?: {
    goalId?: string;
    skillId?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
  };
}

// ============================================================================
// Time-Based Suggestions
// ============================================================================

const TIME_BASED_SUGGESTIONS: Record<string, HabitSuggestion[]> = {
  morning: [
    { title: 'Make the bed', description: 'Small win to start the day', reason: 'Morning routine foundation', confidence: 'high', source: 'time_of_day', metadata: { timeOfDay: 'morning' } },
    { title: 'Drink a glass of water', description: 'Start your day hydrated', reason: 'Morning hydration helps with energy and focus', confidence: 'high', source: 'time_of_day', metadata: { timeOfDay: 'morning' } },
    { title: 'Get daylight exposure', description: 'Regulate your circadian rhythm', reason: 'Morning light exposure supports healthy sleep patterns', confidence: 'high', source: 'time_of_day', metadata: { timeOfDay: 'morning' } },
    { title: 'Stretch for 5 minutes', description: 'Wake up your body gently', reason: 'Morning movement helps with stiffness and energy', confidence: 'medium', source: 'time_of_day', metadata: { timeOfDay: 'morning' } },
    { title: 'Plan the day', description: 'Set intentions for the day ahead', reason: 'Morning planning can improve focus', confidence: 'medium', source: 'time_of_day', metadata: { timeOfDay: 'morning' } },
  ],
  afternoon: [
    { title: 'Drink a glass of water', description: 'Stay hydrated throughout the day', reason: 'Afternoon hydration helps maintain energy', confidence: 'medium', source: 'time_of_day', metadata: { timeOfDay: 'afternoon' } },
    { title: 'Stretch for 5 minutes', description: 'Take a moment to move your body', reason: 'Afternoon movement can reduce fatigue', confidence: 'medium', source: 'time_of_day', metadata: { timeOfDay: 'afternoon' } },
    { title: 'Review top 3 priorities', description: 'Refocus on what matters', reason: 'Afternoon review can maintain momentum', confidence: 'medium', source: 'time_of_day', metadata: { timeOfDay: 'afternoon' } },
  ],
  evening: [
    { title: 'Reflect on the day', description: 'Process your experiences', reason: 'Evening reflection supports mental clarity', confidence: 'medium', source: 'time_of_day', metadata: { timeOfDay: 'evening' } },
    { title: 'Tidy one small area', description: 'Keep your space organized', reason: 'Evening tidying can reduce morning stress', confidence: 'medium', source: 'time_of_day', metadata: { timeOfDay: 'evening' } },
    { title: 'Prepare for tomorrow', description: 'Set up for a smoother morning', reason: 'Evening preparation supports better mornings', confidence: 'medium', source: 'time_of_day', metadata: { timeOfDay: 'evening' } },
    { title: 'Screen-free before bed', description: 'Support better sleep', reason: 'Reducing screen time before bed improves rest', confidence: 'high', source: 'time_of_day', metadata: { timeOfDay: 'evening' } },
  ],
};

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

// ============================================================================
// General Suggestions (Fallback)
// ============================================================================

const GENERAL_SUGGESTIONS: HabitSuggestion[] = [
  { title: 'Make the bed', description: 'Small win to start the day', reason: 'Common first habit that builds momentum', confidence: 'high', source: 'general' },
  { title: 'Drink a glass of water', description: 'Stay hydrated throughout the day', reason: 'Hydration supports overall well-being', confidence: 'high', source: 'general' },
  { title: 'Take vitamins or medication', description: 'Stay consistent with health', reason: 'Important daily maintenance', confidence: 'high', source: 'general' },
  { title: 'Plan the day', description: 'Set intentions for what matters', reason: 'Planning can improve focus and reduce stress', confidence: 'medium', source: 'general' },
  { title: 'Tidy one small area', description: 'Keep your space organized', reason: 'Small actions can reduce overwhelm', confidence: 'medium', source: 'general' },
  { title: 'Eat mindfully', description: 'Be present while eating', reason: 'Mindful eating supports better nutrition', confidence: 'medium', source: 'general' },
  { title: 'Message a friend', description: 'Stay connected with others', reason: 'Social connection supports wellbeing', confidence: 'medium', source: 'general' },
];

// ============================================================================
// Main Suggestion Engine
// ============================================================================

/**
 * Get intelligent habit suggestions for a user
 * Returns 3-5 high-confidence suggestions based on context
 * 
 * @param userId - User ID
 * @param existingHabits - Existing habits to avoid duplicates
 * @param options - Optional context (date, calendar events count)
 */
export async function getIntelligentHabitSuggestions(
  userId: string,
  existingHabits: Array<{ id: string; title: string }>,
  options?: {
    date?: string; // YYYY-MM-DD - Check calendar load for this date
    calendarEventCount?: number; // Number of events on this date
  }
): Promise<HabitSuggestion[]> {
  const suggestions: HabitSuggestion[] = [];
  const existingTitles = new Set(existingHabits.map(h => h.title.toLowerCase().trim()));
  
  // Check if today is overloaded (calendar context)
  const isOverloaded = options?.calendarEventCount !== undefined && options.calendarEventCount > 5;

  try {
    // 1. Time-based suggestions (high priority)
    // If overloaded, prefer lighter suggestions
    const timeOfDay = getTimeOfDay();
    let timeSuggestions = TIME_BASED_SUGGESTIONS[timeOfDay] || [];
    
    // Filter to lighter habits if overloaded
    if (isOverloaded) {
      const lightHabits = ['Drink a glass of water', 'Make the bed', 'Stretch for 5 minutes', 'Get daylight exposure', 'Plan the day'];
      timeSuggestions = timeSuggestions.filter(s => lightHabits.includes(s.title));
    }
    
    for (const suggestion of timeSuggestions) {
      if (!existingTitles.has(suggestion.title.toLowerCase().trim())) {
        // Add context hint if overloaded
        if (isOverloaded) {
          suggestions.push({
            ...suggestion,
            reason: suggestion.reason + ' (Light effort)',
          });
        } else {
          suggestions.push(suggestion);
        }
        if (suggestions.length >= 3) break;
      }
    }

    // 2. Goal-based suggestions (if we have stalled goals)
    if (suggestions.length < 5) {
      try {
        const goals = await listGoals(userId);
        const stalledGoals = goals.filter(g => {
          // Check if goal has low progress or no recent habit activity
          // This is a simplified check - in production, use goal momentum
          return g.status === 'active';
        }).slice(0, 2); // Limit to 2 goals

        for (const goal of stalledGoals) {
          // Get goal activity title
          const { getActivity } = await import('../activities/activityService');
          const goalActivity = await getActivity(goal.goal_activity_id);
          
          if (!goalActivity) continue;
          
          // Suggest habits that might support this goal
          // This is a placeholder - in production, use goal requirements or AI
          const goalSuggestion: HabitSuggestion = {
            title: `Work toward: ${goalActivity.title}`,
            description: `Support your goal of ${goalActivity.title}`,
            reason: `This could help progress your goal: ${goalActivity.title}`,
            confidence: 'medium',
            source: 'stalled_goal',
            metadata: { goalId: goal.id },
          };

          if (!existingTitles.has(goalSuggestion.title.toLowerCase().trim())) {
            suggestions.push(goalSuggestion);
            if (suggestions.length >= 5) break;
          }
        }
      } catch (err) {
        console.warn('[habitSuggestionEngine] Error loading goals:', err);
        // Non-fatal, continue
      }
    }

    // 3. Skill-based suggestions (if we have under-practiced skills)
    if (suggestions.length < 5) {
      try {
        const skills = await skillsService.getAll(userId);
        const underPracticed = skills
          .filter(skill => {
            // Skills with low usage_count or old last_used_at
            const daysSinceLastUse = skill.last_used_at
              ? Math.floor((Date.now() - new Date(skill.last_used_at).getTime()) / (1000 * 60 * 60 * 24))
              : Infinity;
            return daysSinceLastUse > 7 || (skill.usage_count || 0) < 3;
          })
          .slice(0, 2);

        for (const skill of underPracticed) {
          const skillSuggestion: HabitSuggestion = {
            title: `Practice: ${skill.name}`,
            description: `Build your ${skill.name} skill through regular practice`,
            reason: `Regular practice can strengthen your ${skill.name} skill`,
            confidence: 'medium',
            source: 'under_practiced_skill',
            metadata: { skillId: skill.id },
          };

          if (!existingTitles.has(skillSuggestion.title.toLowerCase().trim())) {
            suggestions.push(skillSuggestion);
            if (suggestions.length >= 5) break;
          }
        }
      } catch (err) {
        console.warn('[habitSuggestionEngine] Error loading skills:', err);
        // Non-fatal, continue
      }
    }

    // 4. Fill with general suggestions if needed
    if (suggestions.length < 3) {
      for (const suggestion of GENERAL_SUGGESTIONS) {
        if (!existingTitles.has(suggestion.title.toLowerCase().trim())) {
          suggestions.push(suggestion);
          if (suggestions.length >= 5) break;
        }
      }
    }

    // Sort by confidence (high first), then limit to 5
    return suggestions
      .sort((a, b) => {
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      })
      .slice(0, 5);
  } catch (err) {
    console.error('[habitSuggestionEngine] Error generating suggestions:', err);
    // Fallback to general suggestions
    return GENERAL_SUGGESTIONS
      .filter(s => !existingTitles.has(s.title.toLowerCase().trim()))
      .slice(0, 5);
  }
}
