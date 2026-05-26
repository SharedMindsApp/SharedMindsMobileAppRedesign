// ProjectActionChooser
//
// When the user clicks "Start a session" on a project (or marks a
// task Active and wants to commit time), the old flow forced a
// right-now session start — which is the wrong default for someone
// mid-task who wants to *plan* their work. This chooser gives three
// honest options:
//
//   ▶ Start now           — opens DeclareSessionModal pre-pinned to
//                           the project, defaults to immediate.
//   📅 Block out time     — opens DeclareSessionModal in schedule mode
//                           at a chosen future slot.
//   🔍 Find one to join   — sends the user to /sessions with the
//                           project pre-pinned so they can see / take
//                           an existing slot.

import { Play, CalendarPlus, Search, X } from 'lucide-react';

interface Props {
  projectTitle: string;
  onStartNow: () => void;
  onBlockTime: () => void;
  onFindOne: () => void;
  onClose: () => void;
}

export function ProjectActionChooser({ projectTitle, onStartNow, onBlockTime, onFindOne, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
              Make time for
            </p>
            <h2 className="text-lg font-extrabold stitch-text-primary leading-tight truncate">
              {projectTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-2">
          <Option
            icon={<Play size={18} className="text-primary" strokeWidth={2.5} />}
            tone="primary"
            title="Start now"
            description="Open a focus session this minute. Pick duration, mode, video on/off."
            onClick={() => { onClose(); onStartNow(); }}
          />
          <Option
            icon={<CalendarPlus size={18} className="text-sky-600" strokeWidth={2.5} />}
            tone="sky"
            title="Block out time"
            description="Schedule a future slot. Calendar entry now, session later."
            onClick={() => { onClose(); onBlockTime(); }}
          />
          <Option
            icon={<Search size={18} className="text-emerald-600" strokeWidth={2.5} />}
            tone="emerald"
            title="Find one to join"
            description="Browse upcoming public sessions and slot in with someone else."
            onClick={() => { onClose(); onFindOne(); }}
          />
        </div>
      </div>
    </div>
  );
}

const TONE_CLS: Record<string, string> = {
  primary: 'bg-primary/8 ring-primary/15',
  sky:     'bg-sky-50 ring-sky-100',
  emerald: 'bg-emerald-50 ring-emerald-100',
};

function Option({
  icon, tone, title, description, onClick,
}: {
  icon: React.ReactNode;
  tone: 'primary' | 'sky' | 'emerald';
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors p-4 flex items-start gap-3"
    >
      <div className={`w-10 h-10 rounded-2xl ring-1 grid place-items-center shrink-0 ${TONE_CLS[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-extrabold stitch-text-primary">{title}</p>
        <p className="text-xs stitch-text-secondary leading-snug mt-0.5">{description}</p>
      </div>
    </button>
  );
}
