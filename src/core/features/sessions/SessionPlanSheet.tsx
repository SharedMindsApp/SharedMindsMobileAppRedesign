// SessionPlanSheet
//
// The "set up your session" step shown right after a task is declared:
//   • Music — pick an arriving vibe (sets the music category).
//   • Breath at start — optional 1 or 3 min to settle in.
//   • Mid-session break — duration-adaptive:
//        ≤ 45 min   hidden (too short)
//        46–89 min  offered (off by default)
//        90 min +   pre-scheduled (on by default; can remove)
//
// Skippable. Portaled to <body>. Writes the agenda to planned_wizards and
// dispatches the chosen music category.

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Music, Wind, Coffee, Check } from 'lucide-react';
import type { SessionMode } from '../../lib/sessions/focusTypes';
import type { PlannedWizard } from '../../lib/sessions/focusTypes';
import type { WizardId } from './SessionWizards/types';
import { MUSIC_CATEGORIES, type MusicCategory } from '../../services/SessionMusicService';
import { planForDuration } from './SessionWizards/sessionPlan';

interface Props {
  durationMin: number;
  mode: SessionMode;
  /** Existing agenda (e.g. the 90+ auto-break seeded at creation). */
  planned: PlannedWizard[];
  onClose: () => void;
  /** Persist the new agenda + optional music pick. */
  onApply: (planned: PlannedWizard[], music: MusicCategory | null) => void;
}

const genId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `pw_${Math.random().toString(36).slice(2, 10)}`;

export function SessionPlanSheet({ durationMin, planned, onClose, onApply }: Props) {
  const plan = useMemo(() => planForDuration(durationMin), [durationMin]);

  // Seed initial UI state from any existing agenda.
  const initialBreath = planned.find((p) => p.status === 'planned' && (p.wizardId === 'breathing_1min' || p.wizardId === 'breathing_3min'))?.wizardId as WizardId | undefined;
  const hasBreak = planned.some((p) => p.status === 'planned' && (p.wizardId === 'break_3min' || p.wizardId === 'break_5min'));

  const [music, setMusic] = useState<MusicCategory | null>(null);
  const [breath, setBreath] = useState<WizardId | null>(initialBreath ?? null);
  const [breakOn, setBreakOn] = useState<boolean>(plan.breakMode === 'auto' ? (hasBreak || true) : hasBreak);

  function apply() {
    const next: PlannedWizard[] = [];
    if (breath) next.push({ id: genId(), wizardId: breath, at: 'start', status: 'planned' });
    if (breakOn && plan.breakMode !== 'none') {
      next.push({ id: genId(), wizardId: plan.breakWizardId, at: plan.breakAt, status: 'planned' });
    }
    onApply(next, music);
  }

  const breakLabel = plan.breakWizardId === 'break_5min' ? 'Take five (5 min)' : 'Quick break (3 min)';
  const breakWhen = plan.breakAt === 'halfway' ? `~${Math.round(durationMin / 2)} min in` : plan.breakAt;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
        className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[86dvh] flex flex-col"
      >
        <div className="sm:hidden flex justify-center pt-2 pb-1"><span className="w-9 h-1 rounded-full bg-black/15" /></div>

        <div className="shrink-0 flex items-center justify-between px-5 pt-2 sm:pt-4 pb-1">
          <h2 className="text-base font-extrabold stitch-text-primary">Set up your session</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors">
            <X size={15} className="stitch-text-secondary" />
          </button>
        </div>
        <p className="shrink-0 px-5 pb-3 text-xs stitch-text-secondary leading-snug">
          Optional — pick a vibe and how you want to break it up. You can change any of this mid-session.
        </p>

        <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0 space-y-5">
          {/* Music */}
          <section>
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2 inline-flex items-center gap-1.5">
              <Music size={11} /> Music
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MUSIC_CATEGORIES.map((c) => {
                const active = music === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setMusic(active ? null : c.id)}
                    title={c.character}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      active ? 'stitch-btn--primary text-white' : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                    }`}
                  >
                    <span>{c.glyph}</span>{c.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Breath at start */}
          <section>
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2 inline-flex items-center gap-1.5">
              <Wind size={11} /> Settle in
            </p>
            <div className="flex gap-1.5">
              <PlanChip label="None" selected={breath === null} onClick={() => setBreath(null)} />
              <PlanChip label="1-min breath" selected={breath === 'breathing_1min'} onClick={() => setBreath('breathing_1min')} />
              <PlanChip label="3-min breath" selected={breath === 'breathing_3min'} onClick={() => setBreath('breathing_3min')} />
            </div>
          </section>

          {/* Break */}
          {plan.breakMode !== 'none' && (
            <section>
              <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2 inline-flex items-center gap-1.5">
                <Coffee size={11} /> Mid-session break
              </p>
              <button
                type="button"
                onClick={() => setBreakOn((v) => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  breakOn ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${breakOn ? 'bg-primary' : 'bg-surface-container'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${breakOn ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold stitch-text-primary leading-tight">{breakLabel}</p>
                  <p className="text-[11px] stitch-text-secondary leading-tight mt-0.5">
                    {breakWhen}{plan.breakMode === 'auto' ? ' · recommended for longer sessions' : ''}
                  </p>
                </div>
              </button>
            </section>
          )}
        </div>

        {/* footer */}
        <div className="shrink-0 px-5 pt-2 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 px-4 py-3 rounded-2xl text-sm font-bold bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.98] transition-all"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl stitch-btn--primary text-white text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
          >
            <Check size={16} /> Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PlanChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
        selected ? 'stitch-btn--primary text-white' : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
      }`}
    >
      {label}
    </button>
  );
}
