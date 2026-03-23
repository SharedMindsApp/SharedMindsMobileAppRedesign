import { BarChart3, CalendarClock, FileStack } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import {
  PageGreeting,
  SurfaceCard,
  SectionHeader,
  PillButton,
  GradientButton,
  ProgressOrbit,
} from '../../ui/CorePage';

export function ReportsPage() {
  const {
    state: { reports, tasks, responsibilities, activityLog, journal },
    generateReport,
  } = useCoreData();

  const tasksDone = tasks.filter((t) => t.done).length;
  const respDone = responsibilities.filter((r) => r.done).length;
  const taskPercent = tasks.length> 0 ? Math.round((tasksDone / tasks.length) * 100) : 0;
  // respPercent available for future use: Math.round((respDone / responsibilities.length) * 100)

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* ── Greeting ────────────────────────────────────────── */}
      <PageGreeting
        greeting="Reports"
        subtitle="Turn your daily loop into useful history."
      />

      {/* ── Row 1: Report Types + Snapshot ──────────────────── */}
      <div className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">

        {/* Daily Report */}
        <SurfaceCard>
          <SectionHeader overline="Daily" title="Daily report" />
          <div className="mt-4 space-y-2">
            <SurfaceCard variant="nested" padding="sm">
              <p className="text-sm stitch-text-primary">
                Brain state timeline and major shifts
              </p>
            </SurfaceCard>
            <SurfaceCard variant="nested" padding="sm">
              <p className="text-sm stitch-text-primary">
                Tasks completed, overdue items, and responsibilities
              </p>
            </SurfaceCard>
            <SurfaceCard variant="nested" padding="sm">
              <p className="text-sm stitch-text-primary">
                Activity log, journal reflection, and tomorrow's intention
              </p>
            </SurfaceCard>
          </div>
        </SurfaceCard>

        {/* Weekly Summary */}
        <SurfaceCard>
          <SectionHeader overline="Weekly" title="Weekly summary" />
          <div className="mt-4 space-y-2">
            <SurfaceCard variant="nested" padding="sm">
              <div className="flex items-center gap-2.5">
                <BarChart3 size={16} className="stitch-icon-accent" />
                <p className="text-sm stitch-text-primary">
                  Sleep and brain-state patterns
                </p>
              </div>
            </SurfaceCard>
            <SurfaceCard variant="nested" padding="sm">
              <div className="flex items-center gap-2.5">
                <CalendarClock size={16} className="stitch-icon-accent" />
                <p className="text-sm stitch-text-primary">
                  Calendar and responsibility consistency
                </p>
              </div>
            </SurfaceCard>
            <SurfaceCard variant="nested" padding="sm">
              <div className="flex items-center gap-2.5">
                <FileStack size={16} className="stitch-icon-accent" />
                <p className="text-sm stitch-text-primary">
                  Project progress and blockers
                </p>
              </div>
            </SurfaceCard>
          </div>
        </SurfaceCard>

        {/* Today's Snapshot */}
        <SurfaceCard>
          <SectionHeader overline="Quick stats" title="Today's snapshot" />
          <div className="mt-4 flex items-center gap-5">
            <ProgressOrbit value={taskPercent} size={80} strokeWidth={5}>
              <span
                className="text-sm font-bold">
                {taskPercent}%
              </span>
            </ProgressOrbit>
            <div className="flex-1 space-y-2">
              <PillButton size="sm" tone="emerald">
                {tasksDone}/{tasks.length} tasks
              </PillButton>
              <PillButton size="sm" tone="sky">
                {respDone}/{responsibilities.length} responsibilities
              </PillButton>
              <PillButton size="sm" tone="amber">
                {activityLog.length} activities · sleep {journal.sleepQuality}/5
              </PillButton>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* ── Row 2: Report History ──────────────────────────── */}
      <SurfaceCard>
        <SectionHeader
          overline="Saved reports"
          title="Report history"
          actions={
            <GradientButton size="sm" onClick={generateReport}>
              Generate today&apos;s report
            </GradientButton>
          }
        />

        <div className="mt-4 space-y-2">
          {reports.length === 0 && (
            <SurfaceCard variant="nested">
              <p className="text-sm stitch-text-primary">
                No reports yet. Generate one to capture today's snapshot.
              </p>
            </SurfaceCard>
          )}
          {reports.map((report) => (
            <SurfaceCard variant="nested" padding="sm" key={report.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {report.title}
                  </p>
                  <p className="mt-0.5 text-sm stitch-text-primary">
                    {report.summary}
                  </p>
                </div>
                <PillButton size="sm" tone="emerald">
                  {report.type}
                </PillButton>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
