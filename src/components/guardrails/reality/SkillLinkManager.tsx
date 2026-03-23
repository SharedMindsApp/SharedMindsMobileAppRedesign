/**
 * Skill Link Manager
 * 
 * UI for linking skills to habits, goals, projects, calendar events, etc.
 * Supports contextual linking (link is specific to a skill context).
 */

import { useState, useEffect } from 'react';
import { Plus, X, Link2, Target, BookOpen, FolderKanban, Calendar, FileText, GraduationCap, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  skillEntityLinksService,
  skillContextsService,
  type SkillEntityLink,
  type SkillContext,
} from '../../../lib/skillsService';

interface SkillLinkManagerProps {
  skillId: string;
  contextId?: string; // Optional: if provided, links are contextual
  onLinkChange?: () => void;
}

const ENTITY_TYPE_ICONS = {
  habit: Target,
  goal: BookOpen,
  project: FolderKanban,
  trip: Calendar,
  calendar_event: Calendar,
  journal_entry: FileText,
  learning_resource: GraduationCap,
};

const ENTITY_TYPE_LABELS: Record<SkillEntityLink['entity_type'], string> = {
  habit: 'Habit',
  goal: 'Goal',
  project: 'Project',
  trip: 'Trip',
  calendar_event: 'Calendar Event',
  journal_entry: 'Journal Entry',
  learning_resource: 'Learning Resource',
};

export function SkillLinkManager({ skillId, contextId, onLinkChange }: SkillLinkManagerProps) {
  const { user } = useAuth();
  const [links, setLinks] = useState<SkillEntityLink[]>([]);
  const [contexts, setContexts] = useState<SkillContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (user && skillId) {
      loadData();
    }
  }, [user, skillId, contextId]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [linksData, contextsData] = await Promise.all([
        skillEntityLinksService.getLinksForSkill(user.id, skillId, contextId),
        skillContextsService.getContextsForSkill(user.id, skillId),
      ]);
      setLinks(linksData);
      setContexts(contextsData);
    } catch (err) {
      console.error('Failed to load links:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('Remove this connection?')) return;
    try {
      await skillEntityLinksService.deleteLink(linkId);
      await loadData();
      onLinkChange?.();
    } catch (err) {
      console.error('Failed to delete link:', err);
      alert('Failed to delete link');
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading connections...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Connections</h4>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={12} />
          Add Connection
        </button>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-gray-500">
          No connections yet. Link this skill to habits, goals, projects, or other entities.
        </p>
      ) : (
        <div className="space-y-2">
          {links.map(link => {
            const Icon = ENTITY_TYPE_ICONS[link.entity_type];
            return (
              <div
                key={link.id}
                className="p-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Icon size={16} className="text-blue-600" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {ENTITY_TYPE_LABELS[link.entity_type]}
                    </span>
                    {link.link_notes && (
                      <p className="text-xs text-gray-600 mt-0.5">{link.link_notes}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(link.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove connection"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <LinkModal
          skillId={skillId}
          contextId={contextId}
          contexts={contexts}
          onClose={() => setShowAddModal(false)}
          onSave={async () => {
            await loadData();
            setShowAddModal(false);
            onLinkChange?.();
          }}
        />
      )}
    </div>
  );
}

// Link Add Modal
function LinkModal({
  skillId,
  contextId,
  contexts,
  onClose,
  onSave,
}: {
  skillId: string;
  contextId?: string;
  contexts: SkillContext[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { user } = useAuth();
  const [entityType, setEntityType] = useState<SkillEntityLink['entity_type']>('habit');
  const [entityId, setEntityId] = useState('');
  const [linkContextId, setLinkContextId] = useState<string | undefined>(contextId);
  const [linkNotes, setLinkNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [availableEntities, setAvailableEntities] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  useEffect(() => {
    if (user && entityType) {
      loadAvailableEntities();
    }
  }, [user, entityType]);

  const loadAvailableEntities = async () => {
    if (!user) return;
    setLoadingEntities(true);
    try {
      // TODO: Implement entity fetching based on type
      // For now, this is a placeholder
      setAvailableEntities([]);
    } catch (err) {
      console.error('Failed to load entities:', err);
    } finally {
      setLoadingEntities(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !entityId) return;

    setSaving(true);
    try {
      await skillEntityLinksService.createLink({
        skill_id: skillId,
        context_id: linkContextId || null,
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        link_notes: linkNotes.trim() || undefined,
      });
      onSave();
    } catch (err) {
      console.error('Failed to create link:', err);
      alert('Failed to create link');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Add Connection</h2>
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
              Connection Type *
            </label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value as SkillEntityLink['entity_type']);
                setEntityId(''); // Reset entity selection
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {contexts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context (optional)
              </label>
              <select
                value={linkContextId || ''}
                onChange={(e) => setLinkContextId(e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Global (all contexts)</option>
                {contexts.map(ctx => (
                  <option key={ctx.id} value={ctx.id}>
                    {ctx.context_type} {ctx.role_label ? `(${ctx.role_label})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                If set, this connection is specific to the selected context.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select {ENTITY_TYPE_LABELS[entityType]} *
            </label>
            {loadingEntities ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <select
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose {ENTITY_TYPE_LABELS[entityType]}</option>
                {availableEntities.map(entity => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              TODO: Implement entity search/selection based on type
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={linkNotes}
              onChange={(e) => setLinkNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Add context about this connection..."
            />
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
              disabled={saving || !entityId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Link2 size={16} />
              {saving ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}






