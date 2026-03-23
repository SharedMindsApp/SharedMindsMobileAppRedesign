import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Pause, Play, Settings, Eye, Zap, HelpCircle, CheckCircle, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { InterventionKey } from '../../lib/interventions/stage3_1-types';
import { SignalsSection } from '../regulation/SignalsSection';
import { AlignmentInsightsSection } from '../regulation/analytics/AlignmentInsightsSection';
import { detectReturn, createReturnContext, updateReturnContext, dismissReturnBanner, markReorientationShown, getReorientationInfo } from '../../lib/regulation/returnService';
import type { ReturnDetectionResult, ReturnContextInput, ReorientationInfo } from '../../lib/regulation/returnTypes';
import { ReturnBanner } from '../regulation/ReturnBanner';
import { ReturnContextFlow } from '../regulation/ReturnContextFlow';
import { ReorientationCard } from '../regulation/ReorientationCard';
import { getOnboardingState, markOnboardingSeen, dismissMentalModelCard } from '../../lib/regulation/onboardingService';
import { RegulationOnboarding } from '../regulation/RegulationOnboarding';
import { MentalModelCard } from '../regulation/MentalModelCard';
import { getTestingModeEnabled, setTestingModeEnabled } from '../../lib/regulation/testingModeService';
import { PresetQuickStart } from '../regulation/PresetQuickStart';
import { ActivePresetBanner } from '../regulation/ActivePresetBanner';
import { PresetChangesModal } from '../regulation/PresetChangesModal';
import { getActivePreset, revertPreset, getPresetApplication } from '../../lib/regulation/presetService';
import type { PresetChanges, PresetId } from '../../lib/regulation/presetTypes';

interface ResponseItem {
  id: string;
  key: InterventionKey;
  name: string;
  category: string;
  appearance: 'Manual' | 'Contextual';
  status: 'Active' | 'Paused' | 'Disabled';
}

interface ExplanationCardProps {
  title: string;
  description: string;
  why: string;
  icon: React.ReactNode;
  color: string;
}

