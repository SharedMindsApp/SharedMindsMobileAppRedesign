/**
 * Screen Time Stats Panel
 * 
 * Displays screen time analytics and insights.
 */

import { BarChart3, TrendingUp, Clock, Smartphone } from 'lucide-react';
import type { Tracker } from '../../../lib/trackerStudio/types';

interface ScreenTimeStatsPanelProps {
  tracker: Tracker;
}

export function ScreenTimeStatsPanel({ tracker }: ScreenTimeStatsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 size={24} className="text-indigo-600" />
          Usage Statistics
        </h2>
        <p className="text-gray-600">Analytics coming soon...</p>
      </div>
    </div>
  );
}
