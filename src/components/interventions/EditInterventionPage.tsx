/**
 * Stage 3.1: Edit Intervention Page
 *
 * Allows editing of why_text and user_parameters.
 * No system suggestions.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { updateIntervention, getIntervention } from '../../lib/interventions/stage3_1-service';
import type { InterventionRegistryEntry } from '../../lib/interventions/stage3_1-types';
import { INTERVENTION_METADATA } from '../../lib/interventions/stage3_1-types';
import { ArrowLeft, Save } from 'lucide-react';

export function EditInterventionPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [intervention, setIntervention] = useState<InterventionRegistryEntry | null>(
    location.state?.intervention || null
  );
  const [whyText, setWhyText] = useState('');
  const [loading, setLoading] = useState(!intervention);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!intervention && id && user) {
      loadIntervention();
    } else if (intervention) {
      setWhyText(intervention.why_text || '');
    }
  }, [id, user]);

  async function loadIntervention() {
    if (!user || !id) return;

    setLoading(true);
    try {
      const data = await getIntervention(user.id, id);
      if (data) {
        setIntervention(data);
        setWhyText(data.why_text || '');
      } else {
        setError('Intervention not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load intervention');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user || !id) return;

    setSaving(true);
    setError(null);

    try {
      await updateIntervention(user.id, id, {
        why_text: whyText || undefined,
      });
      navigate('/interventions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update intervention');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading intervention...</p>
        </div>
      </div>
    );
  }

  if (!intervention) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Intervention not found</p>
          <button
            onClick={() => navigate('/interventions')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Interventions
          </button>
        </div>
      </div>
    );
  }

  const metadata = INTERVENTION_METADATA[intervention.intervention_key];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button
        onClick={() => navigate('/interventions')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Interventions
      </button>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{metadata.name}</h1>
        <p className="text-gray-600 mb-4">{metadata.description}</p>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Created: {new Date(intervention.created_at).toLocaleDateString()}</span>
          <span>Status: {intervention.status}</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Intervention</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Why are you creating this? (Optional but encouraged)
          </label>
          <textarea
            value={whyText}
            onChange={(e) => setWhyText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Your reason in your own words..."
          />
          <p className="text-sm text-gray-500 mt-2">
            This helps you remember why this intervention exists. It's your personal note.
          </p>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">User Parameters</h3>
          <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-auto">
            {JSON.stringify(intervention.user_parameters, null, 2)}
          </pre>
          <p className="text-sm text-gray-500 mt-2">
            Note: Full parameter editing UI will be specific to each intervention type.
            For this scaffolding stage, parameters are view-only here.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <button
          onClick={() => navigate('/interventions')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
