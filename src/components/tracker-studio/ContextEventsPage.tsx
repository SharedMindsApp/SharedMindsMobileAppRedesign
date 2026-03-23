import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import { ContextTimelinePanel } from './ContextTimelinePanel';
import { InterpretationTimelinePanel } from './InterpretationTimelinePanel';

export function ContextEventsPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setMonth(start.getMonth() - 1); // Last month
    return {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/tracker-studio/my-trackers')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 active:text-gray-700 mb-4 transition-colors text-sm sm:text-base min-h-[44px] sm:min-h-0"
          >
            <ArrowLeft size={18} />
            Back to Trackers
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Life Context</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Add context events to explain periods that affected your tracking. These help interpret your data without judgment.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 flex-shrink-0">
              <Calendar size={16} />
              <span>Date Range:</span>
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-1">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
              />
              <span className="text-gray-500 text-center sm:text-left self-center">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Context Timeline Panel */}
        <div className="mb-6">
          <ContextTimelinePanel
            startDate={dateRange.start}
            endDate={dateRange.end}
          />
        </div>

        {/* Your Notes Section */}
        <InterpretationTimelinePanel
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      </div>
    </div>
  );
}
