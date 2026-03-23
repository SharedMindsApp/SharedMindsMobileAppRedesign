import { CalendarRange, FolderKanban, Users } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import {
  PageGreeting,
  SurfaceCard,
  SectionHeader,
  PillButton,
  GradientButton,
} from '../../ui/CorePage';

export function ProjectsPage() {
  const {
    state: { projects, tasks, activeProjectId, activityLog, checkins },
    setActiveProject,
  } = useCoreData();

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* ── Greeting ────────────────────────────────────────── */}
      <PageGreeting
        greeting="Projects"
        subtitle="Your focus areas — personal and shared."
      />

      <div className="grid gap-3 sm:gap-5 md:grid-cols-[1.1fr,0.9fr]">

        {/* ── Project Shelf ─────────────────────────────────── */}
        <SurfaceCard>
          <SectionHeader
            overline="Your projects"
            title="Project shelf"
          />

          <div className="mt-4 space-y-3">
            {projects.map((project) => {
              const projectTasks = tasks.filter((t) => t.projectId === project.id);
              const openTasks = projectTasks.filter((t) => !t.done).length;
              const doneTasks = projectTasks.filter((t) => t.done).length;
              const isActive = project.id === activeProjectId;

              return (
                <SurfaceCard
                  key={project.id}
                  variant={isActive ? 'highlight' : 'default'}
                  padding="md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderKanban size={18} className="stitch-icon-accent" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {project.name}
                        </p>
                        <p className="mt-0.5 text-xs uppercase tracking-wider stitch-text-secondary">
                          {openTasks} open task{openTasks === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <PillButton
                      size="sm"
                      tone={project.scope === 'shared' ? 'sky' : 'emerald'}>
                      {project.scope}
                    </PillButton>
                  </div>

                  <p className="mt-2 text-sm leading-6 stitch-text-secondary">
                    {project.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <PillButton size="sm" tone="amber">
                      {doneTasks} done
                    </PillButton>
                    {isActive ? (
                      <GradientButton size="sm">
                        Active project
                      </GradientButton>
                    ) : (
                      <GradientButton size="sm" variant="secondary" onClick={() => setActiveProject(project.id)}>
                        Make active
                      </GradientButton>
                    )}
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        </SurfaceCard>

        {/* ── Right Column ──────────────────────────────────── */}
        <div className="space-y-5">

          {/* Collaboration */}
          <SurfaceCard>
            <SectionHeader
              overline="Collaboration"
              title="Sharing"
            />
            <div className="mt-4 space-y-3">
              <SurfaceCard variant="nested">
                <div className="flex items-center gap-2 text-sm font-semibold stitch-text-primary">
                  <Users size={16} className="stitch-icon-accent" />
                  Shared ownership
                </div>
                <p className="mt-2 text-sm leading-6 stitch-text-secondary">
                  Projects belong to a personal or shared space. Permissions follow from space membership.
                </p>
              </SurfaceCard>
              <SurfaceCard variant="nested">
                <div className="flex items-center gap-2 text-sm font-semibold stitch-text-primary">
                  <CalendarRange size={16} className="stitch-icon-accent" />
                  Calendar projection
                </div>
                <p className="mt-2 text-sm leading-6 stitch-text-secondary">
                  Push milestones and deadlines into the calendar without adding complexity.
                </p>
              </SurfaceCard>
            </div>
          </SurfaceCard>

          {/* Active Project Detail */}
          {activeProject && (
            <SurfaceCard>
              <SectionHeader
                overline="Active project"
                title={activeProject.name}
              />
              <div className="mt-4 space-y-2">
                <SurfaceCard variant="nested" padding="sm">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 stitch-text-secondary">
                    Latest activity
                  </p>
                  <p className="text-sm stitch-text-primary">
                    {activityLog[0]?.title ?? 'Nothing logged yet'}
                  </p>
                </SurfaceCard>
                <SurfaceCard variant="nested" padding="sm">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 stitch-text-secondary">
                    Latest check-in
                  </p>
                  <p className="text-sm stitch-text-primary">
                    {checkins[0]?.prompt ?? 'No check-ins yet'}
                  </p>
                </SurfaceCard>
              </div>
            </SurfaceCard>
          )}
        </div>
      </div>
    </div>
  );
}
