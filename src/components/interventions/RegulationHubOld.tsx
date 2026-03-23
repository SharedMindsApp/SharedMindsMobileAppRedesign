import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Pause, Play, Settings, Eye, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { InterventionKey } from '../../lib/interventions/stage3_1-types';
import { getActiveSignals, dismissSignal, computeSignalsForUser, getSignalDefinitions } from '../../lib/regulation/signalService';
import { enrichSignalsWithCalibration, snoozeSignal } from '../../lib/regulation/calibrationService';
import type { EnrichedSignal } from '../../lib/regulation/signalTypes';
import { SignalCard } from '../regulation/SignalCard';
import { detectReturn, createReturnContext, updateReturnContext, dismissReturnBanner, markReorientationShown, getReorientationInfo } from '../../lib/regulation/returnService';
import type { ReturnDetectionResult, ReturnContextInput, ReorientationInfo } from '../../lib/regulation/returnTypes';
import { ReturnBanner } from '../regulation/ReturnBanner';
import { ReturnContextFlow } from '../regulation/ReturnContextFlow';
import { ReorientationCard } from '../regulation/ReorientationCard';
import { getOnboardingState, markOnboardingSeen, dismissMentalModelCard, showMentalModelCard } from '../../lib/regulation/onboardingService';
import { RegulationOnboarding } from '../regulation/RegulationOnboarding';
import { MentalModelCard } from '../regulation/MentalModelCard';
import { getTestingModeEnabled, setTestingModeEnabled } from '../../lib/regulation/testingModeService';
import { PresetQuickStart } from '../regulation/PresetQuickStart';
import { ActivePresetBanner } from '../regulation/ActivePresetBanner';
import { PresetChangesModal } from '../regulation/PresetChangesModal';
import { getActivePreset, revertPreset, getPresetApplication } from '../../lib/regulation/presetService';
import { getPreset } from '../../lib/regulation/presetRegistry';
import type { PresetChanges, PresetId } from '../../lib/regulation/presetTypes';

interface ResponseItem {
  id: string;
  key: InterventionKey;
  name: string;
  category: string;
  appearance: 'Manual' | 'Contextual';
  status: 'Active' | 'Paused' | 'Disabled';
}

