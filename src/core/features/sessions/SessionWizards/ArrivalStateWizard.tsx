// ArrivalStateWizard
//
// "How are you arriving?" — the personal entry-point to picking a music
// category. 7 user states map to 6 categories (Restless + Scattered share
// Anchor). User taps one, we set their music override via a window event
// the player listens for. Personal wizard: never broadcast, even when
// launched from a group session.

import { X } from 'lucide-react';
import type { WizardComponentProps } from './types';
import type { MusicCategory } from '../../../services/SessionMusicService';
import { MUSIC_CATEGORIES } from '../../../services/SessionMusicService';

interface ArrivalState {
  id: string;
  label: string;
  glyph: string;
  description: string;
  /** Which music category this state maps to. */
  category: MusicCategory;
}

const ARRIVAL_STATES: ArrivalState[] = [
  { id: 'stressed',     label: 'Stressed',     glyph: '😤', description: 'Cortisol high · need to slow down',         category: 'calm'   },
  { id: 'scattered',    label: 'Scattered',    glyph: '😵', description: "Can't latch on · need structure",            category: 'anchor' },
  { id: 'foggy',        label: 'Foggy',        glyph: '😴', description: 'Low energy · need a gentle lift',            category: 'lift'   },
  { id: 'ready',        label: 'Ready',        glyph: '🙂', description: 'Neutral · deepen into focus',                category: 'flow'   },
  { id: 'hyperfocused', label: 'In the zone',  glyph: '🧠', description: 'Already flowing · keep it sharp',            category: 'deep'   },
  { id: 'creative',     label: 'Creative',     glyph: '💡', description: 'Brainstorming · loose connections',          category: 'open'   },
  { id: 'restless',     label: 'Restless',     glyph: '⚡', description: 'Wired · channel the energy',                  category: 'anchor' },
];

/** Triggered globally so the music player can update its override. */
function dispatchCategoryChoice(category: MusicCategory) {
  window.dispatchEvent(
    new CustomEvent('sm:music-set-category', { detail: category }),
  );
}

export function ArrivalStateWizard({ onLocalDismiss }: WizardComponentProps) {
  function handlePick(state: ArrivalState) {
    dispatchCategoryChoice(state.category);
    onLocalDismiss();
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white p-6 overflow-y-auto">
      <button
        type="button"
        onClick={onLocalDismiss}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md grid place-items-center hover:bg-white/20"
        aria-label="Skip"
      >
        <X size={18} />
      </button>

      <div className="w-full max-w-md text-center mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-3">
          Vibe check
        </p>
        <h2 className="text-2xl font-extrabold leading-tight">How are you arriving?</h2>
        <p className="text-sm text-white/55 mt-2 leading-snug">
          Pick your state. The music adapts to meet you where you are.
        </p>
      </div>

      <div className="w-full max-w-md grid grid-cols-2 gap-2">
        {ARRIVAL_STATES.map((s) => {
          const cat = MUSIC_CATEGORIES.find((c) => c.id === s.category)!;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handlePick(s)}
              className="group flex flex-col items-start gap-1.5 p-3 rounded-2xl bg-white/5 hover:bg-white/12 ring-1 ring-white/10 hover:ring-white/25 transition-all text-left active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">{s.glyph}</span>
                <span className="text-sm font-extrabold">{s.label}</span>
              </div>
              <p className="text-[11px] text-white/55 leading-snug">{s.description}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/40 group-hover:text-white/70">
                <span>{cat.glyph}</span>
                <span>{cat.label} · {cat.targetHz} Hz</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-[10px] text-white/35 text-center max-w-xs leading-snug">
        Your choice sets the music for this session. You can change it again from the player at any time.
      </p>
    </div>
  );
}
