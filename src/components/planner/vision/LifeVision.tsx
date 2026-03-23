import { useEffect, useState } from 'react';
import { Save, Compass } from 'lucide-react';
import { PlannerShell } from '../PlannerShell';
import {
  getActiveLifeStatement,
  createLifeStatement,
  updateLifeStatement,
  type LifeStatement
} from '../../../lib/visionService';

export function LifeVision() {
  const [statement, setStatement] = useState<LifeStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    statement: '',
    what_good_life_looks_like: '',
    want_more_of: '',
    want_less_of: ''
  });

  useEffect(() => {
    loadStatement();
  }, []);

  async function loadStatement() {
    try {
      const data = await getActiveLifeStatement();
      if (data) {
        setStatement(data);
        setFormData({
          statement: data.statement || '',
          what_good_life_looks_like: data.what_good_life_looks_like || '',
          want_more_of: data.want_more_of || '',
          want_less_of: data.want_less_of || ''
        });
      }
    } catch (error) {
      console.error('Error loading life statement:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (statement) {
        await updateLifeStatement(statement.id, formData);
      } else {
        await createLifeStatement({ ...formData, is_active: true });
      }
      await loadStatement();
    } catch (error) {
      console.error('Error saving life statement:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-48 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Compass className="w-6 h-6 text-slate-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Life Vision</h1>
          </div>
          <p className="text-slate-600">Your anchor - what a good life looks like to you</p>
        </div>

        <div className="space-y-6">
          {/* Main Vision Statement */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Life Vision</h3>
            <textarea
              value={formData.statement}
              onChange={e => setFormData({ ...formData, statement: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 min-h-[200px] font-serif text-lg leading-relaxed"
              placeholder="Write your life vision in your own words... There's no right or wrong here. What feels true to you?"
            />
            <p className="text-xs text-slate-500 mt-2 italic">
              This evolves over time - that's normal and good
            </p>
          </div>

          {/* Reflective Prompts */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-md font-semibold text-slate-800 mb-3">What does a good life look like to you?</h3>
              <textarea
                value={formData.what_good_life_looks_like}
                onChange={e => setFormData({ ...formData, what_good_life_looks_like: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                rows={4}
                placeholder="Describe it in your own words..."
              />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-md font-semibold text-slate-800 mb-3">What do you want more of?</h3>
              <textarea
                value={formData.want_more_of}
                onChange={e => setFormData({ ...formData, want_more_of: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                rows={4}
                placeholder="Energy, connection, creativity, peace, challenge..."
              />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-md font-semibold text-slate-800 mb-3">What do you want less of?</h3>
              <textarea
                value={formData.want_less_of}
                onChange={e => setFormData({ ...formData, want_less_of: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                rows={4}
                placeholder="Stress, comparison, noise, obligation..."
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Vision'}
            </button>
          </div>

          {/* Context Note */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">This is your anchor</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your life vision isn't a destination - it's a north star. It helps you make decisions,
              set boundaries, and stay aligned with what matters to you. It's okay if it changes.
              Revisit this whenever something feels off or when you're making big decisions.
            </p>
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}
