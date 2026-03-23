import { PlannerShell } from '../PlannerShell';
import { Calendar, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFiveYearOutlook, createOrUpdateFiveYearOutlook, type FiveYearOutlook as FiveYearOutlookType } from '../../../lib/visionService';

export function FiveYearOutlook() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<FiveYearOutlookType>>({
    lifestyle_vision: '',
    lifestyle_confidence: 50,
    work_income_vision: '',
    work_income_confidence: 50,
    home_environment_vision: '',
    home_environment_confidence: 50,
    relationships_vision: '',
    relationships_confidence: 50,
    health_energy_vision: '',
    health_energy_confidence: 50,
    overall_notes: ''
  });

  useEffect(() => {
    loadOutlook();
  }, []);

  const loadOutlook = async () => {
    try {
      const data = await getFiveYearOutlook();
      if (data) {
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading outlook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await createOrUpdateFiveYearOutlook(formData);
    } catch (error) {
      console.error('Error saving outlook:', error);
      alert('Failed to save outlook. Please try again.');
    } finally {
      setSaving(false);
    }
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-slate-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">5-Year Outlook</h1>
          </div>
          <p className="text-slate-600">Big-picture thinking across life domains</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <p className="text-sm text-slate-500 mb-6">
              This is expansive thinking without binding commitments. What might life look like in 5 years? How confident do you feel about each area?
            </p>

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Lifestyle & Daily Rhythms
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="How do you imagine your typical day or week might look? What kind of pace and rhythm feels right?"
                  value={formData.lifestyle_vision || ''}
                  onChange={(e) => setFormData({ ...formData, lifestyle_vision: e.target.value })}
                />
                <div className="mt-3">
                  <label className="block text-xs text-slate-600 mb-2">
                    Confidence Level: {formData.lifestyle_confidence}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.lifestyle_confidence}
                    onChange={(e) => setFormData({ ...formData, lifestyle_confidence: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Work & Income
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="What might your work situation look like? This isn't a career plan, just what feels possible or desirable."
                  value={formData.work_income_vision || ''}
                  onChange={(e) => setFormData({ ...formData, work_income_vision: e.target.value })}
                />
                <div className="mt-3">
                  <label className="block text-xs text-slate-600 mb-2">
                    Confidence Level: {formData.work_income_confidence}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.work_income_confidence}
                    onChange={(e) => setFormData({ ...formData, work_income_confidence: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Home & Environment
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="Where might you be living? What kind of space or environment would feel right?"
                  value={formData.home_environment_vision || ''}
                  onChange={(e) => setFormData({ ...formData, home_environment_vision: e.target.value })}
                />
                <div className="mt-3">
                  <label className="block text-xs text-slate-600 mb-2">
                    Confidence Level: {formData.home_environment_confidence}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.home_environment_confidence}
                    onChange={(e) => setFormData({ ...formData, home_environment_confidence: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Relationships & Social Life
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="What might your relationships and social world look like? What feels important?"
                  value={formData.relationships_vision || ''}
                  onChange={(e) => setFormData({ ...formData, relationships_vision: e.target.value })}
                />
                <div className="mt-3">
                  <label className="block text-xs text-slate-600 mb-2">
                    Confidence Level: {formData.relationships_confidence}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.relationships_confidence}
                    onChange={(e) => setFormData({ ...formData, relationships_confidence: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Health & Energy
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="How might you feel in your body? What kind of energy and health would you like to have?"
                  value={formData.health_energy_vision || ''}
                  onChange={(e) => setFormData({ ...formData, health_energy_vision: e.target.value })}
                />
                <div className="mt-3">
                  <label className="block text-xs text-slate-600 mb-2">
                    Confidence Level: {formData.health_energy_confidence}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.health_energy_confidence}
                    onChange={(e) => setFormData({ ...formData, health_energy_confidence: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Overall Notes & Reflections
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="Any other thoughts about this 5-year view? Tensions, hopes, uncertainties?"
                  value={formData.overall_notes || ''}
                  onChange={(e) => setFormData({ ...formData, overall_notes: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Outlook'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}
