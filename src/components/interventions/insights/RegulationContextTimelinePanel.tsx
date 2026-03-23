import { Activity } from 'lucide-react';
import { RegulationTrendOverview } from '../../regulation/RegulationTrendOverview';

export function RegulationContextTimelinePanel() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">What support was around</h3>
      </div>

      <div className="mb-4 bg-gray-50 rounded-lg p-4 border border-gray-100">
        <p className="text-sm text-gray-700 leading-relaxed">
          This timeline shows when regulation tools were present—not whether they worked. Signals, presets, and
          responses appear here as context, not judgment.
        </p>
      </div>

      <RegulationTrendOverview />
    </div>
  );
}
