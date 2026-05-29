// The wizard registry — single source of truth for what's launchable.
// Add new wizards here.

import type { WizardEntry, WizardId } from './types';
import { Breathing1Min, Breathing3Min, BreathingBox5Min } from './BreathingWizard';
import { Break3Min, Break5Min } from './BreakWizard';
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
    // Hidden from matched 1-on-1s — keeps that list short (most won't use it).
    visibleIn: ['solo', 'group'],
  },
  {
    id: 'break_3min',
    label: 'Quick break (3 min)',
    description: 'Step away briefly. Eyes off the screen.',
    glyph: '☕',
    kind: 'passive',
    durationSeconds: 180,
    component: Break3Min,
    enabled: true,
  },
  {
    id: 'break_5min',
    // Generic break (was "Group break") — a 5-min break suits any mode; the
    // group framing was misleading for solo / 1-on-1.
    label: 'Take five (5 min)',
    description: 'Stand up, stretch, water. Back in five.',
    glyph: '🫖',
    kind: 'passive',
    durationSeconds: 300,
    component: Break5Min,
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
    visibleIn: ['group'],
  },
  {
    id: 'weekly_intentions',
    label: 'Weekly intentions',
    description: 'Set this week’s 3 priorities together.',
    glyph: '🗓️',
    kind: 'active',
    component: ComingSoonWizard,
    enabled: false,
    visibleIn: ['group'],
  },
];

export function findWizard(id: WizardId): WizardEntry | undefined {
  return WIZARD_REGISTRY.find((w) => w.id === id);
}

/** Wizards offered for a given session mode (respects `visibleIn`). */
export function wizardsForMode(mode: 'solo' | 'one_on_one' | 'group'): WizardEntry[] {
  return WIZARD_REGISTRY.filter((w) => !w.visibleIn || w.visibleIn.includes(mode));
}
