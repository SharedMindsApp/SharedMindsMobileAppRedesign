// The wizard registry — single source of truth for what's launchable.
// Add new wizards here.

import type { WizardEntry, WizardId } from './types';
import { Breathing1Min, Breathing3Min, BreathingBox5Min } from './BreathingWizard';
import { ArrivalStateWizard } from './ArrivalStateWizard';
import { ComingSoonWizard } from './ComingSoonWizard';

export const WIZARD_REGISTRY: WizardEntry[] = [
  {
    id: 'arrival_state',
    label: 'Vibe check',
    description: 'Pick your arriving state — music adapts to match.',
    glyph: '🎚️',
    kind: 'active',
    component: ArrivalStateWizard,
    enabled: true,
    broadcast: false, // personal: only the launcher sees this
  },
  {
    id: 'breathing_1min',
    label: 'Quick breath (1 min)',
    description: 'A minute of resonance breathing to settle in.',
    glyph: '🌬️',
    kind: 'passive',
    durationSeconds: 60,
    component: Breathing1Min,
    enabled: true,
  },
  {
    id: 'breathing_3min',
    label: 'Calm breath (3 min)',
    description: 'Three minutes of slow exhales — drop into the session.',
    glyph: '🫁',
    kind: 'passive',
    durationSeconds: 180,
    component: Breathing3Min,
    enabled: true,
  },
  {
    id: 'breathing_box',
    label: 'Box breath (5 min)',
    description: 'Box breathing 4-4-4-4. Used by Navy SEALs to centre.',
    glyph: '🟦',
    kind: 'passive',
    durationSeconds: 300,
    component: BreathingBox5Min,
    enabled: true,
  },
  {
    id: 'daily_intentions',
    label: 'Daily intention',
    description: 'Each person picks their main focus for today.',
    glyph: '🎯',
    kind: 'active',
    component: ComingSoonWizard,
    enabled: false,
  },
  {
    id: 'weekly_intentions',
    label: 'Weekly intentions',
    description: 'Set this week’s 3 priorities together.',
    glyph: '🗓️',
    kind: 'active',
    component: ComingSoonWizard,
    enabled: false,
  },
];

export function findWizard(id: WizardId): WizardEntry | undefined {
  return WIZARD_REGISTRY.find((w) => w.id === id);
}
