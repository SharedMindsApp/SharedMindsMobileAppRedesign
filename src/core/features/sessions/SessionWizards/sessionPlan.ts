// sessionPlan — duration-adaptive defaults for the session plan step.
//
// Encodes the rules:
//   • Breath at start is always offered (esp. valuable for short sessions).
//   • Breaks scale with length:
//       ≤ 45 min   → no break suggested (too short)
//       46–89 min  → a break is OFFERED at halfway (opt-in)
//       90 min +   → a break is AUTO-scheduled at halfway (opt-out)
//   • "Halfway" conveniently lands the break at 45 min for a 90-min session
//     and 60 min for a 120-min — matching the "break at 45 or 60" intent
//     without needing absolute-minute moments.

import type { WizardId } from './types';
import type { PlannedWizard } from '../../../lib/sessions/focusTypes';

export const BREAK_OFFER_MIN = 46;   // below this, no break suggested
export const BREAK_AUTO_MIN = 90;    // at/above this, break is pre-scheduled

export type BreakMode = 'none' | 'offered' | 'auto';

export interface SessionPlanSuggestion {
  /** Breath options to surface at the start (host picks at most one). */
  breathOptions: WizardId[];
  /** How the mid-session break should be treated for this duration. */
  breakMode: BreakMode;
  /** Which break wizard the auto/offered break uses + when it fires. */
  breakWizardId: WizardId;
  breakAt: PlannedWizard['at'];
}

export function planForDuration(durationMin: number): SessionPlanSuggestion {
  const breakMode: BreakMode =
    durationMin >= BREAK_AUTO_MIN ? 'auto'
    : durationMin >= BREAK_OFFER_MIN ? 'offered'
    : 'none';
  return {
    breathOptions: ['breathing_1min', 'breathing_3min'],
    breakMode,
    // 90+ uses the 5-min "Take five"; shorter offered breaks use the same.
    breakWizardId: 'break_5min',
    breakAt: 'halfway',
  };
}

/** Build the default planned_wizards a session should start with, given its
 *  length. Currently only the 90+ auto-break. Returns [] when nothing is
 *  auto-scheduled. `genId` lets callers control id generation (crypto). */
export function defaultPlannedWizards(
  durationMin: number,
  genId: () => string,
): PlannedWizard[] {
  const plan = planForDuration(durationMin);
  if (plan.breakMode !== 'auto') return [];
  return [{
    id: genId(),
    wizardId: plan.breakWizardId,
    at: plan.breakAt,
    status: 'planned',
  }];
}
