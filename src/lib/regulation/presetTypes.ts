import { SignalKey, SignalSensitivity, SignalRelevance, SignalVisibility } from './signalTypes';

export type PresetId =
  | 'overwhelmed'
  | 'build_without_expanding'
  | 'explore_freely'
  | 'returning_after_time'
  | 'fewer_interruptions';

export interface PresetSignalChanges {
  sensitivity?: SignalSensitivity;
  relevance?: SignalRelevance;
  visibility?: SignalVisibility;
}

export interface PresetChanges {
  signals?: {
    [key in SignalKey]?: PresetSignalChanges;
  };
  globalVisibility?: 'prominently' | 'quietly' | 'hide_unless_strong';
  responseMode?: 'all' | 'manual_only' | 'calming_only';
  limitSuggestions?: {
    sessionCap?: number;
    newProjectVisibility?: 'normal' | 'reduced';
  };
  temporaryUntil?: Date | null;
}

export interface RegulationPreset {
  presetId: PresetId;
  name: string;
  shortDescription: string;
  longExplanation: string;
  intendedState: string;
  appliesChanges: PresetChanges;
  doesNotDo: string[];
  reversible: true;
}

export interface PresetApplication {
  id: string;
  userId: string;
  presetId: PresetId;
  appliedAt: string;
  changesMade: PresetChanges;
  revertedAt: string | null;
  editedManually: boolean;
  notes: string | null;
  createdAt: string;
}

export interface PresetDiff {
  presetId: PresetId;
  presetName: string;
  willChange: {
    category: string;
    before: string;
    after: string;
    signalKey?: SignalKey;
  }[];
  willNotChange: string[];
  affectedSignals: SignalKey[];
}

export interface PresetPreview {
  preset: RegulationPreset;
  diff: PresetDiff;
  currentConfig: any;
  canApply: boolean;
  warnings: string[];
}
