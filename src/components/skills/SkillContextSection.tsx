/**
 * Skill Context Section
 * 
 * Read-only display of contextual information about a skill:
 * - Habits that practice this skill
 * - Practice frequency summary
 * - Momentum insight
 * 
 * Non-intrusive, ADHD-friendly design.
 */

import { Repeat, Sparkles } from 'lucide-react';
import type { HabitPracticingSkill, RecentPracticeSummary } from '../../lib/skills/skillContextHelpers';
import type { MomentumResult } from '../../lib/trackerContext/momentumEngine';

export interface SkillContextSectionProps {
  habits: HabitPracticingSkill[];
  practiceSummary: RecentPracticeSummary;
  momentum: MomentumResult;
  compact?: boolean;
}

/**
 * Small, non-intrusive context section for skill cards
 * Only shows if there's context to display
 */
export function SkillContextSection({
  habits,
  practiceSummary,
  momentum,
  compact = false,
}: SkillContextSectionProps) {
  // Don't render if there's nothing meaningful to show
  const hasHabits = habits.length > 0;
  const hasPractice = practiceSummary.evidenceCount7d > 0 || practiceSummary.evidenceCount30d > 0;
  const hasMomentumInsight = momentum.insight !== null;

  if (!hasHabits && !hasPractice && !hasMomentumInsight) {
    return null;
  }

  const textSize = compact ? 'text-xs' : 'text-sm';
  const iconSize = compact ? 12 : 14;
  const spacing = compact ? 'space-y-1.5' : 'space-y-2';

  // Format practice frequency text
  const getPracticeFrequencyText = () => {
    if (practiceSummary.evidenceCount7d > 0) {
      return `Practiced ${practiceSummary.evidenceCount7d}× this week`;
    } else if (practiceSummary.evidenceCount30d > 0) {
      return `Practiced ${practiceSummary.evidenceCount30d}× this month`;
    }
    return null;
  };

  const practiceText = getPracticeFrequencyText();

  return (
    <div className={`pt-2 border-t border-gray-100 ${spacing}`}>
      {/* Habits Practicing This Skill */}
      {hasHabits && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Repeat size={iconSize} className="text-blue-600 flex-shrink-0" />
            <span className={`${textSize} font-medium text-gray-700`}>
              Practiced through:
            </span>
          </div>
          <ul className="ml-5 space-y-0.5">
            {habits.map(({ habit, evidenceCount7d }) => (
              <li key={habit.id} className={`${textSize} text-gray-600`}>
                • {habit.title}
                {evidenceCount7d > 0 && (
                  <span className="text-gray-500 ml-1">
                    ({evidenceCount7d}× this week)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Practice Frequency Summary */}
      {practiceText && (
        <div className="flex items-center gap-1.5">
          <span className={`${textSize} text-gray-600`}>
            {practiceText}
          </span>
        </div>
      )}

      {/* Momentum Insight */}
      {hasMomentumInsight && momentum.insight && (
        <div className="flex items-start gap-1.5 pt-1">
          <Sparkles size={iconSize} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className={`${textSize} text-gray-600 italic`}>
            {momentum.insight.text}
          </p>
        </div>
      )}
    </div>
  );
}
