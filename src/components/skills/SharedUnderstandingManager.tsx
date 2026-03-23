/**
 * Shared Understanding Manager
 * 
 * Allows skill owners to manage explicit agreements that let others
 * observe and understand their skills without control or judgment.
 * 
 * PRINCIPLES:
 * - Everything is explicit and consent-based
 * - Owner retains full control
 * - No implicit inheritance
 * - All agreements are revocable
 */

import { useState, useEffect } from 'react';
import { X, Plus, Eye, Users, Shield, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  sharedUnderstandingService,
  type SharedUnderstandingAgreement,
  type SharedUnderstandingRole,
  type SharedUnderstandingScope,
  type SharedUnderstandingInteraction,
  type SharedUnderstandingVisibility,
} from '../../lib/skills/sharedUnderstandingService';
import {
  skillContextsService,
  skillsService,
  type SkillContext,
  type UserSkill,
} from '../../lib/skillsService';

interface SharedUnderstandingManagerProps {
  skillId?: string; // Optional: if provided, pre-select this skill
  contextId?: string; // Optional: if provided, pre-select this context
  onAgreementChange?: () => void;
}

const ROLE_LABELS: Record<SharedUnderstandingRole, string> = {
  observer: 'Observer',
  supporter: 'Supporter',
  guide: 'Guide',
  educator: 'Educator',
  mentor: 'Mentor',
  coach: 'Coach',
  therapist: 'Therapist',
  parent: 'Parent',
  partner: 'Partner',
  peer: 'Peer',
  manager: 'Manager',
  leader: 'Leader',
  student: 'Student',
  self: 'Self',
  custom: 'Custom',
};

const ROLE_DESCRIPTIONS: Record<SharedUnderstandingRole, string> = {
  observer: 'Neutral viewer, no interaction',
  supporter: 'Emotional or practical support (no edits)',
  guide: 'Can add reflections/questions (non-binding)',
  educator: 'Learning-oriented observer',
  mentor: 'Experience-based perspective',
  coach: 'Process-oriented observer (no outcomes)',
  therapist: 'Reflective, wellbeing-oriented',
  parent: 'Care-oriented perspective',
  partner: 'Shared life context',
  peer: 'Equal-level understanding',
  manager: 'Organisational context (no authority)',
  leader: 'Strategic context (no evaluation)',
  student: 'Reverse mentorship context',
  self: 'Explicit self-view mode',
  custom: 'User-defined label',
};

const SCOPE_LABELS: Record<SharedUnderstandingScope, string> = {
  skills_only: 'All Skills',
  specific_contexts: 'Specific Contexts',
  specific_skills: 'Specific Skills',
};

const INTERACTION_LABELS: Record<SharedUnderstandingInteraction, string> = {
  view_only: 'View Only',
  reflect: 'Add Reflections',
  ask_questions: 'Ask Questions',
};

const VISIBILITY_LABELS: Record<SharedUnderstandingVisibility, string> = {
  overview: 'Overview (Summary)',
  detailed: 'Detailed (Full Access)',
};