export function RegulationHub() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [signals, setSignals] = useState<EnrichedSignal[]>([]);
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
      await computeSignalsForUser({ userId: user!.id });

      const activeSignals = await getActiveSignals(user!.id);
      const definitions = await getSignalDefinitions();
      const enrichedSignals = await enrichSignalsWithCalibration(user!.id, activeSignals, definitions);
      setSignals(enrichedSignals);
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

  async function handleDismissSignal(signalId: string) {
    if (!user) return;
    try {
      await dismissSignal(user.id, signalId);
      setSignals(signals.filter((s) => s.id !== signalId));
    } catch (error) {
      console.error('[RegulationHub] Error dismissing signal:', error);
    }
  }

  async function handleSnoozeSignal(signalId: string) {
    if (!user) return;
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + 24);
      await snoozeSignal(user.id, signalId, snoozeUntil);
      setSignals(signals.filter((s) => s.id !== signalId));
    } catch (error) {
      console.error('[RegulationHub] Error snoozing signal:', error);
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
  const contextualEnabled = responses.some((r) => r.appearance === 'Contextual' && r.status === 'Active');

  const responsesByCategory = responses.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, ResponseItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Onboarding Flow */}
      {showOnboarding && (
        <RegulationOnboarding
          onComplete={handleCompleteOnboarding}
          onSkip={handleSkipOnboarding}
        />
      )}

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Regulation</h1>
          <p className="text-gray-600 max-w-3xl">
            Regulation helps you stay steady, focused, and aligned while working on projects and goals.
            Nothing here is automatic or required.
          </p>
        </div>

        {/* Mental Model Card */}
        {showMentalModel && !showOnboarding && (
          <MentalModelCard
            onDismiss={handleDismissMentalModel}
            onOpenFullExplanation={handleOpenFullExplanation}
          />
        )}

        {/* Active Preset Banner */}
        {activePresetId && activePresetAppliedAt && !showOnboarding && (
          <ActivePresetBanner
            presetId={activePresetId}
            appliedAt={activePresetAppliedAt}
            onViewChanges={handleViewPresetChanges}
            onEdit={handleEditPreset}
            onRevert={handleRevertPreset}
          />
        )}

        {/* Return Banner */}
        {returnDetection?.shouldShowBanner && returnDetection.gapDays && (
        <ReturnBanner
          gapDays={returnDetection.gapDays}
          onAddContext={handleAddContext}
          onSkip={handleSkipContext}
          onNotNow={handleNotNow}
        />
      )}

      {/* Return Context Flow */}
      {showContextFlow && returnDetection?.gapDays && (
        <ReturnContextFlow
          gapDays={returnDetection.gapDays}
          onComplete={handleCompleteContextFlow}
          onCancel={handleCancelContextFlow}
        />
      )}

      {/* Reorientation Card */}
      {reorientationInfo && !showContextFlow && (
        <ReorientationCard
          info={reorientationInfo}
          onNavigate={handleNavigateFromReorientation}
          onDismiss={handleDismissReorientation}
        />
      )}

      {/* Preset Quick Start */}
      {!showOnboarding && !activePresetId && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <PresetQuickStart onPresetApplied={handlePresetApplied} />
        </div>
      )}

      {/* Section A: Current Regulation State */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Current Regulation State</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start space-x-3">
            <Shield className={`w-5 h-5 mt-0.5 ${safeMode ? 'text-blue-600' : 'text-gray-400'}`} />
            <div>
              <div className="text-sm font-medium text-gray-900">Safe Mode</div>
              <div className="text-sm text-gray-600">{safeMode ? 'ON' : 'OFF'}</div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Zap className="w-5 h-5 mt-0.5 text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Active Responses</div>
              <div className="text-sm text-gray-600">{activeResponsesCount}</div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Eye className="w-5 h-5 mt-0.5 text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Contextual Responses</div>
              <div className="text-sm text-gray-600">{contextualEnabled ? 'Yes' : 'No'}</div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Settings className="w-5 h-5 mt-0.5 text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Governance Rules</div>
              <div className="text-sm text-gray-600">{governanceRulesCount}</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 pt-2">
          Regulation is active. You are currently allowing {activeResponsesCount} response{activeResponsesCount !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Section B: Signals */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Signals</h2>
        <p className="text-gray-600">
          Signals describe patterns in how you work (for example: switching tasks quickly or expanding project scope).
          They appear here when patterns are detected.
        </p>

        {signals.length > 0 ? (
          <div className="space-y-3 mt-4">
            {signals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onDismiss={handleDismissSignal}
                onSnooze={handleSnoozeSignal}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No signals detected right now. Signals appear based on your activity patterns.
          </div>
        )}
      </div>

      {/* Section C: Responses */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Responses</h2>
        <p className="text-gray-600">
          Responses are tools you can use to support yourself.
          They only appear when you choose to use them.
        </p>

        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/regulation/use')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Use a Response
          </button>
          <button
            onClick={() => navigate('/regulation/create')}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Create a Response
          </button>
        </div>

        {responses.length > 0 ? (
          <div className="space-y-6 mt-6">
            {Object.entries(responsesByCategory).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          How it appears: {item.appearance}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            item.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : item.status === 'Paused'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No responses created yet. Create your first response to get started.
          </div>
        )}
      </div>

      {/* Section D: Contexts */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Contexts</h2>
        <p className="text-gray-600">
          Contexts describe moments in the app where a response could appear.
        </p>
        <p className="text-sm text-gray-500">
          Nothing here runs in the background.
          Contexts only exist while you're actively using the app.
        </p>
        <button
          onClick={() => navigate('/regulation/contexts')}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          View Contexts
        </button>
      </div>

      {/* Section E: Governance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Limits & Control</h2>
        <p className="text-gray-600">
          You decide how much influence the system is allowed to have.
          You can pause everything instantly.
        </p>
        <button
          onClick={() => navigate('/regulation/governance')}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Manage Limits & Control
        </button>
      </div>

      {/* Section F: Testing Mode */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Testing Mode (Advanced)</h2>
        <p className="text-gray-600">
          Testing Mode shows how signals are computed. It does not change how Regulation works.
        </p>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={testingModeEnabled}
              onChange={(e) => handleToggleTestingMode(e.target.checked)}
              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">
              Enable Testing Mode (for understanding how signals are computed)
            </span>
          </label>
        </div>

        {testingModeEnabled && (
          <div className="bg-amber-100 border border-amber-200 rounded p-3">
            <p className="text-sm text-amber-900 mb-2">
              Testing Mode is ON. This shows internal reasoning for signals.
            </p>
            <button
              onClick={() => navigate('/regulation/testing')}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
            >
              Open Testing Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Preset Changes Modal */}
      {showPresetChanges && presetChanges && activePresetId && (
        <PresetChangesModal
          presetId={activePresetId as PresetId}
          changes={presetChanges}
          onClose={() => setShowPresetChanges(false)}
        />
      )}
    </div>
    </>
  );
}
