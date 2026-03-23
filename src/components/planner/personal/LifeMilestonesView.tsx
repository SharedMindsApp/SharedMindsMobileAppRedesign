import { useState, useEffect } from 'react';
import { Award, Plus, Lock, Users, Trash2, Calendar as CalendarIcon, Edit2, Flag, Star } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { milestonesService, type Milestone } from '../../../lib/personalDevelopmentService';

export function LifeMilestonesView() {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    reflection: '',
    milestone_date: new Date().toISOString().split('T')[0],
    is_approximate_date: false,
    category: '',
    tags: [] as string[],
    is_private: true
  });

  const categories = [
    'Personal Achievement',
    'Career',
    'Education',
    'Relationships',
    'Health',
    'Creative',
    'Travel',
    'Financial',
    'Other'
  ];

  useEffect(() => {
    if (user) {
      loadMilestones();
    }
  }, [user]);

  const loadMilestones = async () => {
    if (!user) return;
    try {
      const data = await milestonesService.getAll(user.id);
      setMilestones(data);
    } catch (error) {
      console.error('Error loading milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = async () => {
    if (!user || !newMilestone.title.trim()) return;

    try {
      await milestonesService.create({
        user_id: user.id,
        space_id: null,
        title: newMilestone.title,
        description: newMilestone.description || undefined,
        reflection: newMilestone.reflection || undefined,
        milestone_date: newMilestone.milestone_date,
        is_approximate_date: newMilestone.is_approximate_date,
        category: newMilestone.category || undefined,
        tags: newMilestone.tags.length > 0 ? newMilestone.tags : undefined,
        is_private: newMilestone.is_private
      });

      resetForm();
      loadMilestones();
    } catch (error) {
      console.error('Error adding milestone:', error);
    }
  };

  const handleUpdateMilestone = async () => {
    if (!editingMilestone || !newMilestone.title.trim()) return;

    try {
      await milestonesService.update(editingMilestone.id, {
        title: newMilestone.title,
        description: newMilestone.description || undefined,
        reflection: newMilestone.reflection || undefined,
        milestone_date: newMilestone.milestone_date,
        is_approximate_date: newMilestone.is_approximate_date,
        category: newMilestone.category || undefined,
        tags: newMilestone.tags.length > 0 ? newMilestone.tags : undefined,
        is_private: newMilestone.is_private
      });

      resetForm();
      loadMilestones();
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      await milestonesService.delete(id);
      loadMilestones();
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  const openEditModal = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setNewMilestone({
      title: milestone.title,
      description: milestone.description || '',
      reflection: milestone.reflection || '',
      milestone_date: milestone.milestone_date,
      is_approximate_date: milestone.is_approximate_date,
      category: milestone.category || '',
      tags: milestone.tags || [],
      is_private: milestone.is_private
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingMilestone(null);
    setNewMilestone({
      title: '',
      description: '',
      reflection: '',
      milestone_date: new Date().toISOString().split('T')[0],
      is_approximate_date: false,
      category: '',
      tags: [],
      is_private: true
    });
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'Personal Achievement': 'bg-blue-100 text-blue-800',
      'Career': 'bg-purple-100 text-purple-800',
      'Education': 'bg-green-100 text-green-800',
      'Relationships': 'bg-pink-100 text-pink-800',
      'Health': 'bg-teal-100 text-teal-800',
      'Creative': 'bg-yellow-100 text-yellow-800',
      'Travel': 'bg-cyan-100 text-cyan-800',
      'Financial': 'bg-emerald-100 text-emerald-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[category || 'Other'] || 'bg-gray-100 text-gray-800';
  };

  const groupByYear = (milestones: Milestone[]) => {
    const groups: Record<string, Milestone[]> = {};
    milestones.forEach((milestone) => {
      const year = new Date(milestone.milestone_date).getFullYear().toString();
      if (!groups[year]) groups[year] = [];
      groups[year].push(milestone);
    });
    return groups;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-slate-600">Loading milestones...</div>
    </div>;
  }

  const yearGroups = groupByYear(milestones);
  const years = Object.keys(yearGroups).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Life Milestones</h2>
          <p className="text-slate-600 mt-1">Meaningful life events and achievements</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Grid
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Milestone
          </button>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No milestones yet</h3>
          <p className="text-slate-500 mb-4">Record meaningful life events and achievements</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Add Your First Milestone
          </button>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="space-y-8">
          {years.map((year) => (
            <div key={year} className="relative">
              <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg shadow-sm mb-6">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  <span className="text-xl font-bold">{year}</span>
                  <span className="text-sm opacity-90">({yearGroups[year].length} milestone{yearGroups[year].length !== 1 ? 's' : ''})</span>
                </div>
              </div>

              <div className="space-y-4 pl-8 border-l-2 border-amber-200">
                {yearGroups[year].map((milestone) => (
                  <div
                    key={milestone.id}
                    className="relative bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow ml-6"
                  >
                    <div className="absolute -left-10 top-6 w-4 h-4 bg-amber-500 rounded-full border-4 border-white shadow-sm" />

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-5 h-5 text-amber-500" />
                          <h3 className="text-xl font-semibold text-slate-800">{milestone.title}</h3>
                          {milestone.is_private ? (
                            <Lock className="w-4 h-4 text-slate-400" />
                          ) : (
                            <Users className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>
                              {new Date(milestone.milestone_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                              {milestone.is_approximate_date && ' (approx.)'}
                            </span>
                          </div>
                          {milestone.category && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(milestone.category)}`}>
                              {milestone.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(milestone)}
                          className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMilestone(milestone.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {milestone.description && (
                      <p className="text-slate-700 mb-4">{milestone.description}</p>
                    )}

                    {milestone.reflection && (
                      <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-500">
                        <div className="flex items-center gap-2 mb-2">
                          <Flag className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800">Reflection</span>
                        </div>
                        <p className="text-slate-700 text-sm italic">{milestone.reflection}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-semibold text-slate-800 line-clamp-2">{milestone.title}</h3>
                  </div>
                  <div className="text-sm text-slate-500">
                    {new Date(milestone.milestone_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {milestone.is_private ? (
                    <Lock className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Users className="w-4 h-4 text-amber-500" />
                  )}
                  <button
                    onClick={() => handleDeleteMilestone(milestone.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {milestone.description && (
                <p className="text-slate-600 text-sm line-clamp-3 mb-3">{milestone.description}</p>
              )}

              {milestone.category && (
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(milestone.category)}`}>
                  {milestone.category}
                </span>
              )}

              <button
                onClick={() => openEditModal(milestone)}
                className="mt-4 w-full px-3 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">
              {editingMilestone ? 'Edit Milestone' : 'Add New Milestone'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., Graduated from University"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent h-24"
                  placeholder="What happened?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reflection
                </label>
                <textarea
                  value={newMilestone.reflection}
                  onChange={(e) => setNewMilestone({ ...newMilestone, reflection: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent h-24"
                  placeholder="How did this impact you? What did you learn?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newMilestone.milestone_date}
                    onChange={(e) => setNewMilestone({ ...newMilestone, milestone_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newMilestone.category}
                    onChange={(e) => setNewMilestone({ ...newMilestone, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  id="approximate"
                  checked={newMilestone.is_approximate_date}
                  onChange={(e) => setNewMilestone({ ...newMilestone, is_approximate_date: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <label htmlFor="approximate" className="text-sm text-slate-700">
                  Date is approximate
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  id="private"
                  checked={newMilestone.is_private}
                  onChange={(e) => setNewMilestone({ ...newMilestone, is_private: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <label htmlFor="private" className="text-sm text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Keep this milestone private
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingMilestone ? handleUpdateMilestone : handleAddMilestone}
                disabled={!newMilestone.title.trim()}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingMilestone ? 'Update Milestone' : 'Add Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
