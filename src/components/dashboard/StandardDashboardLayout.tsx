import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Home,
  LayoutGrid,
  Compass,
  Activity,
} from 'lucide-react';
import { Section, Member, Progress } from '../../lib/supabase';
import { Household } from '../../lib/household';
import { useNavigate } from 'react-router-dom';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { DENSITY_SPACING_MAP, FONT_SCALE_MAP, COLOR_THEMES } from '../../lib/uiPreferencesTypes';
import { BrainProfileWidget } from './BrainProfileWidget';
import { LockedFeaturesJourney } from '../features/LockedFeaturesJourney';
import { HouseholdMatchTriggerCard } from '../household/HouseholdMatchTriggerCard';
import { HouseholdInsightMatchViewer } from '../household/HouseholdInsightMatchViewer';
import { HouseholdMatchUnlockCelebration } from '../household/HouseholdMatchUnlockCelebration';
import { DailyAlignmentEntryCard } from '../regulation/DailyAlignmentEntryCard';
import { getDailyAlignmentEnabled } from '../../lib/regulation/dailyAlignmentService';
import { PersonalCalendarCard } from '../calendar/PersonalCalendarCard';
import { SharedCalendarCard } from '../calendar/SharedCalendarCard';
import {
  checkHouseholdMatchReady,
  generateHouseholdMatch,
  getHouseholdMatch,
  markMatchAsViewed,
  saveMatchToProfile,
  HouseholdInsightMatch,
} from '../../lib/householdInsightMatch';
import { isStandaloneApp } from '../../lib/appContext';
import { AppReferenceGuide } from '../reference/AppReferenceGuide';

interface StandardDashboardLayoutProps {
  sections: Section[];
  members: Member[];
  progressData: Progress[];
  household: Household | null;
  currentMember: Member | null;
  firstIncompleteSection: Section | null;
  reportAvailable: boolean;
  overallProgress: number;
  isPremium: boolean;
}

