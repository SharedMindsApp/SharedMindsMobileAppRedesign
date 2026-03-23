/**
 * Insight Card Component
 * 
 * Mobile-optimized card for displaying cross-tracker insights.
 */

import { Calendar, ExternalLink, TrendingUp, TrendingDown, Activity, AlertCircle, Sparkles } from 'lucide-react';
import type { Insight, CrossTrackerSummary } from '../../lib/trackerStudio/trackerInterpretationTypes';
import { useNavigate } from 'react-router-dom';

interface InsightCardProps {
  insight: Insight;
  summary: CrossTrackerSummary;
}

export function InsightCard({ insight, summary }: InsightCardProps) {
  const navigate = useNavigate();

  const getInsightConfig = () => {
    switch (insight.type) {
      case 'temporal_alignment':
        return {
          icon: Calendar,
          gradient: 'from-blue-500 to-cyan-500',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          text: 'text-blue-900',
        };
      case 'directional_shift':
        return {
          icon: TrendingUp,
          gradient: 'from-green-500 to-emerald-500',
          bg: 'bg-green-50',
          border: 'border-green-200',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          text: 'text-green-900',
        };
      case 'volatility':
        return {
          icon: Activity,
          gradient: 'from-yellow-500 to-amber-500',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          text: 'text-yellow-900',
        };
      case 'context_comparison':
        return {
          icon: Sparkles,
          gradient: 'from-purple-500 to-pink-500',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
          text: 'text-purple-900',
        };
      case 'missing_data':
        return {
          icon: AlertCircle,
          gradient: 'from-gray-500 to-slate-500',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          text: 'text-gray-900',
        };
      default:
        return {
          icon: Calendar,
          gradient: 'from-gray-500 to-slate-500',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          text: 'text-gray-900',
        };
    }
  };

  const config = getInsightConfig();
  const Icon = config.icon;

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // If same month, show: "Jan 5 - 12"
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return `${startStr} - ${endDate.getDate()}`;
    }
    return `${startStr} - ${endStr}`;
  };

  const handleViewData = () => {
    if (insight.relatedTrackers.length > 0) {
      navigate(`/tracker-studio/tracker/${insight.relatedTrackers[0]}`);
    }
  };

  // Get tracker names for display
  const trackerNames = insight.relatedTrackers
    .map(id => summary.trackers.find(t => t.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <div className={`${config.bg} ${config.border} border-2 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`${config.iconBg} ${config.iconColor} rounded-lg p-2.5 flex-shrink-0`}>
          <Icon size={18} className={config.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className={`font-bold ${config.text} text-base sm:text-lg mb-1 line-clamp-2`}>
            {insight.title}
          </h5>
          {trackerNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {trackerNames.map((name, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 bg-white/60 rounded-md text-xs font-medium text-gray-700"
                >
                  {name}
                </span>
              ))}
              {insight.relatedTrackers.length > trackerNames.length && (
                <span className="text-xs text-gray-500">
                  +{insight.relatedTrackers.length - trackerNames.length} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className={`text-sm sm:text-base ${config.text} mb-4 leading-relaxed`}>
        {insight.description}
      </p>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t-2 border-white/50">
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} className="text-gray-400" />
            {formatDateRange(insight.timeRange.start, insight.timeRange.end)}
          </span>
          {insight.contextLabels.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">
                {insight.contextLabels.slice(0, 2).join(', ')}
                {insight.contextLabels.length > 2 && ` +${insight.contextLabels.length - 2}`}
              </span>
            </span>
          )}
        </div>
        
        {insight.relatedTrackers.length > 0 && (
          <button
            onClick={handleViewData}
            className={`inline-flex items-center gap-2 px-4 py-2 ${config.iconBg} ${config.iconColor} rounded-lg hover:opacity-80 transition-all text-sm font-semibold self-start sm:self-auto`}
          >
            <ExternalLink size={14} />
            <span>View Data</span>
          </button>
        )}
      </div>
    </div>
  );
}
