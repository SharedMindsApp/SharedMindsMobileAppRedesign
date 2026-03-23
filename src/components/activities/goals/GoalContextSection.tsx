/**
 * Goal Context Section
 * 
 * Read-only display of contextual information about a goal:
 * - Habits contributing to this goal
 * - Goal momentum insight
 * 
 * Non-intrusive, ADHD-friendly design.
 */

import { Repeat, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import type { HabitContributor } from '../../../lib/goals/goalContextHelpers';

export interface GoalContextSectionProps {
  habits: HabitContributor[];
  momentumInsight: string | null;
  compact?: boolean;
}

/**
 * Small, non-intrusive context section for goal cards
 * Only shows if there's context to display
 */
export function GoalContextSection({
  habits,
  momentumInsight,
  compact = false,
}: GoalContextSectionProps) {
  // Don't render if there's nothing to show
  if (habits.length === 0 && !momentumInsight) {
    return null;
  }

  const textSize = compact ? 'text-xs' : 'text-sm';
  const iconSize = compact ? 12 : 14;
  const spacing = compact ? 'space-y-1.5' : 'space-y-2';

  // Status indicator helper
  const getStatusIndicator = (status: HabitContributor['status']) => {
    switch (status) {
      case 'on_track':
        return <span className="text-green-600">🔥</span>;
      case 'inconsistent':
        return <span className="text-amber-600">⚠️</span>;
      case 'stalled':
        return <span className="text-red-600">⏸️</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`pt-2 border-t border-gray-100 ${spacing}`}>
      {/* Habits Contributors Section */}
      {habits.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Repeat size={iconSize} className="text-blue-600 flex-shrink-0" />
            <span className={`${textSize} font-medium text-gray-700`}>
              Habits contributing to this goal:
            </span>
          </div>
          <ul className="ml-5 space-y-0.5">
            {habits.map((contributor) => (
              <li key={contributor.habit.id} className={`${textSize} text-gray-600 flex items-center gap-1.5`}>
                {getStatusIndicator(contributor.status)}
                <span className="font-medium">{contributor.habit.title}</span>
                {contributor.summary && (
                  <span className="text-gray-500">
                    — {contributor.summary.currentStreak}-day streak
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Momentum Insight */}
      {momentumInsight && (
        <div className="flex items-start gap-1.5 pt-1">
          <Sparkles size={iconSize} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className={`${textSize} text-gray-600 italic`}>
            {momentumInsight}
          </p>
        </div>
      )}
    </div>
  );
}
