/**
 * Stage 1: Signal Registry (Whitelist)
 *
 * This registry defines ALL allowed signals in Stage 1.
 * Any signal not in this registry MUST be rejected.
 *
 * CRITICAL CONSTRAINTS:
 * - Signal keys must match database enum
 * - Each signal must specify required consent
 * - Descriptions must be neutral (no judgmental language)
 * - Version must be updated when computation logic changes
 *
 * FORBIDDEN SIGNAL TYPES:
 * - "completion_rate" - judgmental
 * - "streak_count" - shame risk
 * - "productivity_score" - judgmental
 * - "success_rate" - judgmental
 * - "consistency_score" - judgmental
 * - "improvement_trend" - comparative judgment
 */

import type { SignalKey, ConsentKey } from './types';

export interface SignalDefinition {
  key: SignalKey;
  version: string;
  requiredConsent: ConsentKey;
  description: string;
  parameters: {
    name: string;
    type: string;
    default?: unknown;
    description: string;
  }[];
  minimumEvents: number;
  confidenceThreshold: number;
}

export const SIGNAL_REGISTRY: Record<SignalKey, SignalDefinition> = {
  session_boundaries: {
    key: 'session_boundaries',
    version: '1.0.0',
    requiredConsent: 'session_structures',
    description:
      'Detects activity session start and end times based on explicit events or inactivity gaps. Neutral observation of temporal boundaries.',
    parameters: [
      {
        name: 'inactivity_gap_minutes',
        type: 'number',
        default: 30,
        description:
          'Minutes of inactivity to consider as session boundary (if explicit events not available)',
      },
      {
        name: 'prefer_explicit',
        type: 'boolean',
        default: true,
        description: 'Use explicit session start/end events when available',
      },
    ],
    minimumEvents: 2,
    confidenceThreshold: 0.5,
  },

  time_bins_activity_count: {
    key: 'time_bins_activity_count',
    version: '1.0.0',
    requiredConsent: 'time_patterns',
    description:
      'Counts activity events by time-of-day bins. Shows when user tends to be active. No judgment about optimal times.',
    parameters: [
      {
        name: 'bin_count',
        type: 'number',
        default: 24,
        description: 'Number of hourly bins (24 = hourly, 6 = 4-hour blocks)',
      },
      {
        name: 'timezone',
        type: 'string',
        default: 'UTC',
        description: "User's timezone for local time binning",
      },
    ],
    minimumEvents: 10,
    confidenceThreshold: 0.6,
  },

  activity_intervals: {
    key: 'activity_intervals',
    version: '1.0.0',
    requiredConsent: 'activity_durations',
    description:
      'Extracts duration of activities with defined start and end times. Factual measurement only.',
    parameters: [
      {
        name: 'activity_types',
        type: 'string[]',
        default: [],
        description:
          'Filter to specific activity types (empty = all activities with duration)',
      },
    ],
    minimumEvents: 1,
    confidenceThreshold: 0.9,
  },

  capture_coverage: {
    key: 'capture_coverage',
    version: '1.0.0',
    requiredConsent: 'data_quality_basic',
    description:
      'Measures data capture coverage: days with events vs total days. Data quality metric, not habit consistency.',
    parameters: [
      {
        name: 'minimum_events_per_day',
        type: 'number',
        default: 1,
        description: 'Minimum events to consider a day as "captured"',
      },
    ],
    minimumEvents: 1,
    confidenceThreshold: 1.0,
  },
};

export function getSignalDefinition(key: SignalKey): SignalDefinition {
  const definition = SIGNAL_REGISTRY[key];
  if (!definition) {
    throw new Error(`Signal key "${key}" not found in registry`);
  }
  return definition;
}

export function getAllSignalKeys(): SignalKey[] {
  return Object.keys(SIGNAL_REGISTRY) as SignalKey[];
}

export function getRequiredConsent(signalKey: SignalKey): ConsentKey {
  return getSignalDefinition(signalKey).requiredConsent;
}

export function validateSignalKey(key: string): key is SignalKey {
  return key in SIGNAL_REGISTRY;
}

export const FORBIDDEN_TERMS = [
  'success',
  'failure',
  'productive',
  'unproductive',
  'effective',
  'ineffective',
  'optimal',
  'suboptimal',
  'good',
  'bad',
  'better',
  'worse',
  'improvement',
  'decline',
  'streak',
  'completion_rate',
  'consistency_score',
  'productivity',
  'performance',
];

export function containsForbiddenTerms(text: string): boolean {
  const lowerText = text.toLowerCase();
  return FORBIDDEN_TERMS.some((term) => lowerText.includes(term));
}

export function assertNeutralLanguage(text: string, context: string): void {
  if (containsForbiddenTerms(text)) {
    throw new Error(
      `Stage 1 violation: Forbidden judgmental language detected in ${context}. Text contains prohibited terms.`
    );
  }
}