export function StandardDashboardLayout({
  sections,
  members,
  progressData,
  household,
  currentMember,
  firstIncompleteSection,
  reportAvailable,
  overallProgress,
  isPremium,
}: StandardDashboardLayoutProps) {
  const navigate = useNavigate();
  const { config } = useUIPreferences();
  const densityClass = DENSITY_SPACING_MAP[config.uiDensity];
  const fontScale = FONT_SCALE_MAP[config.fontScale];
  const theme = COLOR_THEMES[config.colorTheme];
  const lineHeight = config.fontScale === 'xl' ? 'leading-relaxed' : config.fontScale === 'l' ? 'leading-relaxed' : 'leading-normal';
  const transitionClass = config.reducedMotion ? '' : 'transition-all duration-300';

  const [householdMatch, setHouseholdMatch] = useState<HouseholdInsightMatch | null>(null);
  const [matchReady, setMatchReady] = useState(false);
  const [showMatchViewer, setShowMatchViewer] = useState(false);
  const [showUnlockCelebration, setShowUnlockCelebration] = useState(false);
  const [isCheckingMatch, setIsCheckingMatch] = useState(true);
  const [dailyAlignmentEnabled, setDailyAlignmentEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // FIXED: Restore app guide state from sessionStorage on load
  const [showReferenceGuide, setShowReferenceGuide] = useState(() => {
    // Check if guide was open before reload
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('app_guide_open') === 'true';
    }
    return false;
  });

  useEffect(() => {
    // Restore guide state on mount if it was open before reload
    if (typeof window !== 'undefined') {
      const wasOpen = sessionStorage.getItem('app_guide_open') === 'true';
      if (wasOpen) {
        setShowReferenceGuide(true);
      }
    }
  }, []);

  useEffect(() => {
    checkForHouseholdMatch();
  }, [household, members, progressData]);

  useEffect(() => {
    if (currentMember?.user_id) {
      loadDailyAlignmentEnabled();
    }
  }, [currentMember]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768 || isStandaloneApp());
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadDailyAlignmentEnabled = async () => {
    if (!currentMember?.user_id) return;
    const enabled = await getDailyAlignmentEnabled(currentMember.user_id);
    setDailyAlignmentEnabled(enabled);
  };

  const checkForHouseholdMatch = async () => {
    if (!household) return;

    setIsCheckingMatch(true);

    const isReady = await checkHouseholdMatchReady(household.id);
    setMatchReady(isReady);

    if (isReady) {
      const existingMatch = await getHouseholdMatch(household.id);

      if (existingMatch) {
        setHouseholdMatch(existingMatch);
        if (!existingMatch.viewed) {
          setShowUnlockCelebration(true);
          await markMatchAsViewed(existingMatch.id);
        }
      } else {
        const newMatch = await generateHouseholdMatch(household.id);
        if (newMatch) {
          setHouseholdMatch(newMatch);
          setShowUnlockCelebration(true);
        }
      }
    }

    setIsCheckingMatch(false);
  };

  const handleViewMatch = () => {
    setShowMatchViewer(true);
  };

  const handleCloseMatchViewer = () => {
    setShowMatchViewer(false);
  };

  const handleSaveMatchToProfile = async () => {
    if (!householdMatch) return;
    await saveMatchToProfile(householdMatch.id);
  };

  const handleUnlockCelebrationComplete = () => {
    setShowUnlockCelebration(false);
  };

  return (
    <div className={`${densityClass} ${lineHeight}`} style={{ fontSize: `${fontScale}rem` }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Welcome{currentMember ? `, ${currentMember.name}` : ''}
          </h1>
          <p className="text-sm text-gray-600">
            {household?.name ? `${household.name} · ` : ''}
            {members.length} member{members.length !== 1 ? 's' : ''} · {sections.length} sections
          </p>
        </div>
        <button
          onClick={() => setShowReferenceGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-md transition-colors"
          title="How Everything Fits Together"
        >
          <Compass size={14} className="text-gray-500" />
          <span>Guide</span>
        </button>
      </div>

      {household && (
        <div className="mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Home size={22} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 mb-0.5">
                      {household.name} Hub
                    </h2>
                    <p className="text-sm text-gray-600">
                      Your shared family space with calendar, goals, and more
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/planner')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <span>Open</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracker Studio Card */}
      <div className="mb-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity size={22} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 mb-0.5">
                    Tracker Studio
                  </h2>
                  <p className="text-sm text-gray-600">
                    Track anything you want - sleep, mood, habits, or custom metrics
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/tracker-studio')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <span>Open</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <PersonalCalendarCard />
        <SharedCalendarCard />
      </div>

      {dailyAlignmentEnabled && currentMember?.user_id && (
        <div className="mb-4">
          <DailyAlignmentEntryCard userId={currentMember.user_id} />
        </div>
      )}

      {/* Questionnaire Progress - Hidden on mobile */}
      {!isMobile && (
        <div className={`${theme.cardBg} rounded-lg shadow-sm border border-gray-200 p-5 mb-4`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Questionnaire Progress</h2>
              <p className="text-xs text-gray-600">Complete all sections</p>
            </div>
          </div>

          {firstIncompleteSection && (
            <div className="mb-4 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-gray-900 mb-0.5">Next Section:</p>
              <p className="text-xs text-blue-700">{firstIncompleteSection.title}</p>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-semibold text-gray-900">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full ${transitionClass}`}
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-600">Household Progress</span>
              <span className="text-xs text-gray-500">{members.length} members</span>
            </div>
            <div className="space-y-1">
              {members.map((member) => {
                const memberProgress = progressData.filter((p) => p.member_id === member.id);
                const completedCount = memberProgress.filter((p) => p.completed).length;
                const memberPercent =
                  sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

                return (
                  <div key={member.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-20 truncate">{member.name}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`bg-blue-400 h-1.5 rounded-full ${transitionClass}`}
                        style={{ width: `${memberPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 w-10 text-right">{memberPercent}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {firstIncompleteSection ? (
            <button
              onClick={() => navigate('/journey')}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2.5 px-4 rounded-lg ${transitionClass} flex items-center justify-center gap-2`}
            >
              Continue Questionnaire
              <ArrowRight size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2.5 rounded-lg text-sm">
              <CheckCircle2 size={16} />
              <span className="font-medium">All sections completed!</span>
            </div>
          )}
        </div>
      )}

      {matchReady && householdMatch && !showMatchViewer && (
        <HouseholdMatchTriggerCard
          onViewMatch={handleViewMatch}
          memberCount={householdMatch.memberIds.length}
          reducedMotion={config.reducedMotion}
        />
      )}

      {/* Your Insight Journey - Hidden on mobile */}
      {!isMobile && (
        <LockedFeaturesJourney
          memberId={currentMember?.id || null}
          reducedMotion={config.reducedMotion}
        />
      )}

      {/* My Brain Profile - Hidden on mobile */}
      {!isMobile && <BrainProfileWidget />}

      {showUnlockCelebration && (
        <HouseholdMatchUnlockCelebration
          onComplete={handleUnlockCelebrationComplete}
          reducedMotion={config.reducedMotion}
        />
      )}

      {showMatchViewer && householdMatch && (
        <HouseholdInsightMatchViewer
          insightCards={householdMatch.insightCards}
          onSaveToProfile={handleSaveMatchToProfile}
          onClose={handleCloseMatchViewer}
          reducedMotion={config.reducedMotion}
        />
      )}

      {/* Phase 9: App Reference Guide */}
      <AppReferenceGuide
        isOpen={showReferenceGuide}
        onClose={() => setShowReferenceGuide(false)}
      />
    </div>
  );
}
