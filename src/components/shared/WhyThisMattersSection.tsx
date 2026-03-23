/**
 * Why This Matters Section
 * 
 * Shared read-only component that displays "why this matters" context
 * for habits, goals, skills, and tasks.
 * 
 * Non-intrusive, identity-affirming design.
 */

import { Sparkles } from 'lucide-react';
import type { WhyThisMattersContext } from '../../lib/trackerContext/meaningHelpers';

export interface WhyThisMattersSectionProps {
  context: WhyThisMattersContext | null;
  compact?: boolean;
}

/**
 * Small, non-intrusive section explaining why an entity matters
 * Only renders if context exists and confidence is high
 */
export function WhyThisMattersSection({
  context,
  compact = false,
}: WhyThisMattersSectionProps) {
  // Don't render if no context or low confidence
  if (!context || context.confidence !== 'high') {
    return null;
  }

  const textSize = compact ? 'text-xs' : 'text-sm';
  const iconSize = compact ? 12 : 14;

  return (
    <div className="pt-2 border-t border-gray-100">
      <div className="flex items-start gap-1.5">
        <Sparkles size={iconSize} className="text-purple-600 flex-shrink-0 mt-0.5" />
        <p className={`${textSize} text-gray-600 italic`}>
          {context.summary}
        </p>
      </div>
    </div>
  );
}
