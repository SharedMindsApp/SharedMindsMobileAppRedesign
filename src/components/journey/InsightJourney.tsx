import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { supabase, Member, Progress } from '../../lib/supabase';
import { JourneySection, JOURNEY_STAGES, JourneyStage } from '../../lib/journeyTypes';
import { StageCard } from './StageCard';
import { QuestionScreen } from '../QuestionScreen';
import { MiniCelebration } from './MiniCelebration';
import { InsightSummaryRevealCard, InsightSummary as InsightSummaryType } from './InsightSummaryRevealCard';
import { generateInsightSummary, saveInsightToProfile } from '../../lib/insightSummaries';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { COLOR_THEMES } from '../../lib/uiPreferencesTypes';

export function InsightJourney() {
  const { config } = useUIPreferences();
  const [sections, setSections] = useState<JourneySection[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [progressData, setProgressData] = useState<Progress[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showMiniCelebration, setShowMiniCelebration] = useState(false);
  const [insightData, setInsightData] = useState<{
    insight: InsightSummaryType;
    sectionTitle: string;
  } | null>(null);

  const theme = COLOR_THEMES[config.colorTheme];
  const transitionClass = config.reducedMotion ? '' : 'transition-all duration-300';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Please sign in to view your journey.');
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // V1: Legacy 'members' table no longer exists. Use user id as member id.
      const memberData = { id: user.id, household_id: null };
      setCurrentMemberId(user.id);
      setMembers([]);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .order('stage_order', { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      const { data: progressDataList, error: progressError } = await supabase
        .from('progress')
        .select('*')
        .in('member_id', householdMembers?.map((m) => m.id) || []);

      if (progressError) throw progressError;
      setProgressData(progressDataList || []);
    } catch (err) {
      console.error('Error loading journey:', err);
      setError('Failed to load your journey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);

    if (section && section.title === 'You, As an Individual') {
      window.location.href = '/journey/individual-profile';
      return;
    }

    setActiveSection(sectionId);
  };

  const handleCloseSection = async () => {
    const section = sections.find((s) => s.id === activeSection);
    const progress = progressData.find(
      (p) => p.section_id === activeSection && p.member_id === currentMemberId
    );

    setActiveSection(null);

    if (section && progress?.completed && currentMemberId) {
      const insight = await generateInsightSummary(
        currentMemberId,
        section.id,
        section.title
      );

      if (insight) {
        setShowMiniCelebration(true);
        setInsightData({
          insight: {
            id: insight.id,
            title: insight.title,
            coreInsight: insight.coreInsight,
            brainTip: insight.brainTip,
            featureTeaser: insight.featureTeaser,
            savedToProfile: insight.savedToProfile,
          },
          sectionTitle: section.title,
        });
      }
    }

    await loadData();
  };

  const handleMiniCelebrationComplete = () => {
    setShowMiniCelebration(false);
  };

  const handleSaveToProfile = async () => {
    if (!insightData) return;

    const success = await saveInsightToProfile(insightData.insight.id);
    if (success && insightData.insight) {
      setInsightData({
        ...insightData,
        insight: {
          ...insightData.insight,
          savedToProfile: true,
        },
      });
    }
  };

  const handleContinueFromInsight = () => {
    setInsightData(null);
  };

  const groupSectionsByStage = (): JourneyStage[] => {
    const stages: JourneyStage[] = [];

    Object.entries(JOURNEY_STAGES).forEach(([key, stageInfo]) => {
      const stageSections = sections.filter((s) => s.stage === key);
      if (stageSections.length > 0) {
        stages.push({
          ...stageInfo,
          sections: stageSections.sort((a, b) => a.stage_order - b.stage_order),
        });
      }
    });

    return stages.sort((a, b) => a.order - b.order);
  };

  const getProgressBySection = (): Record<string, Progress | null> => {
    const map: Record<string, Progress | null> = {};
    sections.forEach((section) => {
      const progress = progressData.find(
        (p) => p.section_id === section.id && p.member_id === currentMemberId
      );
      map[section.id] = progress || null;
    });
    return map;
  };

  const isStageUnlocked = (stageIndex: number): boolean => {
    if (stageIndex === 0) return true;

    const stages = groupSectionsByStage();
    const previousStage = stages[stageIndex - 1];
    if (!previousStage) return true;

    const completedInPreviousStage = previousStage.sections.filter((section) => {
      const progress = progressData.find(
        (p) => p.section_id === section.id && p.member_id === currentMemberId
      );
      return progress?.completed || false;
    }).length;

    return completedInPreviousStage === previousStage.sections.length;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`mb-4 inline-block ${config.reducedMotion ? '' : 'animate-pulse'}`}>
            <Sparkles size={48} className="text-blue-500" />
          </div>
          <p className="text-gray-600 font-medium">Loading your journey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-4`}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-red-500" size={32} />
            <h2 className="text-lg font-semibold text-gray-900">Error</h2>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (activeSection) {
    return <QuestionScreen sectionId={activeSection} onClose={handleCloseSection} />;
  }

  const stages = groupSectionsByStage();
  const progressBySection = getProgressBySection();
  const totalSections = sections.length;
  const completedSections = Object.values(progressBySection).filter((p) => p?.completed).length;
  const overallProgress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  return (
    <>
      <div className={`min-h-screen ${theme.bg} ${transitionClass} py-8 px-4 sm:px-6 lg:px-8`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Your Insight Journey</h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
              A guided path to understanding yourself, your patterns, and your relationships. Take it at your own pace.
            </p>
          </div>

          <div className={`${theme.cardBg} rounded-2xl shadow-lg border border-gray-200 p-6 mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Overall Progress</h2>
                  <p className="text-sm text-gray-600">You're making great progress</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{overallProgress}%</div>
                <div className="text-xs text-gray-500">
                  {completedSections} of {totalSections} modules
                </div>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full ${transitionClass}`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>

            {overallProgress === 100 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Journey Complete!</p>
                    <p className="text-sm text-green-700">
                      You've unlocked a deep understanding of yourself
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {stages.map((stage, index) => (
              <StageCard
                key={stage.id}
                stage={stage}
                progressBySection={progressBySection}
                members={members}
                currentMemberId={currentMemberId || ''}
                onStartSection={handleStartSection}
                isLocked={!isStageUnlocked(index)}
                previousStageComplete={isStageUnlocked(index)}
              />
            ))}
          </div>

          <div className={`mt-8 ${theme.cardBg} rounded-xl border border-gray-200 p-6 text-center`}>
            <p className="text-sm text-gray-600 leading-relaxed">
              <span className="font-medium">Remember:</span> There's no rush. This journey is about understanding, not completion. Take breaks when you need them.
            </p>
          </div>
        </div>
      </div>

      {showMiniCelebration && (
        <MiniCelebration
          onComplete={handleMiniCelebrationComplete}
          reducedMotion={config.reducedMotion}
        />
      )}

      {!showMiniCelebration && insightData && (
        <InsightSummaryRevealCard
          insight={insightData.insight}
          sectionTitle={insightData.sectionTitle}
          onSaveToProfile={handleSaveToProfile}
          onContinue={handleContinueFromInsight}
          reducedMotion={config.reducedMotion}
        />
      )}
    </>
  );
}
