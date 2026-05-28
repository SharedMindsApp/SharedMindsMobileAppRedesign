/**
 * NextActionControl — the single, always-one next step for a project.
 *
 * The core ADHD-execution primitive: collapses "what do I do?" into one
 * pre-decided sentence. Used on the project card, the project detail page,
 * and the home "pick up where you left off" card.
 *
 * States:
 *   • has action  → check-circle + text (+ optional Start-session CTA)
 *   • no action   → "+ Set next step" affordance
 *   • editing     → inline input (save / cancel)
 *
 * Completing the action clears it and immediately drops into edit mode
 * pre-prompting the next step — the dopamine loop. All click handlers
 * stopPropagation so the control works inside a clickable card.
 */

import { useState } from 'react';
import { Circle, CheckCircle2, Plus, Play, Loader2, Check, X } from 'lucide-react';
import { ProjectService } from '../../services/ProjectService';

type Variant = 'card' | 'detail' | 'home';

interface Props {
  projectId: string;
  nextAction: string | null;
  variant?: Variant;
  /** Called after any change so the parent can refresh project state. */
  onChanged: () => void | Promise<void>;
  /** If provided, a "Start a session on this" CTA shows (detail/home). */
  onStartSession?: () => void;
}

export function NextActionControl({ projectId, nextAction, variant = 'card', onChanged, onStartSession }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  // Brief "nice, what's next?" affirmation shown after completing one.
  const [justCompleted, setJustCompleted] = useState(false);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  async function save() {
    const value = text.trim();
    if (!value || saving) return;
    setSaving(true);
    try {
      await ProjectService.setNextAction(projectId, value);
      setEditing(false);
      setText('');
      setJustCompleted(false);
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function complete() {
    if (saving) return;
    setSaving(true);
    try {
      await ProjectService.completeNextAction(projectId);
      await onChanged();
      // Drop straight into setting the next step — keeps the loop turning.
      setJustCompleted(true);
      setText('');
      setEditing(true);
    } finally {
      setSaving(false);
    }
  }

  function beginEdit() {
    setText(nextAction ?? '');
    setEditing(true);
  }

  const isDetail = variant === 'detail';
  const isHome = variant === 'home';
  const prominent = isDetail || isHome;

  // ── Editing ──────────────────────────────────────────────────────
  if (editing) {
    return (
      <div onClick={stop} className={prominent ? 'space-y-2' : 'space-y-1.5'}>
        {justCompleted && (
          <p className="text-[11px] font-bold text-emerald-600">Nice — one down. What's the next tiny step?</p>
        )}
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); save(); }
              if (e.key === 'Escape') { setEditing(false); setText(''); setJustCompleted(false); }
            }}
            placeholder="One small next step…"
            disabled={saving}
            className="flex-1 min-w-0 rounded-lg border border-surface-container-high bg-surface px-3 py-2 text-sm stitch-text-primary placeholder:stitch-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving || !text.trim()}
            aria-label="Save next step"
            className="w-8 h-8 shrink-0 rounded-lg bg-primary text-white grid place-items-center disabled:opacity-40 transition-opacity"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
          </button>
          {!justCompleted && (
            <button
              type="button"
              onClick={() => { setEditing(false); setText(''); }}
              aria-label="Cancel"
              className="w-8 h-8 shrink-0 rounded-lg bg-surface-container-low stitch-text-secondary grid place-items-center hover:bg-surface-container transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── No action set ────────────────────────────────────────────────
  if (!nextAction) {
    // Prominent (detail/home): the card has real estate, so make the empty
    // state feel intentional — eyebrow label, a one-line nudge, and a proper
    // button — rather than a lone link floating in white space.
    if (prominent) {
      return (
        <div onClick={stop} className="flex flex-col items-start">
          <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary">
            Your next step
          </p>
          <p className="mt-2 text-sm stitch-text-secondary leading-snug">
            Pre-decide the one small thing to do next, so you never face a blank page.
          </p>
          <button
            type="button"
            onClick={(e) => { stop(e); beginEdit(); }}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/15 active:scale-[0.98] transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            Set next step
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => { stop(e); beginEdit(); }}
        className="inline-flex items-center gap-1.5 font-bold text-primary hover:opacity-80 transition-opacity text-xs"
      >
        <Plus size={13} strokeWidth={2.5} />
        Set next step
      </button>
    );
  }

  // ── Has an action ────────────────────────────────────────────────
  return (
    <div className={prominent ? 'space-y-2.5' : ''}>
      {prominent && (
        <p className="text-[10px] font-extrabold uppercase tracking-widest stitch-text-secondary">
          Your next step
        </p>
      )}
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={(e) => { stop(e); complete(); }}
          disabled={saving}
          aria-label="Mark next step done"
          className="shrink-0 mt-0.5 text-primary hover:text-emerald-600 transition-colors"
        >
          {saving
            ? <Loader2 size={prominent ? 20 : 16} className="animate-spin" />
            : <Circle size={prominent ? 20 : 16} strokeWidth={2} />}
        </button>
        <button
          type="button"
          onClick={(e) => { stop(e); beginEdit(); }}
          className={`flex-1 min-w-0 text-left stitch-text-primary hover:opacity-80 transition-opacity ${
            prominent ? 'text-sm font-semibold leading-snug' : 'text-xs leading-snug'
          }`}
        >
          {nextAction}
        </button>
      </div>

      {prominent && onStartSession && (
        <button
          type="button"
          onClick={(e) => { stop(e); onStartSession(); }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-extrabold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Play size={12} fill="currentColor" />
          Start a session on this
        </button>
      )}
    </div>
  );
}
