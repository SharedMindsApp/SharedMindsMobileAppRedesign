/**
 * SessionTagPills — emoji-first attribute chips for sessions.
 *
 * Inspired by FLOWN's "🤐 Silent co-working · 🎤 Microphones deactivated"
 * pattern: use emoji to make the pill scannable at a glance without
 * needing to decode an icon. A new user can tell what a session "feels
 * like" in under a second.
 *
 * Usage:
 *   <SessionTagPills mode="one_on_one" quietMode partnerOpen />
 *   <SessionTagPills mode="group" quietMode={false} size="sm" />
 *
 * Canonical source of truth for all session-attribute chips. Any surface
 * that renders session metadata should use this component — don't
 * re-implement the chip styles inline.
 */

type SessionMode = 'group' | 'one_on_one' | 'solo';

export interface SessionTagPillsProps {
  mode: SessionMode;
  quietMode: boolean;
  /** Camera required (body-double mode). Shows a "Camera on" pill. */
  bodyDouble?: boolean;
  /** True when this is a 1-on-1 and the partner slot is unclaimed. */
  partnerOpen?: boolean;
  /** Show a live/scheduled status pill. Usually only in detail views. */
  status?: 'active' | 'scheduled';
  /** Duration chip — shown when provided. */
  durationMinutes?: number;
  /** Project tag — tiny colored dot + title. */
  projectTitle?: string | null;
  projectColor?: string | null;
  /** "sm" = compact (home cards, calendar blocks), "md" = comfortable (detail sheet) */
  size?: 'sm' | 'md';
  /** When true, renders a "TIMER" pill (amber) instead of the Solo
   *  mode pill. Used to distinguish Quick Timer rows from full Solo
   *  Session rows on the calendar — both store session_mode='solo'
   *  but represent very different product surfaces. */
  isQuickTimer?: boolean;
}

const MODE_META: Record<SessionMode, { emoji: string; label: string; cls: string }> = {
  group:     { emoji: '👥', label: 'Group',   cls: 'bg-blue-50 text-blue-700' },
  one_on_one:{ emoji: '🤝', label: '1-on-1',  cls: 'bg-violet-50 text-violet-700' },
  solo:      { emoji: '🎯', label: 'Solo',    cls: 'bg-rose-50 text-rose-700' },
};

const PROJECT_DOT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectHex(token: string | null | undefined): string {
  return PROJECT_DOT_HEX[token ?? ''] ?? PROJECT_DOT_HEX.blue;
}

export function SessionTagPills({
  mode,
  quietMode,
  bodyDouble = false,
  partnerOpen = false,
  status,
  durationMinutes,
  projectTitle,
  projectColor,
  size = 'md',
  isQuickTimer = false,
}: SessionTagPillsProps) {
  const isSmall = size === 'sm';
  const textCls = isSmall ? 'text-[9px]'  : 'text-[10px]';
  const padCls  = isSmall ? 'px-1.5 py-0.5' : 'px-2 py-1';
  const emojiCls = isSmall ? 'text-[10px]'  : 'text-[11px]';

  const modeMeta = MODE_META[mode] ?? MODE_META.group;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">

      {/* ── Status (live / scheduled) — detail views only ── */}
      {status === 'active' && (
        <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full ${textCls} ${padCls} bg-emerald-50 text-emerald-700`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
          Live now
        </span>
      )}
      {status === 'scheduled' && (
        <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full ${textCls} ${padCls} bg-cyan-50 text-cyan-700`}>
          📅 Upcoming
        </span>
      )}

      {/* ── Mode (or TIMER for Quick Timer rows) ── */}
      {isQuickTimer ? (
        <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full ${textCls} ${padCls} bg-amber-50 text-amber-700`}>
          <span className={emojiCls}>⏱</span>
          Timer
        </span>
      ) : (
        <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full ${textCls} ${padCls} ${modeMeta.cls}`}>
          <span className={emojiCls}>{modeMeta.emoji}</span>
          {modeMeta.label}
        </span>
      )}

      {/* ── Quiet / mics off ── */}
      {quietMode && (
        <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full ${textCls} ${padCls} bg-slate-50 text-slate-600`}>
          <span className={emojiCls}>🔇</span>
          Quiet mode
        </span>
      )}

      {/* ── Camera required (body-double) ── */}
      {bodyDouble && (
        <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full ${textCls} ${padCls} bg-indigo-50 text-indigo-700`}>
          <span className={emojiCls}>📷</span>
          Camera on
        </span>
      )}

      {/* ── Partner slot open — 1-on-1 with no claimed partner ── */}
      {partnerOpen && (
        <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full ${textCls} ${padCls} bg-amber-50 text-amber-700`}>
          <span className={emojiCls}>✨</span>
          Partner slot open
        </span>
      )}

      {/* ── Duration ── */}
      {durationMinutes != null && durationMinutes > 0 && (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full ${textCls} ${padCls} bg-surface-container-low stitch-text-secondary`}>
          <span className={emojiCls}>⏱</span>
          {durationMinutes}m
        </span>
      )}

      {/* ── Project tag ── */}
      {projectTitle && (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full ${textCls} ${padCls} bg-surface-container stitch-text-primary`}>
          <span
            className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
            style={{ backgroundColor: projectHex(projectColor) }}
          />
          {projectTitle}
        </span>
      )}
    </div>
  );
}
