/**
 * MoodPicker — the adaptive "state of mind" check-in.
 *
 * The options shown depend on the session kind: 'do' sessions ask about
 * ENERGY (hyperfocus … brain fog), 'plan'/'reflect' sessions ask about
 * CLARITY/confidence (foggy … motivated). Used at session start (declare)
 * and end (debrief) so the recap can show the shift.
 *
 * Compact, single-tap, optional — never blocks starting or finishing.
 */

import { type SessionKind, moodOptionsForKind, moodPromptForKind } from '../../../lib/sessionMood';

interface Props {
  kind: SessionKind;
  /** Selected mood code, or null. */
  value: string | null;
  onChange: (code: string | null) => void;
  /** Tunes the prompt copy ("going in" vs "now"). */
  when: 'before' | 'after';
  /** Visual theme — light surfaces (declare) vs dark overlay (debrief). */
  tone?: 'light' | 'dark';
  /** Suppress the built-in prompt (when the caller renders its own header). */
  hideLabel?: boolean;
}

export function MoodPicker({ kind, value, onChange, when, tone = 'light', hideLabel = false }: Props) {
  const options = moodOptionsForKind(kind);
  const prompt = moodPromptForKind(kind, when);

  const labelCls = tone === 'dark' ? 'text-white/60' : 'stitch-text-secondary';

  return (
    <div>
      {!hideLabel && <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${labelCls}`}>{prompt}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((m) => {
          const active = value === m.code;
          const base = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95';
          const cls = active
            ? 'bg-primary text-white shadow-sm'
            : tone === 'dark'
              ? 'bg-white/10 text-white/80 hover:bg-white/20'
              : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container';
          return (
            <button
              key={m.code}
              type="button"
              // Tapping the active one again clears it (mood is optional).
              onClick={() => onChange(active ? null : m.code)}
              className={`${base} ${cls}`}
            >
              <span className="text-sm leading-none">{m.emoji}</span>
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
