// Session wizards: host-triggered guided experiences during a group session.
//
// Two flavours we support:
//
//   1. PASSIVE wizards (breathing, meditation, stretching) — host triggers,
//      every participant sees the same animation/audio, no per-user input.
//      Outcome lives in the moment; nothing is persisted per participant.
//
//   2. ACTIVE wizards (daily intentions, weekly check-in) — host triggers,
//      every participant fills in their own answers, results save to the
//      participant's own row. Host doesn't see participants' content (just
//      a "X of Y done" indicator).
//
// Adding a new wizard:
//   1. Append a new entry to `WIZARD_REGISTRY` with id + label + component
//   2. Build the component to accept `WizardComponentProps`
//   3. Done — the launcher menu picks it up automatically.

import type { ComponentType } from 'react';

export type WizardId =
  | 'arrival_state'
  | 'breathing_1min'
  | 'breathing_3min'
  | 'breathing_box'
  | 'break_3min'
  | 'break_5min'
  | 'weekly_intentions'
  | 'daily_intentions';

export interface WizardEntry {
  id: WizardId;
  label: string;
  /** One-line description shown in the picker. */
  description: string;
  /** Emoji or short string for the picker icon. */
  glyph: string;
  /** Passive = synced animation for all. Active = each participant fills
   *  in their own (host triggers, others answer privately). */
  kind: 'passive' | 'active';
  /** For passive wizards: how long the experience lasts. Active wizards
   *  run until the participant submits. */
  durationSeconds?: number;
  /** Lazy-loaded component renderer. Receives WizardComponentProps. */
  component: ComponentType<WizardComponentProps>;
  /** Render flag — false hides the wizard from the picker (e.g. "coming soon"). */
  enabled: boolean;
  /** When true, host launching this wizard broadcasts it to every participant
   *  (e.g. group breathing). When false, the wizard is personal — only the
   *  launching user sees it. Defaults to true for backwards-compat. */
  broadcast?: boolean;
  /** Which session modes this wizard is offered in. Omitted = all modes.
   *  e.g. group intentions only make sense in 'group'; box-breath is hidden
   *  from matched 1-on-1s to keep the list short. */
  visibleIn?: Array<'solo' | 'one_on_one' | 'group'>;
}

export interface WizardComponentProps {
  /** True when the local user is the host who triggered this. */
  isHost: boolean;
  /** Called when this user is done — closes the overlay locally.
   *  For passive wizards the host's `end` broadcast also closes everyone's
   *  view; this is the participant's local "I'm done" escape hatch. */
  onLocalDismiss: () => void;
  /** Host-only: broadcast end-of-wizard to all participants. */
  onBroadcastEnd: () => void;
}

/** Realtime broadcast payloads on the `wizard:{sessionId}` channel. */
export type WizardSyncEvent =
  | { type: 'start'; wizardId: WizardId; startedAt: number }
  | { type: 'end' };
