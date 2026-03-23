import { supabase } from '../supabase';
import type {
  SignalCalibration,
  SignalKey,
  SignalSensitivity,
  SignalRelevance,
  SignalVisibility,
  EnrichedSignal,
  ActiveSignal,
  SignalDefinition,
} from './signalTypes';

export async function getSignalCalibration(
  userId: string,
  signalKey: SignalKey
): Promise<SignalCalibration | null> {
  const { data, error } = await supabase
    .from('regulation_signal_calibration')
    .select('*')
    .eq('user_id', userId)
    .eq('signal_key', signalKey)
    .maybeSingle();

  if (error) {
    console.error('[CalibrationService] Error fetching calibration:', error);
    return null;
  }

  return data;
}

export async function getAllUserCalibrations(userId: string): Promise<SignalCalibration[]> {
  const { data, error } = await supabase
    .from('regulation_signal_calibration')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('[CalibrationService] Error fetching all calibrations:', error);
    return [];
  }

  return data || [];
}

export async function upsertSignalCalibration(params: {
  userId: string;
  signalKey: SignalKey;
  sensitivity?: SignalSensitivity;
  relevance?: SignalRelevance;
  visibility?: SignalVisibility;
  userNotes?: string;
}): Promise<SignalCalibration | null> {
  const { userId, signalKey, sensitivity, relevance, visibility, userNotes } = params;

  const existing = await getSignalCalibration(userId, signalKey);

  const payload: any = {
    user_id: userId,
    signal_key: signalKey,
    updated_at: new Date().toISOString(),
  };

  if (sensitivity !== undefined) payload.sensitivity = sensitivity;
  if (relevance !== undefined) payload.relevance = relevance;
  if (visibility !== undefined) payload.visibility = visibility;
  if (userNotes !== undefined) payload.user_notes = userNotes;

  const { data, error } = await supabase
    .from('regulation_signal_calibration')
    .upsert(payload, { onConflict: 'user_id,signal_key' })
    .select()
    .single();

  if (error) {
    console.error('[CalibrationService] Error upserting calibration:', error);
    return null;
  }

  return data;
}

export async function enrichSignalsWithCalibration(
  userId: string,
  signals: ActiveSignal[],
  definitions: SignalDefinition[]
): Promise<EnrichedSignal[]> {
  const calibrations = await getAllUserCalibrations(userId);
  const calibrationMap = new Map(calibrations.map((c) => [c.signal_key, c]));
  const definitionMap = new Map(definitions.map((d) => [d.signal_key, d]));

  return signals.map((signal) => {
    const enriched: EnrichedSignal = {
      ...signal,
      state: determineSignalState(signal),
      timeWindow: calculateTimeWindow(signal),
      calibration: calibrationMap.get(signal.signal_key),
      definition: definitionMap.get(signal.signal_key),
    };

    return enriched;
  });
}

function determineSignalState(signal: ActiveSignal): 'active' | 'recently_seen' | 'inactive' {
  const now = Date.now();
  const detectedAt = new Date(signal.detected_at).getTime();
  const hoursSinceDetection = (now - detectedAt) / (1000 * 60 * 60);

  if (hoursSinceDetection < 1) {
    return 'active';
  } else if (hoursSinceDetection < 24) {
    return 'recently_seen';
  } else {
    return 'inactive';
  }
}

function calculateTimeWindow(signal: ActiveSignal): string {
  const now = Date.now();
  const detectedAt = new Date(signal.detected_at).getTime();
  const hoursSinceDetection = (now - detectedAt) / (1000 * 60 * 60);

  if (hoursSinceDetection < 1) {
    const minutes = Math.floor((now - detectedAt) / (1000 * 60));
    return `${minutes}m ago`;
  } else if (hoursSinceDetection < 24) {
    const hours = Math.floor(hoursSinceDetection);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(hoursSinceDetection / 24);
    return `${days}d ago`;
  }
}

export async function snoozeSignal(
  userId: string,
  signalId: string,
  snoozeUntil: Date
): Promise<void> {
  const { error } = await supabase
    .from('regulation_active_signals')
    .update({ snoozed_until: snoozeUntil.toISOString() })
    .eq('id', signalId)
    .eq('user_id', userId);

  if (error) {
    console.error('[CalibrationService] Error snoozing signal:', error);
    throw error;
  }
}

export async function unsnoozeSignal(userId: string, signalId: string): Promise<void> {
  const { error } = await supabase
    .from('regulation_active_signals')
    .update({ snoozed_until: null })
    .eq('id', signalId)
    .eq('user_id', userId);

  if (error) {
    console.error('[CalibrationService] Error unsnoozing signal:', error);
    throw error;
  }
}

export function getIntensityLabel(intensity: string): string {
  switch (intensity) {
    case 'low':
      return 'Low';
    case 'medium':
      return 'Medium';
    case 'high':
      return 'High';
    default:
      return 'Medium';
  }
}

export function getStateLabel(state: string): string {
  switch (state) {
    case 'active':
      return 'Active';
    case 'recently_seen':
      return 'Recently Seen';
    case 'inactive':
      return 'Inactive';
    default:
      return 'Active';
  }
}
