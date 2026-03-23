/**
 * Intensity Clustering Chart
 * 
 * Displays intensity distribution by session type (gym-specific).
 */

import type { IntensityClustering } from '../../../lib/fitnessTracker/domainAwarePatternService';

type IntensityClusteringChartProps = {
  data: IntensityClustering;
};

export function IntensityClusteringChart({ data }: IntensityClusteringChartProps) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3">Intensity by Session Type</h4>

      <div className="space-y-4">
        {data.bySessionType.map(item => (
          <div key={item.type}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-700 capitalize">{item.type.replace(/_/g, ' ')}</span>
              <span className="text-sm font-medium text-gray-900">
                Avg: {item.average.toFixed(1)}/5
              </span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(level => {
                const percentage = item.distribution[level] || 0;
                return (
                  <div key={level} className="flex-1">
                    <div className="relative h-8 bg-gray-200 rounded overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-blue-600 transition-all"
                        style={{ height: `${percentage}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {percentage > 10 ? level : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-center text-xs text-gray-600 mt-1">{level}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
