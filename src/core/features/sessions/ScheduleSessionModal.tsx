import { useState } from 'react';
import { X, Calendar, Loader2, Zap, Leaf, Coffee, Link, Copy, Check } from 'lucide-react';
import { createScheduledSession } from '../../services/SessionService';
import type { FocusSession } from '../../../lib/sessions/focusTypes';

type DurationOption = 25 | 50 | 90;

const DURATIONS: { value: DurationOption; label: string; sublabel: string; icon: any }[] = [
  { value: 25, label: '25 min', sublabel: 'Pomodoro', icon: Coffee },
  { value: 50, label: '50 min', sublabel: 'Deep work', icon: Zap },
  { value: 90, label: '90 min', sublabel: 'Flow state', icon: Leaf },
];

// Returns the local datetime-local input value for "now + 1 hour" as a default
function defaultScheduledTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  // datetime-local input needs "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatSessionTime(isoOrLocal: string): string {
  const d = new Date(isoOrLocal);
  return d.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  onClose: () => void;
  onCreated?: (session: FocusSession) => void;
}

export function ScheduleSessionModal({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [scheduledTime, setScheduledTime] = useState(defaultScheduledTime);
  const [duration, setDuration] = useState<DurationOption>(50);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<FocusSession | null>(null);
  const [copied, setCopied] = useState(false);

  const joinUrl = created?.join_code
    ? `${window.location.origin}/join/${created.join_code}`
    : '';

  const canSubmit = title.trim().length > 0 && scheduledTime && !submitting;

  async function handleCreate() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await createScheduledSession({
        title: title.trim(),
        scheduledAt: new Date(scheduledTime),
        durationMinutes: duration,
      });
      setCreated(session);
      onCreated?.(session);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <div className="relative w-full h-full flex flex-col max-w-2xl mx-auto">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl stitch-card--accent flex items-center justify-center shrink-0">
              <Calendar size={18} className="text-white" />
            </div>
            <div>
              <h2 className="stitch-headline text-base font-extrabold leading-tight">
                Schedule a session
              </h2>
              <p className="text-xs stitch-text-secondary">
                Set a time and share the link
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors shrink-0"
          >
            <X size={15} className="stitch-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 min-h-0">

          {!created ? (
            <div className="space-y-5 pb-4">
              {/* Title */}
              <div>
                <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-2">
                  Session title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Wednesday morning coworking"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              {/* Date + time */}
              <div>
                <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-2">
                  Date &amp; time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              {/* Duration */}
              <div>
                <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
                  Session length
                </p>
                <div className="flex gap-2">
                  {DURATIONS.map(({ value, label, sublabel, icon: Icon }) => {
                    const isActive = duration === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDuration(value)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'stitch-btn--primary text-white shadow-md shadow-primary/20'
                            : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.97]'
                        }`}
                      >
                        <Icon size={13} className={isActive ? 'text-white/80' : 'stitch-text-secondary'} />
                        <div className="text-left">
                          <p className="text-sm font-extrabold leading-none">{label}</p>
                          <p className={`text-[10px] leading-none mt-0.5 ${isActive ? 'text-white/70' : 'stitch-text-secondary'}`}>
                            {sublabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
              )}
            </div>
          ) : (
            /* ── Success state — show join link ── */
            <div className="space-y-4 pb-4">
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <Check size={28} className="text-emerald-600" strokeWidth={2.5} />
                </div>
                <h3 className="stitch-headline text-lg font-extrabold mb-1">Session scheduled!</h3>
                <p className="text-sm stitch-text-secondary">
                  {formatSessionTime(created.scheduled_at ?? created.start_time)} · {created.intended_duration_minutes} min
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
                  Share this link
                </p>
                <div className="flex items-center gap-2 px-4 py-3 bg-surface-container-low rounded-xl">
                  <Link size={14} className="stitch-text-secondary shrink-0" />
                  <span className="flex-1 text-sm font-medium stitch-text-primary truncate">
                    {joinUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      copied
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-xs stitch-text-secondary px-1">
                  Post this on Skool, Meetup, or anywhere you want people to join from.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pt-3 pb-6">
          {!created ? (
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canSubmit}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold transition-all duration-200 ${
                canSubmit
                  ? 'stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98]'
                  : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Calendar size={18} />
                  Create session
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold bg-surface-container-low stitch-text-primary hover:bg-surface-container transition-all"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
