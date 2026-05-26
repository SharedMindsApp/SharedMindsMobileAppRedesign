/**
 * WaitingRoom — the pre-session lobby.
 *
 * Shown when a scheduled session is within the join window (5 min before
 * start) but hasn't officially started yet. Purpose:
 *
 *   • Reduce the cold start of joining: people show up early, see who else
 *     is there, settle in. Cuts the awkward "ok everyone, ready?" intro.
 *   • Build presence WITHOUT burning Daily.co participant-minutes —
 *     we use Supabase Realtime presence on a channel instead of joining
 *     the video room early.
 *   • Surface a quick "pre-session ritual" prompt so people arrive with
 *     intent, not scrolling Twitter until the timer hits 0.
 *
 * Once the start time arrives OR a moderator clicks "Start now", the
 * parent component flips state, this unmounts, and DailyMeeting takes over.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Users, Coffee, BellOff, Wifi, CheckCircle2, Play, X, PenLine } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  markScheduledSessionActive,
  setDeclaredIntention,
  fetchSessionOutcomes,
} from '../../services/SessionService';

interface WaitingRoomProps {
  sessionId: string;
  sessionTitle: string;
  declaredGoal: string | null;
  scheduledStart: string;     // ISO timestamp
  isModerator: boolean;
  currentUserId: string;
  displayName: string;
  avatarUrl: string | null;
  onLeave: () => void;
  /** Fires when the timer hits zero OR the moderator starts the session.
      Parent should flip into the live DailyMeeting view. */
  onSessionStart: () => void;
}

interface PresenceParticipant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_ready: boolean;
}

const READY_CHECKLIST = [
  { id: 'water',   icon: Coffee,   label: 'Water + snack within reach' },
  { id: 'notif',   icon: BellOff,  label: 'Notifications silenced' },
  { id: 'connect', icon: Wifi,     label: 'Internet stable, headphones on' },
];

