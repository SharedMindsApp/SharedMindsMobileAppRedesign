// ArrivalStateWizard
//
// "How are you arriving?" — the personal entry-point to picking a music
// category. Nine emotion-led options laid out as a 3×3 grid, one per
// album. Each row groups options by intensity:
//
//   Row 1 — dysregulated:   Wired · Scattered · Sluggish
//   Row 2 — balanced:       Centred · Locked in · Curious
//   Row 3 — heavy / weighty: Pensive · Drained · Determined
//
// Wording is intentionally emotional ("Wired" not "Stressed", "Sluggish"
// not "Foggy") so users pick what FEELS true rather than self-diagnosing.
// Each emotion maps 1:1 to one of the 9 music categories.
//
// Personal wizard: never broadcast, even when launched from a group
// session. User taps one, we set their music override via a window
// event the player listens for.

import { X } from 'lucide-react';
import type { WizardComponentProps } from './types';
import type { MusicCategory } from '../../../services/SessionMusicService';
import { MUSIC_CATEGORIES } from '../../../services/SessionMusicService';

interface MoodChoice {
  id: string;
  /** Emotion-led label — the headline the user reads. */
  label: string;
  /** Big emoji that matches the feeling, NOT the album glyph (album
   *  glyph is shown smaller as the "what you'll get" hint). */
  emoji: string;
  /** One-line subtitle clarifying the feeling. */
  description: string;
  /** Which music category this feeling maps to. */
  category: MusicCategory;
}

const MOOD_CHOICES: MoodChoice[] = [
  // ── Row 1: dysregulated / off-balance ───────────────────────
  { id: 'wired',     label: 'Wired',     emoji: '😤', description: 'Anxious, can\'t slow down',     category: 'calm'   },
  { id: 'scattered', label: 'Scattered', emoji: '😵', description: 'Mind jumping, can\'t latch on', category: 'anchor' },
  { id: 'sluggish',  label: 'Sluggish',  emoji: '😴', description: 'Foggy, slow off the line',      category: 'lift'   },

  // ── Row 2: balanced / present ───────────────────────────────
  { id: 'centred',   label: 'Centred',   emoji: '🙂', description: 'Steady, ready to begin',        category: 'flow'   },
  { id: 'locked-in', label: 'Locked in', emoji: '🧠', description: 'Already in flow, keep it sharp',category: 'deep'   },
  { id: 'curious',   label: 'Curious',   emoji: '💡', description: 'Open, exploratory, playful',    category: 'zen'    },

  // ── Row 3: weighty / emotional ──────────────────────────────
  { id: 'pensive',   label: 'Pensive',   emoji: '🌙', description: 'Reflective, contemplative',     category: 'dusk'   },
  { id: 'drained',   label: 'Drained',   emoji: '🔋', description: 'Low fuel, need external push',  category: 'drive'  },
  { id: 'purposeful',label: 'Purposeful',emoji: '🎯', description: 'Work that matters today',       category: 'score'  },
];

/** Triggered globally so the music player can update its override. */
function dispatchCategoryChoice(category: MusicCategory) {
  window.dispatchEvent(
    new CustomEvent('sm:music-set-category', { detail: category }),
  );
}

export function ArrivalStateWizard({ onLocalDismiss }: WizardComponentProps) {
  function handlePick(choice: MoodChoice) {
    dispatchCategoryChoice(choice.category);
    onLocalDismiss();
  }

  return (
    // Scroll-safe full-screen sheet. The inner wrapper uses `my-auto` so the
    // content vertically centres when it fits, but scrolls from the TOP when
    // it's taller than the viewport (mobile) — `justify-center` on the flex
    // parent would clip the top rows and make them unreachable.
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white">
      <button
        type="button"
        onClick={onLocalDismiss}
        className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md grid place-items-center hover:bg-white/20"
        aria-label="Skip"
      >
        <X size={18} />
      </button>

      <div
        className="min-h-full flex flex-col justify-center px-4 py-10 sm:py-12"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 2.5rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)',
        }}
      >
        <div className="w-full max-w-2xl mx-auto text-center mb-5 sm:mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-2">
            Vibe check
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            How are you arriving?
          </h2>
          <p className="text-sm text-white/55 mt-2 leading-snug max-w-md mx-auto">
            Pick the feeling that's closest. The music adapts to meet you where you are.
          </p>
        </div>

        {/* 2-col on phones, 3-col from sm+. (The old `xs:` breakpoint wasn't
            configured, so mobile silently fell back to a single tall column
            whose top rows scroll-clipped.) */}
        <div className="w-full max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {MOOD_CHOICES.map((m) => {
            const cat = MUSIC_CATEGORIES.find((c) => c.id === m.category)!;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handlePick(m)}
                className="group flex flex-col items-start gap-1 p-3 sm:p-4 rounded-2xl bg-white/5 hover:bg-white/12 ring-1 ring-white/10 hover:ring-white/25 transition-all text-left active:scale-[0.98]"
              >
                <span className="text-3xl sm:text-4xl leading-none">{m.emoji}</span>
                <span className="text-sm sm:text-base font-extrabold mt-1">{m.label}</span>
                <p className="text-[11px] text-white/55 leading-snug">{m.description}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/40 group-hover:text-white/70">
                  <span>{cat.glyph}</span>
                  <span>{cat.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-[10px] text-white/35 text-center max-w-xs mx-auto leading-snug">
          Your choice sets the music for this session. You can change it again from the player at any time.
        </p>
      </div>
    </div>
  );
}
