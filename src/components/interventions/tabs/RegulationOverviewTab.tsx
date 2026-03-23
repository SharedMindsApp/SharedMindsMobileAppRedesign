import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Shield, Activity, CheckCircle, Calendar, Eye } from 'lucide-react';
import { MentalModelCard } from '../../regulation/MentalModelCard';
import { ActivePresetBanner } from '../../regulation/ActivePresetBanner';
import { SignalsSection } from '../../regulation/SignalsSection';
import { ReturnBanner } from '../../regulation/ReturnBanner';
import { ReturnContextFlow } from '../../regulation/ReturnContextFlow';
import { ReorientationCard } from '../../regulation/ReorientationCard';
import { RegulationOnboarding } from '../../regulation/RegulationOnboarding';
import {
  getOnboardingState,
  markOnboardingSeen,
  dismissMentalModelCard,
} from '../../../lib/regulation/onboardingService';
import {
  detectReturn,
  createReturnContext,
  dismissReturnBanner,
  markReorientationShown,
  getReorientationInfo,
  updateReturnContext,
} from '../../../lib/regulation/returnService';
import { getActivePreset, revertPreset, getPresetApplication } from '../../../lib/regulation/presetService';
import { PresetChangesModal } from '../../regulation/PresetChangesModal';
import { getTodaysAlignment } from '../../../lib/regulation/dailyAlignmentService';
import type { ReturnDetectionResult, ReturnContextInput, ReorientationInfo } from '../../../lib/regulation/returnTypes';
import type { PresetChanges, PresetId } from '../../../lib/regulation/presetTypes';
import { useNavigate } from 'react-router-dom';

