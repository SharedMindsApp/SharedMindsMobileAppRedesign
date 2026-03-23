import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSignalTrends,
  type SignalTrend,
  type TimeWindow,
} from '../../lib/regulation/regulationTrendService';
import { TrendTimeWindowSelector } from './TrendTimeWindowSelector';
import { SignalTrendBadge } from './SignalTrendBadge';
import { TrendingUp } from 'lucide-react';

export function RegulationTrendOverview() {
  const { user } = useAuth();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('7days');
  const [trends, setTrends] = useState<SignalTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTrends();
    }
  }, [user, timeWindow]);

  async function loadTrends() {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getSignalTrends(user.id, timeWindow);
      setTrends(data);
    } catch (error) {
      console.error('[RegulationTrendOverview] Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">Patterns over time</h3>
        </div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">Patterns over time</h3>
        </div>
        <p className="text-sm text-gray-500">
          No patterns have appeared in this period yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Patterns over time</h3>
          </div>
          <p className="text-sm text-gray-500">
            This is a quiet overview of how some signals have appeared recently.
            Nothing here requires action.
          </p>
        </div>
        <TrendTimeWindowSelector selected={timeWindow} onChange={setTimeWindow} />
      </div>

      <div className="space-y-3 mt-6">
        {trends.map(trend => (
          <div
            key={trend.signal_key}
            className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50"
          >
            <span className="text-sm text-gray-700">{trend.signal_name}</span>
            <SignalTrendBadge trendState={trend.trend_state} />
          </div>
        ))}
      </div>
    </div>
  );
}
