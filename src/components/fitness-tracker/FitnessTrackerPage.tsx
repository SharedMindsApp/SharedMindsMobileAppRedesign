/**
 * Fitness Tracker Page
 * 
 * Main entry point for the Fitness Tracker.
 * Displays quick log buttons and session history.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, Loader2, AlertCircle, Settings, Edit3, Clock, Flame, Target, ArrowLeft, MoreVertical, TrendingUp } from 'lucide-react';
import { DiscoveryService } from '../../lib/fitnessTracker/discoveryService';
import { MovementSessionService } from '../../lib/fitnessTracker/movementSessionService';
import { CapabilityDetectionService } from '../../lib/fitnessTracker/capabilityDetectionService';
import type { UserMovementProfile, QuickLogButton, MovementSession, MovementDomain } from '../../lib/fitnessTracker/types';
import { DynamicQuickLog } from './DynamicQuickLog';
import { SessionListView } from './SessionListView';
import { PatternView } from './PatternView';
import { InsightsView } from './InsightsView';
import { ReconfigurationModal } from './ReconfigurationModal';

export function FitnessTrackerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserMovementProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReconfiguration, setShowReconfiguration] = useState(false);
  const [todaySessions, setTodaySessions] = useState<MovementSession[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Filter by category

  const discoveryService = new DiscoveryService();
  const sessionService = new MovementSessionService();
  const capabilityService = new CapabilityDetectionService();

  useEffect(() => {
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (profile && user) {
      checkCapabilityUnlocks();
      loadTodaySessions();
    }
  }, [profile, user]);

  const loadTodaySessions = async () => {
    if (!profile || !user) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      const allSessions: MovementSession[] = [];
      for (const category of profile.trackerStructure?.categories || []) {
        try {
          const domainSessions = await sessionService.listSessions(user.id, category.domain, {
            startDate: todayStr,
            endDate: todayStr,
            limit: 100,
          });
          allSessions.push(...domainSessions);
        } catch (error) {
          // Ignore errors for missing domains
        }
      }
      
      setTodaySessions(allSessions);
    } catch (error) {
      console.error('Failed to load today sessions:', error);
    }
  };

  // Calculate today's metrics
  const todayMetrics = useMemo(() => {
    const sessions = todaySessions;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    // Estimate calories: ~8-12 cal/min for moderate activity
    const estimatedCalories = Math.round(totalDuration * 10);
    const avgIntensity = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.perceivedIntensity || 3), 0) / sessions.length
      : 0;

    return {
      sessionsCount: sessions.length,
      totalDuration,
      estimatedCalories,
      avgIntensity: Math.round(avgIntensity * 10) / 10,
    };
  }, [todaySessions]);

  useEffect(() => {
    // Listen for reconfiguration events
    const handleReconfigured = () => {
      loadProfile(true);
    };
    
    window.addEventListener('fitness-profile-reconfigured', handleReconfigured);
    return () => {
      window.removeEventListener('fitness-profile-reconfigured', handleReconfigured);
    };
  }, [profile]);

  const loadProfile = async (forceRefresh?: boolean) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userProfile = await discoveryService.getProfile(user.id, { forceRefresh });

      if (!userProfile || !userProfile.discoveryCompleted) {
        // Redirect to discovery if not completed
        navigate('/fitness-tracker/discovery');
        return;
      }

      setProfile(userProfile);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fitness tracker');
    } finally {
      setLoading(false);
    }
  };

  const checkCapabilityUnlocks = async () => {
    if (!profile || !user) return;

    try {
      // Get all sessions for capability detection
      const allSessions: any[] = [];
      for (const category of profile.trackerStructure?.categories || []) {
        try {
          const domainSessions = await sessionService.listSessions(user.id, category.domain, {
            limit: 200,
          });
          allSessions.push(...domainSessions);
        } catch (error) {
          // Ignore errors for missing domains
        }
      }

      if (allSessions.length >= 10) {
        // Check for new unlocks
        const unlocks = await capabilityService.detectUnlocks(profile, allSessions);
        const currentUnlocks = profile.unlockedFeatures || [];
        const newUnlocks = unlocks.filter(
          u => u.activated && !currentUnlocks.includes(u.feature)
        );

        if (newUnlocks.length > 0) {
          // Update profile with new unlocks (silently, no announcement)
          await capabilityService.updateUnlocks(user.id, unlocks);
          
          // Reload profile to get updated unlocks
          const updatedProfile = await discoveryService.getProfile(user.id);
          if (updatedProfile) {
            setProfile(updatedProfile);
          }
        }
      }
    } catch (error) {
      // Silently fail - capability unlocking is background process
      console.error('Capability detection failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your fitness tracker...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const quickLogButtons = profile.uiConfiguration?.quickLogButtons || [];
  const categories = profile.trackerStructure?.categories || [];
  const allCategories = [{ id: 'all', name: 'All' }, ...categories];

  // Filter quick log buttons by selected category
  const filteredQuickLogButtons = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return quickLogButtons;
    return quickLogButtons.filter(btn => btn.category === selectedCategory);
  }, [quickLogButtons, selectedCategory]);

  return (
    <div className="w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -ml-4 sm:-ml-6 lg:-ml-8 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 min-h-screen">
      {/* Gradient Header - Full Width */}
      <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white w-full py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/tracker-studio/my-trackers')}
              className="flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Trackers
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReconfiguration(true)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                title="Update Profile"
              >
                <Edit3 size={18} />
              </button>
              <button
                onClick={() => navigate('/fitness-tracker/settings')}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <Activity size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">Fitness Tracker</h1>
              <p className="text-sm text-white/90">
                A personalized movement intelligence system tracking all your activities in one place
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 -mt-4 relative z-0">
        {/* Today's Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={16} className="text-blue-600" />
              <span className="text-xs text-gray-600 font-medium">Sessions</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{todayMetrics.sessionsCount}</div>
            <div className="text-xs text-gray-500">Today</div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-cyan-600" />
              <span className="text-xs text-gray-600 font-medium">Duration</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{todayMetrics.totalDuration}</div>
            <div className="text-xs text-gray-500">Minutes</div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} className="text-orange-600" />
              <span className="text-xs text-gray-600 font-medium">Calories</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{todayMetrics.estimatedCalories}</div>
            <div className="text-xs text-gray-500">Est. kcal</div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Target size={16} className="text-purple-600" />
              <span className="text-xs text-gray-600 font-medium">Intensity</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{todayMetrics.avgIntensity || '—'}</div>
            <div className="text-xs text-gray-500">Avg /5</div>
          </div>
        </div>

        {/* Category Filters */}
        {categories.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {allCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id || (!selectedCategory && cat.id === 'all')
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Quick Log Section - Compact */}
        {filteredQuickLogButtons.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Quick Log</h2>
            </div>
            <DynamicQuickLog buttons={filteredQuickLogButtons} profile={profile} />
          </div>
        )}

        {/* Two Column Layout: Recent Sessions + Insights/Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Sessions - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <SessionListView profile={profile} selectedCategory={selectedCategory} />
          </div>

          {/* Insights & Patterns - Sidebar */}
          <div className="space-y-4">
            {/* Insights - Compact */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Insights</h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <InsightsView profile={profile} />
              </div>
            </div>

            {/* Patterns - Compact */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Patterns</h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <PatternView profile={profile} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reconfiguration Modal */}
      {showReconfiguration && profile && (
        <ReconfigurationModal
          profile={profile}
          isOpen={showReconfiguration}
          onClose={() => setShowReconfiguration(false)}
          onReconfigured={(newProfile) => {
            setProfile(newProfile);
            setShowReconfiguration(false);
            // Trigger refresh for all components
            window.dispatchEvent(new CustomEvent('fitness-profile-reconfigured'));
          }}
        />
      )}
    </div>
  );
}
