// QuickRestartCard — warm "welcome back" surface that fires when the
// user hasn't completed a session in ≥3 days. Replaces the would-be
// "you've been gone 5 days" guilt message with a forward-looking nudge
// biased toward a small 25-min win.
//
// Per the no-gap-no-shame principle:
//   • Never mentions HOW long the gap was (numerically or otherwise)
//   • Default action is a 25-min Quick Start (small + winnable)
//   • No reference to "missed days" / "broken streak" / etc.
//   • Dismissable per-session via localStorage so it doesn't nag
//     the same user every page-load on the same day.

import { useEffect, useState } from 'react';
import { Play, Sparkles, X } from 'lucide-react';

interface Props {
  /** Open the DeclareSessionModal pre-filled with a small (25-min) intent. */
  onQuickStart: () => void;
  /** Stable identifier (e.g. user id) used for the dismiss localStorage
   *  key so we don't bleed dismissal state across accounts. */
  userId: string;
}

const DISMISS_KEY_PREFIX = 'sm.quickRestart.dismissedOn:';

/** "Today" key — once dismissed, hide for the rest of the calendar day. */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function QuickRestartCard({ onQuickStart, userId }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `${DISMISS_KEY_PREFIX}${userId}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === todayKey()) {
        setDismissed(true);
      }
    } catch { /* ignore quota / private-mode errors */ }
  }, [storageKey]);

  function handleDismiss() {
    setDismissed(true);
    try { localStorage.setItem(storageKey, todayKey()); } catch {}
  }

  if (dismissed) return null;

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-violet-50 via-violet-50 to-indigo-50 ring-1 ring-violet-100 p-5 sm:p-6 overflow-hidden">
      {/* Subtle decorative glyph */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-violet-100/40 blur-xl pointer-events-none" />

      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 w-7 h-7 rounded-full grid place-items-center text-violet-700/60 hover:text-violet-900 hover:bg-white/40"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <div className="relative flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-violet-100 grid place-items-center shrink-0">
          <Sparkles size={16} className="text-violet-600" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="text-lg sm:text-xl font-extrabold text-violet-950 leading-tight">
            Welcome back.
          </h3>
          <p className="text-sm text-violet-900/80 mt-1 leading-snug">
            Ready for a quick win? A 25-minute session is a great way back in — pick anything small.
          </p>
          <button
            type="button"
            onClick={onQuickStart}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors"
          >
            <Play size={13} fill="currentColor" strokeWidth={0} />
            Quick start 25 min
          </button>
        </div>
      </div>
    </div>
  );
}
