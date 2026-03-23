/**
 * Session Balance Chart
 * 
 * Displays distribution of session types (gym-specific).
 */

import type { SessionBalance } from '../../../lib/fitnessTracker/domainAwarePatternService';

type SessionBalanceChartProps = {
  data: SessionBalance;
};

export function SessionBalanceChart({ data }: SessionBalanceChartProps) {
  const maxCount = Math.max(...data.distribution.map(d => d.count), 1);

  return (
    <div>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900">Session Balance</h4>
        <p className="text-xs text-gray-600">
          Balance score: {(data.balanceScore * 100).toFixed(0)}%
        </p>
      </div>

      <div className="space-y-2">
        {data.distribution.map(item => (
          <div key={item.type} className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-700 capitalize truncate">
              {item.type.replace(/_/g, ' ')}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm text-gray-700">
                  {item.count} ({item.percentage.toFixed(0)}%)
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
