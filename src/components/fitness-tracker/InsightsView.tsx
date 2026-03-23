/**
 * Insights View Component
 * 
 * Displays domain-aware and level-appropriate insights.
 */

import { useState, useEffect, useRef } from 'react';
import { Lightbulb, TrendingUp, Activity, Loader2, Info } from 'lucide-react';
import { InsightGenerationService } from '../../lib/fitnessTracker/insightGenerationService';
import type { UserMovementProfile, Insight } from '../../lib/fitnessTracker/types';

type InsightsViewProps = {
  profile: UserMovementProfile;
  activityDomain?: string; // Filter insights for specific activity
};

export function InsightsView({ profile, activityDomain }: InsightsViewProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const idleHandleRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const insightService = new InsightGenerationService();

  useEffect(() => {
    scheduleLoadInsights(false);

    // Refresh insights when new session is created
    const handleSessionCreated = () => {
      scheduleLoadInsights(true);
    };

    window.addEventListener('fitness-session-created', handleSessionCreated);
    
    const handleProfileReconfigured = () => {
      scheduleLoadInsights(true);
    };
    
    window.addEventListener('fitness-profile-reconfigured', handleProfileReconfigured);
    
    return () => {
      window.removeEventListener('fitness-session-created', handleSessionCreated);
      window.removeEventListener('fitness-profile-reconfigured', handleProfileReconfigured);
      clearPendingWork();
    };
  }, [profile]);

  const scheduleLoadInsights = (forceRefresh: boolean) => {
    clearPendingWork();

    const run = () => {
      loadInsights(forceRefresh);
    };

    const requestIdleCallback = (window as any).requestIdleCallback as
      | ((cb: IdleRequestCallback, opts?: { timeout: number }) => number)
      | undefined;

    if (requestIdleCallback) {
      idleHandleRef.current = requestIdleCallback(run, { timeout: 800 });
    } else {
      timeoutRef.current = window.setTimeout(run, 0);
    }
  };

  const clearPendingWork = () => {
    const cancelIdleCallback = (window as any).cancelIdleCallback as
      | ((handle: number) => void)
      | undefined;

    if (idleHandleRef.current && cancelIdleCallback) {
      cancelIdleCallback(idleHandleRef.current);
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    idleHandleRef.current = null;
    timeoutRef.current = null;
  };

  const loadInsights = async (forceRefresh: boolean) => {
    if (!profile.userId || !profile.trackerStructure) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const generatedInsights = await insightService.generateInsights(
        profile.userId,
        profile,
        { days: 56 }, // 8 weeks
        { forceRefresh }
      );

      setInsights(generatedInsights);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Generating insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Not enough data for insights yet</p>
        <p className="text-xs mt-1">Log more sessions to see personalized insights</p>
      </div>
    );
  }

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'frequency':
      case 'consistency':
        return TrendingUp;
      case 'intensity':
      case 'recovery':
        return Activity;
      default:
        return Info;
    }
  };

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'sustainability':
      case 'consistency':
        return 'text-green-600 bg-green-50';
      case 'frequency':
        return 'text-blue-600 bg-blue-50';
      case 'intensity':
      case 'balance':
        return 'text-purple-600 bg-purple-50';
      case 'recovery':
        return 'text-orange-600 bg-orange-50';
      case 'cross_domain':
        return 'text-indigo-600 bg-indigo-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Filter insights by activity domain if specified
  const filteredInsights = activityDomain
    ? insights.filter(insight => insight.domain === activityDomain)
    : insights;

  if (filteredInsights.length === 0 && insights.length > 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">No insights yet for this activity</p>
        <p className="text-xs mt-1">Keep logging sessions to see patterns</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredInsights.slice(0, 3).map(insight => {
        const Icon = getInsightIcon(insight.type);
        const colorClass = getInsightColor(insight.type);

        return (
          <div
            key={insight.id}
            className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-md ${colorClass} flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{insight.title}</h3>
                <p className="text-xs text-gray-700 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
