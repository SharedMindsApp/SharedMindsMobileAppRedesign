/**
 * Activity Space Page
 * 
 * Dedicated space for a specific movement domain (e.g., Gym, Running, Tennis).
 * Each activity has its own visual space with activity-specific quick log buttons,
 * recent sessions, and patterns.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Loader2, AlertCircle, Settings } from 'lucide-react';
import { triggerHaptic } from '../../lib/fitnessTracker/motionUtils';
import { SkeletonLoader } from './SkeletonLoader';
import { DiscoveryService } from '../../lib/fitnessTracker/discoveryService';
import { MovementSessionService } from '../../lib/fitnessTracker/movementSessionService';
import type { UserMovementProfile, MovementDomain, QuickLogButton, MovementSession } from '../../lib/fitnessTracker/types';
import { getActivityMetadata } from '../../lib/fitnessTracker/activityMetadata';
import { getIconComponent } from '../../lib/fitnessTracker/iconUtils';
import { DynamicQuickLog } from './DynamicQuickLog';
import { SessionListView } from './SessionListView';
import { PatternView } from './PatternView';
import { InsightsView } from './InsightsView';
import { SessionsCalendar } from './ScheduledSessionsCalendar';
import { ActivityCustomizationModal } from './ActivityCustomizationModal';

export function ActivitySpacePage() {
  const navigate = useNavigate();
  const { activityId } = useParams<{ activityId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserMovementProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);

  const discoveryService = new DiscoveryService();
  const sessionService = new MovementSessionService();

  // Helper function - must be defined before use
  const isValidDomain = (id: string): id is MovementDomain => {
    return ['gym', 'running', 'cycling', 'swimming', 'team_sports', 'individual_sports', 'martial_arts', 'yoga', 'rehab', 'other'].includes(id);
  };

  // Resolve domain from activityId (could be a domain or a category ID like 'team_sport_football_soccer')
  const resolvedDomain = useMemo(() => {
    if (!activityId) return null;
    
    // Check if it's a direct domain
    if (isValidDomain(activityId)) {
      return activityId;
    }
    
    // Check if it's a sport category ID
    if (activityId.startsWith('team_sport_') || activityId.startsWith('individual_sport_')) {
      // Extract domain from category ID pattern
      if (activityId.startsWith('team_sport_')) return 'team_sports';
      if (activityId.startsWith('individual_sport_')) return 'individual_sports';
    }
    
    // Check if it matches a category ID in tracker structure
    const category = profile?.trackerStructure?.categories?.find(c => c.id === activityId);
    if (category) {
      return category.domain;
    }
    
    return null;
  }, [activityId, profile]);

  // Define domain and metadata BEFORE early returns (for useMemo dependencies)
  const domain = resolvedDomain;
  // For martial arts, get disciplines from profile to customize metadata
  const martialArtsDisciplines = domain === 'martial_arts' && profile?.domainDetails?.martial_arts?.disciplines
    ? profile.domainDetails.martial_arts.disciplines
    : undefined;
  const metadata = domain ? getActivityMetadata(domain, martialArtsDisciplines) : null;
  
  // Filter quick log buttons for this activity - MUST be called before early returns
  // Also filter out hidden buttons based on customization
  const activityQuickLogButtons = useMemo(() => {
    if (!profile || !domain) return [];
    const allButtons = profile.uiConfiguration?.quickLogButtons || [];
    const customization = profile.uiConfiguration?.activityCustomizations?.[domain];
    const hiddenButtons = new Set(customization?.hiddenQuickLogButtons || []);
    
    return allButtons.filter(btn => 
      btn.category === domain && !hiddenButtons.has(btn.id)
    );
  }, [profile?.uiConfiguration?.quickLogButtons, profile?.uiConfiguration?.activityCustomizations, domain]);

  // Get activity category from tracker structure (match by category ID if provided, otherwise by domain)
  const activityCategory = activityId 
    ? profile?.trackerStructure?.categories?.find(cat => cat.id === activityId)
    : profile?.trackerStructure?.categories?.find(cat => cat.domain === domain);
  const categoryId = activityCategory?.id || domain || '';

  useEffect(() => {
    if (activityId && isValidDomain(activityId)) {
      loadProfile();
    } else {
      setError('Invalid activity');
      setLoading(false);
    }
  }, [activityId, user]);

  const loadProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userProfile = await discoveryService.getProfile(user.id);

      if (!userProfile || !userProfile.discoveryCompleted) {
        navigate('/fitness-tracker/discovery');
        return;
      }

      if (activityId && !userProfile.primaryDomains?.includes(activityId as MovementDomain)) {
        setError('Activity not found in your profile');
        setLoading(false);
        return;
      }

      setProfile(userProfile);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity space');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <SkeletonLoader variant="text" width={300} height={40} className="mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <SkeletonLoader variant="card" className="h-64" />
            </div>
            <div className="space-y-4">
              <SkeletonLoader variant="card" className="h-48" />
            </div>
          </div>
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
            onClick={() => navigate('/fitness-tracker')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Activities
          </button>
        </div>
      </div>
    );
  }

  if (!profile || !activityId || !domain || !metadata) {
    return null;
  }

  const Icon = getIconComponent(metadata.icon);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {/* Compact Activity Header */}
      <div className={`relative bg-gradient-to-br ${metadata.gradient} text-white w-full py-5 sm:py-6 px-4 sm:px-6 lg:px-8 overflow-hidden`}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        
        <div className="relative max-w-6xl mx-auto">
          <button
            onClick={() => {
              triggerHaptic('light');
              navigate('/fitness-tracker');
            }}
            className="flex items-center gap-1.5 text-white/90 hover:text-white text-xs font-semibold transition-all duration-200 mb-4 hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={14} />
            Back to Activities
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-white/20">
                <Icon size={24} className="text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold mb-0.5 tracking-tight">{metadata.displayName}</h1>
                {metadata.description && (
                  <p className="text-xs text-white/85 line-clamp-1">{metadata.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                setShowCustomization(true);
              }}
              className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-110 active:scale-95"
              title="Customize Activity"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 -mt-4">
        {/* Compact Quick Log Section */}
        {activityQuickLogButtons.length > 0 && (
          <div className="mb-6 animate-slide-up">
            <h2 className="text-base font-bold text-gray-900 mb-3 tracking-tight">Quick Log</h2>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-xl p-4">
              <DynamicQuickLog buttons={activityQuickLogButtons} profile={profile} />
            </div>
          </div>
        )}

        {/* Compact Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Recent Sessions - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-5">
            <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <h2 className="text-base font-bold text-gray-900 mb-3 tracking-tight">Recent Sessions</h2>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-xl p-4">
                <SessionListView profile={profile} selectedCategory={categoryId} />
              </div>
            </div>
            
            {/* Scheduled Sessions Calendar */}
            <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
              <h2 className="text-base font-bold text-gray-900 mb-3 tracking-tight">Scheduled Sessions</h2>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-xl p-4">
                <SessionsCalendar profile={profile} activityDomain={domain} />
              </div>
            </div>
          </div>

          {/* Insights & Patterns - Compact Sidebar */}
          <div className="space-y-5">
            {/* Insights */}
            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <h2 className="text-base font-bold text-gray-900 mb-3 tracking-tight">Insights</h2>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-xl p-4">
                <InsightsView profile={profile} activityDomain={domain} />
              </div>
            </div>

            {/* Patterns */}
            <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
              <h2 className="text-base font-bold text-gray-900 mb-3 tracking-tight">Patterns</h2>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/60 shadow-xl p-4">
                <PatternView profile={profile} activityDomain={domain} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Customization Modal */}
      {showCustomization && profile && domain && (
        <ActivityCustomizationModal
          isOpen={showCustomization}
          onClose={() => setShowCustomization(false)}
          profile={profile}
          activityDomain={domain}
          onSaved={(updatedProfile) => {
            setProfile(updatedProfile);
            setShowCustomization(false);
          }}
        />
      )}
    </div>
  );
}
