/**
 * Skill Planning Panel
 * 
 * Optional, non-binding planning interface for skills.
 * Allows users to express intentions without creating pressure or expectations.
 * 
 * PRINCIPLES:
 * - Planning is optional
 * - No metrics or targets
 * - No deadlines or outcomes
 * - User-initiated only
 */

import { useState, useEffect } from 'react';
import { Calendar, Archive, Edit2, Save, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  skillPlanningService,
  type SkillPlan,
  type SkillPlanTimeframe,
} from '../../lib/skills/skillPlanningService';

interface SkillPlanningPanelProps {
  skillId: string;
  contextId?: string;
  mode: 'guardrails' | 'planner';
  canEdit: boolean;
  onPlanChange?: () => void;
}

const TIMEFRAME_LABELS: Record<SkillPlanTimeframe, string> = {
  short: 'Short-term',
  medium: 'Medium-term',
  long: 'Long-term',
  open: 'Open timeframe',
};

const TIMEFRAME_DESCRIPTIONS: Record<SkillPlanTimeframe, string> = {
  short: 'Weeks to months',
  medium: 'Months to a year',
  long: 'Year or more',
  open: 'No specific timeframe',
};

export function SkillPlanningPanel({
  skillId,
  contextId,
  mode,
  canEdit,
  onPlanChange,
}: SkillPlanningPanelProps) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<SkillPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [intentNote, setIntentNote] = useState('');
  const [timeframe, setTimeframe] = useState<SkillPlanTimeframe>('open');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && skillId) {
      loadPlan();
    }
  }, [user, skillId, contextId]);

  const loadPlan = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const planData = await skillPlanningService.getPlanForContext(
        user.id,
        skillId,
        contextId
      );
      setPlan(planData);
      if (planData) {
        setIntentNote(planData.intent_note || '');
        setTimeframe(planData.timeframe);
      } else {
        setIntentNote('');
        setTimeframe('open');
      }
    } catch (err) {
      console.error('Failed to load plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !canEdit) return;
    setSaving(true);
    try {
      if (plan) {
        // Update existing plan
        await skillPlanningService.updatePlan(plan.id, {
          intent_note: intentNote.trim() || null,
          timeframe,
        });
      } else {
        // Create new plan
        await skillPlanningService.createPlan({
          skill_id: skillId,
          context_id: contextId || null,
          user_id: user.id,
          timeframe,
          intent_note: intentNote.trim() || null,
        });
      }
      setEditing(false);
      await loadPlan();
      onPlanChange?.();
    } catch (err) {
      console.error('Failed to save plan:', err);
      alert('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!plan || !canEdit) return;
    if (!confirm('Archive this planning note? You can restore it later.')) return;
    
    try {
      await skillPlanningService.archivePlan(plan.id);
      await loadPlan();
      onPlanChange?.();
    } catch (err) {
      console.error('Failed to archive plan:', err);
      alert('Failed to archive plan');
    }
  };

  const handleCancel = () => {
    if (plan) {
      setIntentNote(plan.intent_note || '');
      setTimeframe(plan.timeframe);
    } else {
      setIntentNote('');
      setTimeframe('open');
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">Loading planning...</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            <strong>Planning is optional.</strong> This is a non-binding note about what you'd like this skill to support. No metrics, no deadlines, no pressure.
          </p>
        </div>
      </div>

      {/* Mode-specific framing */}
      {mode === 'guardrails' && (
        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
          <strong>Guardrails View:</strong> Capability planning and exposure planning.
        </div>
      )}
      {mode === 'planner' && (
        <div className="p-2 bg-violet-50 border border-violet-200 rounded text-xs text-violet-700">
          <strong>Planner View:</strong> Personal intention and supportive context.
        </div>
      )}

      {/* Plan Content */}
      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              What would you like this skill to support?
            </label>
            <textarea
              value={intentNote}
              onChange={(e) => setIntentNote(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Express your intention here... (optional)"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is a free-form note. No structure required, no validation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Timeframe (non-binding)
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as SkillPlanTimeframe)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {Object.entries(TIMEFRAME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label} — {TIMEFRAME_DESCRIPTIONS[value as SkillPlanTimeframe]}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This is an indicator only. It does not create deadlines or expectations.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : plan ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-gray-600" />
                <span className="text-xs font-medium text-gray-700">
                  {TIMEFRAME_LABELS[plan.timeframe]}
                </span>
              </div>
              {plan.intent_note && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {plan.intent_note}
                </p>
              )}
              {!plan.intent_note && (
                <p className="text-sm text-gray-500 italic">
                  No planning note yet.
                </p>
              )}
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit plan"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={handleArchive}
                  className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors"
                  title="Archive plan"
                >
                  <Archive size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">No planning note</p>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add planning note (optional)
            </button>
          )}
        </div>
      )}
    </div>
  );
}






