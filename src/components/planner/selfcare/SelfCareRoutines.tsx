import { PlannerShell } from '../PlannerShell';
import { useState, useEffect } from 'react';
import { ListChecks, Plus, Trash2, Edit2, ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as selfCareService from '../../../lib/selfCareService';
import type { SelfCareRoutine } from '../../../lib/selfCareService';

export function SelfCareRoutines() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<SelfCareRoutine[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    routine_name: '',
    activities: [] as string[],
    frequency: '',
    newActivity: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const spaceId = await selfCareService.getPersonalSpaceId();
      setHouseholdId(spaceId);
      if (spaceId) {
        const data = await selfCareService.getSelfCareRoutines(spaceId);
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
        await selfCareService.updateSelfCareRoutine(editingId, {
          routine_name: formData.routine_name,
          activities: formData.activities,
          frequency: formData.frequency,
        });
      } else {
        await selfCareService.createSelfCareRoutine({
          household_id: householdId,
          routine_name: formData.routine_name,
          activities: formData.activities,
          frequency: formData.frequency,
        });
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving routine:', error);
    }
  };

  const handleEdit = (routine: SelfCareRoutine) => {
    setEditingId(routine.id);
    setFormData({
      routine_name: routine.routine_name,
      activities: routine.activities || [],
      frequency: routine.frequency || '',
      newActivity: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this routine?')) return;
    try {
      await selfCareService.deleteSelfCareRoutine(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting routine:', error);
    }
  };

  const handleComplete = async (routineId: string) => {
    try {
      await selfCareService.completeRoutine(routineId);
      alert('Routine completed!');
    } catch (error) {
      console.error('Error completing routine:', error);
    }
  };

  const addActivity = () => {
    if (formData.newActivity.trim()) {
      setFormData({
        ...formData,
        activities: [...formData.activities, formData.newActivity.trim()],
        newActivity: '',
      });
    }
  };

  const removeActivity = (index: number) => {
    setFormData({
      ...formData,
      activities: formData.activities.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setFormData({
      routine_name: '',
      activities: [],
      frequency: '',
      newActivity: '',
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Self-Care Routines</h1>
                <p className="text-slate-600">Build repeatable care habits</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Routine Name</label>
                <input
                  type="text"
                  value={formData.routine_name}
                  onChange={(e) => setFormData({ ...formData, routine_name: e.target.value })}
                  placeholder="e.g., Morning Self-Care"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                <input
                  type="text"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="e.g., Daily, 3x/week, When needed"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Activities</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.newActivity}
                    onChange={(e) => setFormData({ ...formData, newActivity: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addActivity())}
                    placeholder="Add an activity..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={addActivity}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.activities.map((activity, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg">
                      <span className="flex-1 text-slate-700">{activity}</span>
                      <button
                        type="button"
                        onClick={() => removeActivity(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.activities.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No activities added yet</p>
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
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
              <ListChecks className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No routines yet</h3>
              <p className="text-slate-600 mb-4">Create repeatable self-care habits</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create Your First Routine
              </button>
            </div>
          ) : (
            routines.filter(r => r.is_active).map((routine) => (
              <div key={routine.id} className="bg-white rounded-lg p-6 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-800 mb-1">{routine.routine_name}</h3>
                    {routine.frequency && (
                      <p className="text-sm text-slate-500">Frequency: {routine.frequency}</p>
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

                <div className="space-y-2 mb-4">
                  {routine.activities && routine.activities.length > 0 ? (
                    routine.activities.map((activity, index) => (
                      <div key={index} className="flex items-center gap-2 text-slate-700">
                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span>{activity}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No activities defined</p>
                  )}
                </div>

                <button
                  onClick={() => handleComplete(routine.id)}
                  className="w-full py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Check className="w-4 h-4" />
                  Mark as Completed Today
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