function ExplanationCard({ title, description, why, icon, color }: ExplanationCardProps) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className={`bg-white border-2 ${color} rounded-xl p-6 hover:shadow-lg transition-all`}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`flex-shrink-0 w-12 h-12 ${color.replace('border', 'bg').replace('2', '')} bg-opacity-10 rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>

      <button
        onClick={() => setShowWhy(!showWhy)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <HelpCircle className="w-4 h-4" />
        {showWhy ? 'Hide details' : 'Why does this exist?'}
      </button>

      {showWhy && (
        <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-gray-700 leading-relaxed">{why}</p>
        </div>
      )}
    </div>
  );
}

export function RegulationHub() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [governanceRulesCount, setGovernanceRulesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [returnDetection, setReturnDetection] = useState<ReturnDetectionResult | null>(null);
  const [showContextFlow, setShowContextFlow] = useState(false);
  const [reorientationInfo, setReorientationInfo] = useState<ReorientationInfo | null>(null);
  const [returnContextId, setReturnContextId] = useState<string | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMentalModel, setShowMentalModel] = useState(false);
  const [testingModeEnabled, setTestingModeEnabledState] = useState(false);

  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activePresetAppliedAt, setActivePresetAppliedAt] = useState<string | null>(null);
  const [showPresetChanges, setShowPresetChanges] = useState(false);
  const [presetChanges, setPresetChanges] = useState<PresetChanges | null>(null);

  useEffect(() => {
    if (!user) return;
    loadRegulationState();
    checkForReturn();
    checkOnboardingState();
    checkTestingMode();
    loadActivePresetInfo();

    const refreshInterval = setInterval(() => {
      loadRegulationState();
    }, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [user]);

  async function loadRegulationState() {
    try {
      const { data: interventions, error } = await supabase
        .from('interventions_registry')
        .select('*')
        .eq('user_id', user!.id)
        .is('deleted_at', null);

      if (error) throw error;

      const items: ResponseItem[] = (interventions || []).map((i) => ({
        id: i.id,
        key: i.intervention_key as InterventionKey,
        name: i.name,
        category: getCategoryLabel(i.intervention_key),
        appearance: i.allow_contextual_trigger ? 'Contextual' : 'Manual',
        status: i.is_active ? 'Active' : i.is_paused ? 'Paused' : 'Disabled',
      }));

      setResponses(items);

      const { count } = await supabase
        .from('intervention_governance_rules')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'active');

      setGovernanceRulesCount(count || 0);
    } catch (error) {
      console.error('[RegulationHub] Error loading state:', error);
    } finally {
      setLoading(false);
    }
  }


  async function checkForReturn() {
    if (!user) return;
    try {
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
    } catch (error) {
      console.error('[RegulationHub] Error checking for return:', error);
    }
  }

  async function handleAddContext() {
    setShowContextFlow(true);
  }

  async function handleSkipContext() {
    if (!returnContextId) return;
    await dismissReturnBanner(returnContextId);
    setReturnDetection((prev) => prev ? { ...prev, shouldShowBanner: false } : null);
  }

  async function handleNotNow() {
    setReturnDetection((prev) => prev ? { ...prev, shouldShowBanner: false } : null);
  }

  async function handleCompleteContextFlow(input: ReturnContextInput) {
    if (!returnContextId) return;

    await updateReturnContext(returnContextId, input);

    if (input.behavior_preference === 'safe_mode' && user) {
      await supabase
        .from('profiles')
        .update({ safe_mode_enabled: true })
        .eq('id', user.id);
    }

    setShowContextFlow(false);
    setReturnDetection((prev) => prev ? { ...prev, shouldShowBanner: false } : null);

    const info = await getReorientationInfo(user!.id);
    setReorientationInfo(info);
  }

  async function handleCancelContextFlow() {
    setShowContextFlow(false);
    if (returnContextId) {
      await dismissReturnBanner(returnContextId);
    }
    setReturnDetection((prev) => prev ? { ...prev, shouldShowBanner: false } : null);
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

  async function checkOnboardingState() {
    if (!user) return;
    try {
      const state = await getOnboardingState(user.id);

      if (!state || !state.has_seen_onboarding) {
        setShowOnboarding(true);
      } else {
        setShowMentalModel(!state.mental_model_card_dismissed);
      }
    } catch (error) {
      console.error('[RegulationHub] Error checking onboarding state:', error);
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

  async function checkTestingMode() {
    if (!user) return;
    try {
      const enabled = await getTestingModeEnabled(user.id);
      setTestingModeEnabledState(enabled);
    } catch (error) {
      console.error('[RegulationHub] Error checking testing mode:', error);
    }
  }

  async function handleToggleTestingMode(enabled: boolean) {
    if (!user) return;
    const success = await setTestingModeEnabled(user.id, enabled);
    if (success) {
      setTestingModeEnabledState(enabled);
    }
  }

  async function loadActivePresetInfo() {
    if (!user) return;
    try {
      const active = await getActivePreset(user.id);
      if (active) {
        setActivePresetId(active.presetId);
        setActivePresetAppliedAt(active.appliedAt);
      }
    } catch (error) {
      console.error('[RegulationHub] Error loading active preset:', error);
    }
  }

  async function handleRevertPreset() {
    if (!user || !activePresetId) return;
    try {
      await revertPreset(user.id, activePresetId);
      setActivePresetId(null);
      setActivePresetAppliedAt(null);
      setShowPresetChanges(false);
      loadRegulationState();
    } catch (error) {
      console.error('[RegulationHub] Error reverting preset:', error);
      alert('Failed to revert preset. Please try again.');
    }
  }

  async function handleViewPresetChanges() {
    if (!user || !activePresetId) return;
    try {
      const application = await getPresetApplication(user.id, activePresetId);
      if (application) {
        setPresetChanges(application.changesMade);
        setShowPresetChanges(true);
      }
    } catch (error) {
      console.error('[RegulationHub] Error loading preset changes:', error);
    }
  }

  function handleEditPreset() {
    navigate('/regulation/calibration');
  }

  function handlePresetApplied() {
    loadActivePresetInfo();
    loadRegulationState();
  }

  function getCategoryLabel(key: InterventionKey): string {
    if (key === 'reflection_prompt' || key === 'accountability_view') return 'Accountability';
    if (key === 'simplified_view') return 'Friction Reduction';
    if (key === 'focus_mode' || key === 'timebox') return 'Self-Imposed Constraints';
    if (key === 'reminder_display') return 'User-Initiated';
    return 'Other';
  }

  const safeMode = profile?.safe_mode_enabled ?? false;
  const activeResponsesCount = responses.filter((r) => r.status === 'Active').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Activity className="w-8 h-8 text-blue-600 animate-pulse" />
        <div className="text-gray-600">Loading your regulation settings...</div>
      </div>
    );
  }

  return (
    <>
      {showOnboarding && (
        <RegulationOnboarding
          onComplete={handleCompleteOnboarding}
          onSkip={handleSkipOnboarding}
        />
      )}

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border-2 border-blue-100 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Regulation</h1>
              <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                Your supportive workspace companion. Regulation notices patterns in how you work and offers gentle tools when you might find them helpful.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border-2 border-green-200 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-800">Nothing is automatic</span>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border-2 border-blue-200 shadow-sm">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-800">You control everything</span>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border-2 border-purple-200 shadow-sm">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">Always reversible</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showMentalModel && !showOnboarding && (
          <MentalModelCard
            onDismiss={handleDismissMentalModel}
            onOpenFullExplanation={handleOpenFullExplanation}
          />
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

        {/* Quick Start Presets - Enhanced */}
        {!showOnboarding && !activePresetId && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200">
            <PresetQuickStart onPresetApplied={handlePresetApplied} />
          </div>
        )}

        {/* Status Overview - Enhanced */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-900">Current Status</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-5 rounded-xl border-2 transition-all ${
              safeMode
                ? 'bg-blue-50 border-blue-300'
                : 'bg-gray-50 border-gray-200'
            }`}>
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

            <div className="p-5 bg-purple-50 rounded-xl border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-purple-600" />
                <div className="text-base font-semibold text-gray-900">Active Responses</div>
              </div>
              <div className="text-2xl font-bold text-purple-600">{activeResponsesCount}</div>
              <div className="text-xs text-gray-600 mt-1">Tools ready when needed</div>
            </div>

            <div className="p-5 bg-green-50 rounded-xl border-2 border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div className="text-base font-semibold text-gray-900">Governance Rules</div>
              </div>
              <div className="text-2xl font-bold text-green-600">{governanceRulesCount}</div>
              <div className="text-xs text-gray-600 mt-1">Safety boundaries active</div>
            </div>
          </div>
        </div>

        {/* Main Sections - Enhanced with explanations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExplanationCard
            title="Signals"
            description="Patterns in how you work, like switching tasks quickly or expanding scope"
            why="Signals help you notice what's happening without judgment. They're descriptive, not prescriptive. You decide what to do with the information."
            icon={<Activity className="w-6 h-6 text-blue-600" />}
            color="border-blue-300"
          />

          <ExplanationCard
            title="Responses"
            description="Tools you can use to support yourself when you need them"
            why="Responses are helpers you activate. They never appear automatically. Think of them as tools in a toolbox - available when you need them, invisible when you don't."
            icon={<Zap className="w-6 h-6 text-purple-600" />}
            color="border-purple-300"
          />
        </div>

        {/* Signals Section - Stage 4.1 */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
          <SignalsSection />
        </div>

        {/* Insights & Alignment Section - Stage 4.10 */}
        <AlignmentInsightsSection />

        {/* Actions Section - More prominent */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-purple-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore & Configure</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/regulation/use')}
              className="flex items-center gap-3 p-6 bg-white rounded-xl border-2 border-purple-300 hover:border-purple-400 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">Use a Response</div>
                <div className="text-sm text-gray-600">Activate a support tool right now</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/regulation/create')}
              className="flex items-center gap-3 p-6 bg-white rounded-xl border-2 border-blue-300 hover:border-blue-400 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">Create a Response</div>
                <div className="text-sm text-gray-600">Design your own support tool</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/regulation/contexts')}
              className="flex items-center gap-3 p-6 bg-white rounded-xl border-2 border-green-300 hover:border-green-400 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">View Contexts</div>
                <div className="text-sm text-gray-600">See when responses could appear</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/regulation/governance')}
              className="flex items-center gap-3 p-6 bg-white rounded-xl border-2 border-red-300 hover:border-red-400 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">Limits & Control</div>
                <div className="text-sm text-gray-600">Set boundaries and pause options</div>
              </div>
            </button>
          </div>
        </div>

        {/* Testing Mode - If enabled */}
        {testingModeEnabled && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="w-6 h-6 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">Testing Mode Active</h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Testing Mode shows how signals are computed. It doesn't change behavior.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/regulation/testing')}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                Open Testing Dashboard
              </button>
              <button
                onClick={() => handleToggleTestingMode(false)}
                className="px-4 py-2 bg-white border-2 border-amber-300 text-gray-700 rounded-lg hover:bg-amber-50 transition-colors"
              >
                Disable Testing Mode
              </button>
            </div>
          </div>
        )}

        {!testingModeEnabled && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testingModeEnabled}
                onChange={(e) => handleToggleTestingMode(e.target.checked)}
                className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700">
                Enable Testing Mode (for understanding how signals work)
              </span>
            </label>
          </div>
        )}
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
