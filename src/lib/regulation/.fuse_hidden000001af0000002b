import { supabase } from '../supabase';
import { RegulationPreset, PresetChanges, PresetDiff, PresetPreview, PresetApplication } from './presetTypes';
import { getPreset } from './presetRegistry';
import { SignalKey } from './signalTypes';

export async function getCurrentSignalCalibration(userId: string) {
  const { data, error } = await supabase
    .from('regulation_signal_calibration')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function getActivePreset(userId: string): Promise<{ presetId: string; appliedAt: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('active_preset_id, active_preset_applied_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.active_preset_id) return null;

  return {
    presetId: data.active_preset_id,
    appliedAt: data.active_preset_applied_at
  };
}

export async function getPresetApplication(userId: string, presetId: string): Promise<PresetApplication | null> {
  const { data, error } = await supabase
    .from('regulation_preset_applications')
    .select('*')
    .eq('user_id', userId)
    .eq('preset_id', presetId)
    .is('reverted_at', null)
    .order('applied_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    presetId: data.preset_id,
    appliedAt: data.applied_at,
    changesMade: data.changes_made as PresetChanges,
    revertedAt: data.reverted_at,
    editedManually: data.edited_manually,
    notes: data.notes,
    createdAt: data.created_at
  };
}

function computeDiff(preset: RegulationPreset, currentCalibration: any[]): PresetDiff {
  const willChange: PresetDiff['willChange'] = [];
  const affectedSignals: SignalKey[] = [];

  const changes = preset.appliesChanges;

  if (changes.globalVisibility) {
    willChange.push({
      category: 'Global Visibility',
      before: 'Default prominence',
      after: changes.globalVisibility === 'prominently' ? 'Prominent display' :
             changes.globalVisibility === 'quietly' ? 'Quiet display' :
             'Hide unless strong'
    });
  }

  if (changes.responseMode) {
    willChange.push({
      category: 'Response Mode',
      before: 'All responses available',
      after: changes.responseMode === 'all' ? 'All responses' :
             changes.responseMode === 'calming_only' ? 'Calming responses only' :
             'Manual responses only'
    });
  }

  if (changes.limitSuggestions?.sessionCap) {
    willChange.push({
      category: 'Session Duration',
      before: 'No suggested cap',
      after: `${changes.limitSuggestions.sessionCap} minute suggestion`
    });
  }

  if (changes.limitSuggestions?.newProjectVisibility) {
    willChange.push({
      category: 'New Project Visibility',
      before: 'Normal prominence',
      after: changes.limitSuggestions.newProjectVisibility === 'normal' ? 'Normal' : 'Reduced prominence'
    });
  }

  if (changes.signals) {
    Object.entries(changes.signals).forEach(([signalKey, signalChanges]) => {
      const key = signalKey as SignalKey;
      affectedSignals.push(key);

      const currentSignal = currentCalibration.find(c => c.signal_key === key);

      if (signalChanges.visibility) {
        willChange.push({
          category: 'Signal Visibility',
          before: currentSignal?.visibility || 'prominently',
          after: signalChanges.visibility,
          signalKey: key
        });
      }

      if (signalChanges.sensitivity) {
        willChange.push({
          category: 'Signal Sensitivity',
          before: currentSignal?.sensitivity || 'as_is',
          after: signalChanges.sensitivity,
          signalKey: key
        });
      }

      if (signalChanges.relevance) {
        willChange.push({
          category: 'Signal Relevance',
          before: currentSignal?.relevance || 'sometimes_useful',
          after: signalChanges.relevance,
          signalKey: key
        });
      }
    });
  }

  if (changes.temporaryUntil) {
    const duration = Math.ceil((changes.temporaryUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    willChange.push({
      category: 'Duration',
      before: 'Permanent',
      after: `Active for ${duration} days`
    });
  }

  return {
    presetId: preset.presetId,
    presetName: preset.name,
    willChange,
    willNotChange: preset.doesNotDo,
    affectedSignals
  };
}

export async function previewPreset(userId: string, presetId: string): Promise<PresetPreview | null> {
  const preset = getPreset(presetId);
  if (!preset) return null;

  const currentCalibration = await getCurrentSignalCalibration(userId);
  const diff = computeDiff(preset, currentCalibration);

  const warnings: string[] = [];
  const activePreset = await getActivePreset(userId);

  if (activePreset && activePreset.presetId !== presetId) {
    warnings.push(`You currently have the "${activePreset.presetId}" preset active. Applying this will replace it.`);
  }

  return {
    preset,
    diff,
    currentConfig: currentCalibration,
    canApply: true,
    warnings
  };
}

export async function applyPreset(userId: string, presetId: string, notes?: string): Promise<void> {
  const preset = getPreset(presetId);
  if (!preset) throw new Error('Preset not found');

  const currentCalibration = await getCurrentSignalCalibration(userId);
  const changes = preset.appliesChanges;

  // Apply signal calibration changes
  if (changes.signals) {
    for (const [signalKey, signalChanges] of Object.entries(changes.signals)) {
      const existing = currentCalibration.find(c => c.signal_key === signalKey);

      const calibrationData = {
        user_id: userId,
        signal_key: signalKey,
        sensitivity: signalChanges.sensitivity || existing?.sensitivity || 'as_is',
        relevance: signalChanges.relevance || existing?.relevance || 'sometimes_useful',
        visibility: signalChanges.visibility || existing?.visibility || 'prominently',
        user_notes: existing?.user_notes || null
      };

      if (existing) {
        await supabase
          .from('regulation_signal_calibration')
          .update(calibrationData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('regulation_signal_calibration')
          .insert(calibrationData);
      }
    }
  }

  // Record preset application
  const { data: application } = await supabase
    .from('regulation_preset_applications')
    .insert({
      user_id: userId,
      preset_id: presetId,
      changes_made: changes,
      notes: notes || null
    })
    .select()
    .single();

  // Update profile to mark active preset
  await supabase
    .from('profiles')
    .update({
      active_preset_id: presetId,
      active_preset_applied_at: new Date().toISOString()
    })
    .eq('id', userId);
}

export async function revertPreset(userId: string, presetId: string): Promise<void> {
  const application = await getPresetApplication(userId, presetId);
  if (!application) throw new Error('No active application found');

  const changes = application.changesMade;

  // Revert signal calibration changes
  if (changes.signals) {
    for (const signalKey of Object.keys(changes.signals)) {
      // Reset to defaults by deleting the calibration
      // User can reconfigure manually after revert
      await supabase
        .from('regulation_signal_calibration')
        .delete()
        .eq('user_id', userId)
        .eq('signal_key', signalKey);
    }
  }

  // Mark application as reverted
  await supabase
    .from('regulation_preset_applications')
    .update({ reverted_at: new Date().toISOString() })
    .eq('id', application.id);

  // Clear active preset from profile
  await supabase
    .from('profiles')
    .update({
      active_preset_id: null,
      active_preset_applied_at: null
    })
    .eq('id', userId);
}

export async function markPresetAsEdited(userId: string, presetId: string): Promise<void> {
  const application = await getPresetApplication(userId, presetId);
  if (!application) return;

  await supabase
    .from('regulation_preset_applications')
    .update({ edited_manually: true })
    .eq('id', application.id);

  // Keep the preset marker but note it's been edited
  // This allows users to see they started from a preset but customized it
}

export async function clearActivePreset(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      active_preset_id: null,
      active_preset_applied_at: null
    })
    .eq('id', userId);
}