export function RegulationOverviewTab() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMentalModel, setShowMentalModel] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activePresetAppliedAt, setActivePresetAppliedAt] = useState<string | null>(null);
  const [showPresetChanges, setShowPresetChanges] = useState(false);
  const [presetChanges, setPresetChanges] = useState<PresetChanges | null>(null);
  const [dailyAlignmentStatus, setDailyAlignmentStatus] = useState<'pending' | 'completed' | 'dismissed' | null>(null);
  const [returnDetection, setReturnDetection] = useState<ReturnDetectionResult | null>(null);
  const [showContextFlow, setShowContextFlow] = useState(false);
  const [reorientationInfo, setReorientationInfo] = useState<ReorientationInfo | null>(null);
  const [returnContextId, setReturnContextId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkOnboardingState();
      loadActivePresetInfo();
      loadDailyAlignmentStatus();
      checkForReturn();
    }
  }, [user]);

  async function checkOnboardingState() {
    if (!user) return;
    const state = await getOnboardingState(user.id);
    if (!state || !state.has_seen_onboarding) {
      setShowOnboarding(true);
    } else {
      setShowMentalModel(!state.mental_model_card_dismissed);
    }
  }

  async function handleCompleteOnboarding() {
    if (!user) return;
    await markOnboardingSeen(user.id);
    setShowOnboarding(false);
    setShowMentalModel(true);
  }

  async function handleSkipOnboarding() {
    if (!user) return;
    await markOnboardingSeen(user.id);
    setShowOnboarding(false);
    setShowMentalModel(true);
  }

  async function handleDismissMentalModel() {
    if (!user) return;
    await dismissMentalModelCard(user.id);
    setShowMentalModel(false);
  }

  function handleOpenFullExplanation() {
    setShowOnboarding(true);
  }

  async function loadActivePresetInfo() {
    if (!user) return;
    const active = await getActivePreset(user.id);
    if (active) {
      setActivePresetId(active.presetId);
      setActivePresetAppliedAt(active.appliedAt);
    }
  }

  async function loadDailyAlignmentStatus() {
    if (!user) return;
    try {
      const alignment = await getTodaysAlignment(user.id);
      if (alignment) {
        setDailyAlignmentStatus(alignment.status);
      }
    } catch (error) {
      console.error('[RegulationOverview] Error loading alignment status:', error);
      setDailyAlignmentStatus(null);
    }
  }

  async function checkForReturn() {
    if (!user) return;
    const result = await detectReturn(user.id);
    setReturnDetection(result);

    if (result.isReturning && result.shouldShowBanner && result.lastActivityAt && result.gapDays) {
      const context = await createReturnContext(user.id, result.lastActivityAt, result.gapDays);
      if (context) {
        setReturnContextId(context.id);
      }
    } else if (result.existingContext) {
      setReturnContextId(result.existingContext.id);
    }

    if (result.shouldShowReorientation) {
      const info = await getReorientationInfo(user.id);
      setReorientationInfo(info);
    }
  }

  async function handleRevertPreset() {
    if (!user || !activePresetId) return;
    await revertPreset(user.id, activePresetId);
    setActivePresetId(null);
    setActivePresetAppliedAt(null);
    setShowPresetChanges(false);
  }

  async function handleViewPresetChanges() {
    if (!user || !activePresetId) return;
    const application = await getPresetApplication(user.id, activePresetId);
    if (application) {
      setPresetChanges(application.changesMade);
      setShowPresetChanges(true);
    }
  }

  function handleEditPreset() {
    navigate('/regulation/calibration');
  }

  async function handleAddContext() {
    setShowContextFlow(true);
  }

  async function handleSkipContext() {
    if (!returnContextId) return;
    await dismissReturnBanner(returnContextId);
    setReturnDetection((prev) => (prev ? { ...prev, shouldShowBanner: false } : null));
  }

  async function handleNotNow() {
    setReturnDetection((prev) => (prev ? { ...prev, shouldShowBanner: false } : null));
  }

  async function handleCompleteContextFlow(input: ReturnContextInput) {
    if (!returnContextId) return;
    await updateReturnContext(returnContextId, input);

    if (input.behavior_preference === 'safe_mode' && user) {
      await supabase.from('profiles').update({ safe_mode_enabled: true }).eq('id', user.id);
    }

    setShowContextFlow(false);
    setReturnDetection((prev) => (prev ? { ...prev, shouldShowBanner: false } : null));

    const info = await getReorientationInfo(user!.id);
    setReorientationInfo(info);
  }

  async function handleCancelContextFlow() {
    setShowContextFlow(false);
    if (returnContextId) {
      await dismissReturnBanner(returnContextId);
    }
    setReturnDetection((prev) => (prev ? { ...prev, shouldShowBanner: false } : null));
  }

  async function handleDismissReorientation() {
    if (returnContextId) {
      await markReorientationShown(returnContextId);
    }
    setReorientationInfo(null);
  }

  function handleNavigateFromReorientation(projectId?: string) {
    if (projectId) {
      navigate(`/guardrails/projects/${projectId}`);
    } else {
      navigate('/guardrails');
    }
    handleDismissReorientation();
  }

  const safeMode = profile?.safe_mode_enabled ?? false;

  return (
    <>
      {showOnboarding && (
        <RegulationOnboarding onComplete={handleCompleteOnboarding} onSkip={handleSkipOnboarding} />
      )}

      <div className="space-y-6">
        {showMentalModel && !showOnboarding && (
          <MentalModelCard onDismiss={handleDismissMentalModel} onOpenFullExplanation={handleOpenFullExplanation} />
        )}

        {activePresetId && activePresetAppliedAt && !showOnboarding && (
          <ActivePresetBanner
            presetId={activePresetId}
            appliedAt={activePresetAppliedAt}
            onViewChanges={handleViewPresetChanges}
            onEdit={handleEditPreset}
            onRevert={handleRevertPreset}
          />
        )}

        {returnDetection?.shouldShowBanner && returnDetection.gapDays && (
          <ReturnBanner
            gapDays={returnDetection.gapDays}
            onAddContext={handleAddContext}
            onSkip={handleSkipContext}
            onNotNow={handleNotNow}
          />
        )}

        {showContextFlow && returnDetection?.gapDays && (
          <ReturnContextFlow
            gapDays={returnDetection.gapDays}
            onComplete={handleCompleteContextFlow}
            onCancel={handleCancelContextFlow}
          />
        )}

        {reorientationInfo && !showContextFlow && (
          <ReorientationCard
            info={reorientationInfo}
            onNavigate={handleNavigateFromReorientation}
            onDismiss={handleDismissReorientation}
          />
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">What's happening right now</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`p-5 rounded-xl border-2 transition-all ${
                safeMode ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Shield className={`w-6 h-6 ${safeMode ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-base font-semibold text-gray-900">Safe Mode</div>
              </div>
              <div className={`text-2xl font-bold ${safeMode ? 'text-blue-600' : 'text-gray-500'}`}>
                {safeMode ? 'ON' : 'OFF'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {safeMode ? 'All responses paused' : 'Responses can appear'}
              </div>
            </div>

            <div
              className={`p-5 rounded-xl border-2 ${
                activePresetId ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Activity className={`w-6 h-6 ${activePresetId ? 'text-purple-600' : 'text-gray-400'}`} />
                <div className="text-base font-semibold text-gray-900">Active Preset</div>
              </div>
              <div className={`text-sm font-medium ${activePresetId ? 'text-purple-600' : 'text-gray-500'}`}>
                {activePresetId ? activePresetId.replace('_', ' ').toUpperCase() : 'None active'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {activePresetId ? 'Configuration applied' : 'Default settings'}
              </div>
            </div>

            <div
              className={`p-5 rounded-xl border-2 ${
                dailyAlignmentStatus === 'pending'
                  ? 'bg-amber-50 border-amber-300'
                  : dailyAlignmentStatus === 'completed'
                  ? 'bg-green-50 border-green-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Calendar
                  className={`w-6 h-6 ${
                    dailyAlignmentStatus === 'pending'
                      ? 'text-amber-600'
                      : dailyAlignmentStatus === 'completed'
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                />
                <div className="text-base font-semibold text-gray-900">Today's Plan</div>
              </div>
              <div
                className={`text-sm font-medium ${
                  dailyAlignmentStatus === 'pending'
                    ? 'text-amber-600'
                    : dailyAlignmentStatus === 'completed'
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                {dailyAlignmentStatus === 'pending'
                  ? 'In progress'
                  : dailyAlignmentStatus === 'completed'
                  ? 'Completed'
                  : 'Not started'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {dailyAlignmentStatus ? 'Alignment active' : 'No alignment today'}
              </div>
            </div>
          </div>
        </div>

        <SignalsSection />

        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">What this page shows</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            This overview answers "What's present right now?" — whether support tools are active, which patterns are
            currently visible, and what your rough plan for today looks like. Nothing here requires action.
          </p>
        </div>
      </div>

      {showPresetChanges && presetChanges && activePresetId && (
        <PresetChangesModal
          presetId={activePresetId as PresetId}
          changes={presetChanges}
          onClose={() => setShowPresetChanges(false)}
        />
      )}
    </>
  );
}
