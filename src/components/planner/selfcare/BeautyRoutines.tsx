import { PlannerShell } from '../PlannerShell';
import { useState, useEffect } from 'react';
import { Flower2, Plus, Trash2, Edit2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as selfCareService from '../../../lib/selfCareService';
import type { BeautyRoutine } from '../../../lib/selfCareService';

const routineTypes = ['morning', 'evening', 'weekly', 'other'] as const;

export function BeautyRoutines() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<BeautyRoutine[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    routine_name: '',
    routine_type: '' as typeof routineTypes[number] | '',
    steps: [] as string[],
    frequency: '',
    newStep: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const spaceId = await selfCareService.getPersonalSpaceId();
      setHouseholdId(spaceId);
      if (spaceId) {
        const data = await selfCareService.getBeautyRoutines(spaceId);
        setRoutines(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;

    try {
      if (editingId) {
        await selfCareService.updateBeautyRoutine(editingId, {
          routine_name: formData.routine_name,
          routine_type: formData.routine_type || undefined,
          steps: formData.steps,
          frequency: formData.frequency,
        });
      } else {
        await selfCareService.createBeautyRoutine({
          household_id: householdId,
          routine_name: formData.routine_name,
          routine_type: formData.routine_type || undefined,
          steps: formData.steps,
          frequency: formData.frequency,
        });
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving routine:', error);
    }
  };

  const handleEdit = (routine: BeautyRoutine) => {
    setEditingId(routine.id);
    setFormData({
      routine_name: routine.routine_name,
      routine_type: routine.routine_type || '',
      steps: routine.steps || [],
      frequency: routine.frequency || '',
      newStep: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this routine?')) return;
    try {
      await selfCareService.deleteBeautyRoutine(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting routine:', error);
    }
  };

  const addStep = () => {
    if (formData.newStep.trim()) {
      setFormData({
        ...formData,
        steps: [...formData.steps, formData.newStep.trim()],
        newStep: '',
      });
    }
  };

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setFormData({
      routine_name: '',
      routine_type: '',
      steps: [],
      frequency: '',
      newStep: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-4xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/selfcare')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Self-Care</span>
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                <Flower2 className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Beauty & Skincare</h1>
                <p className="text-slate-600">Practical self-maintenance tracking</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Routine
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 mb-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">
              {editingId ? 'Edit Routine' : 'New Routine'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Routine Name</label>
                  <input
                    type="text"
                    value={formData.routine_name}
                    onChange={(e) => setFormData({ ...formData, routine_name: e.target.value })}
                    placeholder="e.g., Morning Skincare"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.routine_type}
                    onChange={(e) => setFormData({ ...formData, routine_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                  >
                    <option value="">Not specified</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="weekly">Weekly</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                <input
                  type="text"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="e.g., Daily, 2x week"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Steps</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.newStep}
                    onChange={(e) => setFormData({ ...formData, newStep: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
                    placeholder="Add a step..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                  />
                  <button
                    type="button"
                    onClick={addStep}
                    className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg">
                      <span className="text-slate-500 font-medium">{index + 1}.</span>
                      <span className="flex-1 text-slate-700">{step}</span>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.steps.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No steps added yet</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                  {editingId ? 'Update' : 'Create'} Routine
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {routines.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Flower2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No routines yet</h3>
              <p className="text-slate-600 mb-4">Track your skincare and beauty practices</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                Create Your First Routine
              </button>
            </div>
          ) : (
            routines.map((routine) => (
              <div key={routine.id} className="bg-white rounded-lg p-6 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold text-slate-800">{routine.routine_name}</h3>
                      {routine.routine_type && (
                        <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full capitalize">
                          {routine.routine_type}
                        </span>
                      )}
                    </div>
                    {routine.frequency && (
                      <p className="text-sm text-slate-500">{routine.frequency}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(routine)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(routine.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {routine.steps && routine.steps.length > 0 && (
                  <div className="space-y-2">
                    {routine.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-2 text-slate-700">
                        <span className="text-pink-500 font-medium mt-0.5">{index + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {routine.last_completed && (
                  <p className="text-xs text-slate-500 mt-4">
                    Last completed: {new Date(routine.last_completed).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
