/**
 * ProfileCompletenessCard — nudges users to fill out fields that power
 * the matching system. Hidden once the profile clears the threshold.
 *
 * Lives on the home dashboard. Each field is weighted by how much it
 * unlocks downstream features:
 *   - avatar          → required for solo body-double, no-camera sessions
 *   - bio             → context on the People directory
 *   - work_types      → "People like you" filter
 *   - skills          → 🤝 matched signal
 *   - offering        → 🎯 hunt signal (incoming)
 *   - seeking         → 🎯 hunt signal (outgoing)
 *   - wanted_skills   → 🧲 wanted signal
 *   - city/country    → location filter
 *
 * Threshold to hide: 80% — at that point the profile is functional, and
 * we don't want to nag forever.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';

interface Field {
  id: string;
  label: string;
  done: boolean;
  weight: number; // sums to 100 across all fields
  href: string;
}

const HIDE_AT = 80; // %

export function ProfileCompletenessCard() {
  const { profile } = useAuth();

  const fields = useMemo<Field[]>(() => {
    if (!profile) return [];
    return [
      { id: 'avatar',   label: 'Profile photo',        done: !!profile.avatar_url,                        weight: 15, href: '/profile' },
      { id: 'bio',      label: 'Short bio',            done: !!profile.bio?.trim(),                       weight: 15, href: '/profile' },
      { id: 'work',     label: 'What you do',          done: (profile.work_types?.length ?? 0) > 0,       weight: 10, href: '/profile' },
      { id: 'skills',   label: 'Skills you have',      done: (profile.skills?.length ?? 0) >= 3,          weight: 20, href: '/profile' },
      { id: 'offering', label: 'What you can help with', done: (profile.offering?.length ?? 0) > 0,       weight: 10, href: '/profile' },
      { id: 'seeking',  label: "What you'd like help with", done: (profile.seeking?.length ?? 0) > 0,    weight: 10, href: '/profile' },
      { id: 'wanted',   label: "People you'd like to meet", done: (profile.wanted_skills?.length ?? 0) > 0, weight: 10, href: '/people' },
      { id: 'place',    label: 'City + country',       done: !!profile.country_code,                      weight: 10, href: '/profile' },
    ];
  }, [profile]);

  const pct = useMemo(() => {
    if (fields.length === 0) return 0;
    return fields.reduce((sum, f) => sum + (f.done ? f.weight : 0), 0);
  }, [fields]);

  if (!profile || pct >= HIDE_AT) return null;

  const todo = fields.filter((f) => !f.done).slice(0, 3);

  return (
    <section className="rounded-2xl bg-gradient-to-br from-violet-50 via-blue-50/30 to-cyan-50/30 ring-1 ring-violet-200/40 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
          <Sparkles size={18} className="text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-bold stitch-text-primary leading-tight">
              Finish your profile
            </p>
            <span className="text-[11px] font-bold tabular-nums text-violet-700 shrink-0">
              {pct}%
            </span>
          </div>
          <p className="text-[11px] stitch-text-secondary leading-snug mb-2">
            A complete profile gets ~3× more match signal on Pulse and /people.
          </p>

          {/* Progress bar */}
          <div className="h-1.5 w-full bg-white/60 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Up to 3 missing fields */}
          <ul className="space-y-1">
            {todo.map((f) => (
              <li key={f.id}>
                <Link
                  to={f.href}
                  className="flex items-center gap-2 text-xs font-semibold stitch-text-primary hover:text-violet-700 group/item"
                >
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-violet-300 group-hover/item:border-violet-500 transition-colors shrink-0" />
                  <span className="truncate">{f.label}</span>
                  <span className="ml-auto text-[10px] font-bold text-violet-600 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    Add →
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Done items (collapsed count) */}
          {fields.filter((f) => f.done).length > 0 && (
            <p className="text-[10px] stitch-text-secondary mt-2 flex items-center gap-1">
              <CheckCircle2 size={10} className="text-emerald-600" />
              {fields.filter((f) => f.done).length} of {fields.length} done
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