export function WaitingRoom({
  sessionId, sessionTitle, declaredGoal, scheduledStart,
  isModerator, currentUserId, displayName, avatarUrl,
  onLeave, onSessionStart,
}: WaitingRoomProps) {
  const startMs = new Date(scheduledStart).getTime();
  const [now, setNow] = useState(Date.now());
  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const [myChecks, setMyChecks] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const transitionedRef = useRef(false);

  // Per-participant intentions: each row in session_outcomes carries a
  // declared_goal. We display everyone's so people know what the room is
  // working on collectively.
  const [intentions, setIntentions] = useState<Array<{ user_id: string; declared_goal: string | null; profile: { display_name: string; avatar_url: string | null } | null }>>([]);
  const [myIntentionText, setMyIntentionText] = useState('');
  const [savingIntention, setSavingIntention] = useState(false);
  const myIntention = intentions.find((i) => i.user_id === currentUserId)?.declared_goal ?? null;

  const secondsLeft = Math.max(0, Math.ceil((startMs - now) / 1000));
  const minutesLeft = Math.floor(secondsLeft / 60);
  const secondsRemainder = secondsLeft % 60;

  // ── 1s tick ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Auto-transition when the clock hits zero ──────────────────────────────
  useEffect(() => {
    if (secondsLeft > 0 || transitionedRef.current) return;
    transitionedRef.current = true;
    (async () => {
      try { await markScheduledSessionActive(sessionId); } catch { /* non-fatal */ }
      onSessionStart();
    })();
  }, [secondsLeft, sessionId, onSessionStart]);

  // ── Supabase Realtime presence so people see each other arrive ────────────
  useEffect(() => {
    const channel = supabase.channel(`waiting:${sessionId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceParticipant>();
        const flat: PresenceParticipant[] = [];
        for (const id of Object.keys(state)) {
          const entries = state[id] ?? [];
          if (entries[0]) flat.push(entries[0]);
        }
        setParticipants(flat);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUserId,
            display_name: displayName,
            avatar_url: avatarUrl,
            is_ready: false,
          });
        }
      });

    return () => {
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    };
  }, [sessionId, currentUserId, displayName, avatarUrl]);

  // Load existing intentions + subscribe to session_outcomes realtime so
  // peer intentions appear in the lobby as they're typed.
  useEffect(() => {
    let cancelled = false;
    fetchSessionOutcomes(sessionId)
      .then((rows) => {
        if (cancelled) return;
        setIntentions(rows);
        // Seed the input with what the user previously typed (if any)
        const mine = rows.find((r) => r.user_id === currentUserId);
        if (mine?.declared_goal) setMyIntentionText(mine.declared_goal);
      })
      .catch(() => {});

    const ch = supabase
      .channel(`waiting_intentions:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_outcomes', filter: `session_id=eq.${sessionId}` },
        () => {
          fetchSessionOutcomes(sessionId).then((rows) => {
            if (!cancelled) setIntentions(rows);
          }).catch(() => {});
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [sessionId, currentUserId]);

  async function handleSaveIntention() {
    const text = myIntentionText.trim();
    if (!text || savingIntention) return;
    setSavingIntention(true);
    try {
      await setDeclaredIntention({ sessionId, declaredGoal: text });
    } catch (e) {
      console.error('[WaitingRoom] save intention failed:', e);
    } finally {
      setSavingIntention(false);
    }
  }

  // Push the local "is_ready" flag when the user finishes the checklist
  useEffect(() => {
    const allReady = myChecks.size === READY_CHECKLIST.length;
    const channel = supabase.channel(`waiting:${sessionId}`);
    channel.track({
      user_id: currentUserId,
      display_name: displayName,
      avatar_url: avatarUrl,
      is_ready: allReady,
    }).catch(() => {});
  }, [myChecks, sessionId, currentUserId, displayName, avatarUrl]);

  const peers = useMemo(
    () => participants.filter((p) => p.user_id !== currentUserId),
    [participants, currentUserId],
  );
  const readyCount = participants.filter((p) => p.is_ready).length;
  const totalPresent = participants.length;

  function toggleCheck(id: string) {
    setMyChecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleStartNow() {
    if (starting) return;
    setStarting(true);
    try {
      await markScheduledSessionActive(sessionId);
      onSessionStart();
    } catch (e) {
      console.error('[WaitingRoom] start failed:', e);
      setStarting(false);
    }
  }

  const canStartEarly = isModerator && totalPresent >= 1 && secondsLeft > 0;

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#1d1d36] to-[#16213e] flex flex-col overflow-hidden">
      {/* Subtle animated backdrop — slow drifting radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(167,139,250,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.10),transparent_60%)] pointer-events-none" />

      {/* ── Top bar ───────────────────────────────────────── */}
      <div className="relative shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300/80">
            Waiting room
          </span>
        </div>
        <button
          type="button"
          onClick={onLeave}
          aria-label="Leave waiting room"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 overflow-y-auto px-5 pb-5">
        <div className="max-w-md mx-auto space-y-6">

          {/* Session title + goal */}
          <div className="text-center pt-4">
            <h1 className="text-2xl font-extrabold text-white leading-tight mb-1.5">
              {sessionTitle}
            </h1>
            {declaredGoal && (
              <p className="text-sm text-white/60 leading-snug">
                {declaredGoal}
              </p>
            )}
          </div>

          {/* Big countdown */}
          <div className="text-center py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
              Session starts in
            </p>
            <div className="inline-flex items-baseline gap-1">
              <span className="text-6xl font-extrabold text-white tabular-nums">
                {String(minutesLeft).padStart(2, '0')}
              </span>
              <span className="text-3xl font-bold text-white/60 tabular-nums">
                :{String(secondsRemainder).padStart(2, '0')}
              </span>
            </div>
            <p className="text-xs text-white/40 mt-2">
              <Clock size={11} className="inline-block mr-1 -mt-0.5" />
              Starts at {new Date(startMs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Live participant list */}
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                <Users size={10} className="inline-block mr-1 -mt-0.5" />
                In the lobby
              </p>
              <span className="text-[10px] font-bold text-white/50 tabular-nums">
                {readyCount}/{totalPresent} ready
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <ParticipantChip key={p.user_id} participant={p} isMe={p.user_id === currentUserId} />
              ))}
              {peers.length === 0 && (
                <p className="text-xs text-white/40 italic">
                  Just you so far — others can join up to 5 minutes before the start.
                </p>
              )}
            </div>
          </div>

          {/* ── Per-participant intention input ───────────────────── */}
          <div className={`rounded-2xl p-4 transition-all ${
            myIntention
              ? 'bg-violet-500/10 ring-1 ring-violet-400/30'
              : 'bg-amber-500/10 ring-1 ring-amber-400/40'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${
                myIntention ? 'text-violet-300' : 'text-amber-300'
              }`}>
                <PenLine size={10} className="inline-block mr-1 -mt-0.5" />
                Your intention {myIntention ? '· saved' : '· required'}
              </p>
            </div>
            <textarea
              value={myIntentionText}
              onChange={(e) => setMyIntentionText(e.target.value)}
              onBlur={handleSaveIntention}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveIntention();
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
              placeholder="What's the one thing you'll finish this session?"
              maxLength={200}
              rows={2}
              className="w-full bg-white/5 text-sm text-white placeholder:text-white/30 rounded-xl px-3 py-2 outline-none focus:bg-white/10 focus:ring-1 focus:ring-violet-400/50 resize-none"
            />
            <p className="text-[10px] text-white/40 mt-1.5">
              {savingIntention
                ? 'Saving…'
                : myIntention
                ? 'Edit anytime before the session starts. Others can see this.'
                : 'Everyone in the lobby will see this — it sets the room\'s working energy.'}
            </p>
          </div>

          {/* ── Other participants' intentions ───────────────────── */}
          {(() => {
            const peerIntentions = intentions.filter(
              (i) => i.user_id !== currentUserId && i.declared_goal,
            );
            if (peerIntentions.length === 0) return null;
            return (
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                  What others are working on
                </p>
                <div className="space-y-2">
                  {peerIntentions.map((p) => {
                    const name = p.profile?.display_name ?? 'Member';
                    const initial = name.trim().charAt(0).toUpperCase();
                    return (
                      <div key={p.user_id} className="flex items-start gap-2.5">
                        {p.profile?.avatar_url ? (
                          <img src={p.profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
                            {initial}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white/70">{name}</p>
                          <p className="text-xs text-white/90 leading-snug">{p.declared_goal}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Get-ready checklist */}
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">
              Get ready
            </p>
            <div className="space-y-1.5">
              {READY_CHECKLIST.map(({ id, icon: Icon, label }) => {
                const checked = myChecks.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleCheck(id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left active:scale-[0.99] ${
                      checked
                        ? 'bg-emerald-500/15 ring-1 ring-emerald-400/30'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      checked ? 'bg-emerald-500/25' : 'bg-white/5'
                    }`}>
                      {checked
                        ? <CheckCircle2 size={14} className="text-emerald-400" />
                        : <Icon size={14} className="text-white/50" />}
                    </div>
                    <span className={`flex-1 text-sm font-semibold ${checked ? 'text-emerald-200' : 'text-white/80'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Moderator: start early */}
          {canStartEarly && (
            <button
              type="button"
              onClick={handleStartNow}
              disabled={starting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-violet-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Play size={14} fill="currentColor" strokeWidth={0} />
              {starting ? 'Starting…' : 'Start session now'}
            </button>
          )}

          {/* Hint text below */}
          <p className="text-[11px] text-white/30 text-center leading-relaxed px-4">
            {isModerator
              ? 'You can start anytime — others will be pulled in automatically.'
              : 'The host can start early. Otherwise, we go live the moment the clock hits zero.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Participant chip ─────────────────────────────────────────
function ParticipantChip({ participant, isMe }: { participant: PresenceParticipant; isMe: boolean }) {
  const initial = participant.display_name.trim().charAt(0).toUpperCase();
  return (
    <div className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full ${
      participant.is_ready ? 'bg-emerald-500/20 ring-1 ring-emerald-400/30' : 'bg-white/5 ring-1 ring-white/10'
    }`}>
      <div className="relative">
        {participant.avatar_url ? (
          <img src={participant.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
            {initial}
          </div>
        )}
        {participant.is_ready && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#1a1a2e] flex items-center justify-center">
            <CheckCircle2 size={8} className="text-[#1a1a2e]" strokeWidth={3} />
          </span>
        )}
      </div>
      <span className="text-[11px] font-bold text-white/90 truncate max-w-[120px]">
        {isMe ? `${participant.display_name} (You)` : participant.display_name}
      </span>
    </div>
  );
}
