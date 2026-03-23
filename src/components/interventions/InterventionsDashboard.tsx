/**
 * Stage 3.1: Interventions Dashboard
 *
 * Control surface for managing user interventions.
 * Shows active, paused, and disabled interventions with lifecycle controls.
 *
 * CRITICAL: This is infrastructure only - NO delivery, triggers, or notifications.
 * No counts, streaks, or "times used" displayed.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  listInterventions,
  pauseIntervention,
  enableIntervention,
  disableIntervention,
  deleteIntervention,
  InterventionServiceError,
} from '../../lib/interventions/stage3_1-service';
import type { InterventionRegistryEntry, InterventionStatus } from '../../lib/interventions/stage3_1-types';
import { INTERVENTION_METADATA } from '../../lib/interventions/stage3_1-types';
import { Pause, Play, XCircle, Trash2, Edit, Plus, AlertCircle, Info, Settings, Zap, Eye } from 'lucide-react';

export function InterventionsDashboard() {
  const { user, safeModeEnabled } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InterventionStatus>('active');
  const [interventions, setInterventions] = useState<InterventionRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadInterventions();
  }, [activeTab, user]);

  async function loadInterventions() {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = await listInterventions(user.id, { status: activeTab });
      setInterventions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interventions');
    } finally {
      setLoading(false);
    }
  }

  async function handlePause(interventionId: string) {
    if (!user) return;
    setActionLoading(interventionId);

    try {
      await pauseIntervention(user.id, interventionId);
      await loadInterventions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause intervention');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEnable(interventionId: string) {
    if (!user) return;
    setActionLoading(interventionId);

    try {
      await enableIntervention(user.id, interventionId);
      await loadInterventions();
    } catch (err) {
      if (err instanceof InterventionServiceError && err.code === 'SAFE_MODE_ACTIVE') {
        setError('Interventions are paused while Safe Mode is active.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to enable intervention');
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDisable(interventionId: string) {
    if (!user) return;
    if (!confirm('Disable this intervention? You can re-enable it later.')) return;

    setActionLoading(interventionId);

    try {
      await disableIntervention(user.id, interventionId);
      await loadInterventions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable intervention');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(interventionId: string) {
    if (!user) return;
    if (!confirm('Delete this intervention? This cannot be undone.')) return;

    setActionLoading(interventionId);

    try {
      await deleteIntervention(user.id, interventionId);
      await loadInterventions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete intervention');
    } finally {
      setActionLoading(null);
    }
  }

  function handleEdit(intervention: InterventionRegistryEntry) {
    navigate(`/interventions/edit/${intervention.id}`, { state: { intervention } });
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interventions</h1>
        <p className="text-gray-600">
          Manage your optional support tools. All interventions default to OFF.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/interventions/use')}
          className="flex flex-col items-start gap-3 p-5 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Use Interventions</h3>
          </div>
          <p className="text-sm text-gray-600">
            Click to manually use any intervention you created. Nothing happens automatically.
          </p>
        </button>

        <button
          onClick={() => navigate('/interventions/triggers')}
          className="flex flex-col items-start gap-3 p-5 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Trigger Audit</h3>
          </div>
          <p className="text-sm text-gray-600">
            See which interventions are configured to appear in specific contexts.
          </p>
        </button>

        <button
          onClick={() => navigate('/interventions/governance')}
          className="flex flex-col items-start gap-3 p-5 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Governance & Limits</h3>
          </div>
          <p className="text-sm text-gray-600">
            Configure rules and limits for when interventions can appear.
          </p>
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">My Interventions</h2>
        <button
          onClick={() => navigate('/interventions/create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Intervention
        </button>
      </div>

      {safeModeEnabled && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Safe Mode is Active</h3>
            <p className="text-sm text-blue-700 mt-1">
              All interventions are paused while Safe Mode is active. They will remain paused when you turn off Safe Mode.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('paused')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'paused'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Paused
          </button>
          <button
            onClick={() => setActiveTab('disabled')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'disabled'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Disabled
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">Loading interventions...</p>
            </div>
          ) : (interventions ?? []).length === 0 ? (
            <div className="text-center py-12">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {activeTab === 'active' && 'No active interventions'}
                {activeTab === 'paused' && 'No paused interventions'}
                {activeTab === 'disabled' && 'No disabled interventions'}
              </p>
              {activeTab === 'paused' && (
                <p className="text-sm text-gray-500 mt-2">
                  Interventions start paused by default. Enable them when ready.
                </p>
              )}
              {activeTab === 'active' && (
                <p className="text-sm text-gray-500 mt-2">
                  Create an intervention, then enable it to make it active.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(interventions ?? []).map((intervention) => {
                const metadata = INTERVENTION_METADATA[intervention.intervention_key];
                const isLoading = actionLoading === intervention.id;

                if (!metadata) {
                  if (import.meta.env.DEV) {
                    console.warn('[InterventionsDashboard] Missing metadata for:', intervention.intervention_key);
                  }
                  return (
                    <div
                      key={intervention.id}
                      className="border border-gray-200 rounded-lg p-5 bg-gray-50"
                    >
                      <p className="text-sm text-gray-600">
                        This intervention type is not recognized. It may have been created with an older version.
                      </p>
                      <button
                        onClick={() => handleDelete(intervention.id)}
                        className="mt-3 text-sm text-red-600 hover:text-red-700"
                      >
                        Delete this intervention
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={intervention.id}
                    className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{metadata?.name ?? 'Unknown Intervention'}</h3>
                        <p className="text-sm text-gray-600 mt-1">{metadata?.description ?? 'No description available'}</p>

                        {intervention.paused_by_safe_mode && (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                            <AlertCircle className="w-4 h-4" />
                            Paused by Safe Mode
                          </div>
                        )}

                        {intervention.why_text && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Why you created this:</span> {intervention.why_text}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                          <span>Created: {new Date(intervention.created_at).toLocaleDateString()}</span>
                          {intervention.enabled_at && (
                            <span>Last enabled: {new Date(intervention.enabled_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {intervention.status === 'active' && (
                          <button
                            onClick={() => handlePause(intervention.id)}
                            disabled={isLoading}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Pause"
                          >
                            <Pause className="w-5 h-5" />
                          </button>
                        )}

                        {(intervention.status === 'paused' || intervention.status === 'disabled') && (
                          <button
                            onClick={() => handleEnable(intervention.id)}
                            disabled={isLoading}
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Enable"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleEdit(intervention)}
                          disabled={isLoading}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>

                        {intervention.status !== 'disabled' && (
                          <button
                            onClick={() => handleDisable(intervention.id)}
                            disabled={isLoading}
                            className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Disable"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(intervention.id)}
                          disabled={isLoading}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
