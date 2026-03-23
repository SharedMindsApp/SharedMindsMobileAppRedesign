import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { ProjectRequiredSkill } from '../../../lib/guardrailsTypes';

interface AddRequiredSkillModalProps {
  masterProjectId: string;
  skill: ProjectRequiredSkill | null;
  onClose: () => void;
  onSave: () => void;
}

export function AddRequiredSkillModal({
  masterProjectId,
  skill,
  onClose,
  onSave,
}: AddRequiredSkillModalProps) {
  const [name, setName] = useState('');
  const [importance, setImportance] = useState(3);
  const [learningHours, setLearningHours] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setImportance(skill.importance);
      setLearningHours(skill.estimated_learning_hours);
    }
  }, [skill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (skill) {
        const { error } = await supabase
          .from('project_required_skills')
          .update({
            name,
            importance,
            estimated_learning_hours: learningHours,
          })
          .eq('id', skill.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('project_required_skills').insert({
          master_project_id: masterProjectId,
          name,
          importance,
          estimated_learning_hours: learningHours,
        });
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save required skill:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {skill ? 'Edit Required Skill' : 'Add Required Skill'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skill Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., React, Python, UI Design"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Importance Level: {importance}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={importance}
              onChange={(e) => setImportance(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Nice to have</span>
              <span>Important</span>
              <span>Critical</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Learning Hours
            </label>
            <input
              type="number"
              min="0"
              value={learningHours}
              onChange={(e) => setLearningHours(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., 20"
            />
            <p className="text-xs text-gray-500 mt-1">
              How many hours to learn this skill if missing
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : skill ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
