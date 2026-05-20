/**
 * FindSessionsSheet — modal/bottom-sheet listing this week's public sessions
 * a user could join, grouped by day.
 *
 *   • Desktop:  centred modal popup (max-w-lg, scrollable list)
 *   • Mobile:   bottom-sheet slide-up (full-width, rounded top)
 *
 * Each session card: avatar · title · host · time (local) · mode badge · Join.
 * Clicking Join navigates to /sessions/active/:id (the session room handles
 * permission + waiting room).
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Video, Calendar as CalendarIcon, Users, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { fetchScheduledSessionsInRange } from '../../services/SessionService';
import type { ScheduledSessionWithProfile } from '../../services/SessionService';

// ── Helpers ────────────────────────────────────────────────────────

function startOfWeek(now: Date): Date {
  const dow = now.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function endOfFourWeeks(now: Date): Date {
  const end = startOfWeek(now);
  end.setDate(end.getDate() + 28); // 4 weeks
  return end;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

const MODE_STYLES: Record<string, { bg: string; text: string; label: string; Icon: React.ElementType }> = {
  group:       { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Group',  Icon: Users    },
  one_on_one:  { bg: 'bg-amber-100',  text: 'text-amber-700',  label: '1-on-1', Icon: UserIcon },
};

// ── Card ───────────────────────────────────────────────────────────

function SessionCard({
  session,
  onJoin,
}: {
  session: ScheduledSessionWithProfile;
  onJoin: () => void;
}) {
  const mode = session.session_mode ?? 'group';
  const modeStyle = MODE_STYLES[mode] ?? MODE_STYLES.group;
  const startIso = session.scheduled_at ?? session.start_time;
  const time     = formatTime(startIso);
  const duration = session.intended_duration_minutes ?? 50;
  const purpose  = session.session_purpose;

  // Coloured left stripe — green for community, violet for workshop, blue otherwise
  const stripeCls =
    purpose === 'community'      ? 'bg-emerald-500' :
    purpose === 'weekly_review'  ? 'bg-amber-500'   :
    purpose === 'workshop'       ? 'bg-violet-500'  :
    'bg-primary';

  const initial = (session.display_name ?? '?').charAt(0).toUpperCase();

  return (
    <div className="relative rounded-2xl bg-white ring-1 ring-surface-container/60 overflow-hidden hover:shadow-sm transition-shadow">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${stripeCls}`} />
      <div className="flex items-center gap-3 pl-4 pr-3 py-3">
        {/* Avatar */}
        {session.avatar_url ? (
          <img
            src={session.avatar_url}
            alt={session.display_name ?? 'host'}
            className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-surface-container"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center text-white font-bold shrink-0">
            {initial}
          </div>
        )}

        {/* Title + host + time */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary leading-tight truncate">
            {session.session_title ?? session.session_goal ?? 'Coworking session'}
          </p>
          <p className="text-[11px] stitch-text-secondary truncate">
            Hosted by {session.display_name ?? 'Someone'}
          </p>
          <p className="text-[11px] stitch-text-secondary tabular-nums mt-0.5">
            {time} · {duration} min
          </p>
        </div>

        {/* Mode badge + Join */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${modeStyle.bg} ${modeStyle.text}`}>
            <modeStyle.Icon size={9} />
            {modeStyle.label}
          </span>
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/8 hover:bg-primary hover:text-white px-2.5 py-1.5 rounded-lg ring-1 ring-primary/20 transition-colors"
          >
            <Video size={11} />
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main sheet ─────────────────────────────────────────────────────

export function FindSessionsSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [sessions, setSessions] = useState<ScheduledSessionWithProfile[]>([]);

  useEffect(() => {
    const fromIso = startOfWeek(new Date()).toISOString();
    const toIso   = endOfFourWeeks(new Date()).toISOString();
    fetchScheduledSessionsInRange(fromIso, toIso)
      .then(setSessions)
      .catch((err) => {
        console.error('[FindSessionsSheet] fetch failed:', err);
        const msg =
          err?.message ??
          err?.error_description ??
          (typeof err === 'string' ? err : 'Failed to load sessions');
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduledSessionWithProfile[]>();
    for (const s of sessions) {
      const iso = s.scheduled_at ?? s.start_time;
      const d = new Date(iso);
      const key = dayKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  function handleJoin(session: ScheduledSessionWithProfile) {
    onClose();
    navigate(`/sessions/active/${session.id}`);
  }

  // Lock body scroll while the sheet is open so the modal can't "drift"
  // visually while the page underneath scrolls.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[12vh] px-4 sm:px-6 pb-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-lg bg-white
          rounded-3xl
          shadow-2xl ring-1 ring-black/5
          max-h-[85vh] flex flex-col
          animate-in fade-in zoom-in-95 duration-200
          my-auto
        "
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-surface-container/60">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <CalendarIcon size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-extrabold stitch-text-primary leading-tight">This week's sessions</h2>
            <p className="text-[11px] stitch-text-secondary">Find a session to join</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors"
            aria-label="Close"
          >
            <X size={16} className="stitch-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin stitch-text-secondary" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-200 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && grouped.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-violet-100 mx-auto flex items-center justify-center mb-3">
                <Sparkles size={20} className="text-violet-600" />
              </div>
              <p className="text-sm font-bold stitch-text-primary mb-1">No scheduled sessions this week</p>
              <p className="text-xs stitch-text-secondary leading-relaxed max-w-xs mx-auto">
                Be the first — schedule a session on your calendar and the community will see it here.
              </p>
            </div>
          )}

          {!loading && !error && grouped.map(([day, list]) => {
            const d = new Date(day + 'T00:00:00');
            const isToday = day === dayKey(new Date());
            return (
              <section key={day}>
                <div className="flex items-center gap-2 mb-2.5">
                  <p className="text-[10px] font-extrabold tracking-widest uppercase stitch-text-secondary">
                    {formatDayHeader(d)}
                  </p>
                  {isToday && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {list.map((s) => (
                    <SessionCard key={s.id} session={s} onJoin={() => handleJoin(s)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-container/60 flex items-center justify-between bg-surface-container-lowest/40">
          <p className="text-[11px] stitch-text-secondary">
            Sessions you've scheduled appear in your calendar.
          </p>
          <button
            type="button"
            onClick={() => { onClose(); navigate('/sessions'); }}
            className="text-[11px] font-bold text-primary hover:opacity-70 transition-opacity"
          >
            Full calendar →
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
