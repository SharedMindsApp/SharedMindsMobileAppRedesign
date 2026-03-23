import { PlannerShell } from '../PlannerShell';
import { Target } from 'lucide-react';

export function RetirementPlanning() {
  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Retirement & Long-term Planning</h1>
          <p className="text-slate-600">Time-horizon thinking about what enough looks like</p>
        </div>

        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Retirement planning coming soon</h3>
          <p className="text-slate-600 mb-4">Plan for the future without fear-based projections</p>
        </div>
      </div>
    </PlannerShell>
  );
}
