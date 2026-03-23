/**
 * Pattern View Component
 * 
 * Displays domain-aware movement patterns and visualizations.
 */

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BarChart3, Activity, Loader2, TrendingUp, Clock } from 'lucide-react';
import { DomainAwarePatternService } from '../../lib/fitnessTracker/domainAwarePatternService';
import type { UserMovementProfile, DomainAwareMovementPattern } from '../../lib/fitnessTracker/types';
const SessionBalanceChart = lazy(() =>
  import('./patterns/SessionBalanceChart').then(module => ({ default: module.SessionBalanceChart }))
);
const IntensityClusteringChart = lazy(() =>
  import('./patterns/IntensityClusteringChart').then(module => ({ default: module.IntensityClusteringChart }))
);
const TrainingVsCompetitionChart = lazy(() =>
  import('./patterns/TrainingVsCompetitionChart').then(module => ({ default: module.TrainingVsCompetitionChart }))
);
const FrequencyPatternChart = lazy(() =>
  import('./patterns/FrequencyPatternChart').then(module => ({ default: module.FrequencyPatternChart }))
);
const SustainabilityIndicator = lazy(() =>
  import('./patterns/SustainabilityIndicator').then(module => ({ default: module.SustainabilityIndicator }))
);

type PatternViewProps = {
  profile: UserMovementProfile;
  activityDomain?: string; // Filter patterns for specific activity
};

export function PatternView({ profile, activityDomain }: PatternViewProps) {
  const [patterns, setPatterns] = useState<DomainAwareMovementPattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const idleHandleRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const patternService = new DomainAwarePatternService();

  useEffect(() => {
    scheduleLoadPatterns(false);
    
    // Refresh patterns when new session is created
    const handleSessionCreated = () => {
      scheduleLoadPatterns(true);
    };
    
    window.addEventListener('fitness-session-created', handleSessionCreated);
    
    const handleProfileReconfigured = () => {
      scheduleLoadPatterns(true);
    };
    
    window.addEventListener('fitness-profile-reconfigured', handleProfileReconfigured);
    
    return () => {
      window.removeEventListener('fitness-session-created', handleSessionCreated);
      window.removeEventListener('fitness-profile-reconfigured', handleProfileReconfigured);
      clearPendingWork();
    };
  }, [profile]);

  const scheduleLoadPatterns = (forceRefresh: boolean) => {
    clearPendingWork();

    const run = () => {
      loadPatterns(forceRefresh);
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

  const loadPatterns = async (forceRefresh: boolean) => {
    if (!profile.userId || !profile.trackerStructure) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const patternData = await patternService.analyzePatterns(
        profile.userId,
        profile.trackerStructure,
        { days: 56 }, // 8 weeks
        { forceRefresh }
      );

      setPatterns(patternData);
    } catch (err) {
      console.error('Failed to load patterns:', err);
      setError(err instanceof Error ? err.message : 'Failed to load patterns');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Analyzing patterns...</p>
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

  if (!patterns || patterns.overall.totalSessions === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Not enough data for pattern analysis</p>
        <p className="text-xs mt-1">Log more sessions to see patterns</p>
      </div>
    );
  }

  const categories = profile.trackerStructure?.categories || [];
  
  // Filter categories if activityDomain is specified
  const relevantCategories = activityDomain 
    ? categories.filter(c => c.domain === activityDomain)
    : categories;
  
  // Get patterns for the filtered category
  const relevantPatterns = activityDomain 
    ? patterns.domainPatterns[activityDomain]
    : null;

  // Language-first pattern descriptions (text-based, not chart-heavy)
  const getPatternDescription = (domainPattern: any, category: any) => {
    const descriptions: string[] = [];
    
    if (domainPattern.frequencyPattern) {
      const freq = domainPattern.frequencyPattern;
      if (freq.sessionsPerWeek > 0) {
        descriptions.push(
          `You train ${category.name.toLowerCase()} ${freq.sessionsPerWeek.toFixed(1)} times per week on average.`
        );
        if (freq.consistency > 0.7) {
          descriptions.push(`Your schedule is very consistent.`);
        } else if (freq.consistency > 0.4) {
          descriptions.push(`Your schedule varies somewhat.`);
        }
      }
    }
    
    if (domainPattern.sessionBalance) {
      const balance = domainPattern.sessionBalance;
      if (balance.imbalance > 0.3) {
        const dominant = balance.dominantType || 'some types';
        descriptions.push(`You tend to focus more on ${dominant.toLowerCase()}.`);
      } else {
        descriptions.push(`Your training is well-balanced across different types.`);
      }
    }
    
    if (domainPattern.intensityClustering) {
      const intensity = domainPattern.intensityClustering;
      if (intensity.avgIntensity > 4) {
        descriptions.push(`Your sessions are typically high intensity.`);
      } else if (intensity.avgIntensity < 2.5) {
        descriptions.push(`Your sessions tend to be lower intensity, focused on recovery.`);
      }
    }
    
    return descriptions.length > 0 ? descriptions.join(' ') : null;
  };

  return (
    <div className="space-y-4">
      {/* Language-First Pattern Descriptions */}
      {activityDomain && relevantPatterns && (
        <div className="space-y-3">
          {getPatternDescription(relevantPatterns, relevantCategories[0]) && (
            <div className="text-sm text-gray-700 leading-relaxed p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p>{getPatternDescription(relevantPatterns, relevantCategories[0])}</p>
            </div>
          )}
        </div>
      )}

      {/* Overall Stats (compact - only show if no activity filter) */}
      {!activityDomain && patterns && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-600 mb-1">Total Sessions</p>
            <p className="text-lg font-bold text-gray-900">{patterns.overall.totalSessions}</p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-600 mb-1">Per Week</p>
            <p className="text-lg font-bold text-gray-900">
              {patterns.overall.frequency.sessionsPerWeek.toFixed(1)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-600 mb-1">Sustainability</p>
            <Suspense fallback={<div className="text-xs text-gray-400">...</div>}>
              <SustainabilityIndicator score={patterns.overall.sustainabilityScore} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Domain-specific Patterns (charts - only show if no activity filter) */}
      {!activityDomain && categories.map(category => {
        const domainPattern = patterns.domainPatterns[category.id];
        if (!domainPattern) return null;

        return (
          <div key={category.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{category.name} Patterns</h3>
            
            <div className="space-y-4">
              {/* Session Balance (Gym) */}
              {domainPattern.sessionBalance && (
                <Suspense fallback={<ChartFallback label="Loading chart..." />}>
                  <SessionBalanceChart data={domainPattern.sessionBalance} />
                </Suspense>
              )}

              {/* Intensity Clustering (Gym) */}
              {domainPattern.intensityClustering && (
                <Suspense fallback={<ChartFallback label="Loading chart..." />}>
                  <IntensityClusteringChart data={domainPattern.intensityClustering} />
                </Suspense>
              )}

              {/* Training vs Competition (Sport) */}
              {domainPattern.trainingVsCompetition && (
                <Suspense fallback={<ChartFallback label="Loading chart..." />}>
                  <TrainingVsCompetitionChart data={domainPattern.trainingVsCompetition} />
                </Suspense>
              )}

              {/* Frequency Pattern */}
              {domainPattern.frequencyPattern && (
                <Suspense fallback={<ChartFallback label="Loading chart..." />}>
                  <FrequencyPatternChart data={domainPattern.frequencyPattern} />
                </Suspense>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChartFallback({ label }: { label: string }) {
  return (
    <div className="text-sm text-gray-500 py-2">{label}</div>
  );
}
