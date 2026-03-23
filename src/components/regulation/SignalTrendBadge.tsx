import React from 'react';
import type { TrendState } from '../../lib/regulation/regulationTrendService';

interface SignalTrendBadgeProps {
  trendState: TrendState;
}

export function SignalTrendBadge({ trendState }: SignalTrendBadgeProps) {
  const labels: Record<TrendState, string> = {
    new: 'New',
    recurring: 'Recurring',
    settling: 'Settling',
  };

  return (
    <span className="text-sm text-gray-500 font-normal">
      {labels[trendState]}
    </span>
  );
}