export function SharedUnderstandingManager({
  skillId,
  contextId,
  onAgreementChange,
}: SharedUnderstandingManagerProps) {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState<SharedUnderstandingAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [contexts, setContexts] = useState<SkillContext[]>([]);

  // Form state
  const [viewerEmail, setViewerEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<SharedUnderstandingRole>('supporter');
  const [customRoleLabel, setCustomRoleLabel] = useState('');
  const [selectedScope, setSelectedScope] = useState<SharedUnderstandingScope>('skills_only');
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>(contextId ? [contextId] : []);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(skillId ? [skillId] : []);
  const [selectedInteractions, setSelectedInteractions] = useState<SharedUnderstandingInteraction[]>(['view_only']);
  const [selectedVisibility, setSelectedVisibility] = useState<SharedUnderstandingVisibility>('overview');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [agreementsData, skillsData] = await Promise.all([
        sharedUnderstandingService.getAgreementsForOwner(user.id),
        skillsService.getAll(user.id),
      ]);
      setAgreements(agreementsData);
      setSkills(skillsData);

      // Load contexts for all skills
      const allContexts: SkillContext[] = [];
      for (const skill of skillsData) {
        const skillContexts = await skillContextsService.getContextsForSkill(user.id, skill.id);
        allContexts.push(...skillContexts);
      }
      setContexts(allContexts);
    } catch (err) {
      console.error('Failed to load shared understanding data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgreement = async () => {
    if (!user || !viewerEmail.trim()) return;

    // Find viewer by email (simplified - in production, use proper user lookup)
    // For now, we'll need to get the viewer_user_id from the email
    // This is a placeholder - you'll need to implement proper user lookup
    alert('User lookup by email not yet implemented. Please use user ID for now.');

    try {
      // TODO: Implement user lookup by email
      // const viewer = await getUserByEmail(viewerEmail);
      
      await sharedUnderstandingService.createAgreement({
        owner_user_id: user.id,
        viewer_user_id: '', // TODO: Get from email lookup
        role: selectedRole,
        role_label: selectedRole === 'custom' ? customRoleLabel : undefined,
        scope: selectedScope,
        context_ids: selectedScope === 'specific_contexts' ? selectedContextIds : undefined,
        skill_ids: selectedScope === 'specific_skills' ? selectedSkillIds : undefined,
        allowed_interactions: selectedInteractions,
        visibility_level: selectedVisibility,
      });

      setShowCreateForm(false);
      resetForm();
      await loadData();
      onAgreementChange?.();
    } catch (err) {
      console.error('Failed to create agreement:', err);
      alert('Failed to create agreement');
    }
  };

  const handleRevokeAgreement = async (agreementId: string) => {
    if (!confirm('Revoke this shared understanding agreement? The person will no longer have access.')) return;

    try {
      await sharedUnderstandingService.revokeAgreement(agreementId);
      await loadData();
      onAgreementChange?.();
    } catch (err) {
      console.error('Failed to revoke agreement:', err);
      alert('Failed to revoke agreement');
    }
  };

  const resetForm = () => {
    setViewerEmail('');
    setSelectedRole('supporter');
    setCustomRoleLabel('');
    setSelectedScope('skills_only');
    setSelectedContextIds(contextId ? [contextId] : []);
    setSelectedSkillIds(skillId ? [skillId] : []);
    setSelectedInteractions(['view_only']);
    setSelectedVisibility('overview');
  };

  const toggleInteraction = (interaction: SharedUnderstandingInteraction) => {
    setSelectedInteractions(prev =>
      prev.includes(interaction)
        ? prev.filter(i => i !== interaction)
        : [...prev, interaction]
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading shared understanding...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Shared Understanding</h3>
          <p className="text-sm text-gray-600 mt-1">
            Allow others to observe and understand your skills without control or judgment.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus size={16} />
          Share Understanding
        </button>
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Shield size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <strong>You retain full control.</strong> All agreements are explicit, consent-based, and can be revoked at any time. 
            Others can observe and support, but cannot edit, control, or evaluate your skills.
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Share Understanding</h4>
            <button
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Viewer Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Person to Share With
              </label>
              <input
                type="email"
                value={viewerEmail}
                onChange={(e) => setViewerEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                They will be able to view your skills based on the settings below.
              </p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role / Perspective
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as SharedUnderstandingRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[selectedRole]}</p>
              
              {selectedRole === 'custom' && (
                <input
                  type="text"
                  value={customRoleLabel}
                  onChange={(e) => setCustomRoleLabel(e.target.value)}
                  placeholder="Custom role label"
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scope
              </label>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value as SharedUnderstandingScope)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {selectedScope === 'specific_contexts' && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {contexts.map(ctx => (
                    <label key={ctx.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedContextIds.includes(ctx.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContextIds([...selectedContextIds, ctx.id]);
                          } else {
                            setSelectedContextIds(selectedContextIds.filter(id => id !== ctx.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-gray-700">{ctx.context_type}{ctx.role_label ? ` (${ctx.role_label})` : ''}</span>
                    </label>
                  ))}
                </div>
              )}

              {selectedScope === 'specific_skills' && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {skills.map(skill => (
                    <label key={skill.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedSkillIds.includes(skill.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSkillIds([...selectedSkillIds, skill.id]);
                          } else {
                            setSelectedSkillIds(selectedSkillIds.filter(id => id !== skill.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-gray-700">{skill.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Interactions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Interactions
              </label>
              <div className="space-y-2">
                {Object.entries(INTERACTION_LABELS).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedInteractions.includes(value as SharedUnderstandingInteraction)}
                      onChange={() => toggleInteraction(value as SharedUnderstandingInteraction)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility Level
              </label>
              <select
                value={selectedVisibility}
                onChange={(e) => setSelectedVisibility(e.target.value as SharedUnderstandingVisibility)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAgreement}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Share Understanding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agreements List */}
      {agreements.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <Users size={32} className="text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No shared understanding agreements yet</p>
          <p className="text-xs text-gray-500 mt-1">Share understanding with others to allow them to observe your skills</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agreements.map(agreement => (
            <div key={agreement.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={16} className="text-blue-600" />
                    <span className="font-medium text-gray-900">
                      {ROLE_LABELS[agreement.role]}
                      {agreement.role_label && ` (${agreement.role_label})`}
                    </span>
                    <span className="text-xs text-gray-500">
                      • {SCOPE_LABELS[agreement.scope]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Viewer: {agreement.viewer_user_id}</p>
                    <p>Interactions: {agreement.allowed_interactions.map(i => INTERACTION_LABELS[i]).join(', ')}</p>
                    <p>Visibility: {VISIBILITY_LABELS[agreement.visibility_level]}</p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(agreement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeAgreement(agreement.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Revoke agreement"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}






