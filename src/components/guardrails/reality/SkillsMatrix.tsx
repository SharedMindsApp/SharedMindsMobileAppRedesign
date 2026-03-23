import { useState, useEffect } from 'react';
import { Award, Plus, Pencil, Trash2, Loader, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { UserSkill, ProjectRequiredSkill } from '../../../lib/guardrailsTypes';
import { AddSkillModal } from './AddSkillModal';
import { AddRequiredSkillModal } from './AddRequiredSkillModal';
import { SkillsMap } from './SkillsMap';
import { SkillDetailModal } from '../../skills/SkillDetailModal';

interface SkillsMatrixProps {
  masterProjectId: string;
}

export function SkillsMatrix({ masterProjectId }: SkillsMatrixProps) {
  // Use the new SkillsMap component with Guardrails mode
  return <SkillsMap masterProjectId={masterProjectId} mode="guardrails" />;
}

// Legacy component kept for backward compatibility
export function SkillsMatrixLegacy({ masterProjectId }: SkillsMatrixProps) {
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<ProjectRequiredSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [showAddRequiredModal, setShowAddRequiredModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [editingRequired, setEditingRequired] = useState<ProjectRequiredSkill | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [userSkillsRes, requiredSkillsRes] = await Promise.all([
        supabase.from('user_skills').select('*').eq('user_id', user.id).order('name'),
        supabase
          .from('project_required_skills')
          .select('*')
          .eq('master_project_id', masterProjectId)
          .order('importance', { ascending: false }),
      ]);

      if (userSkillsRes.error) throw userSkillsRes.error;
      if (requiredSkillsRes.error) throw requiredSkillsRes.error;

      setUserSkills(userSkillsRes.data || []);
      setRequiredSkills(requiredSkillsRes.data || []);
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [masterProjectId]);

  const handleDeleteUserSkill = async (skillId: string) => {
    try {
      const { error } = await supabase.from('user_skills').delete().eq('id', skillId);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  const handleDeleteRequiredSkill = async (skillId: string) => {
    try {
      const { error } = await supabase.from('project_required_skills').delete().eq('id', skillId);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error('Failed to delete required skill:', err);
    }
  };

  const getSkillGapStatus = (skillName: string) => {
    const userSkill = userSkills.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
    const requiredSkill = requiredSkills.find(
      (s) => s.name.toLowerCase() === skillName.toLowerCase()
    );

    if (!requiredSkill) return null;
    if (!userSkill) return 'missing';
    if (userSkill.proficiency < requiredSkill.importance) return 'insufficient';
    return 'sufficient';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader size={32} className="text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading skills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Skills Matrix</h2>
        <p className="text-gray-600 mt-1">
          Manage your current skills and define project requirements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Your Skills</h3>
            </div>
            <button
              onClick={() => {
                setEditingSkill(null);
                setShowAddSkillModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={16} />
              Add Skill
            </button>
          </div>

          {userSkills.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm mb-2">No skills added yet</p>
              <p className="text-gray-500 text-xs">
                Start by listing what you're good at
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {userSkills.map((skill) => {
                const gapStatus = getSkillGapStatus(skill.name);
                return (
                  <div
                    key={skill.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                      gapStatus === 'insufficient'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => setSelectedSkillId(skill.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{skill.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">
                            Proficiency: {skill.proficiency}/5
                          </span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`w-2 h-2 rounded-full ${
                                  level <= skill.proficiency ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSkill(skill);
                            setShowAddSkillModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUserSkill(skill.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Required for Project</h3>
            </div>
            <button
              onClick={() => {
                setEditingRequired(null);
                setShowAddRequiredModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Plus size={16} />
              Add Requirement
            </button>
          </div>

          {requiredSkills.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm mb-2">No skill requirements defined</p>
              <p className="text-gray-500 text-xs">
                Define skills needed for this project
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {requiredSkills.map((skill) => {
                const gapStatus = getSkillGapStatus(skill.name);
                return (
                  <div
                    key={skill.id}
                    className={`p-3 rounded-lg border ${
                      gapStatus === 'missing'
                        ? 'bg-red-50 border-red-200'
                        : gapStatus === 'insufficient'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{skill.name}</h4>
                          {gapStatus === 'missing' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                              Missing
                            </span>
                          )}
                          {gapStatus === 'insufficient' && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                              Needs Improvement
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-600">
                            Importance: {skill.importance}/5
                          </span>
                          {skill.estimated_learning_hours > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <Clock size={12} />
                              {skill.estimated_learning_hours}h
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingRequired(skill);
                            setShowAddRequiredModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRequiredSkill(skill.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
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

      {showAddSkillModal && (
        <AddSkillModal
          skill={editingSkill}
          onClose={() => {
            setShowAddSkillModal(false);
            setEditingSkill(null);
          }}
          onSave={loadData}
        />
      )}

      {showAddRequiredModal && (
        <AddRequiredSkillModal
          masterProjectId={masterProjectId}
          skill={editingRequired}
          onClose={() => {
            setShowAddRequiredModal(false);
            setEditingRequired(null);
          }}
          onSave={loadData}
        />
      )}

      {/* Skill Detail Modal */}
      {selectedSkillId && (
        <SkillDetailModal
          isOpen={true}
          onClose={() => setSelectedSkillId(null)}
          skillId={selectedSkillId}
          mode="guardrails"
          permissions={{ can_view: true, can_edit: true, can_manage: true }}
        />
      )}
    </div>
  );
}
