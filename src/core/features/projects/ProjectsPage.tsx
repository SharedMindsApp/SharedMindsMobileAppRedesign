/**
 * ProjectsPage — list view for the Projects MVP.
 *
 * A project is the macro goal a session chips at. Show all projects the
 * user can see (own + shared), each as a card with: color dot, title,
 * one-line description, member avatars, task/session counts, and a
 * "Make active" toggle. Tapping a card navigates to ProjectDetailPage.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Target, CheckCircle2, Pin } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import type { CoreProject } from '../../data/CoreDataContext';
import { SurfaceCard, PageGreeting, GradientButton } from '../../ui/CorePage';
import { ProjectEditorModal } from './ProjectEditorModal';

// ── Color tokens (match the editor modal swatches) ───────────────

export const PROJECT_COLORS: Record<string, { hex: string; soft: string; ring: string }> = {
  cyan:    { hex: '#22d3ee', soft: 'bg-cyan-100 text-cyan-800',     ring: 'ring-cyan-500/40' },
  blue:    { hex: '#3b82f6', soft: 'bg-blue-100 text-blue-800',     ring: 'ring-blue-500/40' },
  violet:  { hex: '#8b5cf6', soft: 'bg-violet-100 text-violet-800', ring: 'ring-violet-500/40' },
  emerald: { hex: '#10b981', soft: 'bg-emerald-100 text-emerald-800', ring: 'ring-emerald-500/40' },
  amber:   { hex: '#f59e0b', soft: 'bg-amber-100 text-amber-800',   ring: 'ring-amber-500/40' },
  rose:    { hex: '#f43f5e', soft: 'bg-rose-100 text-rose-800',     ring: 'ring-rose-500/40' },
};

export function projectColorMeta(token: string | null) {
  return PROJECT_COLORS[token ?? ''] ?? PROJECT_COLORS.blue;
}

// ── Page ─────────────────────────────────────────────────────────

export function ProjectsPage() {
  const navigate = useNavigate();
  const {
    state: { projects, tasks, activeProjectId },
    setActiveProject,
    refreshProjects,
  } = useCoreData();
  const [editorOpen, setEditorOpen] = useState(false);

  // refresh on mount to pick up newly accepted shared projects
  useEffect(() => { refreshProjects(); /* eslint-disable-next-line */ }, []);

  // Task counts by project
  const taskCounts = useMemo(() => {
    const map = new Map<string, { open: number; done: number }>();
    for (const t of tasks) {
      if (!t.projectId) continue;
      const c = map.get(t.projectId) ?? { open: 0, done: 0 };
      if (t.done) c.done += 1; else c.open += 1;
      map.set(t.projectId, c);
    }
    return map;
  }, [tasks]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageGreeting
        greeting="Projects"
        subtitle="The macro goals your sessions are chipping at."
        actions={
          <GradientButton size="sm" onClick={() => setEditorOpen(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus size={14} strokeWidth={3} />
              New project
            </span>
          </GradientButton>
        }
      />

      {projects.length === 0 ? (
        <EmptyState onCreate={() => setEditorOpen(true)} />
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              taskCounts={taskCounts.get(project.id) ?? { open: 0, done: 0 }}
              onOpen={() => navigate(`/projects/${project.id}`)}
              onTogglePin={() =>
                setActiveProject(project.id === activeProjectId ? null : project.id)
              }
            />
          ))}
        </div>
      )}

      {editorOpen && (
        <ProjectEditorModal
          onClose={() => setEditorOpen(false)}
          onSaved={(p) => {
            setEditorOpen(false);
            refreshProjects().then(() => navigate(`/projects/${p.id}`));
          }}
        />
      )}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────

function ProjectCard({
  project,
  isActive,
  taskCounts,
  onOpen,
  onTogglePin,
}: {
  project: CoreProject;
  isActive: boolean;
  taskCounts: { open: number; done: number };
  onOpen: () => void;
  onTogglePin: () => void;
}) {
  const color = projectColorMeta(project.color);
  const sharedBadge = project.scope === 'shared';

  return (
    <SurfaceCard variant={isActive ? 'highlight' : 'default'} padding="md">
      <div className="flex items-start gap-3 cursor-pointer" onClick={onOpen}>
        {/* Color dot */}
        <span
          className="mt-1 w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white shadow"
          style={{ backgroundColor: color.hex }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-base font-extrabold stitch-text-primary truncate">
              {project.name}
            </h3>
            {sharedBadge && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 uppercase tracking-wider shrink-0">
                <Users size={9} /> {project.memberCount}
              </span>
            )}
          </div>
          <p className="text-sm stitch-text-secondary leading-snug line-clamp-2 mb-3">
            {project.description || 'No description yet.'}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold stitch-text-secondary">
              <Target size={11} />
              {taskCounts.open} open
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold stitch-text-secondary">
              <CheckCircle2 size={11} />
              {taskCounts.done} done
            </span>
            {project.status !== 'active' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-surface-container stitch-text-secondary">
                {project.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pin toggle (separate click target, doesn't bubble to onOpen) */}
      <div className="mt-3 pt-3 border-t border-surface-container/50">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className={`w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
            isActive
              ? 'bg-primary/10 text-primary'
              : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
          }`}
        >
          <Pin size={11} fill={isActive ? 'currentColor' : 'none'} />
          {isActive ? 'Pinned as active' : 'Pin as active'}
        </button>
      </div>
    </SurfaceCard>
  );
}

// ── Empty ────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <SurfaceCard>
      <div className="flex flex-col items-center text-center py-10 px-6">
        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/8 flex items-center justify-center mb-5">
          <Target size={26} className="text-primary/60" />
        </div>
        <p className="text-base font-bold stitch-text-primary mb-1.5">
          No projects yet
        </p>
        <p className="text-sm stitch-text-secondary max-w-[300px] leading-relaxed mb-6">
          A project is a macro goal — the bigger thing your sessions are chipping
          at. Capture one to give your work a home.
        </p>
        <GradientButton onClick={onCreate}>
          <span className="inline-flex items-center gap-1.5">
            <Plus size={14} strokeWidth={3} />
            Create your first project
          </span>
        </GradientButton>
      </div>
    </SurfaceCard>
  );
}
