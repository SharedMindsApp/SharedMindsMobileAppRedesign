/**
 * DebriefOverlay — live end-of-session check-in.
 *
 * Renders ON TOP of the active video grid so participants can see each
 * other while they pick their outcome. Each person taps one of three
 * buttons. Answers stream in via Supabase Realtime so everyone sees who's
 * done in real time. After 60 seconds we auto-finalize: anyone who hasn't
 * answered gets recorded as 'no_answer' and the session officially ends.
 *
 * Used the same way in solo and group/1-on-1 sessions — the only
 * difference is solo shows just the local user's card with no peers.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, MinusCircle, XCircle, Clock, Inbox, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  submitSessionOutcome,
  fetchSessionOutcomes,
  type DebriefOutcome,
  type SessionOutcomeRow,
} from '../../services/SessionService';
import { TaskService } from '../../services/TaskService';
import { CaptureService, type SessionCapture } from '../../services/CaptureService';
import { SpaceService } from '../../services/SpaceService';
import { MoodPicker } from './MoodPicker';
import { FOCUS_LEVELS, focusPrompt } from '../../../lib/sessionMood';
import type { SessionKind } from '../../../lib/sessionMood';

const DEBRIEF_DURATION_S = 60;

interface DebriefOverlayProps {
  sessionId: string;
  declaredGoal: string | null;
  /** Current user's id — used to pick which row is "me" in the outcomes list */
  currentUserId: string;
  /**
   * Task linked to this session, if any. When the user picks an outcome we
   * propagate it to the task (finished → done; partial → stays active with
   * a "continue" badge for next time).
   */
  taskId: string | null;
  /** Called once the local user has submitted AND the debrief is fully done
      (timer expired OR everyone answered). Parent navigates to summary. */
  onFinalized: () => void;
  /** Skip the "Waiting for everyone else" countdown — call onFinalized
   *  immediately after the user picks an outcome. Used for solo
   *  sessions where there is no "everyone else" to wait for. */
  skipWait?: boolean;
  /** What the session was for — drives the end-of-session mood axis. */
  sessionKind?: SessionKind;
}

type OutcomeWithProfile = SessionOutcomeRow & {
  profile: { display_name: string; avatar_url: string | null } | null;
};

