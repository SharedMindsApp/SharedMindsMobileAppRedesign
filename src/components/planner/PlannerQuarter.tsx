/**
 * Planner Quarter View
 * 
 * Quarterly planning view with life area filtering
 */

import { PlannerShell } from './PlannerShell';
import { useNavigate } from 'react-router-dom';

export function PlannerQuarter() {
  const navigate = useNavigate();
  
  // For now, redirect to quarterly route (existing implementation)
  // TODO: Implement dedicated quarterly view
  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Quarterly Planning</h1>
          <p className="text-slate-600 mb-6">Quarterly view coming soon. For now, use the existing quarterly calendar.</p>
          <button
            onClick={() => navigate('/planner/quarterly')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Quarterly Calendar
          </button>
        </div>
      </div>
    </PlannerShell>
  );
}
