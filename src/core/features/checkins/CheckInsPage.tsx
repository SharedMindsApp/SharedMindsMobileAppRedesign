import { useState } from 'react';
import { Bot, Clock, MessageSquareText, Mic } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import {
  PageGreeting,
  SurfaceCard,
  SectionHeader,
  PillButton,
  GradientButton,
  InputWell,
} from '../../ui/CorePage';

export function CheckInsPage() {
  const [draftResponses, setDraftResponses] = useState<Record<string, string>>({});
  const {
    state: { checkins, tasks, responsibilities, activityLog, currentBrainStateId, projects, activeProjectId },
    generateCheckIn,
    saveCheckInResponse,
  } = useCoreData();

  const openTasks = tasks.filter((t) => !t.done);
  const openResponsibilities = responsibilities.filter((r) => !r.done);
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const latestCheckIn = checkins[0];

  const promptContext = [
    { label: 'Brain state', value: currentBrainStateId, tone: 'sky' as const },
    { label: 'Project', value: `${activeProject?.name ?? 'None'} · ${openTasks.length} open tasks`, tone: 'primary' as const },
    { label: 'Responsibilities', value: `${openResponsibilities.length} remaining`, tone: 'amber' as const },
    { label: 'Activity', value: `${activityLog.length} logged today`, tone: 'emerald' as const },
  ];

  const checkInWindows = [
    { label: 'Morning', time: '09:00 – 15:59', emoji: '🌅' },
    { label: 'Afternoon', time: '16:00 – 20:59', emoji: '☀️' },
    { label: 'Evening', time: '21:00 – 23:59', emoji: '🌙' },
  ];

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* ── Greeting ────────────────────────────────────────── */}
      <PageGreeting
        greeting="Check-Ins"
        subtitle="A quick moment to anchor your mind and plan your flow."
      />

      {/* ── Row 1: Current Prompt + Context ────────────────── */}
      <div className="grid gap-3 sm:gap-5 md:grid-cols-[1.05fr,0.95fr]">

        {/* Current Prompt */}
        <SurfaceCard>
          <SectionHeader
            overline="How are you feeling?"
            title="Current prompt"
          />

          <div className="mt-4 space-y-3">
            <SurfaceCard variant="nested">
              <div className="flex items-center gap-2 text-sm font-semibold stitch-text-primary">
                <Bot size={16} className="stitch-icon-accent" />
                AI prompt
              </div>
              <p className="mt-2 text-sm leading-6 stitch-text-secondary">
                {latestCheckIn?.prompt ?? 'Generate a check-in to get contextual support for your day.'}
              </p>
            </SurfaceCard>

            <SurfaceCard variant="nested">
              <div className="flex items-center gap-2 text-sm font-semibold stitch-text-primary">
                <Mic size={16} className="stitch-icon-accent" />
                Voice option
              </div>
              <p className="mt-2 text-sm leading-6 stitch-text-secondary">
                Speak your response or type it — both work equally well.
              </p>
            </SurfaceCard>

            <GradientButton size="sm" onClick={generateCheckIn}>
              Complete check-in
            </GradientButton>
          </div>
        </SurfaceCard>

        {/* Day Context */}
        <SurfaceCard>
          <SectionHeader
            overline="Context"
            title="What I know about your day"
          />

          <div className="mt-4 space-y-2">
            {promptContext.map((ctx) => (
              <SurfaceCard variant="nested" padding="sm" key={ctx.label}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold stitch-text-primary">
                    {ctx.label}
                  </span>
                  <PillButton size="sm" tone={ctx.tone}>
                    {ctx.value}
                  </PillButton>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </SurfaceCard>
      </div>

      {/* ── Row 2: History + Schedule ──────────────────────── */}
      <div className="grid gap-3 sm:gap-5 md:grid-cols-2">

        {/* Recent Check-ins */}
        <SurfaceCard>
          <SectionHeader
            overline="History"
            title="Recent check-ins"
          />

          <div className="mt-4 space-y-3">
            {checkins.length === 0 && (
              <SurfaceCard variant="nested">
                <p className="text-sm stitch-text-primary">
                  No check-ins yet. Generate one to get started.
                </p>
              </SurfaceCard>
            )}
            {checkins.map((item) => (
              <SurfaceCard variant="nested" key={item.id}>
                <div className="flex gap-3">
                  <MessageSquareText size={16} className="mt-0.5 shrink-0"  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold capitalize">
                        {item.type} check-in
                      </p>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider shrink-0 stitch-text-secondary">
                        {new Date(item.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 stitch-text-secondary">
                      {item.prompt}
                    </p>

                    <div className="mt-3">
                      <InputWell
                        value={draftResponses[item.id] ?? item.response ?? ''}
                        onChange={(val) =>
                          setDraftResponses((cur) => ({ ...cur, [item.id]: val }))
                        }
                        placeholder="Write your response"
                        multiline
                        rows={3}
                      />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <GradientButton
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          saveCheckInResponse(item.id, draftResponses[item.id] ?? item.response ?? '')
                        }>
                        Save response
                      </GradientButton>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </SurfaceCard>

        {/* Check-in Windows */}
        <SurfaceCard>
          <SectionHeader
            overline="Schedule"
            title="Check-in windows"
          />

          <div className="mt-4 space-y-2">
            {checkInWindows.map((w) => (
              <SurfaceCard variant="nested" padding="sm" key={w.label}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{w.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold stitch-text-primary">
                      {w.label}
                    </p>
                    <p className="text-xs stitch-text-secondary">
                      {w.time}
                    </p>
                  </div>
                  <Clock size={14} className="stitch-text-tertiary" />
                </div>
              </SurfaceCard>
            ))}
          </div>

          <div className="mt-4">
            <GradientButton size="sm" onClick={generateCheckIn}>
              Generate check-in now
            </GradientButton>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
