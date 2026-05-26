/**
 * ProjectsPage — list view for the Projects MVP.
 *
 * Each project card is visually rich: colored accent band, task-completion
 * progress bar, session tally, member avatar stack, active pin badge.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Target, CheckCircle2, Pin, Play, Archive, Zap, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { ProjectService } from '../../services/ProjectService';
import { useCoreData } from '../../data/CoreDataContext';
import type { CoreProject } from '../../data/CoreDataContext';
import { PageGreeting, GradientButton } from '../../ui/CorePage';
import { ProjectEditorModal } from './ProjectEditorModal';

// ── Color tokens (match the editor modal swatches) ───────────────

export const PROJECT_COLORS: Record<string, {
  hex: string;
  soft: string;
  ring: string;
  gradient: string;
  textDark: string;
  bar: string;
}> = {
  cyan:    { hex: '#22d3ee', soft: 'bg-cyan-50',    ring: 'ring-cyan-400/40',    gradient: 'from-cyan-500 to-teal-500',      textDark: 'text-cyan-700',    bar: 'bg-cyan-500' },
  blue:    { hex: '#3b82f6', soft: 'bg-blue-50',    ring: 'ring-blue-400/40',    gradient: 'from-blue-500 to-indigo-500',    textDark: 'text-blue-700',    bar: 'bg-blue-500' },
  violet:  { hex: '#8b5cf6', soft: 'bg-violet-50',  ring: 'ring-violet-400/40',  gradient: 'from-violet-500 to-purple-600',  textDark: 'text-violet-700',  bar: 'bg-violet-500' },
  emerald: { hex: '#10b981', soft: 'bg-emerald-50', ring: 'ring-emerald-400/40', gradient: 'from-emerald-500 to-teal-600',   textDark: 'text-emerald-700', bar: 'bg-emerald-500' },
  amber:   { hex: '#f59e0b', soft: 'bg-amber-50',   ring: 'ring-amber-400/40',   gradient: 'from-amber-400 to-orange-500',   textDark: 'text-amber-700',   bar: 'bg-amber-500' },
  rose:    { hex: '#f43f5e', soft: 'bg-rose-50',    ring: 'ring-rose-400/40',    gradient: 'from-rose-500 to-pink-600',      textDark: 'text-rose-700',    bar: 'bg-rose-500' },
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

  useEffect(() => { refreshProjects(); /* eslint-disable-next-line */ }, []);

  // Task counts by project
  const taskCounts = useMemo(() => {
    const map = new Map<string, { open: number; done: number; total: number }>();
    for (const t of tasks) {
      if (!t.projectId) continue;
      const c = map.get(t.projectId) ?? { open: 0, done: 0, total: 0 };
      c.total += 1;
      if (t.done) c.done += 1; else c.open += 1;
      map.set(t.projectId, c);
    }
    return map;
  }, [tasks]);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const archivedProjects = projects.filter((p) => p.status !== 'active');

  // ── Card-level archive / delete handlers ───────────────────────
  // Confirm-then-call-service-then-refresh. Delete uses a stricter
  // type-the-name gate matching the in-editor delete flow.
  async function handleArchive(project: CoreProject) {
    if (!confirm(`Archive "${project.name}"? It hides from this list but past sessions stay accessible.`)) return;
    try {
      await ProjectService.archiveProject(project.id);
      await refreshProjects();
    } catch (e: any) {
      alert(`Could not archive: ${e?.message ?? 'unknown error'}`);
    }
  }
  async function handleDelete(project: CoreProject) {
    if (!confirm(`Permanently delete "${project.name}"?\n\nThis removes the project, its milestones, phases, tasks, notes, and members.\n\nThere is no undo.`)) return;
    const typed = prompt(`Type the project name to confirm:\n"${project.name}"`);
    if (typed?.trim() !== project.name.trim()) {
      if (typed != null) alert('Project name did not match — delete cancelled.');
      return;
    }
    try {
      await ProjectService.deleteProject(project.id);
      await refreshProjects();
    } catch (e: any) {
      alert(`Could not delete: ${e?.message ?? 'unknown error'}`);
    }
  }

  return (
    <div className="space-y-6">
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
        <div className="space-y-6">
          {/* Active projects */}
          <div className="grid gap-4 sm:grid-cols-2">
            {activeProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isActive={project.id === activeProjectId}
                taskCounts={taskCounts.get(project.id) ?? { open: 0, done: 0, total: 0 }}
                onOpen={() => navigate(`/projects/${project.id}`)}
                onStartSession={() => navigate(`/projects/${project.id}`)}
                onTogglePin={() =>
                  setActiveProject(project.id === activeProjectId ? null : project.id)
                }
                onArchive={() => handleArchive(project)}
                onDelete={() => handleDelete(project)}
              />
            ))}
          </div>

          {/* Archived — collapsed section */}
          {archivedProjects.length > 0 && (
            <ArchivedSection
              projects={archivedProjects}
              taskCounts={taskCounts}
              activeProjectId={activeProjectId}
              onOpen={(id) => navigate(`/projects/${id}`)}
              onTogglePin={(id) => setActiveProject(id === activeProjectId ? null : id)}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          )}
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
  onArchive,
  onDelete,
}: {
  project: CoreProject;
  isActive: boolean;
  taskCounts: { open: number; done: number; total: number };
  onOpen: () => void;
  onStartSession: () => void;
  onTogglePin: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Click-outside / Escape close — the menu is inside the card which is
  // also clickable, so we attach the listener once we know the menu is
  // open and stop propagation on the menu itself.
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);
  const color = projectColorMeta(project.color);
  const progress = taskCounts.total > 0
    ? Math.round((taskCounts.done / taskCounts.total) * 100)
    : 0;
  const isShared = project.scope === 'shared';

  return (
    <div
      className={`group relative bg-surface rounded-2xl overflow-hidden shadow-sm ring-1 transition-all duration-200 cursor-pointer
        hover:shadow-md hover:-translate-y-0.5
        ${isActive ? 'ring-2 ' + color.ring : 'ring-surface-container/80 hover:' + color.ring}`}
      onClick={onOpen}
    >
      {/* Color accent band */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${color.gradient}`} />

      <div className="p-4 space-y-3.5">
        {/* Top row: title + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {/* Color dot */}
            <span
              className="mt-0.5 w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: color.hex }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-extrabold stitch-text-primary truncate leading-snug">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-xs stitch-text-secondary leading-snug mt-0.5 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Badges + overflow menu */}
          <div className="flex items-start gap-1.5 shrink-0">
            <div className="flex flex-col items-end gap-1">
              {isActive && (
                <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${color.soft} ${color.textDark}`}>
                  <Pin size={7} fill="currentColor" /> Active
                </span>
              )}
              {isShared && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 uppercase tracking-wider">
                  <Users size={8} /> {project.memberCount ?? 2}
                </span>
              )}
            </div>

            {/* ── 3-dot menu (Edit · Archive · Delete) ──
                stopPropagation everywhere so the card's onOpen doesn't fire
                when the user is interacting with the menu. */}
            {(onArchive || onDelete) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((v) => !v);
                  }}
                  aria-label="Project actions"
                  className="w-7 h-7 rounded-full hover:bg-surface-container-low active:bg-surface-container flex items-center justify-center transition-colors"
                >
                  <MoreVertical size={14} className="stitch-text-secondary" />
                </button>
                {menuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-white shadow-lg ring-1 ring-surface-container-high overflow-hidden py-1"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onOpen();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold stitch-text-primary hover:bg-surface-container-low transition-colors text-left"
                    >
                      <Pencil size={12} /> Open / edit
                    </button>
                    {onArchive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onArchive();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold stitch-text-primary hover:bg-surface-container-low transition-colors text-left"
                      >
                        <Archive size={12} /> Archive
                      </button>
                    )}
                    {onDelete && (
                      <>
                        <div className="border-t border-surface-container my-0.5" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onDelete();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                        >
                          <Trash2 size={12} /> Delete permanently
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar (only when there are tasks) */}
        {taskCounts.total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider">
                Progress
              </span>
              <span className={`text-[10px] font-extrabold tabular-nums ${color.textDark}`}>
                {progress}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-low rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${color.bar}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          {taskCounts.total > 0 ? (
            <>
              <StatChip
                icon={<CheckCircle2 size={10} />}
                label={`${taskCounts.done}/${taskCounts.total} tasks`}
              />
              {taskCounts.open > 0 && (
                <StatChip
                  icon={<Target size={10} />}
                  label={`${taskCounts.open} remaining`}
                />
              )}
            </>
          ) : (
            <span className="text-[11px] stitch-text-secondary italic">No tasks yet</span>
          )}
          {project.status !== 'active' && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container stitch-text-secondary">
              <Archive size={8} /> {project.status}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-surface-container/60" />

        {/* Footer actions */}
        <div className="flex items-center justify-between">
          {/* Pin toggle */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 transition-colors ${
              isActive
                ? `${color.soft} ${color.textDark}`
                : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
            }`}
          >
            <Pin size={10} fill={isActive ? 'currentColor' : 'none'} />
            {isActive ? 'Pinned' : 'Pin'}
          </button>

          {/* Open arrow */}
          <span className={`text-[11px] font-bold ${color.textDark} opacity-0 group-hover:opacity-100 transition-opacity`}>
            Open →
          </span>
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold stitch-text-secondary">
      {icon}
      {label}
    </span>
  );
}

// ── Archived section ─────────────────────────────────────────────

function ArchivedSection({
  projects, taskCounts, activeProjectId, onOpen, onTogglePin, onArchive, onDelete,
}: {
  projects: CoreProject[];
  taskCounts: Map<string, { open: number; done: number; total: number }>;
  activeProjectId: string | null;
  onOpen: (id: string) => void;
  onTogglePin: (id: string) => void;
  onArchive?: (project: CoreProject) => void;
  onDelete?: (project: CoreProject) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-bold stitch-text-secondary uppercase tracking-widest mb-3 hover:stitch-text-primary transition-colors"
      >
        <Archive size={12} />
        Archived ({projects.length})
        <span className="text-[10px] font-normal normal-case tracking-normal">
          {open ? '▲ hide' : '▼ show'}
        </span>
      </button>

      {open && (
        <div className="grid gap-3 sm:grid-cols-2 opacity-70">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              taskCounts={taskCounts.get(project.id) ?? { open: 0, done: 0, total: 0 }}
              onOpen={() => onOpen(project.id)}
              onStartSession={() => onOpen(project.id)}
              onTogglePin={() => onTogglePin(project.id)}
              onDelete={onDelete ? () => onDelete(project) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty ────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 bg-surface rounded-2xl ring-1 ring-surface-container/80 shadow-sm">
      <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center mb-5 shadow-inner">
        <Zap size={28} className="text-violet-500" />
      </div>
      <p className="text-base font-extrabold stitch-text-primary mb-1.5">
        What are you building?
      </p>
      <p className="text-sm stitch-text-secondary max-w-[300px] leading-relaxed mb-6">
        A project is a macro goal — the bigger thing your sessions are chipping
        at. Give your work a home and watch the progress stack up.
      </p>
      <GradientButton onClick={onCreate}>
        <span className="inline-flex items-center gap-1.5">
          <Plus size={14} strokeWidth={3} />
          Create your first project
        </span>
      </GradientButton>
    </div>
  );
}
