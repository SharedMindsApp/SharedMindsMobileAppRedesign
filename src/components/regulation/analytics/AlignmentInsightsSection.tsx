import React from 'react';
import { BarChart3 } from 'lucide-react';
import { DailyAlignmentReflectionCard } from './DailyAlignmentReflectionCard';
import { FocusContextCard } from './FocusContextCard';
import { ScopeBalanceCard } from './ScopeBalanceCard';
import { RegulationContextTimeline } from './RegulationContextTimeline';
import { RegulationTrendOverview } from '../RegulationTrendOverview';
import { PlaybookRemindersCard } from '../PlaybookRemindersCard';

export function AlignmentInsightsSection() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Insights & Alignment</h2>
            <p className="text-sm text-gray-700 mb-4">
              Calm visual reflections showing how declared intent and observed behavior patterns relate
              over time. This information exists to help you decide whether to use regulation tools - not
              to push you toward them.
            </p>
            <div className="p-4 bg-white/80 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 italic">
                This section is descriptive, not evaluative. It compares intent vs observation, not success
                vs failure. All panels are optional, ignorable, and non-binding. Nothing here requires action.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <DailyAlignmentReflectionCard />
        <FocusContextCard />
        <ScopeBalanceCard />
        <RegulationContextTimeline />
        <RegulationTrendOverview />
        <PlaybookRemindersCard />
      </div>

      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">What This Section Answers</h3>
        <p className="text-sm text-gray-700 mb-3">
          "Given what I intended, what seems to have happened?"
        </p>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">What This Section Does NOT Answer</h3>
        <p className="text-sm text-gray-700">
          "What should I do about it?"
        </p>
      </div>
    </div>
  );
}
