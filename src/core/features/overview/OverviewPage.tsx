import { ArrowRight, CalendarDays, Link2, Users } from 'lucide-react';
import {
  PageGreeting,
  SurfaceCard,
  SectionHeader,
  PillButton,
  GradientButton,
} from '../../ui/CorePage';
import { coreKeeps, corePrinciples, hiddenFeatureDomains } from '../../coreData';

const sharedMoments = [
  'Share a project with your partner without exposing every private note.',
  'Let calendars stay personal by default and selectively mirror important events.',
  'Use the same app for solo planning and shared accountability instead of maintaining two products.',
];

export function OverviewPage() {
  return (
    <div className="space-y-5">
      {/* ── Greeting ────────────────────────────────────────── */}
      <PageGreeting
        greeting="One app for personal clarity and shared visibility"
        subtitle="SharedMinds should feel like a calm daily system first: personal when you need privacy, shared when you need accountability, and still ready to grow into richer modules later."
        actions={
          <div className="hidden sm:flex flex-wrap gap-2">
            <PillButton size="sm" tone="neutral">Today</PillButton>
            <PillButton size="sm" tone="neutral">Personal + shared</PillButton>
            <PillButton size="sm" tone="neutral">Mobile first</PillButton>
          </div>
        }
      />

      {/* ── Stat Pills (mobile) ────────────────────────────── */}
      <div className="sm:hidden flex flex-wrap gap-2">
        <PillButton size="sm" tone="neutral">Default: Today</PillButton>
        <PillButton size="sm" tone="neutral">Personal + shared</PillButton>
        <PillButton size="sm" tone="neutral">Mobile first</PillButton>
        <PillButton size="sm" tone="neutral">Legacy packaged</PillButton>
      </div>

      {/* ── Row 1: V1 Experience + Shared Moments ──────────── */}
      <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">

        {/* V1 Experience */}
        <SurfaceCard>
          <SectionHeader
            overline="V1 experience"
            title="SharedMinds starts with the day"
            subtitle="The home surface anchors the product around what matters now: today, tasks, projects, check-ins, and the choice to share selected parts of that state."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SurfaceCard variant="nested">
              <p className="text-sm font-semibold stitch-text-primary">Personal space</p>
              <p className="mt-2 text-sm leading-6 stitch-text-secondary">
                Your own brain state, journal, personal projects, and private planning remain the baseline.
              </p>
            </SurfaceCard>
            <SurfaceCard variant="nested">
              <p className="text-sm font-semibold stitch-text-primary">Shared space</p>
              <p className="mt-2 text-sm leading-6 stitch-text-secondary">
                Invite trusted people into shared projects, responsibilities, and calendar context when it helps.
              </p>
            </SurfaceCard>
            <SurfaceCard variant="nested">
              <div className="flex items-center gap-2 text-sm font-semibold stitch-text-primary">
                <CalendarDays size={16}  />
                Calendar as source of truth
              </div>
              <p className="mt-2 text-sm leading-6 stitch-text-secondary">
                The same calendar drives task timing, responsibilities, and what gets surfaced in check-ins.
              </p>
            </SurfaceCard>
            <SurfaceCard variant="nested">
              <div className="flex items-center gap-2 text-sm font-semibold stitch-text-primary">
                <Link2 size={16}  />
                One product, not two
              </div>
              <p className="mt-2 text-sm leading-6 stitch-text-secondary">
                Web and mobile share one design system, one schema, and one feature set with responsive layout differences only.
              </p>
            </SurfaceCard>
          </div>
        </SurfaceCard>

        {/* Shared Moments */}
        <SurfaceCard>
          <SectionHeader
            overline="Shared moments"
            title="How collaboration should feel"
            subtitle="Support should feel intentional, not invasive."
          />
          <div className="mt-4 space-y-2">
            {sharedMoments.map((item) => (
              <SurfaceCard variant="nested" padding="sm" key={item}>
                <div className="flex gap-3 text-sm leading-6 stitch-text-secondary">
                  <Users size={16} className="mt-0.5 shrink-0"  />
                  <span>{item}</span>
                </div>
              </SurfaceCard>
            ))}
          </div>
          <div className="mt-4">
            <GradientButton size="sm" variant="ghost">
              <span className="inline-flex items-center gap-2">
                Compare packaged legacy features
                <ArrowRight size={16} />
              </span>
            </GradientButton>
          </div>
        </SurfaceCard>
      </div>

      {/* ── Row 2: Keep / Principles / Packaged Later ──────── */}
      <div className="grid gap-5 xl:grid-cols-3">
        {[
          { overline: 'Keep', tone: 'emerald' as const, desc: 'These are the SharedMinds behaviors that deserve the clean V1 treatment.', items: coreKeeps },
          { overline: 'Principles', tone: 'sky' as const, desc: 'These govern what stays simple even as the app grows.', items: corePrinciples },
          { overline: 'Packaged later', tone: 'amber' as const, desc: 'These remain available as modular branches rather than deleted code.', items: hiddenFeatureDomains },
        ].map((group) => (
          <SurfaceCard key={group.overline}>
            <PillButton tone={group.tone} size="sm">
              {group.overline}
            </PillButton>
            <p className="mt-3 text-sm leading-6 stitch-text-secondary">
              {group.desc}
            </p>
            <div className="mt-3 space-y-2">
              {group.items.map((item) => (
                <SurfaceCard variant="nested" padding="sm" key={item}>
                  <div className="flex gap-3 text-sm leading-6 stitch-text-secondary">
                    <span
                      className="mt-[0.45rem] h-2 w-2 rounded-full shrink-0 stitch-list-dot"
                    />
                    <span>{item}</span>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
