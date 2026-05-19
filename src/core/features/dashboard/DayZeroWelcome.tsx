/**
 * DayZeroWelcome — single hero for users with zero sessions.
 *
 * Replaces the old NewUserHero card and absorbs what would otherwise be
 * three stacked "no X yet" states (no projects, no week activity, no
 * community shown). The day-zero home page is now just:
 *   1. Greeting
 *   2. CommunityPulseCard (the room is alive)   [rendered above this]
 *   3. DayZeroWelcome                            ← this component
 *   4. Daily intention                           [rendered below]
 *
 * No empty-state stacking, no useless "this week" graphic with no data.
 */

import { Play, Target, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

export function DayZeroWelcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary via-primary to-blue-600 p-5 text-white shadow-lg shadow-primary/20">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1.5">
        Welcome
      </p>
      <h2 className="text-xl font-extrabold leading-tight mb-1.5">
        Your first focus block is one click away.
      </h2>
      <p className="text-sm text-white/85 leading-relaxed mb-4">
        Declare the one thing you're finishing, show up alongside other founders,
        and report back when it's done.
      </p>

      {/* The loop, compact */}
      <div className="flex items-center gap-2 mb-4 text-white/90">
        {[
          { icon: Target, label: 'Declare' },
          { icon: Zap, label: 'Work' },
          { icon: CheckCircle2, label: 'Finish' },
        ].map(({ icon: Icon, label }, i, arr) => (
          <div key={label} className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1 text-[11px] font-bold">
              <Icon size={11} />
              {label}
            </span>
            {i < arr.length - 1 && <ArrowRight size={11} className="text-white/40" />}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-primary text-sm font-extrabold shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all"
      >
        <Play size={14} fill="currentColor" />
        Start your first session
      </button>
    </div>
  );
}
