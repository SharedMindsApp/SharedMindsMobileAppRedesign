/**
 * Phase 1: Critical Load Protection - Added timeout protection
 */

import { useEffect, useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Legacy Types Stubbed for V1 Compatibility
export interface Section { id: string; title: string; order_index: number; }
export interface Member { id: string; user_id: string; household_id: string; name: string; }
export interface Progress { id: string; member_id: string; section_id: string; completed: boolean; }
import { QuestionScreen } from './QuestionScreen';
import { getUserHousehold, Household } from '../lib/household';
import { useAuth } from '../core/auth/AuthProvider';
import { useCoreData } from '../core/data/CoreDataContext';
import { useUIPreferences } from '../contexts/UIPreferencesContext';
import { DashboardLayoutRouter } from './dashboard/DashboardLayoutRouter';
import { COLOR_THEMES } from '../lib/uiPreferencesTypes';
import { useLoadingState } from '../hooks/useLoadingState';
import { TimeoutRecovery } from './common/TimeoutRecovery';
import { DashboardSkeleton } from './common/Skeleton';
import { DashboardMarks, timeAsync } from '../lib/performance';

export function Dashboard() {
  // Performance: Mark dashboard start
  useEffect(() => {
    DashboardMarks.start();
  }, []);

  const [sections, setSections] = useState<Section[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [progressData, setProgressData] = useState<Progress[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingCritical, setLoadingCritical] = useState(true); // Only for critical auth data
  const [loadingDeferred, setLoadingDeferred] = useState(true); // For dashboard data
  const { timedOut } = useLoadingState({
    timeoutMs: 12000,
  });
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isPremium, role } = useAuth();
  const { state } = useCoreData();
  const { config, neurotype } = useUIPreferences();

  // CRITICAL: Render shell immediately, then load data
  useEffect(() => {
    loadCriticalData();
  }, []);

  // Load critical auth data first (blocks navigation only)
  const loadCriticalData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log('No user found, redirecting to onboarding');
        navigate('/onboarding/household');
        return;
      }

      setCurrentUserId(user.id);
      DashboardMarks.shellVisible();

      // V1: Legacy 'members' table no longer exists. Skip member lookup.
      // Household membership is now via space_members.
      const memberData: any = null;
      console.log('[Dashboard] V1 schema: members table not used, proceeding without household data');

      setLoadingCritical(false);
      DashboardMarks.skeletonsVisible();

      // Now load dashboard data in parallel (non-blocking)
      startTransition(() => {
        loadDashboardData(memberData.household_id);
      });
    } catch (err) {
      console.error('Error loading critical data:', err);
      setError('Failed to load dashboard. Please try again.');
      setLoadingCritical(false);
    }
  };

  // Load dashboard data in parallel (non-blocking after shell renders)
  const loadDashboardData = async (householdId: string) => {
    await timeAsync('dashboard:data:load', async () => {
      try {
        // Remap V1 core data spaces to the legacy Household type expected by the layout
        const activeSpace = state.spaces.find(s => s.id === state.activeSpaceId);
        const householdData: Household | null = activeSpace ? {
          id: activeSpace.id,
          name: activeSpace.name,
          plan: 'free',
          billing_owner_id: activeSpace.billing_owner_id,
          created_at: activeSpace.created_at,
          updated_at: activeSpace.updated_at,
        } : null;

        const householdMembers: Member[] = [];
        const sectionsData: Section[] = [];

        setHousehold(householdData);
        setMembers(householdMembers);
        setSections(sectionsData);
        DashboardMarks.criticalDataLoaded();

        setProgressData([]);
        DashboardMarks.allDataLoaded();
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard. Please try again.');
      } finally {
        setLoadingDeferred(false);
        DashboardMarks.interactive();
      }
    });
  };

  const handleCloseQuestions = () => {
    setActiveSection(null);
    if (household) {
      loadDashboardData(household.id);
    } else {
      loadCriticalData();
    }
  };

  const getFirstIncompleteSection = (): Section | null => {
    const currentMember = members.find((m) => m.user_id === currentUserId);
    if (!currentMember) return null;

    const memberProgress = progressData.filter((p) => p.member_id === currentMember.id);

    for (const section of sections) {
      const sectionProgress = memberProgress.find((p) => p.section_id === section.id);
      if (!sectionProgress || !sectionProgress.completed) {
        return section;
      }
    }

    return null;
  };

  const isReportAvailable = (): boolean => {
    if (sections.length === 0 || members.length === 0) return false;

    const totalSections = sections.length * members.length;
    const completedSections = progressData.filter((p) => p.completed).length;

    return completedSections === totalSections;
  };

  // Show timeout recovery if critical data load timed out
  if (timedOut && loadingCritical) {
    return (
      <TimeoutRecovery
        message="Dashboard is taking longer than expected to load. This may be due to a network issue."
        timeoutSeconds={12}
        onRetry={() => loadCriticalData()}
        onReload={() => window.location.reload()}
      />
    );
  }

  // Handle active section (question screen) - must be before main render
  if (activeSection) {
    return <QuestionScreen sectionId={activeSection} onClose={handleCloseQuestions} />;
  }

  // CRITICAL: Render shell immediately, show skeletons while data loads
  // Never block UI render on data - this is the key performance fix
  const bgTheme = COLOR_THEMES[config.colorTheme];
  const transitionClass = config.reducedMotion ? '' : 'transition-colors duration-200';

  // Render page shell immediately, even if data is loading
  return (
    <div className={`min-h-screen ${bgTheme.bg} ${bgTheme.text} ${transitionClass} -mx-4 -my-8 px-4 py-8 sm:-mx-6 sm:-my-8 sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8`}>
      {loadingCritical || loadingDeferred ? (
        // Show skeleton while loading - user sees structure immediately
        <DashboardSkeleton />
      ) : error ? (
        // Error state
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Error</h2>
              <p className="text-gray-600">{error}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setLoadingCritical(true);
                  setLoadingDeferred(true);
                  loadCriticalData();
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Render dashboard with data
        <DashboardLayoutRouter
          neurotype={neurotype}
          sections={sections}
          members={members}
          progressData={progressData}
          household={household}
          currentMember={members.find((m) => m.user_id === currentUserId) || null}
          firstIncompleteSection={getFirstIncompleteSection()}
          reportAvailable={isReportAvailable()}
          overallProgress={
            sections.length > 0 && members.length > 0
              ? Math.round(
                (progressData.filter((p) => p.completed).length / (sections.length * members.length)) *
                100
              )
              : 0
          }
          isPremium={isPremium}
        />
      )}
    </div>
  );
}
