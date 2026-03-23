/**
 * Planner Tracker Placeholder
 * 
 * Replaces tracking surfaces in Planner UI.
 * Guides users to Tracker Studio for all tracking functionality.
 */

import { useNavigate } from 'react-router-dom';
import { BarChart3, ArrowRight, Activity } from 'lucide-react';

interface PlannerTrackerPlaceholderProps {
  trackerName?: string;
  trackerType?: string;
}

export function PlannerTrackerPlaceholder({ 
  trackerName = 'Tracking',
  trackerType = 'tracking'
}: PlannerTrackerPlaceholderProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 text-center">
      <div className="flex items-center justify-center mb-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-blue-600" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        Tracking lives in Tracker Studio
      </h3>
      <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
        All tracking, logging, and measurement tools are available in Tracker Studio.
        Planner focuses on planning and intention-setting.
      </p>
      <button
        onClick={() => navigate('/tracker-studio')}
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium"
      >
        <Activity size={18} />
        Open Tracker Studio
        <ArrowRight size={18} />
      </button>
    </div>
  );
}
