/**
 * Frequency Pattern Chart
 * 
 * Displays frequency patterns and consistency.
 */

import type { FrequencyPattern } from '../../../lib/fitnessTracker/domainAwarePatternService';
import { TrendingUp } from 'lucide-react';

type FrequencyPatternChartProps = {
  data: FrequencyPattern;
};

export function FrequencyPatternChart({ data }: FrequencyPatternChartProps) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3">Frequency Pattern</h4>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-700">Sessions per week</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {data.sessionsPerWeek.toFixed(1)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Consistency</span>
          <span className="text-sm font-medium text-gray-900">
            {(data.consistency * 100).toFixed(0)}%
          </span>
        </div>

      </div>
    </div>
  );
}
