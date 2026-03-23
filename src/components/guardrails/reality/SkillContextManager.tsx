/**
 * Skill Context Manager
 * 
 * UI for managing multiple contexts per skill.
 * Allows adding, editing, and deleting contexts.
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  skillContextsService,
  type SkillContext,
  type SkillContextType,
  type SkillContextStatus,
  type SkillContextVisibility,
  type SkillPressureLevel,
} from '../../../lib/skillsService';

interface SkillContextManagerProps {
  skillId: string;
  onContextChange?: () => void;
}

const CONTEXT_TYPE_LABELS: Record<SkillContextType, string> = {
  work: 'Work',
  education: 'Education',
  hobby: 'Hobby',
  life: 'Life',
  health: 'Health',
  therapy: 'Therapy',
  parenting: 'Parenting',
  coaching: 'Coaching',
  other: 'Other',
};

const PRESSURE_LEVEL_LABELS: Record<SkillPressureLevel, string> = {
  none: 'No Pressure',
  low: 'Low Pressure',
  moderate: 'Moderate Pressure',
  high: 'High Pressure',
};

export function SkillContextManager({ skillId, onContextChange }: SkillContextManagerProps) {
  const { user } = useAuth();
  const [contexts, setContexts] = useState<SkillContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContext, setEditingContext] = useState<SkillContext | null>(null);

  useEffect(() => {
    if (user && skillId) {
      loadContexts();
    }
  }, [user, skillId]);

  const loadContexts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await skillContextsService.getContextsForSkill(user.id, skillId);
      setContexts(data);
    } catch (err) {
      console.error('Failed to load contexts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contextId: string) => {
    if (!confirm('Delete this context? The skill will remain, but this context will be removed.')) {
      return;
    }
    try {
      await skillContextsService.deleteContext(contextId);
      await loadContexts();
      onContextChange?.();
    } catch (err) {
      console.error('Failed to delete context:', err);
      alert('Failed to delete context');
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading contexts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Contexts</h4>
        <button
          onClick={() => {
            setEditingContext(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={12} />
          Add Context
        </button>
      </div>

      {contexts.length === 0 ? (
        <p className="text-sm text-gray-500">No contexts defined. Add a context to see this skill through different lenses.</p>
      ) : (
        <div className="space-y-2">
          {contexts.map(context => (
            <div
              key={context.id}
              className="p-3 rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {CONTEXT_TYPE_LABELS[context.context_type]}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">({context.status})</span>
                  </div>
                  {context.role_label && (
                    <p className="text-xs text-gray-600">Role: {context.role_label}</p>
                  )}
                  {context.intent && (
                    <p className="text-xs text-gray-700 mt-1">{context.intent}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {context.confidence_level && (
                      <span className="text-xs text-gray-600">
                        Confidence: {context.confidence_level}/5
                      </span>
                    )}
                    <span className="text-xs text-gray-600">
                      {PRESSURE_LEVEL_LABELS[context.pressure_level]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingContext(context);
                      setShowAddModal(true);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit context"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(context.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete context"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <ContextModal
          skillId={skillId}
          context={editingContext}
          onClose={() => {
            setShowAddModal(false);
            setEditingContext(null);
          }}
          onSave={async () => {
            await loadContexts();
            setShowAddModal(false);
            setEditingContext(null);
            onContextChange?.();
          }}
        />
      )}
    </div>
  );
}

// Context Add/Edit Modal
function ContextModal({
  skillId,
  context,
  onClose,
  onSave,
}: {
  skillId: string;
  context: SkillContext | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { user } = useAuth();
  const [contextType, setContextType] = useState<SkillContextType>(context?.context_type || 'work');
  const [roleLabel, setRoleLabel] = useState(context?.role_label || '');
  const [intent, setIntent] = useState(context?.intent || '');
  const [confidenceLevel, setConfidenceLevel] = useState<number | undefined>(context?.confidence_level);
  const [pressureLevel, setPressureLevel] = useState<SkillPressureLevel>(context?.pressure_level || 'low');
  const [visibility, setVisibility] = useState<SkillContextVisibility>(context?.visibility || 'private');
  const [status, setStatus] = useState<SkillContextStatus>(context?.status || 'active');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      if (context) {
        // Update existing
        await skillContextsService.updateContext(context.id, {
          context_type: contextType,
          role_label: roleLabel.trim() || undefined,
          intent: intent.trim() || undefined,
          confidence_level: confidenceLevel,
          pressure_level: pressureLevel,
          visibility,
          status,
        });
      } else {
        // Create new
        await skillContextsService.createContext({
          skill_id: skillId,
          user_id: user.id,
          context_type: contextType,
          role_label: roleLabel.trim() || undefined,
          intent: intent.trim() || undefined,
          confidence_level: confidenceLevel,
          pressure_level: pressureLevel,
          visibility,
          status,
        });
      }
      onSave();
    } catch (err) {
      console.error('Failed to save context:', err);
      alert('Failed to save context');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {context ? 'Edit Context' : 'Add Context'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Context Type *
            </label>
            <select
              value={contextType}
              onChange={(e) => setContextType(e.target.value as SkillContextType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              {Object.entries(CONTEXT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Label (optional)
            </label>
            <input
              type="text"
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Manager, Student, Parent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intent (optional)
            </label>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Why does this skill matter in this context?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confidence Level (1-5)
              </label>
              <select
                value={confidenceLevel || ''}
                onChange={(e) => setConfidenceLevel(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Not set</option>
                {[1, 2, 3, 4, 5].map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pressure Level
              </label>
              <select
                value={pressureLevel}
                onChange={(e) => setPressureLevel(e.target.value as SkillPressureLevel)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PRESSURE_LEVEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as SkillContextVisibility)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="private">Private</option>
                <option value="shared">Shared</option>
                <option value="assessed">Assessed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SkillContextStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="background">Background</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Saving...' : context ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}






