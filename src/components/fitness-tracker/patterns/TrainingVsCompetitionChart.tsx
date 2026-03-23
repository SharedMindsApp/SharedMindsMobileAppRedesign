/**
 * Training vs Competition Chart
 * 
 * Displays training vs competition distribution (sport-specific).
 */

import type { TrainingVsCompetition } from '../../../lib/fitnessTracker/domainAwarePatternService';

type TrainingVsCompetitionChartProps = {
  data: TrainingVsCompetition;
};

export function TrainingVsCompetitionChart({ data }: TrainingVsCompetitionChartProps) {
  const total = data.training.count + data.competition.count;

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3">Training vs Competition</h4>

      <div className="space-y-4">
        {/* Pie-like visualization */}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Training</span>
              <span className="text-sm font-medium text-gray-900">
                {data.training.count} ({data.training.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${data.training.percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Competition</span>
              <span className="text-sm font-medium text-gray-900">
                {data.competition.count} ({data.competition.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-orange-600 h-full rounded-full transition-all"
                style={{ width: `${data.competition.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="text-xs text-gray-600 pt-2 border-t border-gray-200">
            Ratio: {data.ratio.toFixed(2)} (competition to training)
          </div>
        )}
      </div>
    </div>
  );
}