export function DebriefOverlay({
  sessionId, declaredGoal, currentUserId, taskId, onFinalized, skipWait = false, sessionKind = 'do',
}: DebriefOverlayProps) {
  const [outcomes, setOutcomes] = useState<OutcomeWithProfile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [endMood, setEndMood] = useState<string | null>(null);
  const [endFocus, setEndFocus] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(DEBRIEF_DURATION_S);
  const finalizedRef = useRef(false);

  // Parked distractions captured during the session, awaiting triage.
  const [captures, setCaptures] = useState<SessionCapture[]>([]);
  const [captureBusy, setCaptureBusy] = useState<string | null>(null);
  const spaceIdRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    CaptureService.getCapturesForSession(sessionId)
      .then((rows) => { if (!cancelled) setCaptures(rows.filter((c) => !c.resolved_at)); })
      .catch(() => {});
    // Bootstrap the personal space lazily so "make a task" has a home.
    SpaceService.bootstrapPersonalSpace(currentUserId)
      .then((s) => { spaceIdRef.current = s.id; })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId, currentUserId]);

  async function keepCaptureAsTask(c: SessionCapture) {
    if (captureBusy || !spaceIdRef.current) return;
    setCaptureBusy(c.id);
    try {
      await CaptureService.convertToTask(c, spaceIdRef.current, currentUserId);
      setCaptures((prev) => prev.filter((x) => x.id !== c.id));
    } catch { /* leave in list */ }
    finally { setCaptureBusy(null); }
  }
  async function discardCapture(c: SessionCapture) {
    if (captureBusy) return;
    setCaptureBusy(c.id);
    try {
      await CaptureService.deleteCapture(c.id);
      setCaptures((prev) => prev.filter((x) => x.id !== c.id));
    } catch { /* leave in list */ }
    finally { setCaptureBusy(null); }
  }

  const myOutcome = useMemo(
    () => outcomes.find((o) => o.user_id === currentUserId)?.outcome ?? null,
    [outcomes, currentUserId],
  );
  const peers = useMemo(
    () => outcomes.filter((o) => o.user_id !== currentUserId),
    [outcomes, currentUserId],
  );

  // ── Load initial outcomes + subscribe to new ones via Realtime ─────────────
  useEffect(() => {
    let cancelled = false;

    fetchSessionOutcomes(sessionId).then((rows) => {
      if (!cancelled) setOutcomes(rows);
    }).catch(() => {});

    const channel = supabase
      .channel(`debrief:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_outcomes',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // Re-fetch the full list whenever anything changes — small dataset,
          // simpler than diff-applying inserts/updates by hand.
          fetchSessionOutcomes(sessionId).then((rows) => {
            if (!cancelled) setOutcomes(rows);
          }).catch(() => {});
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // ── 60-second countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Finalize when timer hits 0 ──────────────────────────────────────────────
  useEffect(() => {
    if (secondsLeft > 0 || finalizedRef.current) return;
    finalizedRef.current = true;

    // If the local user never answered, record 'no_answer' so the row exists
    // (otherwise the summary page has nothing to display).
    (async () => {
      if (!myOutcome) {
        try {
          await submitSessionOutcome({
            sessionId,
            outcome: 'no_answer',
            declaredGoal,
          });
          if (taskId) await TaskService.applyOutcomeToTask(taskId, 'no_answer');
        } catch { /* non-fatal */ }
      }
      onFinalized();
    })();
  }, [secondsLeft, myOutcome, sessionId, declaredGoal, onFinalized, taskId]);

  async function pick(outcome: DebriefOutcome) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitSessionOutcome({ sessionId, outcome, declaredGoal, endMood, endFocus });
      // Propagate the outcome to the linked task — drives the auto-tick
      // and the "continue from where you left off" badge next session.
      if (taskId) {
        await TaskService.applyOutcomeToTask(taskId, outcome);
      }
      // Solo sessions: no peers to wait for. Finalize the moment the
      // user picks an outcome so the timer surface auto-dismisses
      // straight to the summary page.
      if (skipWait && !finalizedRef.current) {
        finalizedRef.current = true;
        onFinalized();
      }
    } catch (err) {
      console.error('[Debrief] submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#1a1a2e]/95 border border-white/10 rounded-3xl p-6 shadow-2xl">
        {/* ── Header with countdown ──────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
              Time's up
            </p>
            <h2 className="text-lg font-bold text-white">Did you finish it?</h2>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1.5">
            <Clock size={12} className="text-white/60" />
            <span className={`text-sm font-bold tabular-nums ${secondsLeft <= 10 ? 'text-amber-400' : 'text-white/80'}`}>
              {secondsLeft}s
            </span>
          </div>
        </div>

        {/* ── Declared goal ─────────────────────────────────────────── */}
        {declaredGoal && (
          <div className="mb-5 p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
              You declared
            </p>
            <p className="text-sm font-bold text-white leading-snug">
              {declaredGoal}
            </p>
          </div>
        )}

        {/* ── Parked distractions — triage what you caught mid-session ── */}
        {captures.length > 0 && (
          <div className="mb-5 rounded-2xl bg-white/5 border border-white/10 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Inbox size={13} className="text-violet-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Parked · {captures.length}
              </p>
            </div>
            <ul className="space-y-1.5">
              {captures.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 text-[13px] text-white/85 leading-snug break-words">{c.text}</span>
                  <button
                    type="button"
                    onClick={() => keepCaptureAsTask(c)}
                    disabled={captureBusy === c.id}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/90 hover:bg-violet-500 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                    title="Make this a task"
                  >
                    {captureBusy === c.id ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} strokeWidth={3} />}
                    Task
                  </button>
                  <button
                    type="button"
                    onClick={() => discardCapture(c)}
                    disabled={captureBusy === c.id}
                    className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-white/40 hover:text-rose-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                    aria-label="Discard"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-white/35 mt-2 leading-snug">
              Anything you leave stays in your parking lot to sort later.
            </p>
          </div>
        )}

        {/* ── End-of-session mood (adaptive to session kind) ────────── */}
        {!myOutcome && (
          <div className="mb-4">
            <MoodPicker kind={sessionKind} value={endMood} onChange={setEndMood} when="after" tone="dark" />
          </div>
        )}

        {/* ── End-of-session focus (separate dimension from mood) ────── */}
        {!myOutcome && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-white/60">{focusPrompt('after')}</p>
            <div className="flex flex-wrap gap-1.5">
              {FOCUS_LEVELS.map((f) => {
                const active = endFocus === f.code;
                return (
                  <button
                    key={f.code}
                    type="button"
                    onClick={() => setEndFocus(active ? null : f.code)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                      active ? 'bg-primary text-white shadow-sm' : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    <span>{f.emoji}</span>{f.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Three outcome buttons (or your picked one) ────────────── */}
        {!myOutcome ? (
          <div className="space-y-2 mb-5">
            <OutcomeButton
              icon={<CheckCircle2 size={18} className="text-emerald-400" />}
              label="Finished"
              sub="I did what I said I'd do"
              disabled={submitting}
              onClick={() => pick('finished')}
            />
            <OutcomeButton
              icon={<MinusCircle size={18} className="text-amber-400" />}
              label="Partially"
              sub="Some progress, didn't fully ship"
              disabled={submitting}
              onClick={() => pick('partially')}
            />
            <OutcomeButton
              icon={<XCircle size={18} className="text-rose-400" />}
              label="Something came up"
              sub="Got pulled away or stuck"
              disabled={submitting}
              onClick={() => pick('something_came_up')}
            />
          </div>
        ) : (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white mb-0.5">
                {labelFor(myOutcome)}
              </p>
              <p className="text-xs text-white/50">
                Waiting for everyone else — finishes in {secondsLeft}s
              </p>
            </div>
          </div>
        )}

        {/* ── Peer answers (if any) ─────────────────────────────────── */}
        {peers.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
              Others
            </p>
            <div className="space-y-1.5">
              {peers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 px-3 py-2 bg-white/5 rounded-xl"
                >
                  {p.profile?.avatar_url ? (
                    <img src={p.profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {(p.profile?.display_name ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 min-w-0 text-xs font-semibold text-white/80 truncate">
                    {p.profile?.display_name ?? 'Member'}
                  </span>
                  <OutcomeBadge outcome={p.outcome} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OutcomeButton({
  icon, label, sub, disabled, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left active:scale-[0.99]"
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-[11px] text-white/50">{sub}</p>
      </div>
    </button>
  );
}

function OutcomeBadge({ outcome }: { outcome: DebriefOutcome }) {
  if (outcome === 'finished') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 text-[10px] font-bold">
        <CheckCircle2 size={9} /> Finished
      </span>
    );
  }
  if (outcome === 'partially') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-bold">
        <MinusCircle size={9} /> Partial
      </span>
    );
  }
  if (outcome === 'something_came_up') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-400/15 text-rose-300 text-[10px] font-bold">
        <XCircle size={9} /> Came up
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-[10px] font-bold">
      No answer
    </span>
  );
}

function labelFor(outcome: DebriefOutcome): string {
  switch (outcome) {
    case 'finished':           return 'Finished — nice work';
    case 'partially':          return 'Partial progress logged';
    case 'something_came_up':  return 'No worries — happens';
    case 'no_answer':          return 'No answer';
  }
}
