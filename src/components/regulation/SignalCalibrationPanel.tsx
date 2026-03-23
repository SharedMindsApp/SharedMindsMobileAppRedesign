import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { upsertSignalCalibration } from '../../lib/regulation/calibrationService';
import type { EnrichedSignal, SignalSensitivity, SignalRelevance, SignalVisibility } from '../../lib/regulation/signalTypes';

interface SignalCalibrationPanelProps {
  signal: EnrichedSignal;
  onCalibrationUpdated: () => void;
}

export function SignalCalibrationPanel({ signal, onCalibrationUpdated }: SignalCalibrationPanelProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const currentCalibration = signal.calibration || {
    sensitivity: 'as_is',
    relevance: 'sometimes_useful',
    visibility: 'prominently',
    user_notes: '',
  };

  async function handleUpdateSensitivity(sensitivity: SignalSensitivity) {
    if (!user) return;
    setSaving(true);
    try {
      await upsertSignalCalibration({
        userId: user.id,
        signalKey: signal.signal_key,
        sensitivity,
      });
      onCalibrationUpdated();
    } catch (error) {
      console.error('[CalibrationPanel] Error updating sensitivity:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRelevance(relevance: SignalRelevance) {
    if (!user) return;
    setSaving(true);
    try {
      await upsertSignalCalibration({
        userId: user.id,
        signalKey: signal.signal_key,
        relevance,
      });
      onCalibrationUpdated();
    } catch (error) {
      console.error('[CalibrationPanel] Error updating relevance:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateVisibility(visibility: SignalVisibility) {
    if (!user) return;
    setSaving(true);
    try {
      await upsertSignalCalibration({
        userId: user.id,
        signalKey: signal.signal_key,
        visibility,
      });
      onCalibrationUpdated();
    } catch (error) {
      console.error('[CalibrationPanel] Error updating visibility:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Personal Calibration</h2>
      </div>

      <p className="text-sm text-gray-600">
        These settings control how this signal appears to you. They do not affect when the signal is computed—only how it's displayed.
        All changes are reversible.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Sensitivity
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Show me this signal:
          </p>
          <div className="space-y-2">
            {[
              { value: 'earlier', label: 'Earlier', description: 'Show this signal sooner when the pattern begins' },
              { value: 'as_is', label: 'As-is (default)', description: 'Show this signal at the current threshold' },
              { value: 'only_when_strong', label: 'Only when strong', description: 'Show this signal only when the pattern is very clear' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleUpdateSensitivity(option.value as SignalSensitivity)}
                disabled={saving}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  currentCalibration.sensitivity === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Relevance
          </label>
          <p className="text-sm text-gray-600 mb-3">
            This signal feels:
          </p>
          <div className="space-y-2">
            {[
              { value: 'very_relevant', label: 'Very relevant', description: 'This pattern matters to me right now' },
              { value: 'sometimes_useful', label: 'Sometimes useful', description: 'This pattern is occasionally helpful to know about' },
              { value: 'not_useful_right_now', label: 'Not useful right now', description: 'This pattern isn\'t relevant to me at the moment' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleUpdateRelevance(option.value as SignalRelevance)}
                disabled={saving}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  currentCalibration.relevance === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Visibility
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Show this signal:
          </p>
          <div className="space-y-2">
            {[
              { value: 'prominently', label: 'Prominently', description: 'Show this signal clearly when it appears' },
              { value: 'quietly', label: 'Quietly', description: 'Show this signal in a more subtle way' },
              { value: 'hide_unless_strong', label: 'Hide unless strong', description: 'Only show when the pattern is very clear' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleUpdateVisibility(option.value as SignalVisibility)}
                disabled={saving}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  currentCalibration.visibility === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Your calibration settings are personal and private. They help you interpret signals in a way that makes sense for you.
        </p>
      </div>
    </div>
  );
}
