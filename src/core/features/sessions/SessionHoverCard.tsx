/**
 * SessionHoverCard — the hover preview for a session block.
 *
 * Mirrors the rich hover popover baked into the /sessions CalendarView, but
 * rendered via a portal at a fixed position anchored to the hovered block.
 * The portal matters on the home planner: its grid lives inside scrollable,
 * overflow-clipped containers that would otherwise crop a CSS-only popover.
 *
 * Read-only preview (pointer-events: none) — the click still opens the full
 * SessionDetailSheet.
 */

import { createPortal } from 'react-dom';
import { SessionTagPills } from './SessionTagPills';
import type { GridSession } from './CalendarView';

const CARD_W = 256;
const CARD_H = 200; // approximate, for flip decision

function initialAvatarClass(name: string): string {
  // Cheap deterministic gradient from the name's first char.
  const palettes = [
    'from-cyan-400 to-blue-500', 'from-violet-400 to-fuchsia-500',
    'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500', 'from-indigo-400 to-purple-500',
  ];
  const i = (name.charCodeAt(0) || 0) % palettes.length;
  return palettes[i];
}

export function SessionHoverCard({
  session, anchorRect,
}: {
  session: GridSession;
  anchorRect: DOMRect;
}) {
  if (typeof document === 'undefined') return null;

  const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const end = new Date(session.startsAt.getTime() + session.intended_duration_minutes * 60_000);
  const timeRange = `${fmt(session.startsAt)} – ${fmt(end)}`;
  const isActive = session.status === 'active';

  // Flip above the block when there isn't room below.
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const placeAbove = spaceBelow < CARD_H && anchorRect.top > spaceBelow;
  const top = placeAbove ? anchorRect.top - CARD_H - 8 : anchorRect.bottom + 8;

  // Horizontally centre on the block, clamped to the viewport.
  let left = anchorRect.left + anchorRect.width / 2 - CARD_W / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - CARD_W - 8));

  return createPortal(
    <div
      className="fixed z-[120] w-64 rounded-xl bg-white shadow-2xl ring-1 ring-black/5 p-3 pointer-events-none"
      style={{ top, left }}
    >
      <div className="flex items-center gap-2 mb-2">
        {session.avatar_url ? (
          <img src={session.avatar_url} alt={session.display_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${initialAvatarClass(session.display_name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
            {session.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold stitch-text-primary truncate">{session.display_name}</p>
          <p className="text-[10px] stitch-text-secondary">
            {isActive ? 'Live now' : session.status === 'scheduled' ? 'Scheduled' : 'Logged'}
          </p>
        </div>
      </div>

      <p className="text-xs font-semibold stitch-text-primary leading-snug mb-2 line-clamp-3">
        {session.session_goal ?? session.session_title ?? 'Working on something'}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold uppercase tracking-wider text-[9px] stitch-text-secondary">When</span>
          <span className="tabular-nums font-semibold stitch-text-primary">{timeRange}</span>
        </div>
        <SessionTagPills
          mode={session.session_mode}
          quietMode={session.quiet_mode}
          partnerOpen={session.session_mode === 'one_on_one' && !session.partner_user_id}
          isQuickTimer={session.is_quick_timer}
          projectTitle={session.project_title}
          projectColor={session.project_color}
          size="sm"
        />
        <div className="mt-1 pt-2 border-t border-surface-container/60 text-primary font-bold text-[10px] text-center">
          Click for details →
        </div>
      </div>
    </div>,
    document.body,
  );
}
