/**
 * Stage 3.1: Create Intervention Flow
 *
 * Wizard for creating new interventions.
 * Shows explanation, risks, and collects user-defined parameters.
 *
 * CRITICAL: No pre-filled templates. User writes their own text.
 * No system recommendations.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createIntervention } from '../../lib/interventions/stage3_1-service';
import { INTERVENTION_METADATA, type InterventionKey } from '../../lib/interventions/stage3_1-types';
import { AlertTriangle, ArrowLeft, Check } from 'lucide-react';

export function CreateInterventionFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'select' | 'configure' | 'consent'>('select');
  const [selectedKey, setSelectedKey] = useState<InterventionKey | null>(null);
  const [whyText, setWhyText] = useState('');
  const [userParameters, setUserParameters] = useState<Record<string, any>>({});
  const [consentChecked, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMetadata = selectedKey ? INTERVENTION_METADATA[selectedKey] : null;

  function handleSelectIntervention(key: InterventionKey) {
    setSelectedKey(key);
    setStep('configure');
    setUserParameters({});
    setWhyText('');
    setConsentChecked(false);
  }

  function handleBack() {
    if (step === 'configure') {
      setStep('select');
      setSelectedKey(null);
    } else if (step === 'consent') {
      setStep('configure');
    }
  }

  function handleContinueToConsent() {
    setError(null);
    setStep('consent');
  }

  async function handleCreate() {
    if (!user || !selectedKey || !consentChecked) return;

    setLoading(true);
    setError(null);

    try {
      await createIntervention(user.id, {
        intervention_key: selectedKey,
        why_text: whyText || undefined,
        user_parameters: userParameters,
        consent_scope: {
          intervention_type: selectedKey,
          risk_disclosed: true,
          explanation_shown: true,
          consent_version: '1.0',
        },
      });

      navigate('/regulation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create intervention');
    } finally {
      setLoading(false);
    }
  }

  function updateParameter(key: string, value: any) {
    setUserParameters((prev) => ({ ...prev, [key]: value }));
  }

  if (step === 'select') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <button
            onClick={() => navigate('/regulation')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Regulation Hub
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Response</h1>
          <p className="text-gray-600 mt-2">
            Choose a response type. All responses are optional and default to OFF.
          </p>
        </div>

        <div className="space-y-4">
          {Object.values(INTERVENTION_METADATA).map((metadata) => (
            <button
              key={metadata.key}
              onClick={() => handleSelectIntervention(metadata.key)}
              className="w-full text-left p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <h3 className="text-lg font-semibold text-gray-900">{metadata.name}</h3>
              <p className="text-sm text-gray-600 mt-2">{metadata.description}</p>
              <div className="mt-3 inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                {metadata.category.replace(/_/g, ' ')}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'configure' && selectedMetadata) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedMetadata.name}</h2>
          <p className="text-gray-700 mb-6">{selectedMetadata.description}</p>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Example</h3>
            <p className="text-sm text-gray-600 italic">{selectedMetadata.exampleCopy}</p>
          </div>
        </div>

        {(selectedMetadata.riskNotes ?? []).length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-2">Risk Notes</h3>
                <ul className="text-sm text-orange-800 space-y-1">
                  {(selectedMetadata.riskNotes ?? []).map((note, i) => (
                    <li key={i}>• {note}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Configure Intervention</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why are you creating this? (Optional but encouraged)
            </label>
            <textarea
              value={whyText}
              onChange={(e) => setWhyText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Your reason in your own words..."
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Required fields: {(selectedMetadata.requiredFields ?? []).join(', ')}
            </p>
            <p className="text-sm text-gray-500 italic">
              Note: Full parameter configuration UI will be specific to each intervention type.
              For this scaffolding stage, you can manually enter JSON in user_parameters.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleContinueToConsent}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue to Consent
          </button>
        </div>
      </div>
    );
  }

  if (step === 'consent' && selectedMetadata) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Consent & Confirmation</h2>

          <div className="space-y-4 text-sm text-gray-700 mb-6">
            <p>You are creating: <strong>{selectedMetadata.name}</strong></p>
            <p>This intervention will:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Start in PAUSED state (you must enable it manually)</li>
              <li>Be paused automatically if you turn on Safe Mode</li>
              <li>Remain paused when you turn off Safe Mode</li>
              <li>Can be edited, paused, disabled, or deleted anytime</li>
            </ul>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="font-medium mb-2">You have been shown:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>What this intervention does and does not do</li>
                <li>Risk notes specific to this intervention</li>
                <li>Your control options (pause, edit, disable, delete)</li>
              </ul>
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I understand that this intervention is optional, starts paused, and I control when it's active.
              I have read the risk notes and understand how to pause, edit, or delete this intervention.
            </span>
          </label>
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
            onClick={handleCreate}
            disabled={!consentChecked || loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Create Intervention
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
