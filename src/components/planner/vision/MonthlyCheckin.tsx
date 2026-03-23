import { PlannerShell } from '../PlannerShell';
import { CheckCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getMonthlyCheckins, createMonthlyCheckin, updateMonthlyCheckin, deleteMonthlyCheckin, type MonthlyCheckin as MonthlyCheckinType } from '../../../lib/visionService';

export function MonthlyCheckin() {
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<MonthlyCheckinType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCheckin, setEditingCheckin] = useState<MonthlyCheckinType | null>(null);
  const [formData, setFormData] = useState({
    checkin_date: new Date().toISOString().split('T')[0],
    what_felt_aligned: '',
    what_didnt_feel_aligned: '',
    small_adjustment: '',
    overall_feeling: ''
  });

  useEffect(() => {
    loadCheckins();
  }, []);

  const loadCheckins = async () => {
    try {
      const data = await getMonthlyCheckins();
      setCheckins(data);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCheckin) {
        await updateMonthlyCheckin(editingCheckin.id, formData);
      } else {
        await createMonthlyCheckin(formData);
      }
      await loadCheckins();
      resetForm();
    } catch (error) {
      console.error('Error saving check-in:', error);
      alert('Failed to save check-in. Please try again.');
    }
  };

  const handleEdit = (checkin: MonthlyCheckinType) => {
    setEditingCheckin(checkin);
    setFormData({
      checkin_date: checkin.checkin_date,
      what_felt_aligned: checkin.what_felt_aligned || '',
      what_didnt_feel_aligned: checkin.what_didnt_feel_aligned || '',
      small_adjustment: checkin.small_adjustment || '',
      overall_feeling: checkin.overall_feeling || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this check-in?')) return;
    try {
      await deleteMonthlyCheckin(id);
      await loadCheckins();
    } catch (error) {
      console.error('Error deleting check-in:', error);
      alert('Failed to delete check-in. Please try again.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCheckin(null);
    setFormData({
      checkin_date: new Date().toISOString().split('T')[0],
      what_felt_aligned: '',
      what_didnt_feel_aligned: '',
      small_adjustment: '',
      overall_feeling: ''
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-5xl mx-auto p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-slate-700" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Monthly Check-In</h1>
              </div>
              <p className="text-slate-600">Lightweight alignment tracking</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Check-In
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingCheckin ? 'Edit Check-In' : 'New Monthly Check-In'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  value={formData.checkin_date}
                  onChange={(e) => setFormData({ ...formData, checkin_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What Felt Aligned
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={3}
                  placeholder="What felt in sync with your vision this month?"
                  value={formData.what_felt_aligned}
                  onChange={(e) => setFormData({ ...formData, what_felt_aligned: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What Didn't Feel Aligned
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={3}
                  placeholder="What felt off or misaligned?"
                  value={formData.what_didnt_feel_aligned}
                  onChange={(e) => setFormData({ ...formData, what_didnt_feel_aligned: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Small Adjustment
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={2}
                  placeholder="One small thing you might adjust going forward"
                  value={formData.small_adjustment}
                  onChange={(e) => setFormData({ ...formData, small_adjustment: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Overall Feeling
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={2}
                  placeholder="How are you feeling overall?"
                  value={formData.overall_feeling}
                  onChange={(e) => setFormData({ ...formData, overall_feeling: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
                >
                  {editingCheckin ? 'Update Check-In' : 'Save Check-In'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {checkins.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No check-ins yet</h3>
              <p className="text-slate-600 mb-4">
                Quick monthly reflections help you stay aligned with your vision
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
              >
                Add Your First Check-In
              </button>
            </div>
          ) : (
            checkins.map((checkin) => (
              <div key={checkin.id} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{formatDate(checkin.checkin_date)}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(checkin)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(checkin.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {checkin.what_felt_aligned && (
                    <div>
                      <p className="text-sm font-medium text-emerald-700 mb-1">What Felt Aligned</p>
                      <p className="text-slate-600">{checkin.what_felt_aligned}</p>
                    </div>
                  )}

                  {checkin.what_didnt_feel_aligned && (
                    <div>
                      <p className="text-sm font-medium text-amber-700 mb-1">What Didn't Feel Aligned</p>
                      <p className="text-slate-600">{checkin.what_didnt_feel_aligned}</p>
                    </div>
                  )}

                  {checkin.small_adjustment && (
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Small Adjustment</p>
                      <p className="text-slate-600">{checkin.small_adjustment}</p>
                    </div>
                  )}

                  {checkin.overall_feeling && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-sm font-medium text-slate-700 mb-1">Overall Feeling</p>
                      <p className="text-slate-600">{checkin.overall_feeling}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
