/**
 * TaskCard — the one task row used everywhere: Home "Today", the project
 * Day/Week board, and (later) the session picker. One visual language so a
 * task looks and behaves identically wherever you meet it.
 *
 * Deliberately decoupled from CoreData — callers pass the display fields +
 * handlers, so it has no service/context dependency and is trivial to reuse.
 *
 * Shows: a check circle (done toggle), the title, an urgency chip
 * (scheduled/deadline state via taskUrgency), an optional project tag, and
 * an optional "steps" summary that expands a children slot (Chunk E).
 */

import type { ReactNode } from 'react';
import { Circle, CheckCircle2, ChevronRight, ChevronDown, ListChecks, Loader2 } from 'lucide-react';
import { taskUrgency, type UrgencyInput } from '../../lib/taskUrgency';

export interface TaskCardTask extends UrgencyInput {
  id: string;
  title: string;
}

interface Props {
  task: TaskCardTask;
  /** Project tag (hidden when omitted or showProject=false). */
  projectName?: string | null;
  projectColorHex?: string | null;
  showProject?: boolean;
  /** Toggle done. Omit to render a read-only circle. */
  onToggleDone?: () => void;
  /** Open the task (detail / edit). The title becomes the click target. */
  onOpen?: () => void;
  busy?: boolean;
  // ── Steps summary (Chunk E). Chip renders only when stepsTotal > 0. ──
  stepsTotal?: number;
  stepsDone?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Expanded steps content, rendered below the row when `expanded`. */
  children?: ReactNode;
}

export function TaskCard({
  task, projectName, projectColorHex, showProject = true,
  onToggleDone, onOpen, busy,
  stepsTotal = 0, stepsDone = 0, expanded, onToggleExpand, children,
}: Props) {
  const u = taskUrgency(task);
  const done = u.kind === 'done';

  return (
    <div className="rounded-xl bg-surface ring-1 ring-surface-container/70 overflow-hidden">
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        {/* Done toggle */}
        <button
          type="button"
          onClick={onToggleDone}
          disabled={!onToggleDone || busy}
          aria-label={done ? 'Mark not done' : 'Mark done'}
          className={`shrink-0 mt-0.5 transition-colors ${done ? 'text-emerald-500' : 'text-slate-300 hover:text-primary'} ${onToggleDone ? '' : 'cursor-default'}`}
        >
          {busy ? <Loader2 size={18} className="animate-spin" />
            : done ? <CheckCircle2 size={18} strokeWidth={2.25} />
            : <Circle size={18} strokeWidth={2} />}
        </button>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={onOpen}
            disabled={!onOpen}
            className={`block w-full text-left text-sm font-semibold leading-snug truncate ${
              done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'
            } ${onOpen ? 'hover:opacity-80 transition-opacity' : 'cursor-default'}`}
          >
            {task.title}
          </button>

          <div className="flex items-center flex-wrap gap-1.5 mt-1">
            {/* Urgency chip — hidden when done to reduce noise */}
            {!done && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${u.tone}`}>
                {u.label}
              </span>
            )}
            {/* Project tag */}
            {showProject && projectName && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: projectColorHex ?? '#94a3b8' }} />
                {projectName}
              </span>
            )}
            {/* Steps summary */}
            {stepsTotal > 0 && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="inline-flex items-center gap-1 text-[10px] font-semibold stitch-text-secondary hover:stitch-text-primary transition-colors"
              >
                <ListChecks size={11} />
                {stepsDone}/{stepsTotal} steps
                {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded steps slot */}
      {expanded && children && (
        <div className="px-3 pb-3 pt-0">
          {children}
        </div>
      )}
    </div>
  );
}
