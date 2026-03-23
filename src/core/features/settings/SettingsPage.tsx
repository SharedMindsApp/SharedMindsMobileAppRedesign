import { Bell, BrainCircuit, Download, ShieldCheck, UserRound } from 'lucide-react';
import { useCoreData } from '../../data/CoreDataContext';
import {
  PageGreeting,
  SurfaceCard,
  SectionHeader,
  GradientButton,
  InputWell,
} from '../../ui/CorePage';

export function SettingsPage() {
  const {
    state: { settings },
    updateSettings,
  } = useCoreData();

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* ── Greeting ────────────────────────────────────────── */}
      <PageGreeting
        greeting="Settings"
        subtitle="Make SharedMinds work for you."
      />

      {/* ── Row 1: Profile + Preferences ────────────────────── */}
      <div className="grid gap-3 sm:gap-5 md:grid-cols-2">

        {/* Profile */}
        <SurfaceCard>
          <SectionHeader overline="Identity" title="Profile" />
          <SurfaceCard variant="nested" className="mt-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <UserRound size={16} className="stitch-icon-accent" />
              Your details
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InputWell
                value={settings.userName}
                onChange={(val) => updateSettings({ userName: val })}
                placeholder="Full name"
              />
              <InputWell
                value={settings.location}
                onChange={(val) => updateSettings({ location: val })}
                placeholder="Location"
              />
            </div>
          </SurfaceCard>
        </SurfaceCard>

        {/* Preferences */}
        <SurfaceCard>
          <SectionHeader overline="Preferences & sync" title="How SharedMinds behaves" />
          <div className="mt-4 space-y-2">
            {[
              { icon: <ShieldCheck size={16} className="stitch-icon-accent" />, label: 'Share new items by default', key: 'sharedByDefault' as const },
              { icon: <BrainCircuit size={16} className="stitch-icon-accent" />, label: 'Enable voice check-ins', key: 'voiceEnabled' as const },
              { icon: <Bell size={16} className="stitch-icon-accent" />, label: 'Calendar sync', key: 'calendarSyncEnabled' as const },
            ].map((pref) => (
              <label key={pref.key} className="block cursor-pointer">
                <SurfaceCard variant="nested" padding="sm">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0">{pref.icon}</span>
                    <span className="flex-1 text-sm font-medium stitch-text-primary">
                      {pref.label}
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={settings[pref.key]}
                        onChange={(e) => updateSettings({ [pref.key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 rounded-full transition-colors peer-checked:bg-blue-500 bg-[#aeb2b6]/40" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                    </div>
                  </div>
                </SurfaceCard>
              </label>
            ))}
          </div>
        </SurfaceCard>
      </div>

      {/* ── Row 2: Connections + AI + Data ───────────────────── */}
      <div className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">

        {/* Sync Status */}
        <SurfaceCard>
          <SectionHeader overline="Connections" title="Sync status" />
          <div className="mt-4 space-y-2">
            <SurfaceCard variant="nested" padding="sm">
              <p className="text-sm stitch-text-primary">
                Supabase profile for {settings.userName || 'your account'}
              </p>
            </SurfaceCard>
            <SurfaceCard variant="nested" padding="sm">
              <p className="text-sm stitch-text-primary">
                Calendar sync: {settings.calendarSyncEnabled ? 'enabled' : 'disabled'}
              </p>
            </SurfaceCard>
          </div>
        </SurfaceCard>

        {/* AI Preferences */}
        <SurfaceCard>
          <SectionHeader overline="AI preferences" title="Voice & provider" />
          <div className="mt-4 space-y-3">
            <div>
              <label
                className="block text-[11px] font-bold uppercase tracking-[0.14em] mb-2 stitch-text-secondary">
                Voice selection
              </label>
              <select
                className="stitch-input-well stitch-input-well--focus w-full rounded-[2rem] px-5 py-3 text-sm outline-none transition-all duration-200"
                value={settings.voiceChoice}
                onChange={(e) => updateSettings({ voiceChoice: e.target.value })}>
                <option value="ash">Ash (Supportive & Bright)</option>
                <option value="sage">Sage (Calm & Measured)</option>
                <option value="alloy">Alloy (Neutral)</option>
              </select>
            </div>
            <SurfaceCard variant="nested" padding="sm">
              <p className="text-sm stitch-text-primary">
                Voice is {settings.voiceEnabled ? 'enabled' : 'disabled'}, using {settings.voiceChoice}
              </p>
            </SurfaceCard>
          </div>
        </SurfaceCard>

        {/* Data & Privacy */}
        <SurfaceCard>
          <SectionHeader overline="Data & privacy" title="Your data" />
          <div className="mt-4 space-y-3">
            <GradientButton size="sm" variant="secondary" onClick={() => {}}>
              <span className="inline-flex items-center gap-2">
                <Download size={16} />
                Export all data
              </span>
            </GradientButton>
            <p className="text-sm stitch-text-primary">
              Download a complete copy of your tasks, journal, check-ins, and reports.
            </p>
            <button
              type="button"
              className="text-sm font-semibold transition-colors hover:opacity-80 stitch-text-danger">
              Reset to defaults
            </button>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
