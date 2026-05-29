// WizardLauncher
//
// Button + picker sheet in the session top bar. Two things per wizard:
//   • Now      — launch immediately for everyone (broadcasts).
//   • Schedule — (host only) queue it to auto-fire at a relative moment
//                (At the start / 5 min in / Halfway / Last 5 min). Scheduled
//                items show at the top with a cancel control.
//
// Mobile = bottom sheet; desktop = top-right popover. Portaled to <body>.

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Clock, X, Zap } from 'lucide-react';
import { WIZARD_REGISTRY, wizardsForMode } from './registry';
import type { WizardId } from './types';
import type { PlannedWizard, SessionMode } from '../../../lib/sessions/focusTypes';

const MOMENTS: { at: PlannedWizard['at']; label: string }[] = [
  { at: 'start',   label: 'At the start' },
  { at: 'min5',    label: '5 min in' },
  { at: 'halfway', label: 'Halfway' },
  { at: 'last5',   label: 'Last 5 min' },
];
const MOMENT_LABEL: Record<PlannedWizard['at'], string> = {
  start: 'At the start', min5: '5 min in', halfway: 'Halfway', last5: 'Last 5 min',
};

interface Props {
  onLaunch: (id: WizardId) => void;
  /** Host-only scheduling. When omitted, the sheet is run-now only. */
  planned?: PlannedWizard[];
  onSchedule?: (id: WizardId, at: PlannedWizard['at']) => void;
  onCancelPlanned?: (plannedId: string) => void;
  /** Session mode — filters which wizards are offered (e.g. no group break
   *  or box-breath in a 1-on-1). Defaults to 'group' (shows everything). */
  mode?: SessionMode;
}

export function WizardLauncher({ onLaunch, planned = [], onSchedule, onCancelPlanned, mode = 'group' }: Props) {
  const [open, setOpen] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<WizardId | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const visibleWizards = wizardsForMode(mode);

  // Click-outside + Esc to close.
  useEffect(() => {
    if (!open) return;
    function handleDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const labelFor = (id: string) => WIZARD_REGISTRY.find((w) => w.id === id)?.label ?? id;
  const glyphFor = (id: string) => WIZARD_REGISTRY.find((w) => w.id === id)?.glyph ?? '✨';
  const upcoming = planned.filter((p) => p.status === 'planned');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full bg-white/10 backdrop-blur-md grid place-items-center text-white hover:bg-white/15 transition-colors"
        aria-label="Wizards & session plan"
        title="Wizards & session plan"
      >
        <Sparkles size={15} />
        {upcoming.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-amber-950 text-[9px] font-extrabold grid place-items-center">
            {upcoming.length}
          </span>
        )}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[120]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 sm:bg-transparent" />
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
            className="absolute left-0 right-0 bottom-0 w-full max-h-[80dvh] overflow-y-auto rounded-t-3xl sm:left-auto sm:right-4 sm:top-16 sm:bottom-auto sm:w-[340px] sm:rounded-2xl sm:max-h-[82vh] bg-black/90 backdrop-blur-md text-white shadow-2xl ring-1 ring-white/10 p-2"
          >
            <div className="sm:hidden flex justify-center pt-1 pb-2"><span className="w-9 h-1 rounded-full bg-white/20" /></div>

            {/* Planned agenda */}
            {onSchedule && upcoming.length > 0 && (
              <div className="mb-1 rounded-xl bg-amber-500/10 ring-1 ring-amber-400/20 p-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80 px-1 pb-1.5">
                  Planned for this session
                </p>
                <div className="space-y-1">
                  {upcoming.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-1 py-1">
                      <span className="text-base leading-none shrink-0">{glyphFor(p.wizardId)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{labelFor(p.wizardId)}</p>
                        <p className="text-[10px] text-amber-200/70 flex items-center gap-1"><Clock size={9} /> {MOMENT_LABEL[p.at]}</p>
                      </div>
                      {onCancelPlanned && (
                        <button
                          type="button"
                          onClick={() => onCancelPlanned(p.id)}
                          aria-label="Cancel scheduled wizard"
                          className="shrink-0 w-6 h-6 rounded-full grid place-items-center text-white/50 hover:text-white hover:bg-white/10"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2 py-1.5">
              {onSchedule ? 'Run now or schedule' : 'Guided wizards · for everyone'}
            </p>
            <div className="space-y-0.5">
              {visibleWizards.map((w) => (
                <div key={w.id} className={`rounded-lg ${w.enabled ? '' : 'opacity-40'}`}>
                  <div className="flex items-start gap-2.5 p-2.5">
                    <span className="text-lg leading-none flex-shrink-0 mt-0.5">{w.glyph}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-white">
                        {w.label}
                        {!w.enabled && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-white/40">Soon</span>}
                      </p>
                      <p className="text-[11px] text-white/55 leading-snug mt-0.5">{w.description}</p>
                    </div>
                    {w.enabled && (
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => { onLaunch(w.id); setOpen(false); }}
                          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white bg-white/15 hover:bg-white/25 px-2 py-1 rounded-full transition-colors"
                        >
                          <Zap size={10} /> Now
                        </button>
                        {onSchedule && (
                          <button
                            type="button"
                            onClick={() => setScheduleFor((cur) => (cur === w.id ? null : w.id))}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${
                              scheduleFor === w.id ? 'bg-amber-500 text-amber-950' : 'text-white/70 bg-white/5 hover:bg-white/15'
                            }`}
                          >
                            <Clock size={10} /> Schedule
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Moment chips — shown when scheduling this wizard. */}
                  {onSchedule && scheduleFor === w.id && (
                    <div className="flex flex-wrap gap-1 px-2.5 pb-2.5 -mt-1">
                      {MOMENTS.map((m) => (
                        <button
                          key={m.at}
                          type="button"
                          onClick={() => { onSchedule(w.id, m.at); setScheduleFor(null); }}
                          className="text-[10px] font-bold text-amber-200 bg-amber-500/15 ring-1 ring-amber-400/30 hover:bg-amber-500/25 px-2 py-1 rounded-full transition-colors"
                        >
                          + {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/35 px-2 py-2 leading-snug">
              Everyone in the session sees a wizard when it runs. Scheduled ones fire automatically at their moment; you can cancel or run any of them now.
            </p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
