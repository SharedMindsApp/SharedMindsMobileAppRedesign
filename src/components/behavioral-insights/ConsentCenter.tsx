/**
 * Consent Center - Granular Display Permission Management
 *
 * Allows users to control which insights they want to see.
 * Explicit opt-in required. Default: OFF.
 *
 * Shows:
 * - What data is used
 * - What is NOT inferred
 * - Known risks
 */

import { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertTriangle, Info, Check, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  grantDisplayConsent,
  revokeDisplayConsent,
  stage2Display,
  type InsightDisplayConsent,
} from '../../lib/behavioral-sandbox/stage2-service';
import type { SignalKey } from '../../lib/behavioral-sandbox/types';
import { getAllSignalKeys } from '../../lib/behavioral-sandbox/registry';

interface SignalConsentInfo {
  signalKey: SignalKey;
  title: string;
  description: string;
  dataUsed: string[];
  notInferred: string[];
  knownRisks: string[];
}

const SIGNAL_CONSENT_INFO: SignalConsentInfo[] = [
  {
    signalKey: 'session_boundaries',
    title: 'Activity Session Boundaries',
    description: 'Shows when activity sessions started and ended',
    dataUsed: ['Activity start/end events', 'Timestamps', 'Inactivity gaps'],
    notInferred: [
      'Quality of focus',
      'Value of session',
      'Optimal session length',
    ],
    knownRisks: [
      'May trigger fixation on session duration',
      'May create pressure to maintain long sessions',
    ],
  },
  {
    signalKey: 'time_bins_activity_count',
    title: 'Activity Across Time Windows',
    description: 'Shows when activity events were recorded throughout the day',
    dataUsed: ['Event timestamps', 'Time-of-day information'],
    notInferred: [
      'Productivity or effectiveness',
      'Optimal timing suggestions',
      'Schedule quality evaluation',
    ],
    knownRisks: [
      'May trigger shame about irregular patterns',
      'May create pressure to normalize schedule',
      'Patterns may be circumstantial, not meaningful',
    ],
  },
  {
    signalKey: 'activity_intervals',
    title: 'Activity Duration Records',
    description: 'Shows how long activities lasted based on recorded data',
    dataUsed: ['Activity start times', 'Activity end times', 'Duration fields'],
    notInferred: [
      'Quality or value of time spent',
      'Ideal duration suggestions',
      'Time use evaluation',
    ],
    knownRisks: [
      'May trigger comparison to estimated durations',
      'May create pressure about time spent',
    ],
  },
  {
    signalKey: 'capture_coverage',
    title: 'Data Capture Overview',
    description: 'Shows which days had any recorded events',
    dataUsed: ['Event timestamps', 'Date ranges'],
    notInferred: [
      'Habit consistency or adherence',
      'Engagement quality',
      'Actual behavior patterns',
    ],
    knownRisks: [
      'HIGH RISK: May be seen as streak or consistency score',
      'May trigger shame about gaps in recording',
      'May create pressure to record daily',
      'Missing data may be intentional',
    ],
  },
];

export function ConsentCenter() {
  const { user } = useAuth();
  const [consents, setConsents] = useState<Map<SignalKey, InsightDisplayConsent>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<SignalKey | null>(null);
  const [expandedSignal, setExpandedSignal] = useState<SignalKey | null>(null);

  useEffect(() => {
    if (!user) return;

    loadConsents();
  }, [user]);

  const loadConsents = async () => {
    if (!user) return;

    try {
      const allConsents = await stage2Display.getAllDisplayConsents(user.id);
      const consentMap = new Map(
        allConsents.map((c) => [c.signal_key as SignalKey, c])
      );
      setConsents(consentMap);
    } catch (error) {
      console.error('Failed to load consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConsent = async (signalKey: SignalKey) => {
    if (!user || updating) return;

    const currentConsent = consents.get(signalKey);
    const isCurrentlyEnabled = currentConsent?.display_enabled ?? false;

    setUpdating(signalKey);
    try {
      if (isCurrentlyEnabled) {
        await revokeDisplayConsent(user.id, signalKey);
      } else {
        await grantDisplayConsent(user.id, { signalKey });
      }

      await loadConsents();
    } catch (error) {
      console.error('Failed to toggle consent:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading consent settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Insight Display Settings
        </h2>
        <p className="text-gray-600">
          Choose which behavioral insights you want to see. All settings start as OFF.
          You can change these at any time.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Important to know:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>These insights are observations, not evaluations</li>
              <li>They show what was recorded, not what is ideal</li>
              <li>You can hide everything instantly using Safe Mode</li>
              <li>Your data remains private and secure</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {SIGNAL_CONSENT_INFO.map((info) => {
          const consent = consents.get(info.signalKey);
          const isEnabled = consent?.display_enabled ?? false;
          const isExpanded = expandedSignal === info.signalKey;
          const isUpdating = updating === info.signalKey;

          return (
            <div
              key={info.signalKey}
              className={`border-2 rounded-lg transition-all ${
                isEnabled
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{info.title}</h3>
                      {isEnabled ? (
                        <span className="px-2 py-0.5 bg-green-200 text-green-900 text-xs font-medium rounded-full">
                          Visible
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{info.description}</p>

                    <button
                      onClick={() =>
                        setExpandedSignal(isExpanded ? null : info.signalKey)
                      }
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleConsent(info.signalKey)}
                    disabled={isUpdating}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isEnabled
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isUpdating ? (
                      'Updating...'
                    ) : isEnabled ? (
                      <span className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4" />
                        Hide
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Show
                      </span>
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        Data Used
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {info.dataUsed.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-gray-400">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <X className="w-4 h-4 text-red-600" />
                        NOT Inferred
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {info.notInferred.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-gray-400">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        Known Risks
                      </h4>
                      <ul className="text-sm text-orange-800 space-y-1">
                        {info.knownRisks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-orange-400">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Remember:</strong> You can use Safe Mode to hide all insights
          instantly, anytime. No data is deleted when you hide or disable insights.
        </p>
      </div>
    </div>
  );
}
