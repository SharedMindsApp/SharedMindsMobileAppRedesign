/**
 * BuildingProjects — the public "Working on" section of a profile.
 *
 *   <WorkingOnSection userId isOwn />  — typed project cards (hidden when empty)
 *   <BuildingEditor />                 — own: feature projects + set type/summary
 *
 * Not everything is "Building" — each card carries its project TYPE (Building,
 * Creating, Learning, …). Tapping a card opens a limited public OVERVIEW sheet
 * (name, type, status, public summary) — never the full internal project page.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Rocket, Loader2, ArrowRight, X, ExternalLink } from 'lucide-react';
import { ProjectService, type Project } from '../../services/ProjectService';
import { PROJECT_TYPES, projectTypeMeta } from '../../../lib/projectTypes';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Active',  cls: 'bg-emerald-100 text-emerald-700' },
  paused:    { label: 'Paused',  cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Shipped', cls: 'bg-violet-100 text-violet-700' },
};

// ── Display ─────────────────────────────────────────────────────────────────

export function WorkingOnSection({ userId, isOwn = false }: { userId: string; isOwn?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Project | null>(null);

  useEffect(() => {
    let alive = true;
    ProjectService.getProfileProjects(userId)
      .then((p) => { if (alive) setProjects(p); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  if (loading || projects.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Rocket size={13} className="stitch-text-secondary" />
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">Working on</p>
      </div>
      <div className="space-y-2">
        {projects.map((p) => {
          const type = projectTypeMeta(p.project_type);
          const status = STATUS_META[p.status];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(p)}
              className="w-full text-left flex items-center gap-3 rounded-2xl ring-1 ring-surface-container bg-surface px-3.5 py-3 hover:bg-surface-container-low transition-colors group"
            >
              <span className="w-9 h-9 rounded-xl grid place-items-center text-base shrink-0" style={{ background: (p.color ?? '#8b5cf6') + '22' }}>{type.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold stitch-text-primary leading-tight truncate">{p.title}</p>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-surface-container-low stitch-text-secondary">{type.label}</span>
                  {status && <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>}
                </div>
                {(p.public_summary || p.description) && (
                  <p className="text-[11px] stitch-text-secondary leading-snug truncate mt-0.5">{p.public_summary || p.description}</p>
                )}
              </div>
              <ArrowRight size={14} className="stitch-text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          );
        })}
      </div>
      {open && <ProjectOverviewSheet project={open} isOwn={isOwn} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** Limited public overview — an at-a-glance card, never the internal project. */
function ProjectOverviewSheet({ project, isOwn, onClose }: { project: Project; isOwn: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const type = projectTypeMeta(project.project_type);
  const status = STATUS_META[project.status];
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="h-20" style={{ background: project.color ? `linear-gradient(135deg, ${project.color}, ${project.color}cc)` : 'linear-gradient(135deg,#8b5cf6,#3b82f6)' }} />
        <div className="px-5 pb-5 -mt-7">
          <div className="flex items-end justify-between">
            <span className="w-14 h-14 rounded-2xl ring-4 ring-surface bg-surface grid place-items-center text-2xl">{type.emoji}</span>
            <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low"><X size={16} /></button>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container-low stitch-text-secondary">{type.emoji} {type.label}</span>
            {status && <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>}
          </div>
          <h2 className="text-xl font-extrabold stitch-text-primary tracking-tight mt-2">{project.title}</h2>
          {(project.public_summary || project.description) && (
            <p className="text-sm stitch-text-secondary leading-relaxed mt-2">{project.public_summary || project.description}</p>
          )}
          {isOwn && (
            <button type="button" onClick={() => { onClose(); navigate(`/projects/${project.id}`); }}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              <ExternalLink size={12} /> Open full project
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Editor (own profile, in settings) ────────────────────────────────────────

export function BuildingEditor() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    ProjectService.getProjectsForUser()
      .then((p) => { if (alive) setProjects(p); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  function patchLocal(id: string, patch: Partial<Project>) {
    setProjects((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function save(p: Project, patch: Partial<Project>) {
    setBusy(p.id);
    patchLocal(p.id, patch);
    try { await ProjectService.setProjectProfileMeta(p.id, patch as any); }
    catch { /* best-effort */ }
    finally { setBusy(null); }
  }

  if (loading) return <div className="py-4 flex justify-center"><Loader2 size={18} className="animate-spin stitch-text-secondary" /></div>;
  if (projects.length === 0) {
    return <p className="text-xs stitch-text-secondary italic">No projects yet — create one in Projects, then feature it here.</p>;
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-surface text-xs stitch-text-primary placeholder:stitch-text-secondary outline-none focus:ring-2 focus:ring-primary/30 ring-1 ring-surface-container';

  return (
    <div className="space-y-2.5">
      {projects.map((p) => {
        const on = !!p.show_on_profile;
        return (
          <div key={p.id} className="rounded-xl bg-surface-container-low px-3 py-2.5">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color ?? '#8b5cf6' }} />
              <p className="flex-1 min-w-0 text-sm font-semibold stitch-text-primary truncate">{p.title}</p>
              <button
                type="button" onClick={() => void save(p, { show_on_profile: !on })} disabled={busy === p.id}
                role="switch" aria-checked={on}
                className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${on ? 'bg-primary' : 'bg-surface-container-high'} disabled:opacity-60`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            {on && (
              <div className="mt-2.5 space-y-2 pl-5">
                <div>
                  <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">Type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PROJECT_TYPES.map((t) => {
                      const active = p.project_type === t.id;
                      return (
                        <button key={t.id} type="button" onClick={() => void save(p, { project_type: t.id })}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-colors ${active ? 'stitch-btn--primary text-white' : 'bg-surface stitch-text-primary hover:bg-surface-container ring-1 ring-surface-container'}`}>
                          <span>{t.emoji}</span>{t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">Public summary</p>
                  <input
                    className={inputCls}
                    placeholder="One line the public sees (kept separate from your notes)"
                    defaultValue={p.public_summary ?? ''}
                    maxLength={140}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== (p.public_summary ?? '')) void save(p, { public_summary: v || null }); }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
