import { PlannerShell } from '../PlannerShell';
import { Layers, Plus, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getVisionAreas, createVisionArea, updateVisionArea, deleteVisionArea, type VisionArea } from '../../../lib/visionService';

export function VisionAreas() {
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<VisionArea[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<VisionArea | null>(null);
  const [formData, setFormData] = useState({
    area_name: '',
    area_type: 'personal_growth' as VisionArea['area_type'],
    vision_statement: '',
    current_state: '',
    desired_state: '',
    notes: '',
    is_visible: true,
    display_order: 0
  });

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      const data = await getVisionAreas();
      setAreas(data);
    } catch (error) {
      console.error('Error loading areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingArea) {
        await updateVisionArea(editingArea.id, formData);
      } else {
        await createVisionArea(formData);
      }
      await loadAreas();
      resetForm();
    } catch (error) {
      console.error('Error saving area:', error);
      alert('Failed to save area. Please try again.');
    }
  };

  const handleEdit = (area: VisionArea) => {
    setEditingArea(area);
    setFormData({
      area_name: area.area_name,
      area_type: area.area_type,
      vision_statement: area.vision_statement || '',
      current_state: area.current_state || '',
      desired_state: area.desired_state || '',
      notes: area.notes || '',
      is_visible: area.is_visible,
      display_order: area.display_order
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vision area?')) return;
    try {
      await deleteVisionArea(id);
      await loadAreas();
    } catch (error) {
      console.error('Error deleting area:', error);
      alert('Failed to delete area. Please try again.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingArea(null);
    setFormData({
      area_name: '',
      area_type: 'personal_growth',
      vision_statement: '',
      current_state: '',
      desired_state: '',
      notes: '',
      is_visible: true,
      display_order: 0
    });
  };

  const areaTypeLabels: Record<VisionArea['area_type'], string> = {
    personal_growth: 'Personal Growth',
    career_work: 'Career & Work',
    health_wellbeing: 'Health & Wellbeing',
    relationships_social: 'Relationships & Social',
    finances_security: 'Finances & Security',
    home_lifestyle: 'Home & Lifestyle',
    learning_creativity: 'Learning & Creativity',
    custom: 'Custom'
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
                  <Layers className="w-6 h-6 text-slate-700" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Vision Areas</h1>
              </div>
              <p className="text-slate-600">Structured vision across life domains</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Area
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingArea ? 'Edit Vision Area' : 'New Vision Area'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Area Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  value={formData.area_name}
                  onChange={(e) => setFormData({ ...formData, area_name: e.target.value })}
                  placeholder="e.g., Creative Practice, Family Connection"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Area Type
                </label>
                <select
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                  value={formData.area_type}
                  onChange={(e) => setFormData({ ...formData, area_type: e.target.value as VisionArea['area_type'] })}
                >
                  {Object.entries(areaTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vision Statement
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={3}
                  placeholder="What's your vision for this area of life?"
                  value={formData.vision_statement}
                  onChange={(e) => setFormData({ ...formData, vision_statement: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current State
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                    rows={4}
                    placeholder="Where are you now?"
                    value={formData.current_state}
                    onChange={(e) => setFormData({ ...formData, current_state: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Desired State
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                    rows={4}
                    placeholder="Where do you want to be?"
                    value={formData.desired_state}
                    onChange={(e) => setFormData({ ...formData, desired_state: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={2}
                  placeholder="Any additional thoughts or context"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
                >
                  {editingArea ? 'Update Area' : 'Create Area'}
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
          {areas.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No vision areas yet</h3>
              <p className="text-slate-600 mb-4">
                Create structured vision statements for different areas of your life
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
              >
                Add Your First Area
              </button>
            </div>
          ) : (
            areas.map((area) => (
              <div key={area.id} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{area.area_name}</h3>
                    <span className="inline-block mt-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">
                      {areaTypeLabels[area.area_type]}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(area)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(area.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {area.vision_statement && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-1">Vision</p>
                    <p className="text-slate-600">{area.vision_statement}</p>
                  </div>
                )}

                {(area.current_state || area.desired_state) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {area.current_state && (
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-1">Current State</p>
                        <p className="text-sm text-slate-600">{area.current_state}</p>
                      </div>
                    )}
                    {area.desired_state && (
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-1">Desired State</p>
                        <p className="text-sm text-slate-600">{area.desired_state}</p>
                      </div>
                    )}
                  </div>
                )}

                {area.notes && (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500">{area.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </PlannerShell>
  );
}
