import { PlannerShell } from '../PlannerShell';
import { Heart, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getRelationshipVision, createOrUpdateRelationshipVision, type RelationshipVision as RelationshipVisionType } from '../../../lib/visionService';

export function RelationshipVision() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<RelationshipVisionType>>({
    what_matters: '',
    boundaries_non_negotiables: '',
    how_to_show_up: '',
    long_term_intentions: '',
    relationship_values: ''
  });

  useEffect(() => {
    loadRelationshipVision();
  }, []);

  const loadRelationshipVision = async () => {
    try {
      const data = await getRelationshipVision();
      if (data) {
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading relationship vision:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await createOrUpdateRelationshipVision(formData);
    } catch (error) {
      console.error('Error saving relationship vision:', error);
      alert('Failed to save relationship vision. Please try again.');
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
              <Heart className="w-6 h-6 text-slate-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Relationship Vision</h1>
          </div>
          <p className="text-slate-600">Clarity about relationships and boundaries</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <p className="text-sm text-slate-500 mb-6">
              This isn't therapy or relationship advice. It's clarity about what matters to you in your relationships and how you want to show up.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What Matters
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="What matters most to you in your relationships? What makes a relationship feel meaningful or fulfilling?"
                  value={formData.what_matters || ''}
                  onChange={(e) => setFormData({ ...formData, what_matters: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Boundaries & Non-Negotiables
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="What are your boundaries? What do you need in order to feel safe and respected in relationships?"
                  value={formData.boundaries_non_negotiables || ''}
                  onChange={(e) => setFormData({ ...formData, boundaries_non_negotiables: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  How to Show Up
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="How do you want to show up in your relationships? What kind of friend, partner, family member, or colleague do you want to be?"
                  value={formData.how_to_show_up || ''}
                  onChange={(e) => setFormData({ ...formData, how_to_show_up: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Long-Term Intentions
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="What are your long-term intentions for your relationships? How do you want your social world to evolve?"
                  value={formData.long_term_intentions || ''}
                  onChange={(e) => setFormData({ ...formData, long_term_intentions: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Relationship Values
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                  rows={4}
                  placeholder="What values guide your approach to relationships? Honesty, loyalty, independence, interdependence, authenticity, growth?"
                  value={formData.relationship_values || ''}
                  onChange={(e) => setFormData({ ...formData, relationship_values: e.target.value })}
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
                {saving ? 'Saving...' : 'Save Relationship Vision'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}
