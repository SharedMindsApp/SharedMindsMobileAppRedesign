import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, BookOpen, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FeatureWithUnlockStatus } from '../../lib/featureTypes';
import { FeatureCard } from './FeatureCard';
import { FeatureUnlockModal } from './FeatureUnlockModal';
import { UnlockCelebration } from './UnlockCelebration';

interface LockedFeaturesJourneyProps {
  memberId: string | null;
  reducedMotion?: boolean;
}

export function LockedFeaturesJourney({
  memberId,
  reducedMotion = false
}: LockedFeaturesJourneyProps) {
  const [features, setFeatures] = useState<FeatureWithUnlockStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureWithUnlockStatus | null>(null);
  const [celebrationFeature, setCelebrationFeature] = useState<FeatureWithUnlockStatus | null>(null);
  const [newlyUnlockedFeatures, setNewlyUnlockedFeatures] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    if (memberId) {
      loadFeatures();
    }
  }, [memberId]);

  const loadFeatures = async () => {
    if (!memberId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: featuresData, error: featuresError } = await supabase
        .from('app_features')
        .select('*')
        .order('order_index', { ascending: true });

      if (featuresError) throw featuresError;

      const { data: unlocksData, error: unlocksError } = await supabase
        .from('member_feature_unlocks')
        .select('*')
        .eq('member_id', memberId);

      if (unlocksError) throw unlocksError;

      const unlockMap = new Map(unlocksData?.map(u => [u.feature_id, u.unlocked_at]) || []);

      const previouslyUnlocked = new Set(
        features.filter(f => f.isUnlocked).map(f => f.id)
      );

      const featuresWithStatus: FeatureWithUnlockStatus[] = (featuresData || []).map(feature => ({
        ...feature,
        isUnlocked: unlockMap.has(feature.id),
        unlockedAt: unlockMap.get(feature.id)
      }));

      const currentlyUnlocked = new Set(
        featuresWithStatus.filter(f => f.isUnlocked).map(f => f.id)
      );

      const newUnlocks = new Set<string>();
      currentlyUnlocked.forEach(id => {
        if (!previouslyUnlocked.has(id)) {
          newUnlocks.add(id);
        }
      });

      setNewlyUnlockedFeatures(newUnlocks);

      if (newUnlocks.size > 0 && featuresWithStatus.length > 0) {
        const firstNewUnlock = featuresWithStatus.find(f => newUnlocks.has(f.id));
        if (firstNewUnlock) {
          setTimeout(() => {
            setCelebrationFeature(firstNewUnlock);
          }, 500);
        }
      }

      setFeatures(featuresWithStatus);
    } catch (err) {
      console.error('Error loading features:', err);
      setError('Failed to load features. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureClick = (feature: FeatureWithUnlockStatus) => {
    if (feature.isUnlocked) {
      navigate(`/features/${feature.slug}`);
    } else {
      setSelectedFeature(feature);
    }
  };

  const handleStartUnlocking = () => {
    if (selectedFeature) {
      setSelectedFeature(null);
      navigate('/journey');
    }
  };

  const handleCloseCelebration = () => {
    setCelebrationFeature(null);
    setNewlyUnlockedFeatures(new Set());
  };

  const unlockedCount = features.filter(f => f.isUnlocked).length;
  const totalCount = features.length;

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg border-2 border-gray-200 p-8">
        <div className="text-center">
          <div className={`mb-4 inline-block ${!reducedMotion && 'animate-pulse'}`}>
            <Sparkles size={32} className="text-blue-500" />
          </div>
          <p className="text-gray-600 font-medium">Loading your features...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl shadow-lg border-2 border-red-200 p-8">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle size={24} />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-3xl shadow-lg border-2 border-amber-200/50 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-rose-200/30 to-pink-200/30 rounded-full blur-3xl translate-y-24 -translate-x-24"></div>

        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles size={24} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Your Insight Journey
                </h2>
              </div>
              <p className="text-gray-700 text-lg leading-relaxed max-w-2xl">
                Discover tools designed around the way your brain works.
              </p>
            </div>

            {totalCount > 0 && (
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
                  {unlockedCount}/{totalCount}
                </div>
                <div className="text-sm text-gray-600 font-medium">unlocked</div>
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-amber-200/50">
            <p className="text-gray-700 leading-relaxed text-center">
              A calm, guided experience that unlocks personalised features as you explore your questionnaire.
            </p>
          </div>

          <button
            onClick={() => navigate('/journey')}
            className={`
              w-full mb-6 bg-gradient-to-r from-blue-500 via-blue-600 to-teal-600
              hover:from-blue-600 hover:via-blue-700 hover:to-teal-700
              text-white font-bold py-4 px-6 rounded-xl shadow-lg
              flex items-center justify-center gap-3
              hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
              ${!reducedMotion && 'transition-all duration-300'}
            `}
          >
            <BookOpen size={24} />
            <span>View All Questionnaire Modules</span>
            <ArrowRight size={20} />
          </button>

          <div className="space-y-4">
            {features.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onClick={() => handleFeatureClick(feature)}
                showUnlockAnimation={newlyUnlockedFeatures.has(feature.id)}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>

          {unlockedCount === 0 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 leading-relaxed">
                <span className="font-semibold">Start your journey</span> to unlock these amazing tools.
                <br />
                Each feature becomes more personal as you share more about yourself.
              </p>
            </div>
          )}

          {unlockedCount > 0 && unlockedCount < totalCount && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 leading-relaxed">
                <span className="font-semibold">You're nearly there!</span>
                <br />
                {totalCount - unlockedCount} more {totalCount - unlockedCount === 1 ? 'feature' : 'features'} waiting to be unlocked.
              </p>
            </div>
          )}

          {unlockedCount === totalCount && totalCount > 0 && (
            <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
              <div className="text-center">
                <p className="font-bold text-emerald-900 text-lg mb-1">
                  All features unlocked!
                </p>
                <p className="text-emerald-700 text-sm">
                  You now have access to your complete toolkit for neurodivergent thriving.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedFeature && (
        <FeatureUnlockModal
          feature={selectedFeature}
          onStartUnlocking={handleStartUnlocking}
          onClose={() => setSelectedFeature(null)}
          reducedMotion={reducedMotion}
        />
      )}

      {celebrationFeature && (
        <UnlockCelebration
          feature={celebrationFeature}
          onClose={handleCloseCelebration}
          reducedMotion={reducedMotion}
        />
      )}
    </>
  );
}
