/**
 * Current Focus Section
 * 
 * Read-only component that displays orientation signals to help users
 * understand where their attention naturally wants to go.
 * 
 * This is a mirror, not a planner - it reflects behavior without directing it.
 */

import type { OrientationSignal } from '../../lib/trackerContext/orientationEngine';

export interface CurrentFocusSectionProps {
  signals: OrientationSignal[];
  compact?: boolean;
}

/**
 * Small, non-intrusive section showing current focus signals
 * Only renders if signals exist
 */
export function CurrentFocusSection({
  signals,
  compact = false,
}: CurrentFocusSectionProps) {
  // Don't render if no signals
  if (!signals || signals.length === 0) {
    return null;
  }

  const textSize = compact ? 'text-xs' : 'text-sm';

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3.5 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`${textSize} font-medium text-gray-700`}>Current Focus</span>
      </div>
      {signals.map((signal, index) => (
        <p key={`${signal.entityType}-${signal.entityId}-${index}`} className={`${textSize} text-gray-700 leading-relaxed`}>
          {signal.summary}
        </p>
      ))}
    </div>
  );
}
