// SegmentTimeline
//
// Vertical timeline of a session's segments. Each segment shows its
// kind icon, label, and duration. Cumulative running-total on the
// right edge helps the user see "this segment ends at minute 35."
//
// Pure read-only display. Used in:
//   • SessionDetailSheet — pre-session preview of the structure
//   • (future) ActiveSessionPage — same component with `currentIndex`
//     highlighting the active segment

import {
  Sparkles, PenLine, Brain, Coffee, MessageCircle, Hand, Wand2,
} from 'lucide-react';
import type { Segment, SegmentKind } from '../../services/SessionTemplatesService';

interface Props {
  segments: Segment[];
  /** When set, marks the segment at this index as currently active
   *  (used by the live runtime; ignored in the pre-session preview). */
  currentIndex?: number;
}

export function SegmentTimeline({ segments, currentIndex = -1 }: Props) {
  if (!segments || segments.length === 0) return null;

  // Running total — each entry is the cumulative minute at the END
  // of the segment at that index. Used for the right-edge timestamp.
  let cumulative = 0;
  const runningEnds = segments.map((s) => {
    cumulative += s.minutes;
    return cumulative;
  });

  return (
    <ol className="space-y-1.5">
      {segments.map((s, i) => {
        const meta = SEGMENT_META[s.kind] ?? SEGMENT_META.work;
        const isPast = currentIndex >= 0 && i < currentIndex;
        const isActive = currentIndex === i;
        const Icon = meta.icon;
        return (
          <li
            key={i}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors ${
              isActive
                ? `${meta.activeBg} ring-1 ring-inset ${meta.activeRing}`
                : isPast
                ? 'opacity-50'
                : ''
            }`}
          >
            <span className={`shrink-0 w-7 h-7 rounded-full grid place-items-center ${meta.iconBg}`}>
              <Icon size={12} className={meta.iconText} />
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold leading-tight truncate ${isActive ? meta.activeText : 'stitch-text-primary'}`}>
                {s.label}
              </p>
              {s.wizard && (
                <p className="text-[10px] stitch-text-secondary inline-flex items-center gap-1 mt-0.5">
                  <Wand2 size={8} /> {s.wizard}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-extrabold tabular-nums stitch-text-primary">
                {s.minutes}m
              </p>
              <p className="text-[9px] stitch-text-secondary tabular-nums">
                ends {runningEnds[i]}m
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const SEGMENT_META: Record<SegmentKind, {
  icon: typeof Sparkles;
  iconBg: string;
  iconText: string;
  activeBg: string;
  activeRing: string;
  activeText: string;
}> = {
  intro:      { icon: Sparkles,      iconBg: 'bg-violet-50',  iconText: 'text-violet-600',  activeBg: 'bg-violet-50',  activeRing: 'ring-violet-200',  activeText: 'text-violet-900' },
  intentions: { icon: PenLine,       iconBg: 'bg-amber-50',   iconText: 'text-amber-600',   activeBg: 'bg-amber-50',   activeRing: 'ring-amber-200',   activeText: 'text-amber-900' },
  work:       { icon: Brain,         iconBg: 'bg-primary/10', iconText: 'text-primary',     activeBg: 'bg-primary/10', activeRing: 'ring-primary/30', activeText: 'text-primary' },
  break:      { icon: Coffee,        iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', activeBg: 'bg-emerald-50', activeRing: 'ring-emerald-200', activeText: 'text-emerald-900' },
  reflect:    { icon: MessageCircle, iconBg: 'bg-sky-50',     iconText: 'text-sky-600',     activeBg: 'bg-sky-50',     activeRing: 'ring-sky-200',     activeText: 'text-sky-900' },
  farewell:   { icon: Hand,          iconBg: 'bg-rose-50',    iconText: 'text-rose-600',    activeBg: 'bg-rose-50',    activeRing: 'ring-rose-200',    activeText: 'text-rose-900' },
  wizard:     { icon: Wand2,         iconBg: 'bg-fuchsia-50', iconText: 'text-fuchsia-600', activeBg: 'bg-fuchsia-50', activeRing: 'ring-fuchsia-200', activeText: 'text-fuchsia-900' },
};
