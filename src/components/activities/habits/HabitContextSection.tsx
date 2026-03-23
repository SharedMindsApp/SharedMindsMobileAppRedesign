/**
 * Habit Context Section
 * 
 * Read-only display of contextual information about a habit:
 * - Goals this habit contributes to
 * - Skills this habit builds
 * - Optional micro-feedback
 * 
 * Non-intrusive, ADHD-friendly design.
 */

import { Target, Award, Sparkles } from 'lucide-react';
import type { GoalContext } from '../../../lib/habits/habitContextHelpers';
import type { SkillContext } from '../../../lib/habits/habitContextHelpers';

export interface HabitContextSectionProps {
  goals: GoalContext[];
  skills: SkillContext[];
  microFeedback: string | null;
  compact?: boolean;
}

/**
 * Small, non-intrusive context section for habit cards
 * Only shows if there's context to display
 */
export function HabitContextSection({
  goals,
  skills,
  microFeedback,
  compact = false,
}: HabitContextSectionProps) {
  // Don't render if there's nothing to show
  if (goals.length === 0 && skills.length === 0 && !microFeedback) {
    return null;
  }

  const textSize = compact ? 'text-xs' : 'text-sm';
  const iconSize = compact ? 12 : 14;
  const spacing = compact ? 'space-y-1.5' : 'space-y-2';

  return (
    <div className={`pt-2 border-t border-gray-100 ${spacing}`}>
      {/* Goals Section */}
      {goals.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Target size={iconSize} className="text-blue-600 flex-shrink-0" />
            <span className={`${textSize} font-medium text-gray-700`}>
              Contributes to:
            </span>
          </div>
          <ul className="ml-5 space-y-0.5">
            {goals.map(({ goal, activity }) => (
              <li key={goal.id} className={`${textSize} text-gray-600`}>
                • {activity.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills Section */}
      {skills.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Award size={iconSize} className="text-purple-600 flex-shrink-0" />
            <span className={`${textSize} font-medium text-gray-700`}>
              {skills.length === 1 ? 'Builds skill:' : 'Builds skills:'}
            </span>
          </div>
          <ul className="ml-5 space-y-0.5">
            {skills.map(({ skill }) => (
              <li key={skill.id} className={`${textSize} text-gray-600`}>
                • {skill.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Micro-Feedback */}
      {microFeedback && (
        <div className="flex items-start gap-1.5 pt-1">
          <Sparkles size={iconSize} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className={`${textSize} text-gray-600 italic`}>
            {microFeedback}
          </p>
        </div>
      )}
    </div>
  );
}
