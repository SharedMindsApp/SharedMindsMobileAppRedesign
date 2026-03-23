/**
 * Cross-Tracker Insights Page
 * 
 * Mobile-optimized page for viewing cross-tracker insights and interpretations.
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { CrossTrackerInsightsPanel } from './CrossTrackerInsightsPanel';
import { InterpretationTimelinePanel } from './InterpretationTimelinePanel';

export function CrossTrackerInsightsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/tracker-studio/my-trackers')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 active:text-gray-700 mb-4 sm:mb-6 transition-colors text-sm sm:text-base min-h-[44px] sm:min-h-0 px-2 -ml-2 sm:ml-0"
          >
            <ArrowLeft size={18} />
            <span>Back to Trackers</span>
          </button>
          
          <div className="flex items-start gap-3 sm:gap-4 mb-3">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
              <Sparkles className="text-white" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Cross-Tracker Insights
              </h1>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Compare patterns across multiple trackers to understand relationships and changes over time.
                Insights are descriptive and context-aware, helping you see connections without judgment.
              </p>
            </div>
          </div>
        </div>

        {/* Insights Panel */}
        <div className="mb-6 sm:mb-8">
          <CrossTrackerInsightsPanel />
        </div>

        {/* Your Notes Section */}
        <div className="mt-6 sm:mt-8">
          <InterpretationTimelinePanel />
        </div>
      </div>
    </div>
  );
}
