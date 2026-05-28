/**
 * PickUpCard — the home-screen re-entry hook.
 *
 * Surfaces the one project to pick back up + its single Next action, so
 * returning to the app after any gap is a one-tap decision instead of a
 * "where was I / which project / what do I do" spiral.
 *
 * Chooses the project to show as: the active (pinned) project if it has a
 * next action, else the most-recently-active project that has one. Renders
 * nothing if no project has a next action set (other home cards cover that).
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { CoreProject } from '../../data/CoreDataContext';
import { projectColorMeta } from '../projects/ProjectsPage';
import { NextActionControl } from '../projects/NextActionControl';

interface Props {
  projects: CoreProject[];
  activeProjectId: string | null;
  onChanged: () => void;
  /** Open a session pinned to this project. */
  onStartSession: (projectId: string) => void;
}

export function PickUpCard({ projects, activeProjectId, onChanged, onStartSession }: Props) {
  const navigate = useNavigate();

  const project = useMemo(() => {
    const withAction = projects.filter((p) => p.status === 'active' && p.nextAction);
    if (withAction.length === 0) return null;
    // Prefer the pinned active project if it has a next action.
    const active = withAction.find((p) => p.id === activeProjectId);
    if (active) return active;
    // Otherwise the most recently touched one.
    return [...withAction].sort((a, b) => {
      const ta = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
      const tb = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
      return tb - ta;
    })[0];
  }, [projects, activeProjectId]);

  if (!project) return null;

  const color = projectColorMeta(project.color);

  return (
    <section aria-label="Pick up where you left off" className="space-y-2">
      <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary px-1">
        Pick up where you left off
      </p>
      <div className="rounded-2xl bg-surface ring-1 ring-surface-container/70 p-4 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(`/projects/${project.id}`)}
          className="flex items-center gap-2 mb-3 group"
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color.hex }} />
          <span className="text-sm font-extrabold stitch-text-primary truncate group-hover:opacity-80 transition-opacity">
            {project.name}
          </span>
          <ArrowRight size={12} className="stitch-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <NextActionControl
          projectId={project.id}
          nextAction={project.nextAction}
          variant="home"
          onChanged={onChanged}
          onStartSession={() => onStartSession(project.id)}
        />
      </div>
    </section>
  );
}
