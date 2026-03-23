import { TrendingUp, Info } from 'lucide-react';
import { InsightOrientationCard } from '../insights/InsightOrientationCard';
import { IntentVsRealityPanel } from '../insights/IntentVsRealityPanel';
import { AttentionShapePanel } from '../insights/AttentionShapePanel';
import { ExpansionVsExecutionPanel } from '../insights/ExpansionVsExecutionPanel';
import { RegulationContextTimelinePanel } from '../insights/RegulationContextTimelinePanel';
import { PlaybookRemindersCard } from '../../regulation/PlaybookRemindersCard';

export function RegulationInsightsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Insights</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Calm visual reflections showing how declared intent and observed behavior patterns relate over time.
              This information exists to help you decide whether to use regulation tools—not to push you toward them.
            </p>
          </div>
        </div>
      </div>

      <InsightOrientationCard />

      <div className="space-y-6">
        <IntentVsRealityPanel />
        <AttentionShapePanel />
        <ExpansionVsExecutionPanel />
        <RegulationContextTimelinePanel />
        <PlaybookRemindersCard />
      </div>

      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">What This Section Answers</h3>
            <p className="text-sm text-gray-700 mb-3">"Given what I intended, what seems to have happened?"</p>

            <h3 className="text-sm font-semibold text-gray-900 mb-2">What This Section Does NOT Answer</h3>
            <p className="text-sm text-gray-700">"What should I do about it?"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
