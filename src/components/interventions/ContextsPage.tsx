import { useEffect, useState } from 'react';
import { ArrowLeft, Info, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  computeTriggerAudit,
  type TriggerAuditState,
} from '../../lib/interventions/stage3_4-audit-service';

export function ContextsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [auditState, setAuditState] = useState<TriggerAuditState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAudit();
    }
  }, [user]);

  async function loadAudit() {
    if (!user) return;

    setLoading(true);
    try {
      const state = await computeTriggerAudit(user.id);
      setAuditState(state);
    } catch (error) {
      console.error('Failed to compute trigger audit:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!auditState) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <p className="text-gray-600">Failed to load context information.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/regulation')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Regulation Hub
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Contexts</h1>
          </div>

          <div className="p-6 space-y-8">
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="text-blue-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900 mb-2">
                    How Contextual Responses Work
                  </h2>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>This panel explains how contextual responses work.</p>
                    <p>Nothing here tracks your activity.</p>
                    <p>Nothing is logged.</p>
                    <p>
                      This view shows what could appear based on your current settings.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Safe Mode Status</h2>
              <div
                className={`border rounded-lg p-4 ${
                  auditState.safeModeEnabled
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                {auditState.safeModeEnabled ? (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Safe Mode is active.</p>
                      <p className="text-sm text-gray-700">
                        All contextual responses are paused.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-600 mt-0.5" size={20} />
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Safe Mode is off.</p>
                      <p className="text-sm text-gray-700">
                        Contextual responses may appear when their conditions are met.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Context → Response Mapping
              </h2>

              {auditState.contexts.length > 1 && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                  <p className="font-medium mb-1">Deterministic Selection</p>
                  <p>
                    If multiple responses match the same context, the earliest created one
                    is shown. This does not mean it is better or preferred.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                {(auditState?.contexts ?? []).map((contextData) => (
                  <div
                    key={contextData.context}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">
                        Context: {contextData.contextLabel}
                      </h3>
                    </div>

                    <div className="p-4 space-y-4">
                      {(contextData?.eligibleInterventions ?? []).length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">
                            Available Responses
                          </h4>
                          <div className="space-y-3">
                            {(contextData?.eligibleInterventions ?? []).map((eligible) => (
                              <div
                                key={eligible.intervention.id}
                                className={`border rounded-lg p-4 ${
                                  eligible.wouldShowFirst
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                      {getResponseTypeLabel(
                                        eligible.intervention.intervention_key
                                      )}
                                      : "{getUserText(eligible.intervention)}"
                                    </p>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                      <span>Status: {eligible.intervention.status}</span>
                                      <span>
                                        Created:{' '}
                                        {new Date(
                                          eligible.intervention.created_at
                                        ).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                  {eligible.wouldShowFirst && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                      Would show first
                                    </span>
                                  )}
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-sm font-medium text-gray-700 mb-2">
                                    Why it would show:
                                  </p>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {(eligible?.reasons ?? []).map((reason, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-gray-400 mt-0.5">-</span>
                                        <span>{reason}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(contextData?.notEligibleInterventions ?? []).length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Not Available</h4>
                          <div className="space-y-2">
                            {(contextData?.notEligibleInterventions ?? []).map((notEligible) => (
                              <div
                                key={notEligible.intervention.id}
                                className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                              >
                                <div className="flex items-start gap-3">
                                  <XCircle className="text-gray-400 mt-0.5" size={16} />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {getResponseTypeLabel(
                                        notEligible.intervention.intervention_key
                                      )}
                                      : "{getUserText(notEligible.intervention)}"
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Reason: {notEligible.blockingReason}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {contextData.eligibleInterventions.length === 0 &&
                        contextData.notEligibleInterventions.length === 0 && (
                          <p className="text-sm text-gray-500 italic">
                            No responses configured for this context.
                          </p>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function getResponseTypeLabel(key: string): string {
  switch (key) {
    case 'reminder_display':
      return 'Reminder';
    case 'reflection_prompt':
      return 'Reflection';
    case 'focus_mode':
      return 'Focus Mode';
    case 'timebox':
      return 'Timebox';
    case 'simplified_view':
      return 'Simplified View';
    case 'accountability_view':
      return 'Accountability View';
    default:
      return 'Response';
  }
}

function getUserText(intervention: any): string {
  const params = intervention.user_parameters as any;

  if (intervention.intervention_key === 'reminder_display') {
    return params.reminder_text || 'No text';
  } else if (intervention.intervention_key === 'reflection_prompt') {
    return params.prompt_text || 'No text';
  }

  return intervention.name || 'Unnamed';
}
