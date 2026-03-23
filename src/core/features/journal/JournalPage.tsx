import { MoonStar, NotebookText, SunMedium, Trophy, CloudRain, Brain } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import {
  PageGreeting,
  SurfaceCard,
  SectionHeader,
  PillButton,
  GradientButton,
  InputWell,
  TimelineEntry,
} from '../../ui/CorePage';

export function JournalPage() {
  const {
    state: { journal, activityLog },
    updateJournal,
  } = useCoreData();

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* ── Greeting ────────────────────────────────────────── */}
      <PageGreeting
        greeting="Journal"
        subtitle="Close the loop on today to clear space for tomorrow's flow."
      />

      <div className="grid gap-3 sm:gap-5 md:grid-cols-[1.05fr,0.95fr]">

        {/* ── Daily Reflection ──────────────────────────────── */}
        <SurfaceCard>
          <SectionHeader
            overline="Daily reflection"
            title="How was your day?"
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {/* Sleep Quality */}
            <SurfaceCard variant="nested">
              <div className="flex items-center gap-2 text-sm font-semibold stitch-text-primary">
                <MoonStar size={16} className="stitch-icon-accent" />
                How was your sleep?
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <PillButton
                    key={rating}
                    selected={rating === journal.sleepQuality}
                    onClick={() => updateJournal({ sleepQuality: rating })}
                    size="sm">
                    {rating}/5
                  </PillButton>
                ))}
              </div>
            </SurfaceCard>

            {/* Movement */}
            <SurfaceCard variant="nested">
              <div className="flex items-center gap-2 text-sm font-semibold stitch-text-primary">
                <SunMedium size={16} className="stitch-icon-accent" />
                Movement & exercise
              </div>
              <div className="mt-3">
                <InputWell
                  value={journal.exercise}
                  onChange={(val) => updateJournal({ exercise: val })}
                  placeholder="What moved you today?"
                />
              </div>
            </SurfaceCard>

            {/* Tomorrow's Intention */}
            <SurfaceCard variant="nested" className="md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold stitch-text-primary">
                <NotebookText size={16} className="stitch-icon-success" />
                Tomorrow's intention
              </div>
              <div className="mt-3">
                <InputWell
                  value={journal.tomorrowIntention}
                  onChange={(val) => updateJournal({ tomorrowIntention: val })}
                  placeholder="One thing to focus on tomorrow..."
                  multiline
                  rows={3}
                />
              </div>
            </SurfaceCard>
          </div>

          {/* Wins + Struggles + Reflection */}
          <div className="mt-4 grid gap-3">
            <SurfaceCard variant="nested">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Trophy size={16}  />
                Wins
              </div>
              <InputWell
                value={journal.wins}
                onChange={(val) => updateJournal({ wins: val })}
                placeholder="What went well?"
                multiline
                rows={3}
              />
            </SurfaceCard>

            <SurfaceCard variant="nested">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <CloudRain size={16}  />
                Struggles
              </div>
              <InputWell
                value={journal.struggles}
                onChange={(val) => updateJournal({ struggles: val })}
                placeholder="What felt heavy?"
                multiline
                rows={3}
              />
            </SurfaceCard>

            <SurfaceCard variant="nested">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Brain size={16} className="stitch-icon-accent" />
                Open reflection
              </div>
              <InputWell
                value={journal.reflection}
                onChange={(val) => updateJournal({ reflection: val })}
                placeholder="Dump your thoughts here..."
                multiline
                rows={4}
              />
            </SurfaceCard>
          </div>

          <div className="mt-4">
            <GradientButton size="lg" fullWidth>
              Complete entry
            </GradientButton>
          </div>
        </SurfaceCard>

        {/* ── Right Column: Timeline + Science Tip ─────────── */}
        <div className="space-y-5">

          {/* Activity Timeline */}
          <SurfaceCard>
            <SectionHeader
              overline="Activity timeline"
              title="What happened today"
            />
            {activityLog.length> 0 ? (
              <div className="mt-4">
                {activityLog.map((entry, idx) => (
                  <TimelineEntry
                    key={entry.id}
                    time={entry.time}
                    title={entry.title}
                    isLast={idx === activityLog.length - 1}
                  />
                ))}
              </div>
            ) : (
              <SurfaceCard variant="nested" className="mt-4">
                <p className="text-sm stitch-text-primary">
                  No activities logged yet today.
                </p>
              </SurfaceCard>
            )}
          </SurfaceCard>

          {/* Science Tip */}
          <SurfaceCard variant="accent">
            <p className="text-sm font-bold">The science of closing</p>
            <p className="mt-2 text-sm leading-6 opacity-90">
              Labelling struggles reduces amygdala activity. Externalising "tomorrow's intention" signals to your brain that the day's tasks are managed, reducing sleep-onset anxiety.
            </p>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
