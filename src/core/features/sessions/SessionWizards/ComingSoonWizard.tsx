// Placeholder for wizards listed in the registry but not yet built. Shown
// in the picker as disabled chips; if triggered (e.g. via API misuse) it
// just renders a graceful "coming soon" panel.

import type { WizardComponentProps } from './types';
import { X } from 'lucide-react';

export function ComingSoonWizard({ onLocalDismiss }: WizardComponentProps) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
      <button
        type="button"
        onClick={onLocalDismiss}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 grid place-items-center hover:bg-white/20"
        aria-label="Close"
      >
        <X size={18} />
      </button>
      <p className="text-2xl font-extrabold mb-2">Coming soon</p>
      <p className="text-sm text-white/60">This wizard isn't quite ready yet.</p>
    </div>
  );
}
