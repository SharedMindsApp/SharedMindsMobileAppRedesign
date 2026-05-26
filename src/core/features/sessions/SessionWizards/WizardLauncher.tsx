// WizardLauncher
//
// Host-only button + picker sheet. Sits inline in the session top bar.
// Clicking opens a small panel listing the wizard registry; clicking an
// entry triggers `launchWizard(id)`.

import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { WIZARD_REGISTRY } from './registry';
import type { WizardId } from './types';

interface Props {
  onLaunch: (id: WizardId) => void;
}

export function WizardLauncher({ onLaunch }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Click-outside + Esc to close.
  useEffect(() => {
    if (!open) return;
    function handleDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md grid place-items-center text-white hover:bg-white/15 transition-colors"
        aria-label="Run a wizard"
        title="Run a guided wizard"
      >
        <Sparkles size={15} />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-11 right-0 w-[300px] rounded-2xl bg-black/85 backdrop-blur-md text-white shadow-2xl ring-1 ring-white/10 p-2 z-[70]"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2 py-1.5">
            Guided wizards · for everyone
          </p>
          <div className="space-y-1">
            {WIZARD_REGISTRY.map((w) => (
              <button
                key={w.id}
                type="button"
                disabled={!w.enabled}
                onClick={() => {
                  if (!w.enabled) return;
                  onLaunch(w.id);
                  setOpen(false);
                }}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-colors ${
                  w.enabled
                    ? 'hover:bg-white/10'
                    : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span className="text-lg leading-none flex-shrink-0 mt-0.5">{w.glyph}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-white truncate">
                    {w.label}
                    {!w.enabled && (
                      <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-white/40">
                        Soon
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-white/55 leading-snug mt-0.5">
                    {w.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/35 px-2 py-2 leading-snug">
            Everyone in this session sees the wizard. Participants can skip it locally without affecting others.
          </p>
        </div>
      )}
    </div>
  );
}
