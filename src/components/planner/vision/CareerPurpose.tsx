import { PlannerShell } from '../PlannerShell';
import { Briefcase, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getCareerPurpose, createOrUpdateCareerPurpose, type CareerPurpose as CareerPurposeType } from '../../../lib/visionService';

export function CareerPurpose() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<CareerPurposeType>>({
    desired_work_themes: '',
    impact_preferences: '',
    skills_to_grow: '',
    career_narrative: '',
    what_matters_most: ''
  });

  useEffect(() => {
    loadCareerPurpose();
  }, []);

  const loadCareerPurpose = async () => {
    try {
      const data = await getCareerPurpose();
      if (data) {
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading career purpose:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await createOrUpdateCareerPurpose(formData);
    } catch (error) {
      console.error('Error saving career purpose:', error);
      alert('Failed to save career purpose. Please try again.');
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
              <Briefcase className="w-6 h-6 text-slate-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Career & Purpose</h1>
          </div>
          <p className="text-slate-600">Work themes and long-term direction</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <p className="text-sm text-slate-500 mb-6">
              This isn't CV planning or job hunting. It's about the themes and values that guide your work life over time.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Desired Work Themes
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="What kind of work feels meaningful to you? What themes or topics do you want to engage with?"
                  value={formData.desired_work_themes || ''}
                  onChange={(e) => setFormData({ ...formData, desired_work_themes: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Impact Preferences
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="What kind of impact do you want your work to have? Who do you want to help or what problems do you want to solve?"
                  value={formData.impact_preferences || ''}
                  onChange={(e) => setFormData({ ...formData, impact_preferences: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Skills to Grow
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="What capabilities or skills do you want to develop over the long term? Not for a specific job, but for your own growth."
                  value={formData.skills_to_grow || ''}
                  onChange={(e) => setFormData({ ...formData, skills_to_grow: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Career Narrative
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={5}
                  placeholder="If you were to tell the story of your career journey, what would you want it to be about? What thread runs through it?"
                  value={formData.career_narrative || ''}
                  onChange={(e) => setFormData({ ...formData, career_narrative: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What Matters Most
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="When you think about your work life, what matters most to you? Flexibility, challenge, collaboration, independence, income stability, creativity?"
                  value={formData.what_matters_most || ''}
                  onChange={(e) => setFormData({ ...formData, what_matters_most: e.target.value })}
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
                {saving ? 'Saving...' : 'Save Career Vision'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}
