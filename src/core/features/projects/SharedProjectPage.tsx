// SharedProjectPage
//
// Public, unauthenticated read-only view for /shared/:token. Fetches the
// projected view via the get_shared_project_view RPC (SECURITY DEFINER on
// the server) and renders the project header + recent completed sessions.
//
// Privacy posture matches the migration comment: title, description,
// cover, owner's FIRST name, and completed sessions (goal + outcome +
// duration + date). Nothing else. No auth required.
//
// This component is rendered OUTSIDE the normal auth gate by CoreApp's
// public-path check, so it must be self-sufficient (no Layout, no
// CoreDataContext, no AuthProvider expectations).

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Link2, AlertTriangle, Sparkles, Clock, Wifi, WifiOff } from 'lucide-react';
import { ProjectShareService, type SharedProjectView, type SharedSession } from '../../services/ProjectShareService';
import { CoverImage } from './CoverImage';

interface Props {
  token: string;
}

export function SharedProjectPage({ token }: Props) {
  const [view, setView] = useState<SharedProjectView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    ProjectShareService.fetchSharedView(token)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setErrored(true);
        } else {
          setView(blob);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  if (errored || !view) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-6">
        <div className="max-w-md text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 ring-1 ring-amber-100 grid place-items-center">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            This share link isn't active
          </h1>
          <p className="text-sm text-slate-600 leading-snug">
            It may have expired, been revoked, or the link is mistyped.
            Ask the person who sent it for an up-to-date one.
          </p>
        </div>
      </div>
    );
  }

  const { project, ownerFirstName, sessions } = view;
  const heroTextDark = project.cover_text_color === 'dark';
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.intended_duration_minutes ?? 0), 0);
  const finishedCount = sessions.filter((s) => s.session_outcome === 'finished').length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Outer container — single column, comfortable max width */}
      <div className="max-w-2xl mx-auto px-3 sm:px-5 pt-5 pb-12">
        {/* Header chip — sets context that this is a shared accountability view */}
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 px-1">
          <Link2 size={11} /> Accountability share
        </div>

        {/* Project card */}
        <div className="rounded-3xl overflow-hidden bg-white shadow-md ring-1 ring-slate-200/60">
          {/* Hero */}
          <div
            className={`relative px-5 pb-6 ${
              project.cover_image_url
                ? 'pt-3 min-h-[280px] flex flex-col'
                : `pt-6 ${heroGradientFor(project.color)}`
            }`}
          >
            {project.cover_image_url && (
              <>
                <CoverImage
                  url={project.cover_image_url}
                  x={project.cover_x}
                  y={project.cover_y}
                  zoom={project.cover_zoom}
                  fit={project.cover_fit}
                  bgColor={project.cover_bg_color}
                  className="absolute inset-0"
                />
                <div
                  className={`absolute inset-0 pointer-events-none bg-gradient-to-t ${
                    heroTextDark
                      ? 'from-white/40 via-white/10 to-transparent'
                      : 'from-black/40 via-black/10 to-transparent'
                  }`}
                />
              </>
            )}
            <div className="relative z-10 flex flex-col flex-1 min-h-0">
              {project.cover_image_url && <div className="flex-1 min-h-[80px]" />}
              <div
                className={
                  project.cover_image_url
                    ? `relative rounded-2xl px-4 py-3 backdrop-blur-md max-w-xl mr-auto ${
                        heroTextDark
                          ? 'bg-white/70 ring-1 ring-black/5'
                          : 'bg-black/45 ring-1 ring-white/10'
                      }`
                    : ''
                }
              >
                <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${
                  project.cover_image_url
                    ? (heroTextDark ? 'text-slate-700' : 'text-white/80')
                    : 'text-white/85'
                }`}>
                  {ownerFirstName} is working on
                </p>
                <h1 className={`text-2xl sm:text-3xl font-extrabold leading-tight ${
                  project.cover_image_url
                    ? (heroTextDark ? 'text-slate-900' : 'text-white')
                    : 'text-white drop-shadow-sm'
                }`}>
                  {project.title}
                </h1>
                {project.description && (
                  <p className={`text-sm mt-2 leading-snug ${
                    project.cover_image_url
                      ? (heroTextDark ? 'text-slate-700' : 'text-white/90')
                      : 'text-white/90'
                  }`}>
                    {project.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 divide-x divide-slate-200/60 border-b border-slate-200/60">
            <Stat label="Sessions" value={sessions.length.toString()} />
            <Stat label="Finished" value={finishedCount.toString()} />
            <Stat label="Focused" value={formatHours(totalMinutes)} />
          </div>

          {/* Sessions list */}
          <div className="p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 px-1">
              Recent sessions
            </p>
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-500 italic px-1 py-6 text-center">
                {ownerFirstName} hasn't logged any sessions on this project yet —
                check back soon.
              </p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <SessionRow key={s.id} s={s} />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer — gentle explanation + brand */}
        <p className="text-[11px] text-slate-500 leading-snug text-center mt-6 px-4">
          You're seeing a read-only summary {ownerFirstName} chose to share with you
          for accountability. You don't see tasks, notes, or anyone else's work.
        </p>
        <p className="text-[11px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1.5">
          <Sparkles size={10} /> Powered by <strong className="text-slate-500">SharedMinds</strong>
        </p>
      </div>
    </div>
  );
}

// ── Bits ──────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="text-xl font-extrabold text-slate-900 tabular-nums">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">
        {label}
      </p>
    </div>
  );
}

function SessionRow({ s }: { s: SharedSession }) {
  const date = useMemo(() => {
    const ts = s.ended_at ?? s.start_time;
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, [s]);

  const outcomeMeta = OUTCOME_META[s.session_outcome] ?? OUTCOME_META.no_answer;
  const title = s.session_goal || s.session_title || 'Focus session';

  return (
    <li className="rounded-xl bg-slate-50 ring-1 ring-slate-200/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 leading-snug">
            {title}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock size={10} />
              {s.intended_duration_minutes ? `${s.intended_duration_minutes} min` : '—'}
            </span>
            <span>·</span>
            <span>{date}</span>
            {s.is_offline ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <WifiOff size={10} /> Real-world
                </span>
              </>
            ) : (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Wifi size={10} /> Online
                </span>
              </>
            )}
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${outcomeMeta.cls}`}>
          {outcomeMeta.icon} {outcomeMeta.label}
        </span>
      </div>
    </li>
  );
}

const OUTCOME_META: Record<SharedSession['session_outcome'], { label: string; cls: string; icon: string }> = {
  finished:           { label: 'Finished',           cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100', icon: '✓' },
  partially:          { label: 'Partial progress',   cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',             icon: '↗' },
  something_came_up:  { label: 'Got interrupted',    cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',       icon: '⌁' },
  no_answer:          { label: 'No update',          cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',      icon: '·' },
};

function heroGradientFor(color: string | null): string {
  switch (color) {
    case 'cyan':    return 'bg-gradient-to-br from-cyan-500 to-sky-600';
    case 'blue':    return 'bg-gradient-to-br from-blue-500 to-indigo-600';
    case 'violet':  return 'bg-gradient-to-br from-violet-500 to-purple-600';
    case 'emerald': return 'bg-gradient-to-br from-emerald-500 to-teal-600';
    case 'amber':   return 'bg-gradient-to-br from-amber-500 to-orange-600';
    case 'rose':    return 'bg-gradient-to-br from-rose-500 to-pink-600';
    default:        return 'bg-gradient-to-br from-slate-500 to-slate-700';
  }
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = minutes / 60;
  if (h < 10) return `${h.toFixed(1)}h`;
  return `${Math.round(h)}h`;
}
