/**
 * Stage 3.5: Intervention Governance Panel
 *
 * User-defined meta-control for interventions.
 *
 * CRITICAL: This governs the system, not the user.
 * - NO judgment about user behavior
 * - NO system recommendations
 * - ALL limits user-defined
 * - Limits are warnings only, never blocks
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, Settings, Pause, Play, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getGovernanceSettings,
  upsertGovernanceSettings,
  listGovernanceRules,
  createGovernanceRule,
  updateGovernanceRule,
  deleteGovernanceRule,
  computeGovernanceOverview,
  pauseAllInterventions,
  pauseInterventionsByType,
  pauseAllExceptManual,
} from '../../lib/interventions/stage3_5-service';
import { listInterventions } from '../../lib/interventions/stage3_1-service';
import type {
  GovernanceSettings,
  GovernanceRule,
  GovernanceOverview,
} from '../../lib/interventions/stage3_5-types';
import type { InterventionRegistryEntry } from '../../lib/interventions/stage3_1-types';

export function GovernancePanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'limits' | 'rules' | 'actions'>(
    'overview'
  );
  const [settings, setSettings] = useState<GovernanceSettings | null>(null);
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [interventions, setInterventions] = useState<InterventionRegistryEntry[]>([]);
  const [overview, setOverview] = useState<GovernanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadAll();
    }
  }, [user]);

  async function loadAll() {
    if (!user) return;

    setLoading(true);
    try {
      const [settingsData, rulesData, interventionsData] = await Promise.all([
        getGovernanceSettings(user.id),
        listGovernanceRules(user.id, { status: 'active' }),
        listInterventions(user.id, {}),
      ]);

      setSettings(settingsData);
      setRules(rulesData);
      setInterventions(interventionsData);

      const overviewData = await computeGovernanceOverview(user.id, interventionsData);
      setOverview(overviewData);
    } catch (error) {
      console.error('Failed to load governance data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePauseAll() {
    if (!user) return;
    if (!confirm('Pause all responses? This will not delete them.')) return;

    try {
      await pauseAllInterventions(user.id);
      await loadAll();
    } catch (error) {
      console.error('Failed to pause all responses:', error);
    }
  }

  async function handlePauseReminders() {
    if (!user) return;
    if (!confirm('Pause all reminders? This will not delete them.')) return;

    try {
      await pauseInterventionsByType(user.id, 'implementation_intention_reminder');
      await loadAll();
    } catch (error) {
      console.error('Failed to pause reminders:', error);
    }
  }

  async function handlePauseExceptManual() {
    if (!user) return;
    if (!confirm('Pause everything except manual tools? This will not delete them.')) return;

    try {
      await pauseAllExceptManual(user.id);
      await loadAll();
    } catch (error) {
      console.error('Failed to pause interventions:', error);
    }
  }

  async function handleToggleRule(ruleId: string, currentStatus: string) {
    if (!user) return;

    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await updateGovernanceRule(user.id, ruleId, { status: newStatus });
      await loadAll();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!user) return;
    if (!confirm('Delete this governance rule?')) return;

    try {
      await deleteGovernanceRule(user.id, ruleId);
      await loadAll();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <h1 className="text-2xl font-bold text-gray-900">Limits & Control</h1>
            <p className="text-sm text-gray-600 mt-1">
              You decide how much influence the system is allowed to have
            </p>
          </div>

          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('limits')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'limits'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Limits
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'rules'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Rules
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'actions'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Quick Actions
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && overview && (
              <OverviewTab overview={overview} interventions={interventions} />
            )}
            {activeTab === 'limits' && (
              <LimitsTab
                settings={settings}
                overview={overview}
                onUpdate={loadAll}
                userId={user?.id || ''}
              />
            )}
            {activeTab === 'rules' && (
              <RulesTab
                rules={rules}
                onToggle={handleToggleRule}
                onDelete={handleDeleteRule}
                onCreate={() => setShowRuleModal(true)}
              />
            )}
            {activeTab === 'actions' && (
              <ActionsTab
                onPauseAll={handlePauseAll}
                onPauseReminders={handlePauseReminders}
                onPauseExceptManual={handlePauseExceptManual}
              />
            )}
          </div>
        </div>
      </div>

      {showRuleModal && (
        <CreateRuleModal
          userId={user?.id || ''}
          onClose={() => setShowRuleModal(false)}
          onCreated={loadAll}
        />
      )}
    </div>
  );
}

function OverviewTab({
  overview,
  interventions,
}: {
  overview: GovernanceOverview;
  interventions: InterventionRegistryEntry[];
}) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          These are the responses you currently have available. All of these were created by
          you. You can pause or adjust any of them at any time.
        </p>
      </div>

      {(overview?.active_warnings ?? []).length > 0 && (
        <div className="space-y-3">
          {(overview?.active_warnings ?? []).map((warning, idx) => (
            <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 font-medium mb-1">{warning.message}</p>
                  <p className="text-sm text-gray-600">
                    Nothing has been changed. If you want, you can pause or disable some.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Active</p>
          <p className="text-3xl font-bold text-gray-900">{overview?.total_active ?? 0}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Paused</p>
          <p className="text-3xl font-bold text-gray-900">{overview?.total_paused ?? 0}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Disabled</p>
          <p className="text-3xl font-bold text-gray-900">{overview?.total_disabled ?? 0}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">By Category</h3>
        <div className="space-y-2">
          {Object.entries(overview?.breakdown_by_category ?? {}).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">{category}</span>
              <span className="text-sm text-gray-600">{count} active</span>
            </div>
          ))}
          {Object.keys(overview?.breakdown_by_category ?? {}).length === 0 && (
            <p className="text-sm text-gray-500 italic">No categories yet</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Responses</h3>
        <div className="space-y-3">
          {(interventions ?? [])
            .filter((i) => i.status === 'active')
            .map((intervention) => (
              <InterventionCard key={intervention.id} intervention={intervention} />
            ))}
          {(interventions ?? []).filter((i) => i.status === 'active').length === 0 && (
            <p className="text-sm text-gray-500 italic">No active responses</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InterventionCard({ intervention }: { intervention: InterventionRegistryEntry }) {
  const params = intervention.user_parameters as any;
  let displayText = 'No description';
  let appearanceMode = 'Manual only';

  if (intervention.intervention_key === 'implementation_intention_reminder') {
    displayText = params.reminder_text || 'No text';
    if (params.trigger_condition) {
      appearanceMode = `Foreground trigger: ${params.trigger_condition}`;
    }
  } else if (intervention.intervention_key === 'context_aware_prompt') {
    displayText = params.prompt_text || 'No text';
    if (params.context_trigger) {
      appearanceMode = `Foreground trigger: ${params.context_trigger}`;
    }
  } else if (intervention.intervention_key === 'scheduled_reflection_prompt') {
    displayText = params.prompt_text || 'No text';
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{displayText}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span>Type: {getInterventionLabel(intervention.intervention_key)}</span>
            <span>
              Created:{' '}
              {new Date(intervention.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">How it appears: {appearanceMode}</p>
        </div>
      </div>
    </div>
  );
}

function LimitsTab({
  settings,
  overview,
  onUpdate,
  userId,
}: {
  settings: GovernanceSettings | null;
  overview: GovernanceOverview | null;
  onUpdate: () => void;
  userId: string;
}) {
  const [maxActive, setMaxActive] = useState<string>(
    settings?.max_active_interventions?.toString() || ''
  );
  const [maxReminders, setMaxReminders] = useState<string>(
    settings?.max_reminders?.toString() || ''
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await upsertGovernanceSettings(userId, {
        max_active_interventions: maxActive ? parseInt(maxActive) : null,
        max_reminders: maxReminders ? parseInt(maxReminders) : null,
      });
      await onUpdate();
    } catch (error) {
      console.error('Failed to save limits:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700 mb-2">
          Limits are self-authored warnings, not blocks.
        </p>
        <p className="text-sm text-gray-700">
          If you exceed a limit, you will see a notice. Nothing will be changed automatically.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Maximum Active Responses
          </label>
          <input
            type="number"
            min="1"
            value={maxActive}
            onChange={(e) => setMaxActive(e.target.value)}
            placeholder="No limit"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-600 mt-1">
            Leave empty for no limit. Current active: {overview?.total_active || 0}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Maximum Reminders
          </label>
          <input
            type="number"
            min="1"
            value={maxReminders}
            onChange={(e) => setMaxReminders(e.target.value)}
            placeholder="No limit"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-600 mt-1">
            Leave empty for no limit.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Limits'}
        </button>
      </div>
    </div>
  );
}

function RulesTab({
  rules,
  onToggle,
  onDelete,
  onCreate,
}: {
  rules: GovernanceRule[];
  onToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          Rules constrain when responses are allowed to appear. They do not judge
          your behavior or adapt automatically.
        </p>
      </div>

      <button
        onClick={onCreate}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Create Rule
      </button>

      <div className="space-y-3">
        {(rules ?? []).map((rule) => (
          <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{getRuleLabel(rule)}</p>
                <p className="text-sm text-gray-600 mt-1">{getRuleDescription(rule)}</p>
                <p className="text-sm text-gray-500 mt-2">
                  This rule exists because you created it. You can edit or remove it anytime.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggle(rule.id, rule.status)}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                  title={rule.status === 'active' ? 'Pause' : 'Resume'}
                >
                  {rule.status === 'active' ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button
                  onClick={() => onDelete(rule.id)}
                  className="p-2 text-red-600 hover:text-red-700 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {(rules ?? []).length === 0 && (
          <p className="text-sm text-gray-500 italic">No governance rules created</p>
        )}
      </div>
    </div>
  );
}

function ActionsTab({
  onPauseAll,
  onPauseReminders,
  onPauseExceptManual,
}: {
  onPauseAll: () => void;
  onPauseReminders: () => void;
  onPauseExceptManual: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          Quick actions for bulk, reversible changes. These do not delete responses.
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={onPauseAll}
          className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Pause className="text-gray-600" size={24} />
            <div>
              <p className="font-medium text-gray-900">Pause All Responses</p>
              <p className="text-sm text-gray-600">Temporarily pause everything</p>
            </div>
          </div>
        </button>

        <button
          onClick={onPauseReminders}
          className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Pause className="text-gray-600" size={24} />
            <div>
              <p className="font-medium text-gray-900">Pause All Reminders</p>
              <p className="text-sm text-gray-600">Pause only reminder-type responses</p>
            </div>
          </div>
        </button>

        <button
          onClick={onPauseExceptManual}
          className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Settings className="text-gray-600" size={24} />
            <div>
              <p className="font-medium text-gray-900">Pause Everything Except Manual Tools</p>
              <p className="text-sm text-gray-600">Keep only manually-invoked responses active</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function CreateRuleModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [ruleType, setRuleType] = useState<'time_window' | 'context_exclusion'>('time_window');
  const [allowedDays, setAllowedDays] = useState<string[]>([]);
  const [excludeFocus, setExcludeFocus] = useState(false);
  const [creating, setCreating] = useState(false);

  const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  async function handleCreate() {
    setCreating(true);
    try {
      if (ruleType === 'time_window' && allowedDays.length > 0) {
        await createGovernanceRule(userId, 'time_window', {
          type: 'time_window',
          allowed_days: allowedDays,
        });
      } else if (ruleType === 'context_exclusion' && excludeFocus) {
        await createGovernanceRule(userId, 'context_exclusion', {
          type: 'context_exclusion',
          excluded_contexts: ['focus_mode'],
        });
      }
      await onCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create rule:', error);
    } finally {
      setCreating(false);
    }
  }

  function toggleDay(day: string) {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Rule</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Rule Type</label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="time_window">Time Window (allowed days)</option>
              <option value="context_exclusion">Context Exclusion</option>
            </select>
          </div>

          {ruleType === 'time_window' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Allowed Days</label>
              <div className="space-y-2">
                {allDays.map((day) => (
                  <label key={day} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allowedDays.includes(day)}
                      onChange={() => toggleDay(day)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 capitalize">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {ruleType === 'context_exclusion' && (
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={excludeFocus}
                  onChange={(e) => setExcludeFocus(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">
                  No responses when Focus Mode is active
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || (ruleType === 'time_window' && allowedDays.length === 0)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getInterventionLabel(key: string): string {
  switch (key) {
    case 'implementation_intention_reminder':
      return 'Reminder';
    case 'context_aware_prompt':
      return 'Prompt';
    case 'scheduled_reflection_prompt':
      return 'Reflection';
    default:
      return 'Intervention';
  }
}

function getRuleLabel(rule: GovernanceRule): string {
  switch (rule.rule_type) {
    case 'time_window':
      return 'Time Window Rule';
    case 'session_cap':
      return 'Session Cap Rule';
    case 'context_exclusion':
      return 'Context Exclusion Rule';
    default:
      return 'Governance Rule';
  }
}

function getRuleDescription(rule: GovernanceRule): string {
  if (rule.rule_type === 'time_window') {
    const params = rule.rule_parameters as any;
    if (params?.allowed_days && Array.isArray(params.allowed_days) && params.allowed_days.length > 0) {
      return `Interventions allowed only on: ${(params.allowed_days ?? []).map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}`;
    }
  } else if (rule.rule_type === 'context_exclusion') {
    const params = rule.rule_parameters as any;
    if (params?.excluded_contexts?.includes('focus_mode')) {
      return 'No interventions during Focus Mode';
    }
  } else if (rule.rule_type === 'session_cap') {
    const params = rule.rule_parameters as any;
    return `Maximum ${params.max_per_session} intervention(s) per session`;
  }
  return 'Custom rule';
}
