/**
 * Cross-Tracker Insights Panel
 * 
 * Mobile-optimized panel for selecting trackers, date ranges, and viewing insights.
 */

import { useState, useEffect, useMemo } from 'react';
import { Calendar, Loader2, AlertCircle, TrendingUp, BarChart3, ChevronDown, ChevronUp, X, Check, Sparkles } from 'lucide-react';
import { listTrackers } from '../../lib/trackerStudio/trackerService';
import { getCrossTrackerSummary } from '../../lib/trackerStudio/trackerInterpretationService';
import { getTrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';
import type { Tracker } from '../../lib/trackerStudio/types';
import type { CrossTrackerSummary, Insight } from '../../lib/trackerStudio/trackerInterpretationTypes';
import { InsightCard } from './InsightCard';
import { showToast } from '../Toast';

interface CrossTrackerInsightsPanelProps {
  initialTrackerIds?: string[];
  initialDateRange?: { start: string; end: string };
}

export function CrossTrackerInsightsPanel({
  initialTrackerIds = [],
  initialDateRange,
}: CrossTrackerInsightsPanelProps) {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [selectedTrackerIds, setSelectedTrackerIds] = useState<string[]>(initialTrackerIds);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    if (initialDateRange) return initialDateRange;
    const today = new Date();
    const start = new Date(today);
    start.setMonth(start.getMonth() - 1);
    return {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  });

  const [summary, setSummary] = useState<CrossTrackerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrackerSelector, setShowTrackerSelector] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadTrackers();
  }, []);

  const loadTrackers = async () => {
    try {
      const data = await listTrackers(false);
      setTrackers(data);
    } catch (err) {
      console.error('Failed to load trackers:', err);
    }
  };

  const handleGenerateInsights = async () => {
    if (selectedTrackerIds.length < 2) {
      showToast('error', 'Please select at least 2 trackers');
      return;
    }

    setLoading(true);
    setError(null);
    setShowTrackerSelector(false);
    setShowDatePicker(false);

    try {
      const result = await getCrossTrackerSummary({
        trackerIds: selectedTrackerIds,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
      showToast('error', err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackerToggle = (trackerId: string) => {
    setSelectedTrackerIds(prev => {
      if (prev.includes(trackerId)) {
        return prev.filter(id => id !== trackerId);
      } else {
        return [...prev, trackerId];
      }
    });
  };

  const selectedTrackers = useMemo(() => {
    return trackers.filter(t => selectedTrackerIds.includes(t.id));
  }, [trackers, selectedTrackerIds]);

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl border-2 border-gray-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <BarChart3 size={20} className="text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">Cross-Tracker Insights</h3>
        </div>
        <p className="text-sm sm:text-base text-white/90">
          Compare patterns across multiple trackers to understand relationships over time.
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Tracker Selection - Mobile Optimized */}
        <div>
          <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-3">
            Select Trackers <span className="text-gray-500 font-normal">(at least 2)</span>
          </label>
          
          {/* Selected Trackers Display */}
          {selectedTrackers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedTrackers.map(tracker => {
                const theme = getTrackerTheme(tracker.name);
                const Icon = theme.icon;
                return (
                  <div
                    key={tracker.id}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl"
                  >
                    <div className={`${theme.iconBg} ${theme.iconColor} rounded-lg p-1.5`}>
                      <Icon size={14} className={theme.iconColor} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 line-clamp-1 max-w-[120px] sm:max-w-none">
                      {tracker.name}
                    </span>
                    <button
                      onClick={() => handleTrackerToggle(tracker.id)}
                      className="ml-1 p-0.5 hover:bg-gray-200 rounded transition-colors"
                      aria-label={`Remove ${tracker.name}`}
                    >
                      <X size={14} className="text-gray-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tracker Selector - Collapsible for Mobile */}
          <div>
            <button
              onClick={() => setShowTrackerSelector(!showTrackerSelector)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all flex items-center justify-between text-left"
            >
              <span className="text-sm sm:text-base font-medium text-gray-700">
                {selectedTrackers.length === 0 
                  ? 'Choose trackers to compare' 
                  : `${selectedTrackers.length} tracker${selectedTrackers.length !== 1 ? 's' : ''} selected`
                }
              </span>
              {showTrackerSelector ? (
                <ChevronUp size={20} className="text-gray-500" />
              ) : (
                <ChevronDown size={20} className="text-gray-500" />
              )}
            </button>

            {showTrackerSelector && (
              <div className="mt-3 max-h-64 sm:max-h-80 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 space-y-2 bg-white">
                {trackers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No trackers available</p>
                ) : (
                  trackers.map(tracker => {
                    const isSelected = selectedTrackerIds.includes(tracker.id);
                    const theme = getTrackerTheme(tracker.name);
                    const Icon = theme.icon;
                    return (
                      <button
                        key={tracker.id}
                        onClick={() => handleTrackerToggle(tracker.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 shadow-sm'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`${theme.iconBg} ${theme.iconColor} rounded-lg p-2 flex-shrink-0`}>
                          <Icon size={18} className={theme.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm sm:text-base font-medium ${
                              isSelected ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {tracker.name}
                            </span>
                            {isSelected && (
                              <Check size={16} className="text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          {tracker.description && (
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                              {tracker.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date Range - Mobile Optimized */}
        <div>
          <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-3">
            Date Range
          </label>
          
          {/* Date Range Display */}
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              <span className="text-sm sm:text-base font-medium text-gray-700">
                {formatDateRange(dateRange.start, dateRange.end)}
              </span>
            </div>
            {showDatePicker ? (
              <ChevronUp size={20} className="text-gray-500" />
            ) : (
              <ChevronDown size={20} className="text-gray-500" />
            )}
          </button>

          {showDatePicker && (
            <div className="mt-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                />
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateInsights}
          disabled={loading || selectedTrackerIds.length < 2}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold text-base sm:text-lg shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <TrendingUp size={20} />
              <span>Generate Insights</span>
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 flex-1">{error}</p>
          </div>
        )}

        {/* Insights Display */}
        {summary && (
          <div className="mt-6 space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-t-2 border-gray-200 pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
                  <Sparkles size={20} className="text-blue-600" />
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-gray-900">
                  Insights ({summary.insights.length})
                </h4>
              </div>
              
              {summary.insights.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
                  <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-sm sm:text-base text-gray-600 font-medium mb-2">
                    No insights generated for this period.
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Try selecting different trackers or a different date range.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {summary.insights.map(insight => (
                    <InsightCard key={insight.id} insight={insight} summary={summary} />
                  ))}
                </div>
              )}
            </div>

            {/* Context Events */}
            {summary.contextEvents.length > 0 && (
              <div className="border-t-2 border-gray-200 pt-6">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">
                  Context Events
                </h4>
                <div className="flex flex-wrap gap-2">
                  {summary.contextEvents.map(context => (
                    <span
                      key={context.id}
                      className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 text-blue-700 rounded-lg text-xs sm:text-sm font-medium"
                    >
                      {context.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
