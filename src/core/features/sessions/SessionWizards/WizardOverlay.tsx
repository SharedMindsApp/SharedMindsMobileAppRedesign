// WizardOverlay
//
// Looks up the active wizard from the registry and renders its component.
// Returns null when nothing's active. Sits at z-[80] so it covers session
// chrome but stays below toasts.

import { findWizard } from './registry';
import type { WizardId } from './types';

interface Props {
  wizardId: WizardId | null;
  isHost: boolean;
  onLocalDismiss: () => void;
  onBroadcastEnd: () => void;
}

export function WizardOverlay({ wizardId, isHost, onLocalDismiss, onBroadcastEnd }: Props) {
  if (!wizardId) return null;
  const entry = findWizard(wizardId);
  if (!entry) return null;
  const Component = entry.component;
  return (
    <Component
      isHost={isHost}
      onLocalDismiss={onLocalDismiss}
      onBroadcastEnd={onBroadcastEnd}
    />
  );
}
