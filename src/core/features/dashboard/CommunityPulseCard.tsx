/**
 * CommunityPulseCard — one rich, info-dense card that says "the room is alive."
 *
 * Replaces the old 3-row "Working Now" list. Instead of names + goals, it
 * shows a single sentence that quantifies the energy — total working,
 * how many in your timezone, how many in your work type — plus a stack of
 * up to 5 avatars. Taps through to /sessions.
 *
 * When the room is genuinely empty, the card flips to a friendly nudge
 * instead of a sad "no one's working" panel.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import type { CommunitySession } from '../../../lib/sessions/focusTypes';

const AVATAR_GRAD = [
  'from-violet-400 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-purple-500',
];
function gradFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRAD[Math.abs(hash) % AVATAR_GRAD.length];
}

// country_code is a strong-enough proxy for "in your region" — we don't
// track timezones per-user but most people work in their home country.
function countInSameRegion(sessions: CommunitySession[], myCountry: string | null): number {
  if (!myCountry) return 0;
  return sessions.filter((s) => s.country_code && s.country_code === myCountry).length;
}

function countInSameWorkType(sessions: CommunitySession[], myWorkType: string | null): number {
  if (!myWorkType) return 0;
  return sessions.filter((s) => s.work_type && s.work_type === myWorkType).length;
}

export function CommunityPulseCard({
  sessions,
  excludeSessionId,
  onStart,
}: {
  sessions: CommunitySession[];
  excludeSessionId?: string;
  onStart: () => void;
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const others = useMemo(
    () => sessions.filter((s) => s.id !== excludeSessionId),
    [sessions, excludeSessionId]
  );

  const total = others.length;
  const sameRegion = countInSameRegion(others, profile?.country_code ?? null);
  const sameType = countInSameWorkType(others, profile?.work_type ?? null);
  const displayed = others.slice(0, 5);

  // Empty community → friendly nudge, not a sad card
  if (total === 0) {
    return (
      <button
        type="button"
        onClick={onStart}
        className="w-full text-left rounded-2xl p-4 bg-gradient-to-br from-primary/8 to-primary/3 hover:from-primary/12 hover:to-primary/5 border border-primary/15 transition-all active:scale-[0.99] flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
          <Users size={17} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary leading-tight">
            Quiet right now — start the room
          </p>
          <p className="text-[11px] stitch-text-secondary mt-0.5">
            Be the first to show up. Others tend to join once one slot lights up.
          </p>
        </div>
        <ArrowRight size={14} className="text-primary shrink-0" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/sessions')}
      className="w-full text-left rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-cyan-50/60 hover:from-emerald-100 hover:to-cyan-100/70 border border-emerald-200/50 transition-all active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          <p className="text-[10px] font-bold text-emerald-800 tracking-widest uppercase">
            Live now
          </p>
        </div>
        <ArrowRight size={13} className="text-emerald-700" />
      </div>

      <div className="flex items-center gap-3">
        {/* Avatar stack */}
        <div className="flex -space-x-2 shrink-0">
          {displayed.map((s) => (
            s.avatar_url ? (
              <img
                key={s.id}
                src={s.avatar_url}
                alt={s.display_name}
                title={s.display_name}
                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div
                key={s.id}
                title={s.display_name}
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradFor(s.display_name)} border-2 border-white shadow-sm flex items-center justify-center text-[11px] font-bold text-white`}
              >
                {s.display_name.charAt(0).toUpperCase()}
              </div>
            )
          ))}
          {total > 5 && (
            <div className="w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-extrabold text-slate-600">
              +{total - 5}
            </div>
          )}
        </div>

        {/* Sentence */}
        <p className="text-sm font-semibold text-emerald-900 leading-snug">
          <span className="tabular-nums font-extrabold">{total}</span>{' '}
          {total === 1 ? 'person is' : 'people are'} working now
          {sameRegion > 0 && (
            <>
              {' · '}
              <span className="tabular-nums font-extrabold">{sameRegion}</span> in your region
            </>
          )}
          {sameType > 0 && (
            <>
              {' · '}
              <span className="tabular-nums font-extrabold">{sameType}</span> in your work type
            </>
          )}
        </p>
      </div>
    </button>
  );
}
