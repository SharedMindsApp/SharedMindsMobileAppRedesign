/**
 * BuildingProjects — the public "Building" section on a profile.
 *
 *   <BuildingSection userId={...} />  — read-only display (hidden when empty)
 *   <BuildingEditor />                — own: toggle which projects are featured
 *
 * Featured projects are the opt-in public face of the (otherwise space-scoped)
 * projects feature — see migration 20260530000100.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Loader2, ArrowRight } from 'lucide-react';
import { ProjectService, type Project } from '../../services/ProjectService';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'bg-emerald-100 text-emerald-700' },
  paused:    { label: 'Paused',    cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Shipped',   cls: 'bg-violet-100 text-violet-700' },
};

// ── Display ─────────────────────────────────────────────────────────────────

export function BuildingSection({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">Building</p>
      </div>
      <div className="space-y-2">
        {projects.map((p) => {
          const status = STATUS_META[p.status];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/projects/${p.id}`)}
              className="w-full text-left flex items-center gap-3 rounded-2xl ring-1 ring-surface-container bg-surface px-3.5 py-3 hover:bg-surface-container-low transition-colors group"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color ?? '#8b5cf6' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold stitch-text-primary leading-tight truncate">{p.title}</p>
                  {status && <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>}
                </div>
                {p.description && <p className="text-[11px] stitch-text-secondary leading-snug truncate mt-0.5">{p.description}</p>}
              </div>
              <ArrowRight size={14} className="stitch-text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          );
        })}
      </div>
    </section>
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

  async function toggle(p: Project) {
    if (busy) return;
    const next = !p.show_on_profile;
    setBusy(p.id);
    setProjects((cur) => cur.map((x) => (x.id === p.id ? { ...x, show_on_profile: next } : x)));
    try {
      await ProjectService.setProjectShownOnProfile(p.id, next);
    } catch {
      // revert on failure
      setProjects((cur) => cur.map((x) => (x.id === p.id ? { ...x, show_on_profile: !next } : x)));
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="py-4 flex justify-center"><Loader2 size={18} className="animate-spin stitch-text-secondary" /></div>;
  if (projects.length === 0) {
    return <p className="text-xs stitch-text-secondary italic">No projects yet — create one in Projects, then feature it here.</p>;
  }

  return (
    <div className="space-y-2">
      {projects.map((p) => {
        const on = !!p.show_on_profile;
        return (
          <div key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color ?? '#8b5cf6' }} />
            <p className="flex-1 min-w-0 text-sm font-semibold stitch-text-primary truncate">{p.title}</p>
            <button
              type="button"
              onClick={() => void toggle(p)}
              disabled={busy === p.id}
              role="switch"
              aria-checked={on}
              className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${on ? 'bg-primary' : 'bg-surface-container-high'} disabled:opacity-60`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
