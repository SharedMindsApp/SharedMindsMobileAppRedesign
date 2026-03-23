import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  FileText,
  BookOpen,
  Lightbulb,
  Compass,
} from 'lucide-react';
import { Section, Member, Progress } from '../../lib/supabase';
import { Household } from '../../lib/household';
import { useNavigate } from 'react-router-dom';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { DENSITY_SPACING_MAP, FONT_SCALE_MAP, COLOR_THEMES } from '../../lib/uiPreferencesTypes';
import { BrainProfileWidget } from './BrainProfileWidget';
import { LockedFeaturesJourney } from '../features/LockedFeaturesJourney';
import { DailyAlignmentEntryCard } from '../regulation/DailyAlignmentEntryCard';
import { getDailyAlignmentEnabled } from '../../lib/regulation/dailyAlignmentService';
import { PersonalCalendarCard } from '../calendar/PersonalCalendarCard';
import { SharedCalendarCard } from '../calendar/SharedCalendarCard';
import { isStandaloneApp } from '../../lib/appContext';
import { AppReferenceGuide } from '../reference/AppReferenceGuide';

interface NDOptimizedDashboardLayoutProps {
  members: Member[];
  household: Household | null;
  currentMember: Member | null;
  firstIncompleteSection: Section | null;
  reportAvailable: boolean;
  overallProgress: number;
}

export function NDOptimizedDashboardLayout({
  members,
  household,
  currentMember,
  firstIncompleteSection,
  reportAvailable,
  overallProgress,
}: NDOptimizedDashboardLayoutProps) {
  const navigate = useNavigate();
  const { config } = useUIPreferences();
  const densityClass = DENSITY_SPACING_MAP[config.uiDensity];
  const fontScale = FONT_SCALE_MAP[config.fontScale];
  const theme = COLOR_THEMES[config.colorTheme];
  const lineHeight = config.fontScale === 'xl' ? 'leading-relaxed' : config.fontScale === 'l' ? 'leading-relaxed' : 'leading-normal';
  const transitionClass = config.reducedMotion ? '' : 'transition-all duration-200';

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

  return (
    <div className={`max-w-3xl mx-auto ${densityClass} ${lineHeight}`} style={{ fontSize: `${fontScale}rem` }}>
      <div className="text-center mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1" />
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome{currentMember ? `, ${currentMember.name}` : ''}
            </h1>
            <p className="text-gray-600">
              {household?.name && `${household.name}`}
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setShowReferenceGuide(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors shadow-sm"
              title="How Everything Fits Together"
            >
              <Compass size={18} className="text-blue-600" />
              <span>App Guide</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <PersonalCalendarCard />
        <SharedCalendarCard />
      </div>

      {dailyAlignmentEnabled && currentMember?.user_id && (
        <div className="mb-6">
          <DailyAlignmentEntryCard userId={currentMember.user_id} />
        </div>
      )}

      {/* Questionnaire Progress - Hidden on mobile */}
      {!isMobile && (
        <>
          {firstIncompleteSection ? (
            <div className={`${theme.cardBg} rounded-2xl shadow-lg border-2 border-blue-200 p-8 mb-8`}>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                  <BookOpen size={36} className="text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Next Step</h2>
                <p className="text-gray-600">One section at a time</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-100">
                <p className="text-sm font-medium text-gray-600 mb-2">Continue with:</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{firstIncompleteSection.title}</h3>
                <p className="text-gray-700">{firstIncompleteSection.description}</p>
              </div>

              <button
                onClick={() => navigate('/journey')}
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-8 rounded-xl ${transitionClass} flex items-center justify-center gap-3 text-xl shadow-md`}
              >
                Continue
                <ArrowRight size={28} />
              </button>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-3 text-sm text-gray-600 mb-2">
                  <span>Your Progress</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`bg-blue-600 h-3 rounded-full ${transitionClass}`}
                        style={{ width: `${overallProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-gray-900 min-w-[3rem] text-right">{overallProgress}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className={`${theme.cardBg} rounded-2xl shadow-lg border-2 border-green-200 p-8 mb-8`}>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                  <CheckCircle2 size={40} className="text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">All Complete!</h2>
                <p className="text-lg text-gray-700 mb-8">You have finished all questionnaire sections</p>

                <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                  <div className="text-5xl font-bold text-green-600 mb-2">100%</div>
                  <div className="text-base text-gray-700">Questionnaire Complete</div>
                </div>

                {members.length > 0 && (
                  <div className="mt-6 text-sm text-gray-600">
                    All {members.length} member{members.length !== 1 ? 's' : ''} have completed their sections
                  </div>
                )}
              </div>
            </div>
          )}
        </>
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

      <div className="space-y-4">
        {reportAvailable && (
          <button
            onClick={() => navigate('/report')}
            className={`w-full ${theme.cardBg} rounded-xl shadow-sm border-2 border-green-200 p-6 hover:border-green-300 ${transitionClass} text-left`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText size={28} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Report Ready</h3>
                  <p className="text-sm text-gray-600">Your insights are available</p>
                </div>
              </div>
              <ArrowRight size={24} className="text-green-600" />
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <p className="text-sm text-gray-700">
                View your personalized household harmony report
              </p>
            </div>
          </button>
        )}

        <div className={`${theme.cardBg} rounded-xl shadow-sm border border-gray-200 p-6`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lightbulb size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Once you complete all sections, you'll unlock your personalized Household Report with insights
                tailored to your family's unique dynamics and communication styles.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 9: App Reference Guide */}
      <AppReferenceGuide
        isOpen={showReferenceGuide}
        onClose={() => setShowReferenceGuide(false)}
      />
    </div>
  );
}
